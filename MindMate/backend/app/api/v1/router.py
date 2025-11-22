"""
MindMate API v1 Router Configuration
=====================================
Main router configuration with consolidated endpoints for clean API structure.
Uses lazy loading to load routes only when needed.

Author: Mental Health Platform Team
Version: 2.0.0 - Restructured API with Lazy Loading
"""

from fastapi import APIRouter
from typing import Dict
import logging

logger = logging.getLogger(__name__)

# Create main router
router = APIRouter()

# Track loaded routers to prevent duplicate loading
_loaded_routers: Dict[str, bool] = {}

def load_all_routers():
    """Load all API routers - called lazily when needed."""
    global _loaded_routers
    
    # Only load once
    if _loaded_routers.get("all_loaded", False):
        return
    
    logger.info("Lazy loading API routers...")
    
    try:
        # Core authentication and user management
        from .endpoints import auth
        router.include_router(auth.router, tags=["Authentication"])
        
        # User registration and verification
        from .endpoints import verification
        router.include_router(verification.router, tags=["Registration & Verification"])
        
        # Community and discussion features
        from .endpoints import forum
        router.include_router(forum.router, tags=["Forum"])
        
        # Chat and AI assistant features
        from .endpoints import chat
        router.include_router(chat.router, tags=["Chat & Chatbot"])
        
        # Assessment system (assessment.py is the unified router)
        from .endpoints import assessment
        router.include_router(assessment.router, tags=["Assessment"])

        # Specialist management and profiles
        from .endpoints import specialists
        router.include_router(specialists.router, tags=["Specialists"])
        
        # Specialist profile completion and management
        from .endpoints import specialist_profile
        router.include_router(specialist_profile.router, tags=["Specialist Profile"])
        
        # Specialist profile completion (enhanced with progress tracking)
        from .endpoints import specialist_profile_completion
        router.include_router(specialist_profile_completion.router, tags=["Specialist Profile Completion"])
        
        # Specialist registration (unified endpoint)
        from .endpoints import specialist_registration
        router.include_router(specialist_registration.router, tags=["Specialist Registration"])
        
        # Unified appointments system (complete workflow)
        from .endpoints import appointments
        router.include_router(appointments.router, tags=["Appointments Management"])
        
        # Administrative operations
        from .endpoints import admin
        router.include_router(admin.router, tags=["Admin"])
        
        # Specialist slots management
        from .endpoints import specialist_slots
        router.include_router(specialist_slots.router, tags=["Specialist Slots"])
        
        # Weekly schedule management
        from .endpoints import weekly_schedule
        router.include_router(weekly_schedule.router, tags=["Weekly Schedule Management"])
        
        # Specialist favorites
        from .endpoints import specialist_favorites
        router.include_router(specialist_favorites.router, tags=["specialist-favorites"])
        
        # Questionnaires and assessments
        from .endpoints import questionnaires
        router.include_router(questionnaires.router, prefix="/questionnaires", tags=["Questionnaires"])
        
        # Journal and mood tracking
        from .endpoints import journal
        router.include_router(journal.router, tags=["Journal"])
        
        # Mental health exercises
        from .endpoints import exercises
        router.include_router(exercises.router, tags=["Exercises"])
        
        # Progress tracking
        from .endpoints import progress, mood
        router.include_router(progress.router, tags=["Progress Tracker"])
        router.include_router(mood.router, tags=["Mood Assessment"])
        
        # Dashboard (unified dashboard system)
        from .endpoints import dashboard
        router.include_router(dashboard.router, tags=["Dashboard"])
        
        # User profile management
        from .endpoints import users
        router.include_router(users.router, prefix="/users", tags=["Users"])
        
        _loaded_routers["all_loaded"] = True
        logger.info("All API routers loaded successfully")
        
    except Exception as e:
        logger.error(f"Error loading routers: {e}", exc_info=True)
        raise

# ============================================================================
# TEST CORS ENDPOINT
# ============================================================================

@router.get("/test-cors")
@router.options("/test-cors")
async def test_cors():
    """Test CORS endpoint"""
    return {"message": "CORS test successful"}

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
async def system_health_check():
    """System-wide health check endpoint"""
    from datetime import datetime, timezone

    return {
        "status": "healthy",
        "service": "mindmate-api",
        "timestamp": datetime.now(timezone.utc).isoformat(),
        "version": "2.0.0",
        "services": [
            "authentication",
            "verification",
            "forum",
            "chat",
            "assessment",
            "specialists",
            "appointments",
            "admin",
            "questionnaires",
            "journal",
            "specialist-favorites",
            "progress-tracker",
            "dashboard"
        ]
    }

