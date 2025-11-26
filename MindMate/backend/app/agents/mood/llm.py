"""
LLM Client for Mood Tracking System
Specialized for empathetic mood assessment with personalized question generation
"""

import os
import time
import json
import logging
import re
from typing import List, Dict, Any, Optional
from datetime import datetime
from pathlib import Path
from dotenv import load_dotenv
import requests

# Load environment variables from backend/.env
# Path: mood/llm.py -> agents/mood -> agents -> app -> backend
try:
    env_path = Path(__file__).parent.parent.parent.parent / ".env"
    if not env_path.exists():
        # Try alternative paths
        env_path = Path(__file__).parent.parent.parent.parent.parent / ".env"
    load_dotenv(env_path)
except ImportError:
    # dotenv not available, try to load .env manually
    try:
        env_path = Path(__file__).parent.parent.parent.parent / ".env"
        if not env_path.exists():
            env_path = Path(__file__).parent.parent.parent.parent.parent / ".env"

        if env_path.exists():
            with open(env_path, 'r') as f:
                for line in f:
                    line = line.strip()
                    if line and not line.startswith('#') and '=' in line:
                        key, value = line.split('=', 1)
                        # Remove quotes if present
                        value = value.strip('\"\'')
                        os.environ[key] = value
            logger.info("Loaded environment variables from .env file manually")
    except Exception as e:
        logger.warning(f"Failed to load .env file manually: {e}")
        pass

logger = logging.getLogger(__name__)


class MoodTrackingLLMClient:
    """LLM Client specialized for mood tracking and assessment"""
    
    def __init__(self, model: str = None, enable_cache: bool = True):
        # Prioritize Groq over OpenRouter (Groq has working API key)
        self.api_key = os.getenv("GROQ_API_KEY") or os.getenv("OPENROUTER_API_KEY")
        self.model = model or os.getenv("GROQ_MODEL") or os.getenv("OPENROUTER_MODEL", "llama-3.1-8b-instant")

        # Determine which service to use - prefer Groq
        if os.getenv("GROQ_API_KEY"):
            self.base_url = os.getenv("GROQ_BASE_URL", "https://api.groq.com/openai/v1")
            self.service = "groq"
        elif os.getenv("OPENROUTER_API_KEY"):
            self.base_url = os.getenv("OPENROUTER_BASE_URL", "https://openrouter.ai/api/v1")
            self.service = "openrouter"
        else:
            raise ValueError("No LLM API key found. Set GROQ_API_KEY or OPENROUTER_API_KEY")
        
        # Metrics
        self.request_count = 0
        self.success_count = 0
        
        if not self._verify_connection():
            logger.warning("LLM connection verification failed")
    
    def _get_api_endpoint(self) -> str:
        """Get the correct API endpoint based on service"""
        if self.service == "groq":
            return f"{self.base_url}/chat/completions"
        else:  # openrouter
            return f"{self.base_url}/chat/completions"
    
    def _verify_connection(self) -> bool:
        """Verify LLM connection"""
        if not self.api_key:
            logger.error("No API key provided")
            return False
        try:
            self._make_request([{"role": "user", "content": "Hello"}], max_tokens=10)
            logger.info(f"LLM connected: {self.model} ({self.service})")
            return True
        except Exception as e:
            logger.error(f"Connection failed: {e}")
            return False
    
    def _make_request(
        self,
        messages: List[Dict[str, str]],
        max_tokens: int = 800,
        temperature: float = 0.7,
        timeout: int = 30,
        **kwargs
    ) -> str:
        """Make API request to LLM"""
        headers = {
            "Authorization": f"Bearer {self.api_key}",
            "Content-Type": "application/json"
        }
        
        if self.service == "openrouter":
            headers["HTTP-Referer"] = os.getenv("PROJECT_URL", "http://localhost:8000")
            headers["X-Title"] = "MindMate Mood Tracking"
        
        payload = {
            "model": self.model,
            "messages": messages,
            "max_tokens": max_tokens,
            "temperature": temperature,
            **kwargs
        }
        
        response = requests.post(
            self._get_api_endpoint(),
            headers=headers,
            json=payload,
            timeout=timeout
        )
        
        if response.status_code != 200:
            raise Exception(f"API error: {response.status_code} - {response.text}")
        
        result = response.json()
        return result["choices"][0]["message"]["content"]
    
    def generate_conversational_prompt(
        self,
        prompt: str,
        system_prompt: str,
        max_tokens: int = 800,
        temperature: float = 0.7,
        max_retries: int = 3
    ) -> str:
        """Generate conversational response"""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": prompt}
        ]
        
        for attempt in range(max_retries):
            try:
                self.request_count += 1
                response = self._make_request(messages, max_tokens, temperature)
                self.success_count += 1
                return response.strip()
            except Exception as e:
                logger.warning(f"Attempt {attempt + 1} failed: {e}")
                if attempt == max_retries - 1:
                    raise e
                time.sleep(2 ** attempt)
        raise Exception("All retries failed")
    
    def generate_personalized_question(
        self,
        question_concept: str,
        question_number: int,
        context: Dict[str, Any],
        previous_responses: Dict[str, Any] = None
    ) -> str:
        """Generate personalized mood question based on context and history"""
        
        system_prompt = """You are an empathetic mood tracking assistant. Your role is to ask thoughtful, personalized questions about emotional well-being.

Guidelines:
- Be warm, conversational, and supportive
- Adapt tone based on user's emotional state
- Reference previous responses naturally when relevant
- Keep questions clear and easy to answer
- Avoid being clinical or diagnostic
- Use natural, friendly language
- Maximum 2-3 sentences per question"""

        # Get mood history summary
        mood_history = context.get("mood_history", [])
        recent_trends = self._analyze_mood_trends(mood_history) if mood_history else ""
        
        # Build context string
        context_str = f"""
QUESTION CONCEPT: {question_concept}
QUESTION NUMBER: {question_number} of 6

USER CONTEXT:
- Patient ID: {context.get('patient_id', 'Unknown')}
- Previous mood records: {len(mood_history)} recent entries
{recent_trends}

PREVIOUS RESPONSES IN THIS SESSION:
{json.dumps(previous_responses, indent=2) if previous_responses else "None yet"}
"""
        
        # Concept-specific guidance
        concept_guidance = {
            "emotion_label": """Generate a natural question asking about their current emotional state or mood. 
            Examples: "How would you describe your mood right now?", "What's on your mind emotionally today?"
            Be warm and open-ended.""",
            
            "intensity": """Ask about how strong or intense their current feeling is. 
            Reference their previous response about emotion. Use a scale if helpful.
            Examples: "How strong is that feeling?", "On a scale of 1-5, how intense is this for you?" """,
            
            "energy": """Ask about their energy level or vitality today.
            Examples: "How's your energy level today?", "Do you feel energized or drained?" """,
            
            "trigger_context": """Ask about what's affecting their mood or what happened today that influenced it.
            Examples: "What's been affecting your mood most today?", "What's the main thing influencing how you feel right now?"
            Allow for both positive and negative triggers.""",
            
            "coping_response": """Ask how they've been responding to or handling their current mood.
            Examples: "How have you been coping with this?", "What have you been doing to handle these feelings?"
            Be supportive and non-judgmental.""",
            
            "need_reflection": """Ask what they feel they need right now or what would be helpful.
            Examples: "What do you feel you need right now?", "What would help you feel better?"
            Be open and supportive."""
        }
        
        question_prompt = f"""
{context_str}

CONCEPT GUIDANCE:
{concept_guidance.get(question_concept, "Generate a warm, empathetic question about this topic")}

Generate ONE personalized, natural question following the concept. Reference previous responses if relevant, and adjust tone based on their emotional state.

Your question:"""

        try:
            question = self.generate_conversational_prompt(
                prompt=question_prompt,
                system_prompt=system_prompt,
                temperature=0.8,  # Higher creativity for natural variation
                max_tokens=150
            )
            return self.clean_output(question)
        except Exception as e:
            logger.error(f"Question generation failed: {e}")
            # Fallback questions
            fallbacks = {
                "emotion_label": "How would you describe your mood right now?",
                "intensity": "How strong is that feeling?",
                "energy": "How's your energy level today?",
                "trigger_context": "What's been affecting your mood most today?",
                "coping_response": "How have you been responding to your mood today?",
                "need_reflection": "What do you feel you need right now?"
            }
            return fallbacks.get(question_concept, "How are you feeling?")
    
    def extract_structured_response(
        self,
        user_response: str,
        question_concept: str,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """Extract structured data from user's natural language response"""
        
        system_prompt = """You are a mood data extraction specialist. Extract structured information from natural language responses about mood and emotions.

Be empathetic and accurate. Extract the core information while preserving nuance."""
        
        extraction_prompt = f"""
QUESTION CONCEPT: {question_concept}
USER RESPONSE: "{user_response}"

CONVERSATION CONTEXT:
{json.dumps(conversation_history, indent=2) if conversation_history else "None"}

EXTRACT STRUCTURED DATA based on the concept:

1. emotion_label: Extract the primary emotion/mood (e.g., "happy", "anxious", "calm", "sad", "frustrated")
2. intensity: Extract intensity level (1-5 scale) or estimate from description
3. energy: Extract energy level (1-5 scale) or estimate from description
4. trigger_context: Extract what's affecting mood (can be multiple things)
5. coping_response: Extract how they're responding/coping (select from: pushed_through, avoided, sought_support, practiced_self_care, distracted, other)
6. need_reflection: Extract what they feel they need (free text or categorize)

Return as JSON with appropriate fields for this concept. If the response is unclear, make reasonable inferences or return null.
"""

        try:
            response = self.generate_conversational_prompt(
                prompt=extraction_prompt,
                system_prompt=system_prompt,
                temperature=0.1,  # Low temperature for accuracy
                max_tokens=300
            )
            
            # Extract JSON
            response = response.strip()
            if "```json" in response:
                response = response.split("```json")[1].split("```")[0].strip()
            elif "```" in response:
                response = response.split("```")[1].split("```")[0].strip()
            
            if not response.startswith("{"):
                start_idx = response.find("{")
                if start_idx != -1:
                    response = response[start_idx:]
            
            if not response.endswith("}"):
                end_idx = response.rfind("}")
                if end_idx != -1:
                    response = response[:end_idx + 1]
            
            return json.loads(response)
        except Exception as e:
            logger.error(f"Extraction failed: {e}")
            return {"raw_response": user_response}
    
    def generate_reflective_summary(
        self,
        all_responses: Dict[str, Any],
        metrics: Dict[str, float],
        mood_history: List[Dict] = None
    ) -> str:
        """Generate empathetic reflective summary after mood assessment"""
        
        system_prompt = """You are an empathetic mental health assistant. Provide a warm, supportive summary of the user's mood assessment.

Guidelines:
- Be supportive and non-judgmental
- Highlight patterns or improvements if relevant
- Offer gentle insights
- Keep it conversational (2-3 sentences)
- End with an optional supportive suggestion"""
        
        summary_prompt = f"""
USER'S RESPONSES:
{json.dumps(all_responses, indent=2)}

CALCULATED METRICS:
{json.dumps(metrics, indent=2)}

RECENT MOOD HISTORY:
{json.dumps(mood_history[-3:], indent=2) if mood_history and len(mood_history) > 0 else "None"}

Generate a warm, supportive 2-3 sentence summary of their current emotional state, and optionally suggest something supportive (but don't be prescriptive).
"""

        try:
            summary = self.generate_conversational_prompt(
                prompt=summary_prompt,
                system_prompt=system_prompt,
                temperature=0.7,
                max_tokens=200
            )
            return self.clean_output(summary)
        except Exception as e:
            logger.error(f"Summary generation failed: {e}")
            return "Thank you for sharing. Your mood has been recorded."
    
    def _analyze_mood_trends(self, mood_history: List[Dict]) -> str:
        """Analyze mood trends from history"""
        if not mood_history:
            return ""
        
        recent = mood_history[-3:]
        if not recent:
            return ""
        
        scores = [m.get("mood_score", 0) for m in recent if "mood_score" in m]
        if not scores:
            return ""
        
        avg = sum(scores) / len(scores)
        trend = "improving" if len(scores) > 1 and scores[-1] > scores[0] else "declining" if len(scores) > 1 and scores[-1] < scores[0] else "stable"
        
        return f"- Recent average mood: {avg:.2f}\n- Trend: {trend}"
    
    def get_stats(self) -> Dict[str, Any]:
        """Get client statistics"""
        return {
            "model": self.model,
            "service": self.service,
            "request_count": self.request_count,
            "success_count": self.success_count,
            "success_rate": (self.success_count / self.request_count) if self.request_count > 0 else 0
        }

    @staticmethod
    def clean_output(text: Optional[str]) -> Optional[str]:
        """Strip reasoning markers, markdown fences, and extra whitespace from model output."""
        if text is None:
            return None

        cleaned = text.strip()

        # Remove markdown fences
        if cleaned.startswith("```"):
            cleaned = cleaned.strip("`")

        # Remove <think>...</think> style reasoning traces
        cleaned = re.sub(r"<think>.*?</think>", "", cleaned, flags=re.DOTALL | re.IGNORECASE)
        cleaned = re.sub(r"<think>.*", "", cleaned, flags=re.DOTALL | re.IGNORECASE)

        # Remove Question headers such as "Question 2 of 6:"
        cleaned = re.sub(
            r"^\s*question\s*\d+\s*(of|/)\s*\d+[:\-\s]*",
            "",
            cleaned,
            flags=re.IGNORECASE
        )

        # Collapse whitespace
        cleaned = re.sub(r"\s+", " ", cleaned).strip()

        # Trim surrounding quotes
        cleaned = cleaned.strip("\"' ")

        return cleaned or None

