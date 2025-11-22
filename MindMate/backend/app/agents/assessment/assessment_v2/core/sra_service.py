"""
Continuous SRA (Symptom Recognition and Analysis) Service
Processes all responses in real-time to extract symptoms and attributes
Works silently in the background throughout the entire workflow
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
import re

from .symptom_database import get_symptom_database, SymptomDatabase
from ..base_types import SCIDQuestion, ProcessedResponse

logger = logging.getLogger(__name__)

# Try to import LLM client
try:
    from ..core.llm.llm_client import LLMWrapper
except ImportError:
    try:
        from app.agents.assessment.llm import LLMWrapper
    except ImportError:
        LLMWrapper = None
        logger.warning("LLMWrapper not available - SRA service will use rule-based extraction only")


class SRAService:
    """
    Continuous Symptom Recognition and Analysis Service
    
    Processes all user responses in real-time to extract symptoms and their attributes.
    Works silently in the background throughout the entire assessment workflow.
    """
    
    def __init__(self, llm_client: Optional[Any] = None):
        """
        Initialize SRA service.
        
        Args:
            llm_client: LLM client instance (optional, will create if not provided)
        """
        self.symptom_db = get_symptom_database()
        self.llm_client = llm_client
        
        if LLMWrapper and not self.llm_client:
            try:
                self.llm_client = LLMWrapper()
            except Exception as e:
                logger.warning(f"Could not initialize LLM client: {e}")
                self.llm_client = None
        
        # Symptom keywords for rule-based extraction
        self.symptom_keywords = {
            "mood": ["sad", "depressed", "down", "hopeless", "empty", "guilty", "worthless", 
                    "irritable", "angry", "moody", "euphoric", "manic", "high", "elated"],
            "anxiety": ["anxious", "worried", "nervous", "fear", "panic", "afraid", "scared",
                       "restless", "on edge", "tense", "apprehensive"],
            "sleep": ["insomnia", "sleep", "trouble sleeping", "can't sleep", "wake up",
                     "sleeping too much", "hypersomnia", "nightmare", "nightmare"],
            "appetite": ["appetite", "eating", "weight", "hungry", "not hungry", "food",
                        "lost weight", "gained weight"],
            "energy": ["tired", "fatigue", "fatigued", "exhausted", "low energy", "lethargic", "sluggish",
                      "no energy", "energetic", "hyperactive", "constantly tired", "feel tired"],
            "concentration": ["concentrate", "focus", "attention", "distracted", "forgetful",
                            "memory", "remember", "brain fog"],
            "suicidal": ["suicide", "kill myself", "end my life", "want to die", "not worth living"],
            "self_harm": ["hurt myself", "cut", "burn", "self harm", "self-harm"],
            "panic": ["panic attack", "panic", "heart racing", "chest pain", "short of breath",
                     "dizzy", "sweating", "trembling"],
            "ocd": ["obsession", "compulsion", "ritual", "repetitive", "checking", "cleaning",
                   "counting", "intrusive thought"],
            "trauma": ["flashback", "nightmare", "trauma", "ptsd", "triggered", "reliving",
                      "avoid", "numb", "hypervigilant"],
            "adhd": ["attention", "hyperactive", "impulsive", "distracted", "can't focus",
                    "fidget", "restless"]
        }
        
        logger.debug("SRAService initialized")
    
    def process_response(
        self,
        session_id: str,
        user_response: str,
        question: SCIDQuestion,
        processed_response: ProcessedResponse,
        conversation_history: List[Dict[str, str]] = None
    ) -> Dict[str, Any]:
        """
        Process user response to extract symptoms and attributes.
        
        This method is called for EVERY response in the assessment workflow.
        It extracts symptoms silently in the background.
        
        Args:
            session_id: Session identifier
            user_response: User's response text
            question: The question being answered
            processed_response: Processed response from response processor
            conversation_history: Previous conversation history
            
        Returns:
            Dictionary with extracted symptoms and attributes
        """
        try:
            extracted_symptoms = []
            
            # Extract symptoms using rule-based method
            rule_based_symptoms = self._extract_symptoms_rule_based(user_response, question)
            
            # Extract symptoms using LLM if available
            llm_symptoms = []
            if self.llm_client:
                try:
                    llm_symptoms = self._extract_symptoms_llm(user_response, question, conversation_history)
                except Exception as e:
                    logger.warning(f"LLM symptom extraction failed: {e}")
            
            # Merge symptoms (prioritize LLM if available)
            all_symptoms = llm_symptoms if llm_symptoms else rule_based_symptoms
            
            # Extract attributes from processed response
            extracted_fields = processed_response.extracted_fields or {}
            
            # Add symptoms to database
            for symptom_data in all_symptoms:
                # Ensure symptom_data is a dictionary
                if not isinstance(symptom_data, dict):
                    logger.warning(f"Invalid symptom data format: {type(symptom_data)} - {symptom_data}")
                    continue
                
                symptom = self.symptom_db.add_symptom(
                    session_id=session_id,
                    symptom_name=symptom_data.get("name", ""),
                    category=symptom_data.get("category", ""),
                    severity=extracted_fields.get("severity") or symptom_data.get("severity", ""),
                    frequency=extracted_fields.get("frequency") or symptom_data.get("frequency", ""),
                    duration=extracted_fields.get("duration") or symptom_data.get("duration", ""),
                    triggers=extracted_fields.get("triggers") or symptom_data.get("triggers", []),
                    impact=extracted_fields.get("impact") or symptom_data.get("impact", ""),
                    context=f"Question: {question.simple_text[:100]}",
                    confidence=symptom_data.get("confidence", processed_response.confidence)
                )
                extracted_symptoms.append(symptom.to_dict())
            
            logger.debug(f"Extracted {len(extracted_symptoms)} symptoms from response in session {session_id}")
            
            return {
                "symptoms_extracted": len(extracted_symptoms),
                "symptoms": extracted_symptoms,
                "method": "llm" if llm_symptoms else "rule_based"
            }
            
        except Exception as e:
            logger.error(f"Error processing response for symptom extraction: {e}", exc_info=True)
            return {
                "symptoms_extracted": 0,
                "symptoms": [],
                "error": str(e)
            }
    
    def _extract_symptoms_rule_based(self, user_response: str, question: SCIDQuestion) -> List[Dict[str, Any]]:
        """
        Extract symptoms using rule-based keyword matching.
        
        Args:
            user_response: User's response text
            question: The question being answered
            
        Returns:
            List of symptom dictionaries
        """
        symptoms = []
        user_response_lower = user_response.lower()
        
        # Check for symptom keywords
        for category, keywords in self.symptom_keywords.items():
            for keyword in keywords:
                if keyword in user_response_lower:
                    # Extract symptom name and context
                    symptom_name = self._extract_symptom_name(user_response, keyword, category)
                    
                    symptoms.append({
                        "name": symptom_name,
                        "category": category,
                        "severity": self._extract_severity(user_response),
                        "frequency": self._extract_frequency(user_response),
                        "duration": self._extract_duration(user_response),
                        "confidence": 0.7  # Rule-based confidence
                    })
                    break  # Only add each category once per response
        
        return symptoms
    
    def _extract_symptoms_llm(
        self,
        user_response: str,
        question: SCIDQuestion,
        conversation_history: List[Dict[str, str]] = None
    ) -> List[Dict[str, Any]]:
        """
        Extract symptoms using LLM.
        
        Args:
            user_response: User's response text
            question: The question being answered
            conversation_history: Previous conversation history
            
        Returns:
            List of symptom dictionaries
        """
        if not self.llm_client:
            return []
        
        try:
            system_prompt = """You are a symptom extraction specialist. Extract symptoms and their attributes from user responses.

Return JSON array with symptoms:
[
  {
    "name": "symptom name",
    "category": "mood|anxiety|sleep|appetite|energy|concentration|suicidal|self_harm|panic|ocd|trauma|adhd|other",
    "severity": "mild|moderate|severe|extreme",
    "frequency": "daily|weekly|occasional|rare",
    "duration": "weeks|months|years",
    "triggers": ["trigger1", "trigger2"],
    "impact": "minor|moderate|severe|extreme",
    "confidence": 0.0-1.0
  }
]

Only extract symptoms that are clearly mentioned. Return empty array if no symptoms found.
Return only valid JSON, no additional text."""
            
            prompt = f"""
USER RESPONSE: {user_response}

QUESTION: {question.simple_text}

Extract symptoms and their attributes. Return JSON array:"""
            
            response = self.llm_client.generate_response(
                prompt=prompt,
                system_prompt=system_prompt,
                temperature=0.1,
                max_tokens=500
            )
            
            if not response.success:
                logger.warning(f"LLM symptom extraction failed: {response.error}")
                return []
            
            # Parse JSON response
            import json
            content = response.content.strip()
            
            # Remove code block markers if present
            if content.startswith("```json"):
                content = content[7:]
            if content.startswith("```"):
                content = content[3:]
            if content.endswith("```"):
                content = content[:-3]
            
            # Find JSON array
            if "[" in content:
                start_idx = content.find("[")
                end_idx = content.rfind("]") + 1
                content = content[start_idx:end_idx]
            
            # Use improved JSON parsing
            symptoms = self._parse_json_array(content)
            
            # Ensure symptoms is a list of dictionaries
            if not isinstance(symptoms, list):
                if isinstance(symptoms, dict):
                    symptoms = [symptoms]
                elif symptoms:
                    symptoms = [symptoms] if isinstance(symptoms, dict) else []
                else:
                    symptoms = []
            
            # Validate each symptom is a dict
            validated_symptoms = []
            for symptom in symptoms:
                if isinstance(symptom, dict):
                    validated_symptoms.append(symptom)
                elif isinstance(symptom, str):
                    # If symptom is a string, try to parse it
                    logger.warning(f"Unexpected symptom format (string): {symptom}")
                    # Skip string symptoms
                    continue
                else:
                    logger.warning(f"Unexpected symptom format: {type(symptom)}")
                    continue
            
            symptoms = validated_symptoms
            
            logger.debug(f"LLM extracted {len(symptoms)} symptoms")
            return symptoms
            
        except Exception as e:
            logger.warning(f"LLM symptom extraction error: {e}")
            return []
    
    def _parse_json_array(self, response_text: str) -> List[Dict[str, Any]]:
        """
        Parse JSON array from LLM response with improved error handling.
        
        Args:
            response_text: Raw LLM response text
            
        Returns:
            List of symptom dictionaries
        """
        import json
        
        if not response_text or not response_text.strip():
            return []
        
        original_text = response_text
        response_text = response_text.strip()
        
        # Remove markdown code blocks
        if response_text.startswith("```json"):
            response_text = response_text[7:].strip()
        elif response_text.startswith("```"):
            response_text = response_text[3:].strip()
        
        if response_text.endswith("```"):
            response_text = response_text[:-3].strip()
        
        # Remove LLM artifacts
        response_text = re.sub(r'<[^>]+>', '', response_text)
        
        # Find JSON array (look for [ ... ])
        start_idx = response_text.find('[')
        end_idx = response_text.rfind(']')
        
        if start_idx >= 0 and end_idx > start_idx:
            response_text = response_text[start_idx:end_idx + 1]
        elif start_idx >= 0:
            # Found [ but no ], try to find matching ]
            brace_count = 0
            for i, char in enumerate(response_text[start_idx:], start_idx):
                if char == '[':
                    brace_count += 1
                elif char == ']':
                    brace_count -= 1
                    if brace_count == 0:
                        response_text = response_text[start_idx:i+1]
                        break
        elif '{' in response_text and '}' in response_text:
            # No array brackets, but might be a single object or multiple objects
            # Try to extract objects
            objects = []
            brace_count = 0
            start_obj = -1
            
            for i, char in enumerate(response_text):
                if char == '{':
                    if brace_count == 0:
                        start_obj = i
                    brace_count += 1
                elif char == '}':
                    brace_count -= 1
                    if brace_count == 0 and start_obj >= 0:
                        obj_text = response_text[start_obj:i+1]
                        objects.append(obj_text)
                        start_obj = -1
            
            if objects:
                # Try to parse as array of objects
                response_text = '[' + ','.join(objects) + ']'
                logger.debug(f"Reconstructed JSON array from {len(objects)} objects")
        
        # Try parsing
        try:
            symptoms = json.loads(response_text)
            if isinstance(symptoms, list):
                return symptoms
            return [symptoms] if symptoms else []
        except json.JSONDecodeError:
            # Try fixing common issues
            fixed_text = re.sub(r',(\s*[\]}])', r'\1', response_text)
            fixed_text = re.sub(r"'([^']*)':", r'"\1":', fixed_text)
            fixed_text = re.sub(r":\s*'([^']*)'", r': "\1"', fixed_text)
            
            try:
                symptoms = json.loads(fixed_text)
                if isinstance(symptoms, list):
                    return symptoms
                return [symptoms] if symptoms else []
            except json.JSONDecodeError:
                logger.warning(f"Failed to parse JSON array from SRA response: {original_text[:200]}...")
                return []
    
    def _extract_symptom_name(self, user_response: str, keyword: str, category: str) -> str:
        """Extract symptom name from user response"""
        # Use category as base name
        category_names = {
            "mood": "Mood symptoms",
            "anxiety": "Anxiety symptoms",
            "sleep": "Sleep problems",
            "appetite": "Appetite changes",
            "energy": "Energy problems",
            "concentration": "Concentration problems",
            "suicidal": "Suicidal thoughts",
            "self_harm": "Self-harm behavior",
            "panic": "Panic attacks",
            "ocd": "OCD symptoms",
            "trauma": "Trauma symptoms",
            "adhd": "ADHD symptoms"
        }
        
        return category_names.get(category, keyword.title())
    
    def _extract_severity(self, user_response: str) -> str:
        """Extract severity from user response"""
        user_response_lower = user_response.lower()
        
        if any(word in user_response_lower for word in ["extreme", "severe", "very bad", "terrible", "awful"]):
            return "severe"
        elif any(word in user_response_lower for word in ["moderate", "somewhat", "quite", "pretty"]):
            return "moderate"
        elif any(word in user_response_lower for word in ["mild", "slight", "a little", "some"]):
            return "mild"
        
        return ""
    
    def _extract_frequency(self, user_response: str) -> str:
        """Extract frequency from user response"""
        user_response_lower = user_response.lower()
        
        if any(word in user_response_lower for word in ["daily", "every day", "always", "constantly"]):
            return "daily"
        elif any(word in user_response_lower for word in ["weekly", "few times", "several times"]):
            return "weekly"
        elif any(word in user_response_lower for word in ["occasional", "sometimes", "once in a while"]):
            return "occasional"
        elif any(word in user_response_lower for word in ["rare", "rarely", "seldom"]):
            return "rare"
        
        return ""
    
    def _extract_duration(self, user_response: str) -> str:
        """Extract duration from user response"""
        user_response_lower = user_response.lower()
        
        # Look for duration patterns
        if re.search(r'\d+\s*years?', user_response_lower):
            return "years"
        elif re.search(r'\d+\s*months?', user_response_lower):
            return "months"
        elif re.search(r'\d+\s*weeks?', user_response_lower):
            return "weeks"
        elif "year" in user_response_lower:
            return "years"
        elif "month" in user_response_lower:
            return "months"
        elif "week" in user_response_lower:
            return "weeks"
        
        return ""
    
    def get_symptoms_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get summary of all symptoms for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with symptom summary
        """
        return self.symptom_db.get_symptoms_summary(session_id)
    
    def export_symptoms(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Export symptoms for use by DA and TPA.
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of symptom dictionaries
        """
        return self.symptom_db.export_symptoms(session_id)


# Global SRA service instance
_sra_service: Optional[SRAService] = None


def get_sra_service() -> SRAService:
    """Get global SRA service instance (singleton)"""
    global _sra_service
    if _sra_service is None:
        _sra_service = SRAService()
    return _sra_service


