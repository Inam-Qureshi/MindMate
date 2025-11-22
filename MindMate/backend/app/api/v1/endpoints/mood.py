"""Daily Mood Tracker endpoints based on PRD requirements."""

from datetime import date
from decimal import Decimal
from typing import Dict, List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.api.v1.endpoints.auth import get_current_user_from_token
from app.db.session import get_db
from app.models.patient import MoodEntry
from app.schemas.mood import (
    MoodEntryCreate,
    MoodEntryResponse,
    MoodEntrySummary,
    MoodHeatmapPoint,
    MoodHistoryResponse,
)
from app.services.mood_session_manager import get_mood_session_manager
from pydantic import BaseModel, Field

router = APIRouter(
    prefix="/progress-tracker/mood",
    tags=["Mood Tracker"],
)

INTERPRETATION_RANGES: List[tuple[float, str]] = [
    (2.0, "Very low mood / possible depression"),
    (4.0, "Below average / mild distress"),
    (6.0, "Neutral / stable"),
    (8.0, "Positive mood / good well-being"),
    (10.0, "Elevated mood / high energy"),
]


def _to_float(value: Optional[Decimal], precision: int = 2) -> Optional[float]:
    if value is None:
        return None
    return round(float(value), precision)


def _interpret_mood(score: float) -> str:
    for upper_bound, label in INTERPRETATION_RANGES:
        if score <= upper_bound:
            return label
    return INTERPRETATION_RANGES[-1][1]


def _serialize_entry(
    entry: MoodEntry, alerts: Optional[Dict[str, Optional[str]]] = None
) -> MoodEntryResponse:
    mood_value = _to_float(entry.mood_score) or 0.0
    return MoodEntryResponse(
        id=entry.id,
        patient_id=entry.patient_id,
        entry_date=entry.entry_date,
        created_at=entry.created_at,
        updated_at=entry.updated_at,
        mood_score=mood_value,
        energy_level=_to_float(entry.energy_level) or 0.0,
        stress_level=_to_float(entry.stress_level) or 0.0,
        sleep_quality=_to_float(entry.sleep_quality) or 0.0,
        motivation_level=_to_float(entry.motivation_level) or 0.0,
        notes=entry.notes,
        interpretation=_interpret_mood(mood_value),
        alerts=alerts or {},
    )


def _calculate_low_mood_streak(
    entries: List[MoodEntry], threshold: float = 3.0
) -> int:
    streak = 0
    for entry in entries:
        mood_value = _to_float(entry.mood_score)
        if mood_value is not None and mood_value < threshold:
            streak += 1
        else:
            break
    return streak


def _build_alerts(db: Session, patient_id: UUID) -> Dict[str, Optional[str]]:
    recent_entries = (
        db.query(MoodEntry)
        .filter(MoodEntry.patient_id == patient_id)
        .order_by(MoodEntry.entry_date.desc())
        .limit(7)
        .all()
    )
    streak = _calculate_low_mood_streak(recent_entries)
    alerts: Dict[str, Optional[str]] = {}
    if streak >= 3:
        alerts["low_mood_streak"] = f"{streak} consecutive days below 3"
    return alerts


def _moving_average(entries: List[MoodEntry], window: int) -> Optional[float]:
    recent_scores = [
        _to_float(entry.mood_score)
        for entry in entries[:window]
        if entry.mood_score is not None
    ]
    if not recent_scores:
        return None
    return round(sum(recent_scores) / len(recent_scores), 2)


def _compute_summary(entries: List[MoodEntry]) -> MoodEntrySummary:
    summary = MoodEntrySummary(entry_count=len(entries))
    if not entries:
        return summary

    scores = [
        _to_float(entry.mood_score)
        for entry in entries
        if entry.mood_score is not None
    ]
    if scores:
        summary.best_mood = max(scores)
        summary.lowest_mood = min(scores)

    summary.average_7_day = _moving_average(entries, 7)
    summary.average_30_day = _moving_average(entries, 30)
    summary.consecutive_low_mood_days = _calculate_low_mood_streak(entries)
    summary.last_entry_date = entries[0].entry_date
    return summary


def _build_heatmap(entries: List[MoodEntry], max_points: int = 180) -> List[MoodHeatmapPoint]:
    subset = list(reversed(entries[:max_points]))
    return [
        MoodHeatmapPoint(
            entry_date=entry.entry_date,
            mood_score=_to_float(entry.mood_score) or 0.0,
        )
        for entry in subset
    ]


@router.post("/entry", response_model=MoodEntryResponse, status_code=status.HTTP_201_CREATED)
def create_mood_entry(
    payload: MoodEntryCreate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    user = current_user_data["user"]
    entry_date = payload.entry_date or date.today()
    if entry_date > date.today():
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Entry date cannot be in the future.",
        )

    entry = (
        db.query(MoodEntry)
        .filter(MoodEntry.patient_id == user.id, MoodEntry.entry_date == entry_date)
        .first()
    )

    if entry:
        entry.mood_score = payload.mood_score
        entry.energy_level = payload.energy_level
        entry.stress_level = payload.stress_level
        entry.sleep_quality = payload.sleep_quality
        entry.motivation_level = payload.motivation_level
        entry.notes = payload.notes
        entry.updated_by = str(user.id)
    else:
        entry = MoodEntry(
            patient_id=user.id,
            entry_date=entry_date,
            mood_score=payload.mood_score,
            energy_level=payload.energy_level,
            stress_level=payload.stress_level,
            sleep_quality=payload.sleep_quality,
            motivation_level=payload.motivation_level,
            notes=payload.notes,
            created_by=str(user.id),
            updated_by=str(user.id),
        )
        db.add(entry)

    db.commit()
    db.refresh(entry)

    alerts = _build_alerts(db, user.id)
    return _serialize_entry(entry, alerts if alerts else None)


@router.get("/history", response_model=MoodHistoryResponse)
def get_mood_history(
    start_date: Optional[date] = Query(None),
    end_date: Optional[date] = Query(None),
    limit: int = Query(30, ge=1, le=365),
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db),
):
    user = current_user_data["user"]

    query = db.query(MoodEntry).filter(MoodEntry.patient_id == user.id)
    if start_date:
        query = query.filter(MoodEntry.entry_date >= start_date)
    if end_date:
        query = query.filter(MoodEntry.entry_date <= end_date)

    query = query.order_by(MoodEntry.entry_date.desc())
    all_entries = query.all()
    limited_entries = all_entries[:limit]

    summary = _compute_summary(all_entries)
    heatmap = _build_heatmap(all_entries)

    streak_alert = {}
    if limited_entries:
        streak = _calculate_low_mood_streak(all_entries)
        if streak >= 3:
            streak_alert = {"low_mood_streak": f"{streak} consecutive days below 3"}

    serialized_entries: List[MoodEntryResponse] = []
    for index, entry in enumerate(limited_entries):
        alerts = streak_alert if index == 0 else {}
        serialized_entries.append(_serialize_entry(entry, alerts))

    return MoodHistoryResponse(entries=serialized_entries, summary=summary, heatmap=heatmap)


# ============================================================================
# MOOD SESSION ENDPOINTS
# ============================================================================

class MoodSessionResponseRequest(BaseModel):
    """Request to submit a mood session response"""
    session_id: str = Field(..., description="Session ID")
    response: str = Field(..., min_length=1, max_length=2000, description="User's response to the question")


@router.post("/session/start")
async def start_mood_session(
    current_user_data: dict = Depends(get_current_user_from_token),
):
    """
    Start a new mood assessment session.
    
    Creates a new session and returns the first question.
    """
    try:
        user = current_user_data["user"]
        user_id = str(user.id)
        
        # Get session manager
        session_manager = get_mood_session_manager()
        
        # Create new session
        session_id = session_manager.create_session(user_id)
        
        # Get first question
        question_data = session_manager.get_next_question(session_id)
        
        if question_data.get("completed"):
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
                detail="Session completed immediately after creation"
            )
        
        # Calculate progress
        progress_percent = (question_data["question_number"] / question_data["total_questions"]) * 100
        
        return {
            "session_id": session_id,
            "question": question_data["question"],
            "question_number": question_data["question_number"],
            "total_questions": question_data["total_questions"],
            "theme": question_data["theme"],
            "progress_percent": round(progress_percent, 1),
            "metadata": {}
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error starting mood session: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to start mood session: {str(e)}"
        )


@router.post("/session/respond")
async def respond_to_mood_session(
    request: MoodSessionResponseRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
):
    """
    Submit a response to the current question in a mood session.
    
    Returns the next question or completion status with mood inference.
    """
    try:
        user = current_user_data["user"]
        user_id = str(user.id)
        session_id = request.session_id
        
        # Get session manager
        session_manager = get_mood_session_manager()
        
        # Submit response
        result = session_manager.submit_response(session_id, request.response)
        
        if result.get("completed"):
            # Session completed, return mood inference
            return {
                "completed": True,
                "session_id": session_id,
                "mood_inference": result.get("mood_inference", {}),
                "metadata": {}
            }
        
        # Calculate progress
        progress_percent = (result["question_number"] / result["total_questions"]) * 100
        
        return {
            "completed": False,
            "session_id": session_id,
            "question": result["question"],
            "question_number": result["question_number"],
            "total_questions": result["total_questions"],
            "theme": result["theme"],
            "progress_percent": round(progress_percent, 1),
            "metadata": {}
        }
        
    except ValueError as e:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail=str(e)
        )
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error responding to mood session: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to process response: {str(e)}"
        )


@router.get("/session/{session_id}/status")
async def get_mood_session_status(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
):
    """
    Get the status of a mood assessment session.
    """
    try:
        user = current_user_data["user"]
        user_id = str(user.id)
        
        # Get session manager
        session_manager = get_mood_session_manager()
        
        # Get session result
        session_result = session_manager.get_session_result(session_id)
        
        if not session_result:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        # Verify session belongs to user
        if session_result["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        return session_result
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error getting mood session status: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get session status: {str(e)}"
        )


@router.delete("/session/{session_id}")
async def delete_mood_session(
    session_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
):
    """
    Delete a mood assessment session.
    """
    try:
        user = current_user_data["user"]
        user_id = str(user.id)
        
        # Get session manager
        session_manager = get_mood_session_manager()
        
        # Verify session belongs to user before deleting
        session_result = session_manager.get_session_result(session_id)
        if session_result and session_result["user_id"] != user_id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Access denied to this session"
            )
        
        # Delete session
        deleted = session_manager.cleanup_session(session_id)
        
        if not deleted:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Session not found"
            )
        
        return {
            "success": True,
            "message": "Session deleted successfully",
            "session_id": session_id
        }
        
    except HTTPException:
        raise
    except Exception as e:
        import logging
        logger = logging.getLogger(__name__)
        logger.error(f"Error deleting mood session: {str(e)}", exc_info=True)
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to delete session: {str(e)}"
        )

