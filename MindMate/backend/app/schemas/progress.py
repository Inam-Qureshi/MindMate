"""
Progress Tracking Pydantic Schemas - API Request/Response Models
================================================================
Pydantic models for validating and serializing progress tracking data.

Author: MindMate Team
Version: 1.0.0
"""

from pydantic import BaseModel, Field, field_validator, ConfigDict
from typing import Optional, List, Dict, Any
from datetime import datetime, date
from uuid import UUID
from enum import Enum


# ============================================================================
# ENUMS (matching SQLAlchemy enums)
# ============================================================================

class ExerciseStatusEnum(str, Enum):
    NOT_STARTED = "not_started"
    IN_PROGRESS = "in_progress"
    COMPLETED = "completed"


class MasteryLevelEnum(str, Enum):
    BEGINNER = "beginner"
    INTERMEDIATE = "intermediate"
    ADVANCED = "advanced"


class TimeOfDayEnum(str, Enum):
    MORNING = "morning"
    AFTERNOON = "afternoon"
    EVENING = "evening"
    NIGHT = "night"


class LocationTypeEnum(str, Enum):
    HOME = "home"
    WORK = "work"
    OUTDOOR = "outdoor"
    OTHER = "other"


class GoalTypeEnum(str, Enum):
    DAILY_PRACTICE = "daily_practice"
    WEEKLY_PRACTICE = "weekly_practice"
    EXERCISE_VARIETY = "exercise_variety"
    STREAK_MILESTONE = "streak_milestone"
    TOTAL_SESSIONS = "total_sessions"
    SPECIFIC_EXERCISE = "specific_exercise"
    TIME_BASED = "time_based"
    MOOD_IMPROVEMENT = "mood_improvement"
    CUSTOM = "custom"


class GoalStatusEnum(str, Enum):
    ACTIVE = "active"
    COMPLETED = "completed"
    FAILED = "failed"
    ARCHIVED = "archived"


class AchievementCategoryEnum(str, Enum):
    STREAK = "streak"
    COMPLETION = "completion"
    VARIETY = "variety"
    MASTERY = "mastery"
    SPECIAL = "special"


class AchievementRarityEnum(str, Enum):
    COMMON = "common"
    RARE = "rare"
    EPIC = "epic"
    LEGENDARY = "legendary"


# ============================================================================
# SESSION SCHEMAS
# ============================================================================

class SessionStartRequest(BaseModel):
    """Request to start a new exercise session"""
    exercise_name: str = Field(..., min_length=1, max_length=255)
    exercise_category: Optional[str] = Field(None, max_length=100)
    mood_before: Optional[int] = Field(None, ge=1, le=10, description="Mood rating from 1 to 10")
    time_of_day: Optional[TimeOfDayEnum] = None
    location_type: Optional[LocationTypeEnum] = None


class SessionUpdateRequest(BaseModel):
    """Request to update an ongoing session"""
    steps_completed: Optional[List[int]] = None
    notes: Optional[str] = None
    tags: Optional[str] = Field(None, max_length=500)
    mood_after: Optional[int] = Field(None, ge=1, le=10)


class SessionCompleteRequest(BaseModel):
    """Request to complete a session"""
    mood_after: int = Field(..., ge=1, le=10, description="Mood rating from 1 to 10")
    notes: Optional[str] = None
    session_completed: bool = True
    completion_percentage: Optional[float] = Field(None, ge=0, le=100)
    duration_minutes: Optional[float] = Field(None, ge=0, description="Session duration in minutes (optional, calculated from start_time if not provided)")


class SessionQuickCompleteRequest(BaseModel):
    """Request to instantly log a completed session"""
    exercise_name: str = Field(..., min_length=1, max_length=255)
    exercise_category: Optional[str] = Field(None, max_length=100)
    mood_before: Optional[int] = Field(None, ge=1, le=10)
    mood_after: Optional[int] = Field(None, ge=1, le=10)
    completion_percentage: Optional[float] = Field(None, ge=0, le=100)
    duration_minutes: Optional[float] = Field(None, ge=0)
    notes: Optional[str] = None
    time_of_day: Optional[TimeOfDayEnum] = None
    location_type: Optional[LocationTypeEnum] = None


class SessionResponse(BaseModel):
    """Exercise session response"""
    id: UUID
    patient_id: UUID
    exercise_name: str
    exercise_category: Optional[str] = None
    start_time: datetime
    end_time: Optional[datetime] = None
    duration_seconds: Optional[int] = None
    duration_minutes: Optional[float] = None
    mood_before: Optional[int] = None
    mood_after: Optional[int] = None
    mood_improvement: Optional[int] = None
    steps_completed: Optional[List[int]] = None
    completion_percentage: float
    session_completed: bool
    notes: Optional[str] = None
    tags: Optional[str] = None
    time_of_day: Optional[str] = None
    location_type: Optional[str] = None
    created_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# PROGRESS SCHEMAS
# ============================================================================

class ExerciseProgressResponse(BaseModel):
    """Exercise progress response"""
    id: UUID
    patient_id: UUID
    exercise_name: str
    exercise_category: Optional[str] = None
    status: str
    completion_count: int
    total_time_seconds: int
    total_time_hours: Optional[float] = None
    average_session_duration_minutes: Optional[float] = None
    first_attempted_at: Optional[datetime] = None
    last_practiced_at: Optional[datetime] = None
    average_mood_improvement: Optional[float] = None
    effectiveness_rating: Optional[float] = None
    mastery_level: str
    is_favorite: bool
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


class ExerciseProgressUpdate(BaseModel):
    """Update exercise progress"""
    is_favorite: Optional[bool] = None
    effectiveness_rating: Optional[float] = Field(None, ge=1, le=5)


# ============================================================================
# GOAL SCHEMAS
# ============================================================================

class GoalCreateRequest(BaseModel):
    """Create a new goal"""
    goal_type: GoalTypeEnum
    title: str = Field(..., min_length=1, max_length=200)
    description: Optional[str] = None
    target_value: int = Field(..., gt=0)
    target_exercise_name: Optional[str] = Field(None, max_length=255)
    reminder_frequency: Optional[str] = Field("weekly", max_length=50)
    deadline: Optional[date] = None
    
    @field_validator('deadline')
    @classmethod
    def validate_deadline(cls, v):
        if v and v < date.today():
            raise ValueError('Deadline cannot be in the past')
        return v


class GoalUpdateRequest(BaseModel):
    """Update an existing goal"""
    title: Optional[str] = Field(None, min_length=1, max_length=200)
    description: Optional[str] = None
    target_value: Optional[int] = Field(None, gt=0)
    deadline: Optional[date] = None
    status: Optional[GoalStatusEnum] = None


class GoalResponse(BaseModel):
    """Goal response"""
    id: UUID
    patient_id: UUID
    goal_type: str
    title: str
    description: Optional[str] = None
    target_value: int
    current_value: int
    progress_percentage: Optional[float] = None
    target_exercise_name: Optional[str] = None
    reminder_frequency: Optional[str] = None
    start_date: date
    deadline: Optional[date] = None
    days_remaining: Optional[int] = None
    status: str
    completed_at: Optional[datetime] = None
    reward_badge_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# ACHIEVEMENT SCHEMAS
# ============================================================================

class AchievementResponse(BaseModel):
    """Achievement response"""
    id: UUID
    patient_id: UUID
    achievement_id: str
    achievement_name: str
    achievement_description: Optional[str] = None
    achievement_icon: Optional[str] = None
    achievement_category: str
    unlocked_at: datetime
    progress_value: Optional[int] = None
    rarity: str
    is_featured: bool
    is_notified: bool
    
    model_config = ConfigDict(from_attributes=True)


class AchievementDefinition(BaseModel):
    """Achievement definition (for available achievements)"""
    achievement_id: str
    name: str
    description: str
    icon: str
    category: AchievementCategoryEnum
    rarity: AchievementRarityEnum
    requirement_value: int
    requirement_description: str
    is_unlocked: bool = False
    unlocked_at: Optional[datetime] = None
    progress: int = 0


# ============================================================================
# STREAK SCHEMAS
# ============================================================================

class StreakResponse(BaseModel):
    """User streak response"""
    id: UUID
    patient_id: UUID
    current_streak: int
    longest_streak: int
    last_practice_date: Optional[date] = None
    streak_start_date: Optional[date] = None
    longest_streak_start: Optional[date] = None
    longest_streak_end: Optional[date] = None
    total_practice_days: int
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)


# ============================================================================
# CALENDAR SCHEMAS
# ============================================================================

class PracticeCalendarResponse(BaseModel):
    """Practice calendar day response"""
    id: UUID
    patient_id: UUID
    practice_date: date
    session_count: int
    total_duration_seconds: int
    total_duration_minutes: Optional[float] = None
    exercises_practiced: Optional[List[str]] = None
    intensity_level: int
    
    model_config = ConfigDict(from_attributes=True)


class CalendarDayData(BaseModel):
    """Simplified calendar day data for heat map"""
    date: str  # ISO format date string (YYYY-MM-DD)
    count: int
    intensity: int
    exercises: List[str] = []


# ============================================================================
# DASHBOARD SCHEMAS
# ============================================================================

class DashboardStats(BaseModel):
    """Overall dashboard statistics"""
    # Streak stats
    current_streak: int = 0
    longest_streak: int = 0
    
    # Session stats
    total_sessions: int = 0
    total_practice_time_hours: float = 0
    sessions_this_week: int = 0
    sessions_this_month: int = 0
    
    # Exercise stats
    exercises_tried: int = 0
    favorite_exercise: Optional[str] = None
    most_practiced_exercise: Optional[str] = None
    
    # Mood stats
    average_mood_improvement: Optional[float] = None
    best_mood_improvement_exercise: Optional[str] = None
    
    # Achievement stats
    total_achievements: int = 0
    achievements_this_month: int = 0
    
    # Goal stats
    active_goals: int = 0
    completed_goals: int = 0
    
    # Recent activity
    last_practice_date: Optional[date] = None
    days_since_last_practice: Optional[int] = None


class WeeklySummary(BaseModel):
    """Weekly practice summary"""
    week_start: date
    week_end: date
    total_sessions: int
    total_duration_hours: float
    exercises_practiced: List[str]
    average_mood_improvement: Optional[float] = None
    streak_at_start: int
    streak_at_end: int
    goals_completed: int
    achievements_unlocked: int
    practice_days: List[date]


class MonthlySummary(BaseModel):
    """Monthly practice summary"""
    month: int
    year: int
    total_sessions: int
    total_duration_hours: float
    exercises_practiced: List[str]
    average_mood_improvement: Optional[float] = None
    best_streak: int
    goals_completed: int
    achievements_unlocked: int
    practice_days_count: int
    consistency_percentage: float


# ============================================================================
# ANALYTICS SCHEMAS
# ============================================================================

class MoodTrendDataPoint(BaseModel):
    """Single mood trend data point"""
    date: date
    mood_before_avg: Optional[float] = None
    mood_after_avg: Optional[float] = None
    mood_improvement_avg: Optional[float] = None
    session_count: int


class ExerciseAnalytics(BaseModel):
    """Analytics for a specific exercise"""
    exercise_name: str
    completion_count: int
    total_time_hours: float
    average_session_duration_minutes: float
    average_mood_improvement: Optional[float] = None
    mastery_level: str
    last_practiced: Optional[datetime] = None
    is_favorite: bool


class InsightResponse(BaseModel):
    """AI-generated insight"""
    insight_type: str  # "pattern", "recommendation", "milestone", "encouragement"
    title: str
    message: str
    icon: str
    data: Optional[Dict[str, Any]] = None


# ============================================================================
# PAGINATION SCHEMAS
# ============================================================================

class PaginatedSessionsResponse(BaseModel):
    """Paginated sessions response"""
    sessions: List[SessionResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


class PaginatedGoalsResponse(BaseModel):
    """Paginated goals response"""
    goals: List[GoalResponse]
    total: int
    page: int
    page_size: int
    total_pages: int


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    # Enums
    'ExerciseStatusEnum',
    'MasteryLevelEnum',
    'TimeOfDayEnum',
    'LocationTypeEnum',
    'GoalTypeEnum',
    'GoalStatusEnum',
    'AchievementCategoryEnum',
    'AchievementRarityEnum',
    
    # Session schemas
    'SessionStartRequest',
    'SessionUpdateRequest',
    'SessionCompleteRequest',
    'SessionQuickCompleteRequest',
    'SessionResponse',
    
    # Progress schemas
    'ExerciseProgressResponse',
    'ExerciseProgressUpdate',
    
    # Goal schemas
    'GoalCreateRequest',
    'GoalUpdateRequest',
    'GoalResponse',
    
    # Achievement schemas
    'AchievementResponse',
    'AchievementDefinition',
    
    # Streak schemas
    'StreakResponse',
    
    # Calendar schemas
    'PracticeCalendarResponse',
    'CalendarDayData',
    
    # Dashboard schemas
    'DashboardStats',
    'WeeklySummary',
    'MonthlySummary',
    
    # Analytics schemas
    'MoodTrendDataPoint',
    'ExerciseAnalytics',
    'InsightResponse',
    
    # Pagination schemas
    'PaginatedSessionsResponse',
    'PaginatedGoalsResponse',
]

