"""
Mood Session Manager - In-memory session management for mood assessments
"""
import uuid
from datetime import datetime, timedelta
from typing import Dict, Any, Optional

from app.core.logging_config import get_logger

logger = get_logger(__name__)


class MoodSessionManager:
    """
    Manages in-memory mood assessment sessions
    Handles conversational flow for mood tracking
    """
    
    def __init__(self):
        self.sessions: Dict[str, Dict[str, Any]] = {}
        logger.debug("MoodSessionManager initialized")
    
    def create_session(self, user_id: str) -> str:
        """Create a new mood assessment session"""
        session_id = str(uuid.uuid4())
        self.sessions[session_id] = {
            "user_id": user_id,
            "created_at": datetime.utcnow(),
            "current_question": 0,
            "responses": [],
            "completed": False
        }
        logger.info(f"📝 Created session {session_id} for user {user_id}")
        return session_id
    
    def get_next_question(self, session_id: str) -> Dict[str, Any]:
        """Get the next question in the assessment"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.sessions[session_id]
        question_num = session["current_question"]
        
        # Simple question flow (can be expanded)
        questions = [
            {"text": "How are you feeling today?", "theme": "general"},
            {"text": "What's been on your mind lately?", "theme": "thoughts"},
            {"text": "How has your energy level been?", "theme": "energy"},
            {"text": "What are you grateful for today?", "theme": "gratitude"},
        ]
        
        if question_num >= len(questions):
            session["completed"] = True
            return {
                "completed": True,
                "session_id": session_id
            }
        
        question = questions[question_num]
        return {
            "completed": False,
            "question": question["text"],
            "question_number": question_num + 1,
            "total_questions": len(questions),
            "theme": question["theme"]
        }
    
    def submit_response(self, session_id: str, response: str) -> Dict[str, Any]:
        """Submit a response and get next question or completion"""
        if session_id not in self.sessions:
            raise ValueError(f"Session {session_id} not found")
        
        session = self.sessions[session_id]
        session["responses"].append({
            "question_number": session["current_question"] + 1,
            "response": response,
            "timestamp": datetime.utcnow().isoformat()
        })
        
        session["current_question"] += 1
        
        # Get next question
        next_q = self.get_next_question(session_id)
        
        # If completed, generate mood inference
        if next_q.get("completed"):
            mood_inference = self._generate_mood_inference(session)
            return {
                "completed": True,
                "mood_inference": mood_inference,
                "session_id": session_id
            }
        
        return next_q
    
    def _generate_mood_inference(self, session: Dict[str, Any]) -> Dict[str, Any]:
        """Generate mood inference from responses (simplified version)"""
        # This is a simple stub - in production, this would use AI/ML
        return {
            "stress_level": 5.0,
            "energy_level": 6.0,
            "gratitude_level": 7.0,
            "reflection_level": 6.0,
            "overall_mood_score": 6.0,
            "overall_mood_label": "Balanced",
            "dominant_emotions": ["calm", "reflective"],
            "summary": "Overall mood appears balanced with good energy levels.",
            "trigger_factors": {
                "positive": ["gratitude", "reflection"],
                "negative": []
            },
            "reasoning": "Based on the responses provided in this assessment."
        }
    
    def get_session_result(self, session_id: str) -> Optional[Dict[str, Any]]:
        """Get complete session result"""
        if session_id not in self.sessions:
            return None
        
        session = self.sessions[session_id]
        return {
            "session_id": session_id,
            "user_id": session["user_id"],
            "responses": session["responses"],
            "completed": session["completed"],
            "created_at": session["created_at"].isoformat()
        }
    
    def cleanup_session(self, session_id: str) -> bool:
        """Remove session from memory"""
        if session_id in self.sessions:
            del self.sessions[session_id]
            logger.debug(f"Cleaned up session {session_id}")
            return True
        return False
    
    def get_active_sessions_count(self) -> int:
        """Get count of active sessions"""
        return len(self.sessions)
    
    def cleanup_old_sessions(self, max_age_hours: int = 24) -> int:
        """Cleanup sessions older than specified hours"""
        cutoff_time = datetime.utcnow() - timedelta(hours=max_age_hours)
        sessions_to_remove = [
            sid for sid, session in self.sessions.items()
            if session["created_at"] < cutoff_time
        ]
        
        for sid in sessions_to_remove:
            del self.sessions[sid]
        
        logger.debug(f"Cleaned up {len(sessions_to_remove)} old sessions")
        return len(sessions_to_remove)


# Global instance
_mood_session_manager = None


def get_mood_session_manager() -> MoodSessionManager:
    """Dependency injection function for FastAPI"""
    global _mood_session_manager
    if _mood_session_manager is None:
        _mood_session_manager = MoodSessionManager()
    return _mood_session_manager










