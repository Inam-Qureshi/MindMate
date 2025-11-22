"""
Dashboard Router - Unified Dashboard API
======================================
Provides a single optimized endpoint for all dashboard data.

Author: MindMate Team
Version: 2.0.0
"""

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.responses import JSONResponse
from sqlalchemy.orm import Session
from typing import List, Optional, Dict, Any
from datetime import datetime, timedelta
from pathlib import Path
import asyncio
import json
import logging

logger = logging.getLogger(__name__)

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.patient import Patient, ExerciseProgress, ExerciseSession, UserStreak, JournalEntry, MoodAssessment
from app.models.appointment import Appointment
from app.services.dashboard_service import DashboardService
from app.schemas.dashboard import (
    DashboardOverview,
    ProgressData,
    AppointmentData,
    ActivityData,
    WellnessData,
    QuickAction,
    Notification,
    DashboardError
)

router = APIRouter(prefix="/dashboard", tags=["Dashboard"])

# Path to exercises.json
EXERCISES_FILE = Path(__file__).parent.parent.parent.parent / "static" / "exercises.json"


# ============================================================================
# UNIFIED DASHBOARD ENDPOINT
# ============================================================================

@router.get("/overview", response_model=DashboardOverview)
async def get_dashboard_overview(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard data in a single optimized call
    
    Returns all dashboard widgets data, user stats, and real-time updates
    in a single response to minimize API calls and improve performance.
    """
    try:
        user = current_user_data["user"]
        
        # Use DashboardService to get all data efficiently
        dashboard_data = await DashboardService.get_dashboard_overview(db, user.id)

        return DashboardOverview(**dashboard_data)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard data: {str(e)}"
        )


@router.get("/progress", response_model=ProgressData)
async def get_progress_data(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get progress tracking data including streaks, goals, and achievements
    """
    try:
        user = current_user_data["user"]
        progress = await DashboardService.get_progress_data(db, user.id)
        return ProgressData(**progress)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching progress data: {str(e)}"
        )


@router.get("/appointments", response_model=List[AppointmentData])
async def get_appointments_data(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get appointments data for dashboard
    """
    try:
        user = current_user_data["user"]
        appointments = await DashboardService.get_appointments_data(db, user.id)
        return [AppointmentData(**apt) for apt in appointments]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching appointments data: {str(e)}"
        )


@router.get("/activity", response_model=List[ActivityData])
async def get_activity_data(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    limit: int = 10
):
    """
    Get recent activity data for dashboard
    """
    try:
        user = current_user_data["user"]
        activities = await DashboardService.get_activity_data(db, user.id, limit)
        return [ActivityData(**activity) for activity in activities]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching activity data: {str(e)}"
        )


@router.get("/wellness", response_model=WellnessData)
async def get_wellness_data(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get wellness metrics and mood data
    """
    try:
        user = current_user_data["user"]
        wellness = await DashboardService.get_wellness_data(db, user.id)
        return WellnessData(**wellness)
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching wellness data: {str(e)}"
        )


@router.get("/quick-actions", response_model=List[QuickAction])
async def get_quick_actions(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get available quick actions for the user
    """
    try:
        user = current_user_data["user"]
        actions = await DashboardService.get_quick_actions(db, user.id)
        return [QuickAction(**action) for action in actions]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching quick actions: {str(e)}"
        )


@router.get("/notifications", response_model=List[Notification])
async def get_notifications(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    unread_only: bool = False
):
    """
    Get user notifications
    """
    try:
        user = current_user_data["user"]
        notifications = await DashboardService.get_notifications(db, user.id, unread_only)
        return [Notification(**notif) for notif in notifications]
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching notifications: {str(e)}"
        )


# ============================================================================
# REAL-TIME UPDATES
# ============================================================================

@router.get("/updates")
async def get_dashboard_updates(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    last_updated: Optional[datetime] = None
):
    """
    Get incremental updates since last_updated timestamp
    """
    try:
        user = current_user_data["user"]
        updates = await DashboardService.get_dashboard_updates(db, user.id, last_updated)
        return updates
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard updates: {str(e)}"
        )


# ============================================================================
# WIDGET CUSTOMIZATION
# ============================================================================

@router.post("/widgets/preferences")
async def update_widget_preferences(
    preferences: Dict[str, Any],
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update user's widget preferences and layout
    """
    try:
        user = current_user_data["user"]
        result = await DashboardService.update_widget_preferences(db, user.id, preferences)
        return {"success": True, "preferences": result}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating widget preferences: {str(e)}"
        )


@router.get("/widgets/preferences")
async def get_widget_preferences(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get user's widget preferences and layout
    """
    try:
        user = current_user_data["user"]
        preferences = await DashboardService.get_widget_preferences(db, user.id)
        return preferences
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching widget preferences: {str(e)}"
        )


# ============================================================================
# DASHBOARD EXPORT
# ============================================================================

@router.get("/export/pdf")
async def export_dashboard_pdf(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Export dashboard data as PDF
    """
    try:
        user = current_user_data["user"]
        pdf_data = await DashboardService.export_dashboard_pdf(db, user.id)
        return {"pdf_url": pdf_data}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting dashboard PDF: {str(e)}"
        )


@router.get("/export/excel")
async def export_dashboard_excel(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Export dashboard data as Excel file
    """
    try:
        user = current_user_data["user"]
        excel_data = await DashboardService.export_dashboard_excel(db, user.id)
        return {"excel_url": excel_data}
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error exporting dashboard Excel: {str(e)}"
        )


# ============================================================================
# TEST ENDPOINT (NO AUTH REQUIRED)
# ============================================================================

@router.get("/exercises", response_class=JSONResponse)
async def get_dashboard_exercises(
    current_user_data: dict = Depends(get_current_user_from_token)
):
    """
    Get all mental health exercises for dashboard
    
    This endpoint provides exercises data for the dashboard exercises widget.
    It's an alias to /api/exercises but under the dashboard prefix for convenience.
    """
    try:
        if not EXERCISES_FILE.exists():
            logger.error(f"Exercises file not found at: {EXERCISES_FILE}")
            raise HTTPException(
                status_code=404,
                detail="Exercises file not found"
            )
        
        with open(EXERCISES_FILE, 'r', encoding='utf-8') as f:
            exercises_data = json.load(f)
        
        logger.info(f"Successfully loaded {len(exercises_data.get('exercises', []))} exercises for dashboard")
        return JSONResponse(content=exercises_data)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in exercises file: {e}")
        raise HTTPException(
            status_code=500,
            detail="Invalid exercises data format"
        )
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading exercises: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load exercises: {str(e)}"
        )


@router.get("/test")
async def test_dashboard():
    """Test endpoint for dashboard without authentication"""
    return {
        "message": "Dashboard API is working",
        "status": "success",
        "timestamp": "2025-10-25T01:43:00Z"
    }

@router.get("/overview-test")
async def get_dashboard_overview_test(db: Session = Depends(get_db)):
    """Test dashboard overview without authentication"""
    try:
        # Create mock data for testing
        mock_data = {
            "progress_data": {
                "weekly_progress": 75,
                "monthly_goals": 3,
                "achievements": ["First Week", "Mood Tracker"]
            },
            "appointments": [
                {
                    "id": 1,
                    "specialist_name": "Dr. Smith",
                    "date": "2025-10-26T10:00:00Z",
                    "status": "scheduled"
                }
            ],
            "activity": [
                {
                    "id": 1,
                    "type": "exercise",
                    "description": "Completed breathing exercise",
                    "timestamp": "2025-10-25T09:00:00Z"
                }
            ],
            "wellness": {
                "mood_trend": "improving",
                "stress_level": 3,
                "sleep_quality": 8
            },
            "quick_actions": [
                {"id": 1, "title": "Start Exercise", "action": "exercise"},
                {"id": 2, "title": "Log Mood", "action": "mood"}
            ],
            "notifications": [
                {
                    "id": 1,
                    "title": "Appointment Reminder",
                    "message": "You have an appointment tomorrow",
                    "timestamp": "2025-10-25T08:00:00Z",
                    "unread": True
                }
            ]
        }
        return mock_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching test dashboard data: {str(e)}"
        )
