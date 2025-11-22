"""
Symptom Database for Continuous SRA Service
Stores and manages symptoms collected throughout the assessment workflow
"""

import logging
from typing import Dict, List, Any, Optional
from datetime import datetime
from dataclasses import dataclass, field, asdict

logger = logging.getLogger(__name__)


@dataclass
class Symptom:
    """Individual symptom with attributes"""
    name: str
    category: str = ""  # e.g., "mood", "anxiety", "sleep", "cognitive"
    severity: str = ""  # "mild", "moderate", "severe", "extreme"
    frequency: str = ""  # "daily", "weekly", "occasional", "rare"
    duration: str = ""  # "weeks", "months", "years"
    triggers: List[str] = field(default_factory=list)
    impact: str = ""  # "minor", "moderate", "severe", "extreme"
    first_mentioned: datetime = field(default_factory=datetime.now)
    last_updated: datetime = field(default_factory=datetime.now)
    mentions_count: int = 1
    context: List[str] = field(default_factory=list)  # Context where symptom was mentioned
    confidence: float = 1.0  # Confidence in symptom extraction (0.0-1.0)
    
    def to_dict(self) -> Dict[str, Any]:
        """Convert to dictionary"""
        return {
            "name": self.name,
            "category": self.category,
            "severity": self.severity,
            "frequency": self.frequency,
            "duration": self.duration,
            "triggers": self.triggers,
            "impact": self.impact,
            "first_mentioned": self.first_mentioned.isoformat(),
            "last_updated": self.last_updated.isoformat(),
            "mentions_count": self.mentions_count,
            "context": self.context,
            "confidence": self.confidence
        }
    
    def update(self, **kwargs):
        """Update symptom attributes"""
        for key, value in kwargs.items():
            if hasattr(self, key):
                setattr(self, key, value)
        self.last_updated = datetime.now()
        self.mentions_count += 1


class SymptomDatabase:
    """Database for storing symptoms collected throughout assessment workflow"""
    
    def __init__(self):
        """Initialize symptom database"""
        # Session-based symptom storage: {session_id: {symptom_name: Symptom}}
        self._symptoms: Dict[str, Dict[str, Symptom]] = {}
        logger.debug("SymptomDatabase initialized")
    
    def add_symptom(
        self,
        session_id: str,
        symptom_name: str,
        category: str = "",
        severity: str = "",
        frequency: str = "",
        duration: str = "",
        triggers: List[str] = None,
        impact: str = "",
        context: str = "",
        confidence: float = 1.0
    ) -> Symptom:
        """
        Add or update a symptom in the database.
        
        Args:
            session_id: Session identifier
            symptom_name: Name of the symptom
            category: Symptom category
            severity: Severity level
            frequency: Frequency of occurrence
            duration: Duration of symptom
            triggers: List of triggers
            impact: Impact on daily life
            context: Context where symptom was mentioned
            confidence: Confidence in extraction
            
        Returns:
            Symptom object
        """
        if session_id not in self._symptoms:
            self._symptoms[session_id] = {}
        
        symptom_key = symptom_name.lower().strip()
        
        if symptom_key in self._symptoms[session_id]:
            # Update existing symptom
            symptom = self._symptoms[session_id][symptom_key]
            update_data = {}
            if category:
                update_data["category"] = category
            if severity:
                update_data["severity"] = severity
            if frequency:
                update_data["frequency"] = frequency
            if duration:
                update_data["duration"] = duration
            if triggers:
                symptom.triggers.extend(triggers)
                symptom.triggers = list(set(symptom.triggers))  # Remove duplicates
            if impact:
                update_data["impact"] = impact
            if context:
                symptom.context.append(context)
                symptom.context = symptom.context[-10:]  # Keep last 10 contexts
            if confidence > 0:
                # Update confidence (average of old and new)
                symptom.confidence = (symptom.confidence + confidence) / 2
            
            symptom.update(**update_data)
            logger.debug(f"Updated symptom '{symptom_name}' in session {session_id}")
            return symptom
        else:
            # Create new symptom
            symptom = Symptom(
                name=symptom_name,
                category=category,
                severity=severity,
                frequency=frequency,
                duration=duration,
                triggers=triggers or [],
                impact=impact,
                context=[context] if context else [],
                confidence=confidence
            )
            self._symptoms[session_id][symptom_key] = symptom
            logger.debug(f"Added new symptom '{symptom_name}' to session {session_id}")
            return symptom
    
    def get_symptoms(self, session_id: str) -> Dict[str, Symptom]:
        """
        Get all symptoms for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary of symptoms (symptom_name -> Symptom)
        """
        return self._symptoms.get(session_id, {})
    
    def get_symptom(self, session_id: str, symptom_name: str) -> Optional[Symptom]:
        """
        Get a specific symptom.
        
        Args:
            session_id: Session identifier
            symptom_name: Name of the symptom
            
        Returns:
            Symptom object or None if not found
        """
        symptoms = self.get_symptoms(session_id)
        return symptoms.get(symptom_name.lower().strip())
    
    def get_symptoms_by_category(self, session_id: str, category: str) -> List[Symptom]:
        """
        Get symptoms by category.
        
        Args:
            session_id: Session identifier
            category: Symptom category
            
        Returns:
            List of Symptom objects
        """
        symptoms = self.get_symptoms(session_id)
        return [s for s in symptoms.values() if s.category.lower() == category.lower()]
    
    def get_symptoms_summary(self, session_id: str) -> Dict[str, Any]:
        """
        Get summary of all symptoms for a session.
        
        Args:
            session_id: Session identifier
            
        Returns:
            Dictionary with symptom summary
        """
        symptoms = self.get_symptoms(session_id)
        
        summary = {
            "total_symptoms": len(symptoms),
            "symptoms_by_category": {},
            "symptoms_by_severity": {},
            "symptoms_list": [s.to_dict() for s in symptoms.values()],
            "most_mentioned": [],
            "recent_symptoms": []
        }
        
        # Group by category
        for symptom in symptoms.values():
            category = symptom.category or "uncategorized"
            if category not in summary["symptoms_by_category"]:
                summary["symptoms_by_category"][category] = 0
            summary["symptoms_by_category"][category] += 1
        
        # Group by severity
        for symptom in symptoms.values():
            severity = symptom.severity or "unknown"
            if severity not in summary["symptoms_by_severity"]:
                summary["symptoms_by_severity"][severity] = 0
            summary["symptoms_by_severity"][severity] += 1
        
        # Most mentioned symptoms
        sorted_symptoms = sorted(symptoms.values(), key=lambda s: s.mentions_count, reverse=True)
        summary["most_mentioned"] = [s.to_dict() for s in sorted_symptoms[:10]]
        
        # Recent symptoms
        sorted_by_time = sorted(symptoms.values(), key=lambda s: s.last_updated, reverse=True)
        summary["recent_symptoms"] = [s.to_dict() for s in sorted_by_time[:10]]
        
        return summary
    
    def clear_session(self, session_id: str):
        """
        Clear all symptoms for a session.
        
        Args:
            session_id: Session identifier
        """
        if session_id in self._symptoms:
            del self._symptoms[session_id]
            logger.debug(f"Cleared symptoms for session {session_id}")
    
    def export_symptoms(self, session_id: str) -> List[Dict[str, Any]]:
        """
        Export symptoms for a session (for use by DA and TPA).
        
        Args:
            session_id: Session identifier
            
        Returns:
            List of symptom dictionaries
        """
        symptoms = self.get_symptoms(session_id)
        return [s.to_dict() for s in symptoms.values()]


# Global symptom database instance
_symptom_database: Optional[SymptomDatabase] = None


def get_symptom_database() -> SymptomDatabase:
    """Get global symptom database instance (singleton)"""
    global _symptom_database
    if _symptom_database is None:
        _symptom_database = SymptomDatabase()
    return _symptom_database


