"""
Mood Tracking System - Main Collector Agent
Collects daily mood data using LLM-driven personalized questions
"""

import uuid
import json
import logging
from typing import Dict, Any, Optional, List
from datetime import datetime, timedelta
from dataclasses import dataclass
from collections import defaultdict
import statistics

from .llm import MoodTrackingLLMClient

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


@dataclass
class MoodSession:
    """Mood tracking session state"""
    session_id: str
    patient_id: str
    start_time: datetime
    responses: Dict[str, Any]
    current_question: int
    completed: bool
    metrics: Optional[Dict[str, float]] = None
    llm_summary: Optional[str] = None


class MoodMetricsCalculator:
    """Calculate mood metrics from responses"""
    
    # Emotion to Mood Score mapping (-2 to +2)
    EMOTION_SCORE_MAP = {
        "happy": 2, "joyful": 2, "content": 1, "calm": 1, "peaceful": 1,
        "neutral": 0, "okay": 0, "fine": 0,
        "sad": -1, "down": -1, "lonely": -1, "disappointed": -1,
        "anxious": -2, "angry": -2, "frustrated": -2, "overwhelmed": -2,
        "depressed": -2, "hopeless": -2, "stressed": -2
    }
    
    # Coping effectiveness mapping (-1 to +2)
    COPING_EFFECTIVENESS_MAP = {
        "pushed_through": -1,  # May indicate avoidance
        "avoided": -1,
        "distracted": 0,
        "sought_support": 1,
        "practiced_self_care": 2,
        "other": 0
    }
    
    @staticmethod
    def calculate_mood_score(emotion: str) -> float:
        """Calculate Mood Score (MS) from emotion label (-2 to +2)"""
        emotion_lower = emotion.lower()
        
        # Check direct match
        if emotion_lower in MoodMetricsCalculator.EMOTION_SCORE_MAP:
            return MoodMetricsCalculator.EMOTION_SCORE_MAP[emotion_lower]
        
        # Check partial matches
        for key, value in MoodMetricsCalculator.EMOTION_SCORE_MAP.items():
            if key in emotion_lower or emotion_lower in key:
                return value
        
        # Default to neutral if unclear
        return 0.0
    
    @staticmethod
    def calculate_intensity_level(intensity: Any) -> float:
        """Calculate Intensity Level (IL) from response (1-5)"""
        if isinstance(intensity, (int, float)):
            return max(1, min(5, float(intensity)))
        if isinstance(intensity, str):
            # Try to extract number
            import re
            numbers = re.findall(r'\d+', intensity)
            if numbers:
                level = float(numbers[0])
                return max(1, min(5, level))
        return 3.0  # Default
    
    @staticmethod
    def calculate_energy_index(energy: Any) -> float:
        """Calculate Energy Index (EI) from response (1-5)"""
        if isinstance(energy, (int, float)):
            return max(1, min(5, float(energy)))
        if isinstance(energy, str):
            energy_lower = energy.lower()
            # Map descriptions to numbers
            if any(word in energy_lower for word in ["very high", "excellent", "great"]):
                return 5.0
            if any(word in energy_lower for word in ["high", "good", "energized"]):
                return 4.0
            if any(word in energy_lower for word in ["moderate", "okay", "normal"]):
                return 3.0
            if any(word in energy_lower for word in ["low", "tired", "drained"]):
                return 2.0
            if any(word in energy_lower for word in ["very low", "exhausted", "depleted"]):
                return 1.0
            # Try to extract number
            import re
            numbers = re.findall(r'\d+', energy)
            if numbers:
                level = float(numbers[0])
                return max(1, min(5, level))
        return 3.0  # Default
    
    @staticmethod
    def calculate_trigger_index(trigger: Any) -> float:
        """Calculate Trigger Index (TI) from response (1-5)"""
        if not trigger:
            return 2.5  # Neutral if no trigger specified
        
        if isinstance(trigger, (int, float)):
            return max(1, min(5, float(trigger)))
        
        if isinstance(trigger, str):
            trigger_lower = trigger.lower()
            # Higher index for negative stressors
            if any(word in trigger_lower for word in ["stress", "worry", "conflict", "problem", "issue", "difficulty"]):
                return 4.5
            if any(word in trigger_lower for word in ["work", "deadline", "pressure"]):
                return 4.0
            if any(word in trigger_lower for word in ["good", "positive", "happy", "excited"]):
                return 2.0
            return 3.0  # Default moderate
        
        return 3.0
    
    @staticmethod
    def calculate_coping_effectiveness(coping: str) -> float:
        """Calculate Coping Effectiveness (CE) from response (-1 to +2)"""
        if not coping:
            return 0.0
        
        coping_lower = coping.lower()
        
        # Check direct match
        if coping_lower in MoodMetricsCalculator.COPING_EFFECTIVENESS_MAP:
            return MoodMetricsCalculator.COPING_EFFECTIVENESS_MAP[coping_lower]
        
        # Check partial matches
        for key, value in MoodMetricsCalculator.COPING_EFFECTIVENESS_MAP.items():
            if key in coping_lower:
                return value
        
        return 0.0  # Default neutral
    
    @staticmethod
    def calculate_msi(mood_scores_history: List[float], current_score: float) -> float:
        """Calculate Mood Stability Index (MSI) from history (0-1)"""
        if not mood_scores_history:
            return 0.5  # Default moderate stability for first entry
        
        all_scores = mood_scores_history + [current_score]
        
        if len(all_scores) < 2:
            return 0.5
        
        # Calculate standard deviation
        try:
            std_dev = statistics.stdev(all_scores)
        except:
            std_dev = 0.0
        
        # MSI = 1 - (normalized std_dev)
        # Max std_dev for range -2 to +2 is ~2.8, so normalize
        normalized_std = min(std_dev / 2.8, 1.0)
        msi = 1 - normalized_std
        
        return max(0.0, min(1.0, msi))  # Clamp to 0-1
    
    @classmethod
    def calculate_all_metrics(
        cls,
        responses: Dict[str, Any],
        mood_history: List[Dict[str, Any]] = None
    ) -> Dict[str, float]:
        """Calculate all mood metrics from responses"""
        mood_history = mood_history or []
        
        # Extract values
        emotion = responses.get("emotion", "neutral")
        intensity = responses.get("intensity", 3)
        energy = responses.get("energy", 3)
        trigger = responses.get("trigger", "")
        coping = responses.get("coping", "")
        
        # Calculate individual metrics
        mood_score = cls.calculate_mood_score(emotion)
        intensity_level = cls.calculate_intensity_level(intensity)
        energy_index = cls.calculate_energy_index(energy)
        trigger_index = cls.calculate_trigger_index(trigger)
        coping_effectiveness = cls.calculate_coping_effectiveness(coping)
        
        # Calculate MSI from history
        previous_scores = [m.get("mood_score", 0) for m in mood_history if "mood_score" in m]
        msi = cls.calculate_msi(previous_scores, mood_score)
        
        return {
            "mood_score": mood_score,
            "intensity_level": intensity_level,
            "energy_index": energy_index,
            "trigger_index": trigger_index,
            "coping_effectiveness": coping_effectiveness,
            "msi": msi
        }


class MoodCollector:
    """Main mood tracking collector agent"""
    
    # 6 Core Question Concepts
    QUESTION_CONCEPTS = [
        "emotion_label",      # Q1: Emotion Label
        "intensity",          # Q2: Intensity
        "energy",             # Q3: Energy
        "trigger_context",   # Q4: Trigger/Context
        "coping_response",     # Q5: Coping Response
        "need_reflection"     # Q6: Need/Reflection
    ]
    QUESTION_THEMES = {
        "emotion_label": "current_emotion",
        "intensity": "intensity_level",
        "energy": "energy_level",
        "trigger_context": "influences",
        "coping_response": "coping",
        "need_reflection": "next_steps",
    }
    TOTAL_QUESTIONS = len(QUESTION_CONCEPTS)
    
    def __init__(self):
        self.llm = MoodTrackingLLMClient()
        self.sessions: Dict[str, MoodSession] = {}
        self.metrics_calculator = MoodMetricsCalculator()
    
    def start_session(self, patient_id: str, mood_history: List[Dict] = None) -> Dict[str, Any]:
        """Start a new mood tracking session"""
        session_id = str(uuid.uuid4())
        
        session = MoodSession(
            session_id=session_id,
            patient_id=patient_id,
            start_time=datetime.utcnow(),
            responses={},
            current_question=0,
            completed=False
        )
        
        self.sessions[session_id] = session
        
        # Generate first question
        context = {
            "patient_id": patient_id,
            "mood_history": mood_history or []
        }
        
        question = self.llm.generate_personalized_question(
            question_concept=self.QUESTION_CONCEPTS[0],
            question_number=1,
            context=context,
            previous_responses=None
        )
        
        return self._build_question_payload(
            session=session,
            question_text=question,
            concept=self.QUESTION_CONCEPTS[0],
        )
    
    def submit_response(
        self,
        session_id: str,
        user_response: str,
        mood_history: List[Dict] = None
    ) -> Dict[str, Any]:
        """Submit response and get next question or completion"""
        
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.sessions[session_id]
        
        if session.completed:
            raise ValueError("Session already completed")
        
        # Extract structured data from response
        current_concept = self.QUESTION_CONCEPTS[session.current_question]
        
        # Build conversation history
        conversation_history = []
        for i, concept in enumerate(self.QUESTION_CONCEPTS[:session.current_question]):
            if concept in session.responses:
                conversation_history.append({
                    "question_concept": concept,
                    "response": session.responses[concept].get("raw_response", "")
                })
        
        extracted = self.llm.extract_structured_response(
            user_response=user_response,
            question_concept=current_concept,
            conversation_history=conversation_history
        )
        
        # Store response
        session.responses[current_concept] = {
            "raw_response": user_response,
            "extracted": extracted,
            "timestamp": datetime.utcnow().isoformat()
        }
        
        # Move to next question
        session.current_question += 1
        
        # Check if completed
        if session.current_question >= len(self.QUESTION_CONCEPTS):
            # Calculate metrics and generate summary
            metrics = self.metrics_calculator.calculate_all_metrics(
                responses=self._format_responses_for_calculation(session.responses),
                mood_history=mood_history or []
            )
            
            session.metrics = metrics
            
            # Generate reflective summary
            summary = self.llm.generate_reflective_summary(
                all_responses=self._format_responses_for_calculation(session.responses),
                metrics=metrics,
                mood_history=mood_history or []
            )
            
            session.llm_summary = summary
            session.completed = True
            
            structured = self._format_responses_for_calculation(session.responses)
            return {
                "session_id": session_id,
                "completed": True,
                "metrics": metrics,
                "summary": summary,
                "responses": session.responses,
                "structured_responses": structured,
                "dominant_emotions": self._extract_dominant_emotions(structured),
                "trigger_details": self._extract_trigger_details(structured),
                "progress_percent": 100.0,
            }
        
        # Generate next question
        context = {
            "patient_id": session.patient_id,
            "mood_history": mood_history or []
        }
        
        question = self.llm.generate_personalized_question(
            question_concept=self.QUESTION_CONCEPTS[session.current_question],
            question_number=session.current_question + 1,
            context=context,
            previous_responses=self._format_responses_for_calculation(session.responses)
        )
        
        return self._build_question_payload(
            session=session,
            question_text=question,
            concept=self.QUESTION_CONCEPTS[session.current_question],
        )
    
    def get_session(self, session_id: str) -> Optional[MoodSession]:
        """Get session by ID"""
        return self.sessions.get(session_id)
    
    def _format_responses_for_calculation(self, responses: Dict[str, Any]) -> Dict[str, Any]:
        """Format responses for metric calculation"""
        formatted = {}
        for concept, data in responses.items():
            extracted = data.get("extracted", {})
            raw_response = data.get("raw_response", "")
            
            # Map each concept to its value
            if concept == "emotion_label":
                formatted["emotion"] = extracted.get("emotion") or raw_response
            elif concept == "intensity":
                formatted["intensity"] = extracted.get("intensity") or raw_response
            elif concept == "energy":
                formatted["energy"] = extracted.get("energy") or raw_response
            elif concept == "trigger_context":
                formatted["trigger"] = extracted.get("trigger") or extracted.get("context") or raw_response
            elif concept == "coping_response":
                formatted["coping"] = extracted.get("coping") or raw_response
            elif concept == "need_reflection":
                formatted["need"] = extracted.get("need") or raw_response
        
        return formatted

    def _build_question_payload(self, session: MoodSession, question_text: str, concept: str) -> Dict[str, Any]:
        """Build standardized payload for next question."""
        question_number = session.current_question + 1
        progress = round((session.current_question / self.TOTAL_QUESTIONS) * 100, 2)
        return {
            "session_id": session.session_id,
            "question": question_text,
            "question_number": question_number,
            "total_questions": self.TOTAL_QUESTIONS,
            "completed": False,
            "theme": self.QUESTION_THEMES.get(concept, concept),
            "progress_percent": progress,
            "metadata": {
                "concept": concept,
                "questions_answered": session.current_question,
                "total_questions": self.TOTAL_QUESTIONS,
                "flow": "conversational",
            },
        }

    @staticmethod
    def _extract_dominant_emotions(structured_responses: Dict[str, Any]) -> List[str]:
        emotion = structured_responses.get("emotion")
        if not emotion:
            return []
        if isinstance(emotion, list):
            return [str(e).strip() for e in emotion if e]
        return [str(emotion).strip()]

    @staticmethod
    def _extract_trigger_details(structured_responses: Dict[str, Any]) -> Dict[str, List[str]]:
        trigger_raw = structured_responses.get("trigger")
        if not trigger_raw:
            return {"positive": [], "negative": [], "neutral": []}

        if isinstance(trigger_raw, list):
            triggers = trigger_raw
        else:
            triggers = [trigger_raw]

        positive_keywords = {"grateful", "happy", "support", "achievement", "positive", "good", "calm"}
        negative_keywords = {"stress", "argument", "conflict", "worry", "anxious", "problem", "issue", "tired", "sad"}

        categorized = {"positive": [], "negative": [], "neutral": []}
        for item in triggers:
            value = str(item).strip()
            value_lower = value.lower()
            if any(word in value_lower for word in positive_keywords):
                categorized["positive"].append(value)
            elif any(word in value_lower for word in negative_keywords):
                categorized["negative"].append(value)
            else:
                categorized["neutral"].append(value)
        return categorized


# Global instance
_mood_collector_instance: Optional[MoodCollector] = None


def get_mood_collector() -> MoodCollector:
    """Get global mood collector instance"""
    global _mood_collector_instance
    if _mood_collector_instance is None:
        _mood_collector_instance = MoodCollector()
    return _mood_collector_instance

