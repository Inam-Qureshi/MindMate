"""
Progress Router - Main Dashboard and Analytics Endpoints
========================================================
Provides dashboard statistics, exercise progress, streaks, and analytics.

Author: MindMate Team
Version: 1.0.0
"""

from fastapi import APIRouter, Depends, HTTPException, status, Query, Body
from sqlalchemy.orm import Session
from sqlalchemy import func, desc, and_
from typing import List, Optional, Dict, Any
from datetime import date, datetime, timedelta, timezone
from uuid import UUID

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.patient import (
    Patient, ExerciseProgress, ExerciseSession, UserStreak, PracticeCalendar,
    UserGoal, GoalStatus, UserAchievement, TimeOfDay, LocationType,
    MoodAssessment, MoodTrend, JournalEntry
)
from app.schemas.progress import (
    ExerciseProgressResponse, ExerciseProgressUpdate,
    StreakResponse, PracticeCalendarResponse,
    DashboardStats, CalendarDayData, ExerciseAnalytics,
    MoodTrendDataPoint, SessionStartRequest, SessionUpdateRequest,
    SessionCompleteRequest, SessionQuickCompleteRequest, SessionResponse, PaginatedSessionsResponse,
    GoalCreateRequest, GoalUpdateRequest, GoalResponse,
    PaginatedGoalsResponse, AchievementResponse, AchievementDefinition
)
from app.services.progress_service import ProgressService
from app.utils.achievements_config import ACHIEVEMENTS, get_all_achievement_ids

router = APIRouter(prefix="/progress-tracker", tags=["Progress Tracker"])



def _determine_time_of_day(reference: Optional[datetime] = None) -> TimeOfDay:
    """Infer the time of day bucket based on a reference datetime (defaults to now)."""
    reference = reference or datetime.now()
    hour = reference.hour
    if 5 <= hour < 12:
        return TimeOfDay.MORNING
    if 12 <= hour < 17:
        return TimeOfDay.AFTERNOON
    if 17 <= hour < 21:
        return TimeOfDay.EVENING
    return TimeOfDay.NIGHT


def _normalize_time_of_day(value: Optional[object]) -> TimeOfDay:
    """Convert incoming request value to TimeOfDay enum, falling back to inferred value."""
    if value is None:
        return _determine_time_of_day()
    if isinstance(value, TimeOfDay):
        return value
    if hasattr(value, "value"):
        return TimeOfDay(value.value)
    return TimeOfDay(str(value))


def _normalize_location_type(value: Optional[object]) -> Optional[LocationType]:
    """Convert incoming request value to LocationType enum."""
    if value is None:
        return None
    if isinstance(value, LocationType):
        return value
    if hasattr(value, "value"):
        return LocationType(value.value)
    return LocationType(str(value))



# ============================================================================
# DASHBOARD ENDPOINTS
# ============================================================================

@router.get("/dashboard", response_model=DashboardStats)
async def get_dashboard(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get comprehensive dashboard statistics
    
    Returns overview stats including streaks, sessions, achievements, and goals
    """
    try:
        user = current_user_data["user"]
        stats = ProgressService.get_dashboard_stats(db, user.id)
        return DashboardStats(**stats)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching dashboard stats: {str(e)}"
        )


# ============================================================================
# SESSION MANAGEMENT ENDPOINTS (from sessions.py)
# ============================================================================

@router.post("/sessions/start", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def start_session(
    request: SessionStartRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Start a new exercise session
    
    Creates a new session record and returns the session ID
    """
    try:
        user = current_user_data["user"]
        time_of_day = _normalize_time_of_day(request.time_of_day)
        location_type = _normalize_location_type(request.location_type)
        now = datetime.now(timezone.utc)
        
        session = ExerciseSession(
            patient_id=user.id,
            exercise_name=request.exercise_name,
            exercise_category=request.exercise_category,
            time_of_day=time_of_day,
            mood_before=request.mood_before,
            start_time=now,
            location_type=location_type
        )
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        return SessionResponse(
            id=session.id,
            patient_id=session.patient_id,
            exercise_name=session.exercise_name,
            exercise_category=session.exercise_category,
            start_time=session.start_time,
            mood_before=session.mood_before,
            time_of_day=str(session.time_of_day) if session.time_of_day else None,
            completion_percentage=0.0,
            session_completed=False,
            created_at=session.created_at
        )
        
    except Exception as e:
        db.rollback()
        import traceback
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Failed to start session: {str(e)}\n{traceback.format_exc()}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start session: {str(e)}"
        )


@router.put("/sessions/{session_id}", response_model=SessionResponse)
async def update_session(
    session_id: UUID,
    request: SessionUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update an active session
    
    Updates session details like notes, duration, or status
    """
    try:
        user = current_user_data["user"]
        
        # Find session
        session = db.query(ExerciseSession).filter(
            ExerciseSession.id == session_id,
            ExerciseSession.patient_id == user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Update session
        if request.notes is not None:
            session.notes = request.notes
        if request.duration_minutes is not None:
            minutes = max(request.duration_minutes, 0)
            session.duration_seconds = int(round(minutes * 60))
        
        session.updated_at = datetime.now()
        
        db.commit()
        db.refresh(session)
        
        return SessionResponse.from_orm(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update session: {str(e)}"
        )


@router.post("/sessions/{session_id}/complete", response_model=SessionResponse)
async def complete_session(
    session_id: UUID,
    request: SessionCompleteRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Complete an exercise session
    
    Marks session as completed and updates final details
    """
    try:
        user = current_user_data["user"]
        
        # Find session
        session = db.query(ExerciseSession).filter(
            ExerciseSession.id == session_id,
            ExerciseSession.patient_id == user.id
        ).first()
        
        if not session:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        completion_timestamp = datetime.now(timezone.utc)
        
        session.end_time = completion_timestamp
        session.session_completed = True
        session.completion_percentage = (
            request.completion_percentage if request.completion_percentage is not None else 100
        )
        session.notes = request.notes
        session.mood_after = request.mood_after
        
        if request.duration_minutes is not None:
            minutes = max(request.duration_minutes, 0)
            session.duration_seconds = int(round(minutes * 60))
        elif session.start_time:
            # Ensure both datetimes are timezone-aware for subtraction
            start_time = session.start_time
            if start_time.tzinfo is None:
                # If start_time is naive, assume it's UTC
                start_time = start_time.replace(tzinfo=timezone.utc)
            elif start_time.tzinfo != timezone.utc:
                # Convert to UTC if different timezone
                start_time = start_time.astimezone(timezone.utc)
            
            duration_seconds = int((completion_timestamp - start_time).total_seconds())
            if duration_seconds > 0:
                session.duration_seconds = duration_seconds
        
        if session.mood_before is not None and session.mood_after is not None:
            session.mood_improvement = session.mood_after - session.mood_before
        
        db.commit()
        db.refresh(session)
        
        ProgressService.process_session_completion(db, user.id, session)
        
        return SessionResponse.from_orm(session)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to complete session: {str(e)}"
        )


@router.post("/sessions/quick-complete", response_model=SessionResponse, status_code=status.HTTP_201_CREATED)
async def quick_complete_session(
    request: SessionQuickCompleteRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Instantly record an exercise as completed without managing session lifecycle."""
    try:
        user = current_user_data["user"]
        now = datetime.now(timezone.utc)
        time_of_day = _normalize_time_of_day(request.time_of_day)
        location_type = _normalize_location_type(request.location_type)
        
        session = ExerciseSession(
            patient_id=user.id,
            exercise_name=request.exercise_name,
            exercise_category=request.exercise_category,
            start_time=now,
            end_time=now,
            session_completed=True,
            completion_percentage=request.completion_percentage if request.completion_percentage is not None else 100,
            mood_before=request.mood_before,
            mood_after=request.mood_after,
            notes=request.notes,
            time_of_day=time_of_day,
            location_type=location_type
        )
        
        if request.duration_minutes is not None:
            minutes = max(request.duration_minutes, 0)
            session.duration_seconds = int(round(minutes * 60))
        elif request.mood_before is not None or request.mood_after is not None:
            session.duration_seconds = 300
        
        if session.mood_before is not None and session.mood_after is not None:
            session.mood_improvement = session.mood_after - session.mood_before
        
        db.add(session)
        db.commit()
        db.refresh(session)
        
        ProgressService.process_session_completion(db, user.id, session)
        
        return SessionResponse.from_orm(session)
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to quick-complete session: {str(e)}"
        )


@router.get("/sessions", response_model=PaginatedSessionsResponse)
async def get_sessions(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get user's exercise sessions with pagination and filtering
    """
    try:
        user = current_user_data["user"]
        
        # Build query
        query = db.query(ExerciseSession).filter(ExerciseSession.patient_id == user.id)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        sessions = query.order_by(desc(ExerciseSession.start_time)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()
        
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedSessionsResponse(
            sessions=[SessionResponse.from_orm(s) for s in sessions],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve sessions: {str(e)}"
        )


# ============================================================================
# GOAL MANAGEMENT ENDPOINTS (from goals.py)
# ============================================================================

@router.post("/goals", response_model=GoalResponse, status_code=status.HTTP_201_CREATED)
async def create_goal(
    request: GoalCreateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Create a new goal
    
    Creates a goal and immediately calculates its current progress
    """
    try:
        user = current_user_data["user"]
        
        # Check if user already has 3 active goals
        active_goals_count = db.query(func.count(UserGoal.id)).filter(
            UserGoal.patient_id == user.id,
            UserGoal.status == GoalStatus.ACTIVE
        ).scalar()
        
        if active_goals_count >= 3:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Maximum of 3 active goals allowed"
            )
        
        # Create goal
        from datetime import date as date_type
        goal = UserGoal(
            patient_id=user.id,
            goal_type=request.goal_type,
            title=request.title,
            description=request.description,
            target_value=request.target_value,
            current_value=0,
            target_exercise_name=request.target_exercise_name,
            reminder_frequency=request.reminder_frequency or "weekly",
            start_date=date_type.today(),
            deadline=request.deadline,
            status=GoalStatus.ACTIVE
        )
        
        db.add(goal)
        db.commit()
        db.refresh(goal)
        
        # Calculate days remaining
        days_remaining = None
        if goal.deadline:
            delta = goal.deadline - date_type.today()
            days_remaining = max(0, delta.days) if delta.days > 0 else None
        
        return GoalResponse(
            id=goal.id,
            patient_id=goal.patient_id,
            goal_type=goal.goal_type.value if hasattr(goal.goal_type, 'value') else str(goal.goal_type),
            title=goal.title,
            description=goal.description,
            target_value=goal.target_value,
            current_value=goal.current_value,
            target_exercise_name=goal.target_exercise_name,
            reminder_frequency=goal.reminder_frequency,
            progress_percentage=goal.progress_percentage,
            start_date=goal.start_date,
            deadline=goal.deadline,
            days_remaining=days_remaining,
            status=goal.status.value if hasattr(goal.status, 'value') else str(goal.status),
            completed_at=goal.completed_at,
            reward_badge_id=goal.reward_badge_id,
            created_at=goal.created_at,
            updated_at=goal.updated_at
        )
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to create goal: {str(e)}"
        )


@router.get("/goals", response_model=PaginatedGoalsResponse)
async def get_goals(
    page: int = Query(1, ge=1, description="Page number"),
    page_size: int = Query(20, ge=1, le=100, description="Page size"),
    status: Optional[str] = Query(None, description="Filter by status"),
    goal_type: Optional[str] = Query(None, description="Filter by goal type"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get user's goals with pagination and filtering
    """
    try:
        user = current_user_data["user"]
        
        # Build query
        query = db.query(UserGoal).filter(UserGoal.patient_id == user.id)
        
        if status:
            query = query.filter(UserGoal.status == status)
        if goal_type:
            query = query.filter(UserGoal.goal_type == goal_type)
        
        # Get total count
        total = query.count()
        
        # Get paginated results
        goals = query.order_by(desc(UserGoal.created_at)).offset(
            (page - 1) * page_size
        ).limit(page_size).all()
        
        total_pages = (total + page_size - 1) // page_size
        
        return PaginatedGoalsResponse(
            goals=[GoalResponse.from_orm(g) for g in goals],
            total=total,
            page=page,
            page_size=page_size,
            total_pages=total_pages
        )
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve goals: {str(e)}"
        )


@router.put("/goals/{goal_id}", response_model=GoalResponse)
async def update_goal(
    goal_id: UUID,
    request: GoalUpdateRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update a goal
    
    Updates goal details and recalculates progress
    """
    try:
        user = current_user_data["user"]
        
        # Find goal
        goal = db.query(UserGoal).filter(
            UserGoal.id == goal_id,
            UserGoal.patient_id == user.id
        ).first()
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )
        
        # Update goal
        if request.title is not None:
            goal.title = request.title
        if request.description is not None:
            goal.description = request.description
        if request.target_value is not None:
            goal.target_value = request.target_value
        if request.target_date is not None:
            goal.target_date = request.target_date
        if request.status is not None:
            goal.status = request.status
        
        goal.updated_at = datetime.now()
        
        db.commit()
        db.refresh(goal)
        
        return GoalResponse.from_orm(goal)
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update goal: {str(e)}"
        )


@router.delete("/goals/{goal_id}")
async def delete_goal(
    goal_id: UUID,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete a goal
    
    Soft deletes a goal by marking it as deleted
    """
    try:
        user = current_user_data["user"]
        
        # Find goal
        goal = db.query(UserGoal).filter(
            UserGoal.id == goal_id,
            UserGoal.patient_id == user.id
        ).first()
        
        if not goal:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Goal not found"
            )
        
        # Soft delete
        goal.is_deleted = True
        goal.deleted_at = datetime.now()
        
        db.commit()
        
        return {"message": "Goal deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete goal: {str(e)}"
        )


# ============================================================================
# ACHIEVEMENT SYSTEM ENDPOINTS (from achievements.py)
# ============================================================================

@router.get("/achievements", response_model=List[AchievementDefinition])
async def get_achievements(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    unlocked_only: bool = Query(False, description="Show only unlocked achievements"),
    category: Optional[str] = Query(None, description="Filter by category")
):
    """
    Get all achievements with unlock status
    
    Shows both locked and unlocked achievements with progress
    """
    try:
        user = current_user_data["user"]
        # Get unlocked achievement IDs
        unlocked_achievements = db.query(UserAchievement).filter(
            UserAchievement.patient_id == user.id,
            UserAchievement.is_deleted == False
        ).all()
        
        unlocked_ids = {ua.achievement_id for ua in unlocked_achievements}
        
        # Filter achievements
        all_achievements = ACHIEVEMENTS
        if category:
            all_achievements = [a for a in all_achievements if a.get("category") == category]
        
        if unlocked_only:
            all_achievements = [a for a in all_achievements if a["achievement_id"] in unlocked_ids]
        
        # Add unlock status and progress
        result = []
        for achievement in all_achievements:
            achievement_data = achievement.copy()
            achievement_data["unlocked"] = achievement["achievement_id"] in unlocked_ids
            achievement_data["unlocked_at"] = None
            
            if achievement["achievement_id"] in unlocked_ids:
                user_achievement = next(
                    (ua for ua in unlocked_achievements if ua.achievement_id == achievement["achievement_id"]),
                    None
                )
                if user_achievement:
                    achievement_data["unlocked_at"] = user_achievement.unlocked_at.isoformat()
            
            result.append(achievement_data)
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve achievements: {str(e)}"
        )


@router.get("/achievements/{achievement_id}", response_model=AchievementResponse)
async def get_achievement(
    achievement_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get specific achievement details
    
    Returns achievement info with unlock status and progress
    """
    try:
        user = current_user_data["user"]
        
        # Find achievement definition
        achievement_def = next(
            (a for a in ACHIEVEMENTS if a["achievement_id"] == achievement_id),
            None
        )
        
        if not achievement_def:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Achievement not found"
            )
        
        # Check if user has unlocked this achievement
        user_achievement = db.query(UserAchievement).filter(
            UserAchievement.patient_id == user.id,
            UserAchievement.achievement_id == achievement_id,
            UserAchievement.is_deleted == False
        ).first()
        
        unlocked = user_achievement is not None
        unlocked_at = user_achievement.unlocked_at if user_achievement else None
        
        return AchievementResponse(
            id=achievement_def["achievement_id"],
            title=achievement_def["name"],
            description=achievement_def["description"],
            category=achievement_def.get("category", "general"),
            icon=achievement_def.get("icon", "🏆"),
            points=achievement_def.get("points", 0),
            unlocked=unlocked,
            unlocked_at=unlocked_at.isoformat() if unlocked_at else None,
            progress=100 if unlocked else 0
        )
        
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve achievement: {str(e)}"
        )


@router.post("/achievements/{achievement_id}/acknowledge")
async def acknowledge_achievement(
    achievement_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Acknowledge an unlocked achievement
    
    Marks achievement as acknowledged by the user
    """
    try:
        user = current_user_data["user"]
        
        # Find user achievement
        user_achievement = db.query(UserAchievement).filter(
            UserAchievement.patient_id == user.id,
            UserAchievement.achievement_id == achievement_id,
            UserAchievement.is_deleted == False
        ).first()
        
        if not user_achievement:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Achievement not found or not unlocked"
            )
        
        # Acknowledge achievement
        user_achievement.acknowledged = True
        user_achievement.acknowledged_at = datetime.now()
        
        db.commit()
        
        return {"message": "Achievement acknowledged successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to acknowledge achievement: {str(e)}"
        )


# ============================================================================
# UNIFIED ACTIVITY ENDPOINTS (from unified.py)
# ============================================================================

@router.get("/timeline")
async def get_unified_timeline(
    days: int = Query(30, ge=1, le=365, description="Number of days to include"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get unified activity timeline across all progress domains
    
    Returns chronological activity from sessions, mood assessments, and journal entries
    """
    try:
        user = current_user_data["user"]
        end_date = datetime.now()
        start_date = end_date - timedelta(days=days)
        
        # Get exercise sessions
        sessions = db.query(ExerciseSession).filter(
            ExerciseSession.patient_id == user.id,
            ExerciseSession.start_time >= start_date
        ).order_by(desc(ExerciseSession.start_time)).all()
        
        # Get mood assessments
        mood_assessments = db.query(MoodAssessment).filter(
            MoodAssessment.patient_id == user.id,
            MoodAssessment.assessment_date >= start_date
        ).order_by(desc(MoodAssessment.assessment_date)).all()
        
        # Get journal entries
        journal_entries = db.query(JournalEntry).filter(
            JournalEntry.patient_id == user.id,
            JournalEntry.entry_date >= start_date
        ).order_by(desc(JournalEntry.entry_date)).all()
        
        # Combine and sort activities
        activities = []
        
        for session in sessions:
            duration_minutes = session.computed_duration_minutes
            activities.append({
                "type": "exercise_session",
                "id": str(session.id),
                "timestamp": session.start_time.isoformat(),
                "title": f"{session.exercise_name} Session",
                "description": f"Completed {duration_minutes} minutes",
                "data": {
                    "exercise_name": session.exercise_name,
                    "exercise_category": session.exercise_category,
                    "duration_minutes": duration_minutes,
                    "mood_before": session.mood_before,
                    "mood_after": session.mood_after
                }
            })
        
        for assessment in mood_assessments:
            activities.append({
                "type": "mood_assessment",
                "id": str(assessment.id),
                "timestamp": assessment.assessment_date.isoformat(),
                "title": "Mood Assessment",
                "description": f"Mood Score: {assessment.overall_mood_score}/10",
                "data": {
                    "overall_mood_score": assessment.overall_mood_score,
                    "stress_level": assessment.stress_level,
                    "energy_level": assessment.energy_level,
                    "dominant_emotions": assessment.dominant_emotions
                }
            })
        
        for entry in journal_entries:
            activities.append({
                "type": "journal_entry",
                "id": str(entry.id),
                "timestamp": entry.entry_date.isoformat(),
                "title": "Journal Entry",
                "description": entry.content[:50] + "..." if len(entry.content) > 50 else entry.content,
                "data": {
                    "title": "Journal Entry",
                    "mood": entry.mood,
                    "content_preview": entry.content[:100] + "..." if len(entry.content) > 100 else entry.content
                }
            })
        
        # Sort by timestamp (newest first)
        activities.sort(key=lambda x: x["timestamp"], reverse=True)
        
        return {
            "activities": activities,
            "total_activities": len(activities),
            "date_range": {
                "start": start_date.isoformat(),
                "end": end_date.isoformat(),
                "days": days
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve timeline: {str(e)}"
        )


@router.get("/stats")
async def get_unified_stats(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get unified statistics across all progress domains
    
    Returns comprehensive stats including sessions, mood, goals, and achievements
    """
    try:
        user = current_user_data["user"]
        
        # Exercise session stats
        total_sessions = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == user.id
        ).scalar() or 0
        
        completed_sessions = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == user.id,
            ExerciseSession.session_completed == True
        ).scalar() or 0
        
        # Mood assessment stats
        total_mood_assessments = db.query(func.count(MoodAssessment.id)).filter(
            MoodAssessment.patient_id == user.id
        ).scalar() or 0
        
        avg_mood_score = db.query(func.avg(MoodAssessment.overall_mood_score)).filter(
            MoodAssessment.patient_id == user.id
        ).scalar() or 0.0
        
        # Goal stats
        total_goals = db.query(func.count(UserGoal.id)).filter(
            UserGoal.patient_id == user.id,
            UserGoal.is_deleted == False
        ).scalar() or 0
        
        active_goals = db.query(func.count(UserGoal.id)).filter(
            UserGoal.patient_id == user.id,
            UserGoal.status == GoalStatus.ACTIVE,
            UserGoal.is_deleted == False
        ).scalar() or 0
        
        # Achievement stats
        total_achievements = db.query(func.count(UserAchievement.id)).filter(
            UserAchievement.patient_id == user.id,
            UserAchievement.is_deleted == False
        ).scalar() or 0
        
        return {
            "exercise_sessions": {
                "total": total_sessions,
                "completed": completed_sessions,
                "completion_rate": (completed_sessions / total_sessions * 100) if total_sessions > 0 else 0
            },
            "mood_assessments": {
                "total": total_mood_assessments,
                "average_score": round(float(avg_mood_score), 2)
            },
            "goals": {
                "total": total_goals,
                "active": active_goals,
                "completed": total_goals - active_goals
            },
            "achievements": {
                "unlocked": total_achievements,
                "total_available": len(ACHIEVEMENTS)
            }
        }
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to retrieve stats: {str(e)}"
        )


# ============================================================================
# RESET FUNCTIONALITY ENDPOINTS (from reset.py)
# ============================================================================

@router.post("/reset")
async def reset_progress(
    request: Optional[Dict[str, Any]] = Body(None),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Reset user's progress data
    
    WARNING: This will delete all progress data including sessions, goals, and achievements
    """
    try:
        # Accept confirmation from request body or default to True if body is empty
        confirm = True
        if request and isinstance(request, dict):
            confirm = request.get("confirm", True)
        
        if not confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Reset operation requires confirmation"
            )
        
        user = current_user_data["user"]
        
        # Delete exercise sessions
        db.query(ExerciseSession).filter(
            ExerciseSession.patient_id == user.id
        ).delete()
        
        # Delete goals
        db.query(UserGoal).filter(
            UserGoal.patient_id == user.id
        ).delete()
        
        # Delete achievements
        db.query(UserAchievement).filter(
            UserAchievement.patient_id == user.id
        ).delete()
        
        # Delete progress records
        db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id
        ).delete()
        
        # Delete streaks
        db.query(UserStreak).filter(
            UserStreak.patient_id == user.id
        ).delete()
        
        db.commit()
        
        return {"message": "Progress data reset successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to reset progress: {str(e)}"
        )


@router.delete("/data")
async def delete_all_data(
    confirm: bool = Query(False, description="Confirm deletion"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Delete all user data
    
    WARNING: This will permanently delete ALL user data
    """
    try:
        if not confirm:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Data deletion requires confirmation"
            )
        
        user = current_user_data["user"]
        
        # Delete all progress-related data
        db.query(ExerciseSession).filter(ExerciseSession.patient_id == user.id).delete()
        db.query(UserGoal).filter(UserGoal.patient_id == user.id).delete()
        db.query(UserAchievement).filter(UserAchievement.patient_id == user.id).delete()
        db.query(ExerciseProgress).filter(ExerciseProgress.patient_id == user.id).delete()
        db.query(UserStreak).filter(UserStreak.patient_id == user.id).delete()
        
        # Delete mood assessments
        db.query(MoodAssessment).filter(MoodAssessment.patient_id == user.id).delete()
        db.query(MoodTrend).filter(MoodTrend.patient_id == user.id).delete()
        
        # Delete journal entries
        db.query(JournalEntry).filter(JournalEntry.patient_id == user.id).delete()
        
        db.commit()
        
        return {"message": "All user data deleted successfully"}
        
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete data: {str(e)}"
        )


# ============================================================================
# EXERCISE PROGRESS ENDPOINTS
# ============================================================================

@router.get("/exercises", response_model=List[ExerciseProgressResponse])
async def get_all_exercise_progress(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    favorite_only: bool = Query(False, description="Return only favorite exercises")
):
    """
    Get all exercise progress for current user
    
    Optionally filter to show only favorites
    """
    try:
        user = current_user_data["user"]
        query = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id,
            ExerciseProgress.is_deleted == False
        )
        
        if favorite_only:
            query = query.filter(ExerciseProgress.is_favorite == True)
        
        progress_list = query.order_by(desc(ExerciseProgress.last_practiced_at)).all()
        
        # Add computed properties
        for progress in progress_list:
            progress.total_time_hours = progress.total_time_hours
            progress.average_session_duration_minutes = progress.average_session_duration_minutes
        
        return progress_list
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching exercise progress: {str(e)}"
        )


@router.get("/exercises/{exercise_name}", response_model=ExerciseProgressResponse)
async def get_exercise_progress(
    exercise_name: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get specific exercise progress
    
    Returns detailed stats for a single exercise
    """
    try:
        user = current_user_data["user"]
        progress = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id,
            ExerciseProgress.exercise_name == exercise_name,
            ExerciseProgress.is_deleted == False
        ).first()
        
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No progress found for exercise: {exercise_name}"
            )
        
        # Add computed properties
        progress.total_time_hours = progress.total_time_hours
        progress.average_session_duration_minutes = progress.average_session_duration_minutes
        
        return progress
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching exercise progress: {str(e)}"
        )


@router.put("/exercises/{exercise_name}", response_model=ExerciseProgressResponse)
async def update_exercise_progress(
    exercise_name: str,
    update_data: ExerciseProgressUpdate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Update exercise progress (e.g., mark as favorite, update rating)
    """
    try:
        user = current_user_data["user"]
        progress = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id,
            ExerciseProgress.exercise_name == exercise_name,
            ExerciseProgress.is_deleted == False
        ).first()
        
        if not progress:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"No progress found for exercise: {exercise_name}"
            )
        
        # Update fields
        if update_data.is_favorite is not None:
            progress.is_favorite = update_data.is_favorite
        if update_data.effectiveness_rating is not None:
            progress.effectiveness_rating = update_data.effectiveness_rating
        
        db.commit()
        db.refresh(progress)
        
        # Add computed properties
        progress.total_time_hours = progress.total_time_hours
        progress.average_session_duration_minutes = progress.average_session_duration_minutes
        
        return progress
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating exercise progress: {str(e)}"
        )


@router.post("/exercises/{exercise_name}/favorite", response_model=ExerciseProgressResponse)
async def toggle_favorite_exercise(
    exercise_name: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Toggle favorite status for an exercise
    """
    try:
        user = current_user_data["user"]
        progress = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id,
            ExerciseProgress.exercise_name == exercise_name,
            ExerciseProgress.is_deleted == False
        ).first()
        
        if not progress:
            # Create if doesn't exist
            progress = ProgressService.get_or_create_exercise_progress(
                db, user.id, exercise_name
            )
        
        progress.is_favorite = not progress.is_favorite
        db.commit()
        db.refresh(progress)
        
        # Add computed properties
        progress.total_time_hours = progress.total_time_hours
        progress.average_session_duration_minutes = progress.average_session_duration_minutes
        
        return progress
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error toggling favorite: {str(e)}"
        )


# ============================================================================
# STREAK ENDPOINTS
# ============================================================================

@router.get("/streak", response_model=StreakResponse)
async def get_streak(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get current streak information
    """
    try:
        user = current_user_data["user"]
        streak = ProgressService.get_or_create_streak(db, user.id)
        streak.is_active = streak.is_active
        return streak
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching streak: {str(e)}"
        )


# ============================================================================
# CALENDAR ENDPOINTS
# ============================================================================

@router.get("/calendar", response_model=List[CalendarDayData])
async def get_practice_calendar(
    days: Optional[int] = Query(30, description="Number of days to fetch (defaults to 30)"),
    year: Optional[int] = Query(None, description="Year (defaults to current year)"),
    month: Optional[int] = Query(None, ge=1, le=12, description="Month (1-12, optional)"),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get practice calendar data for heat map
    
    Returns practice days with session counts and intensity levels.
    By default, returns last 30 days of data.
    """
    try:
        user = current_user_data["user"]
        
        # If days parameter is provided, get last N days
        if days:
            end_date = date.today()
            start_date = end_date - timedelta(days=days)
            
            calendar_days = db.query(PracticeCalendar).filter(
                PracticeCalendar.patient_id == user.id,
                PracticeCalendar.practice_date >= start_date,
                PracticeCalendar.practice_date <= end_date,
                PracticeCalendar.is_deleted == False
            ).all()
        else:
            # Legacy: Filter by year/month
            if year is None:
                year = date.today().year
            
            query = db.query(PracticeCalendar).filter(
                PracticeCalendar.patient_id == user.id,
                func.extract('year', PracticeCalendar.practice_date) == year,
                PracticeCalendar.is_deleted == False
            )
            
            if month is not None:
                query = query.filter(func.extract('month', PracticeCalendar.practice_date) == month)
            
            calendar_days = query.all()
        
        # Convert to simplified format with ISO date strings
        result = [
            CalendarDayData(
                date=day.practice_date.isoformat() if hasattr(day.practice_date, 'isoformat') else str(day.practice_date),
                count=day.session_count,
                intensity=day.intensity_level,
                exercises=day.exercises_practiced or []
            )
            for day in calendar_days
        ]
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching calendar: {str(e)}"
        )


@router.get("/calendar/year/{year}", response_model=List[CalendarDayData])
async def get_year_calendar(
    year: int,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get full year calendar data for heat map
    """
    try:
        user = current_user_data["user"]
        calendar_days = db.query(PracticeCalendar).filter(
            PracticeCalendar.patient_id == user.id,
            func.extract('year', PracticeCalendar.practice_date) == year,
            PracticeCalendar.is_deleted == False
        ).all()
        
        result = [
            CalendarDayData(
                date=day.practice_date,
                count=day.session_count,
                intensity=day.intensity_level,
                exercises=day.exercises_practiced or []
            )
            for day in calendar_days
        ]
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching year calendar: {str(e)}"
        )


# ============================================================================
# ANALYTICS ENDPOINTS
# ============================================================================

@router.get("/analytics/exercises", response_model=List[ExerciseAnalytics])
async def get_exercise_analytics(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    sort_by: str = Query("most_practiced", description="Sort by: most_practiced, most_effective, recent")
):
    """
    Get analytics for all exercises
    
    Returns detailed stats with sorting options
    """
    try:
        user = current_user_data["user"]
        query = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == user.id,
            ExerciseProgress.is_deleted == False
        )
        
        # Apply sorting
        if sort_by == "most_practiced":
            query = query.order_by(desc(ExerciseProgress.completion_count))
        elif sort_by == "most_effective":
            query = query.order_by(desc(ExerciseProgress.average_mood_improvement))
        elif sort_by == "recent":
            query = query.order_by(desc(ExerciseProgress.last_practiced_at))
        
        progress_list = query.all()
        
        result = [
            ExerciseAnalytics(
                exercise_name=p.exercise_name,
                completion_count=p.completion_count,
                total_time_hours=p.total_time_hours,
                average_session_duration_minutes=p.average_session_duration_minutes,
                average_mood_improvement=p.average_mood_improvement,
                mastery_level=p.mastery_level,
                last_practiced=p.last_practiced_at,
                is_favorite=p.is_favorite
            )
            for p in progress_list
        ]
        
        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching exercise analytics: {str(e)}"
        )


@router.get("/analytics/mood-trends", response_model=List[MoodTrendDataPoint])
async def get_mood_trends(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
    date_from: Optional[date] = Query(None, description="Start date"),
    date_to: Optional[date] = Query(None, description="End date"),
    exercise_name: Optional[str] = Query(None, description="Filter by exercise")
):
    """
    Get mood trend data over time
    
    Returns daily average mood ratings
    """
    try:
        user = current_user_data["user"]
        # Default date range to last 30 days
        if date_to is None:
            date_to = date.today()
        if date_from is None:
            date_from = date_to - timedelta(days=30)
        
        # Build query
        query = db.query(
            func.date(ExerciseSession.start_time).label('date'),
            func.avg(ExerciseSession.mood_before).label('mood_before_avg'),
            func.avg(ExerciseSession.mood_after).label('mood_after_avg'),
            func.avg(ExerciseSession.mood_improvement).label('mood_improvement_avg'),
            func.count(ExerciseSession.id).label('session_count')
        ).filter(
            ExerciseSession.patient_id == user.id,
            func.date(ExerciseSession.start_time) >= date_from,
            func.date(ExerciseSession.start_time) <= date_to,
            ExerciseSession.is_deleted == False
        )
        
        # Filter by exercise if provided
        if exercise_name:
            query = query.filter(ExerciseSession.exercise_name == exercise_name)
        
        # Group by date
        query = query.group_by(func.date(ExerciseSession.start_time))
        query = query.order_by(func.date(ExerciseSession.start_time))
        
        results = query.all()
        
        trend_data = [
            MoodTrendDataPoint(
                date=row.date,
                mood_before_avg=round(row.mood_before_avg, 2) if row.mood_before_avg else None,
                mood_after_avg=round(row.mood_after_avg, 2) if row.mood_after_avg else None,
                mood_improvement_avg=round(row.mood_improvement_avg, 2) if row.mood_improvement_avg else None,
                session_count=row.session_count
            )
            for row in results
        ]
        
        return trend_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching mood trends: {str(e)}"
        )


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = ['router']

