"""
Dashboard Schemas - Data Models for Dashboard API
===============================================
Standardized data models for dashboard responses.

Author: MindMate Team
Version: 2.0.0
"""

from pydantic import BaseModel, Field
from typing import List, Optional, Dict, Any, Union
from datetime import datetime
from enum import Enum


# ============================================================================
# ENUMS
# ============================================================================

class ActivityType(str, Enum):
    EXERCISE = "exercise"
    JOURNAL = "journal"
    APPOINTMENT = "appointment"
    MOOD = "mood"
    ASSESSMENT = "assessment"
    ACHIEVEMENT = "achievement"


class NotificationType(str, Enum):
    APPOINTMENT = "appointment"
    REMINDER = "reminder"
    ACHIEVEMENT = "achievement"
    SYSTEM = "system"
    WELLNESS = "wellness"


class WidgetType(str, Enum):
    PROGRESS = "progress"
    APPOINTMENTS = "appointments"
    ACTIVITY = "activity"
    WELLNESS = "wellness"
    QUICK_ACTIONS = "quick_actions"
    NOTIFICATIONS = "notifications"


# ============================================================================
# CORE DATA MODELS
# ============================================================================

class ProgressData(BaseModel):
    """Progress tracking data"""
    current_streak: int = Field(..., description="Current streak")
    longest_streak: int = Field(..., description="Longest streak")
    total_sessions: int = Field(..., description="Total sessions")
    sessions_this_week: int = Field(..., description="Sessions this week")
    sessions_this_month: int = Field(..., description="Sessions this month")
    completion_rate: float = Field(..., description="Completion rate percentage")
    goals_progress: List[Dict[str, Any]] = Field(..., description="Goals progress")
    recent_achievements: List[Dict[str, Any]] = Field(..., description="Recent achievements")
    next_milestone: Optional[Dict[str, Any]] = Field(None, description="Next milestone")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class AppointmentData(BaseModel):
    """Appointment data for dashboard"""
    id: str = Field(..., description="Appointment ID")
    specialist_name: str = Field(..., description="Specialist name")
    specialist_specialty: str = Field(..., description="Specialist specialty")
    appointment_date: datetime = Field(..., description="Appointment date and time")
    duration_minutes: int = Field(..., description="Appointment duration")
    status: str = Field(..., description="Appointment status")
    location: Optional[str] = Field(None, description="Appointment location")
    notes: Optional[str] = Field(None, description="Appointment notes")
    is_virtual: bool = Field(..., description="Is virtual appointment")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class ActivityData(BaseModel):
    """Recent activity data"""
    id: str = Field(..., description="Activity ID")
    type: ActivityType = Field(..., description="Activity type")
    title: str = Field(..., description="Activity title")
    description: str = Field(..., description="Activity description")
    timestamp: datetime = Field(..., description="Activity timestamp")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    icon: Optional[str] = Field(None, description="Activity icon")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WellnessData(BaseModel):
    """Wellness metrics and mood data"""
    current_mood: int = Field(..., description="Current mood score (1-10)")
    mood_trend: List[Dict[str, Any]] = Field(..., description="Mood trend data")
    wellness_score: float = Field(..., description="Overall wellness score")
    stress_level: int = Field(..., description="Current stress level (1-10)")
    energy_level: int = Field(..., description="Current energy level (1-10)")
    sleep_quality: Optional[int] = Field(None, description="Sleep quality (1-10)")
    exercise_frequency: int = Field(..., description="Exercise frequency per week")
    social_connections: int = Field(..., description="Social connections score")
    last_mood_entry: Optional[datetime] = Field(None, description="Last mood entry")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class QuickAction(BaseModel):
    """Quick action button"""
    id: str = Field(..., description="Action ID")
    title: str = Field(..., description="Action title")
    description: str = Field(..., description="Action description")
    icon: str = Field(..., description="Action icon")
    route: str = Field(..., description="Navigation route")
    color: str = Field(..., description="Button color")
    is_available: bool = Field(..., description="Is action available")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")


class Notification(BaseModel):
    """User notification"""
    id: str = Field(..., description="Notification ID")
    type: NotificationType = Field(..., description="Notification type")
    title: str = Field(..., description="Notification title")
    message: str = Field(..., description="Notification message")
    is_read: bool = Field(..., description="Is notification read")
    created_at: datetime = Field(..., description="Notification creation time")
    action_url: Optional[str] = Field(None, description="Action URL")
    priority: int = Field(..., description="Notification priority (1-5)")
    metadata: Optional[Dict[str, Any]] = Field(None, description="Additional metadata")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class UserStats(BaseModel):
    """Deprecated user stats schema retained for backward compatibility."""
    total_sessions: int = Field(0, description="Total completed sessions")
    completed_tasks: int = Field(0, description="Completed tasks count")
    streak_days: int = Field(0, description="Current streak in days")
    consistency_score: float = Field(0.0, description="Consistency score percentage")
    last_updated: Optional[datetime] = Field(None, description="Timestamp when stats were last updated")

    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ============================================================================
# MAIN DASHBOARD MODELS
# ============================================================================

class DashboardOverview(BaseModel):
    """Complete dashboard overview data"""
    progress_data: ProgressData = Field(..., description="Progress tracking data")
    appointments: List[AppointmentData] = Field(..., description="Appointments data")
    recent_activity: List[ActivityData] = Field(..., description="Recent activity")
    wellness_metrics: WellnessData = Field(..., description="Wellness metrics")
    quick_actions: List[QuickAction] = Field(..., description="Quick actions")
    notifications: List[Notification] = Field(..., description="Notifications")
    last_updated: datetime = Field(..., description="Last data update")
    cache_expires: Optional[datetime] = Field(None, description="Cache expiration")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class WidgetPreferences(BaseModel):
    """User widget preferences"""
    user_id: str = Field(..., description="User ID")
    widgets: List[Dict[str, Any]] = Field(..., description="Widget configuration")
    layout: Dict[str, Any] = Field(..., description="Layout preferences")
    theme: str = Field(..., description="Theme preference")
    updated_at: datetime = Field(..., description="Last update time")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


class DashboardUpdates(BaseModel):
    """Incremental dashboard updates"""
    updates: List[Dict[str, Any]] = Field(..., description="Update data")
    last_updated: datetime = Field(..., description="Last update timestamp")
    has_updates: bool = Field(..., description="Has new updates")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ============================================================================
# ERROR MODELS
# ============================================================================

class DashboardError(BaseModel):
    """Dashboard error response"""
    error_code: str = Field(..., description="Error code")
    message: str = Field(..., description="Error message")
    details: Optional[Dict[str, Any]] = Field(None, description="Error details")
    timestamp: datetime = Field(default_factory=datetime.now, description="Error timestamp")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }


# ============================================================================
# EXPORT MODELS
# ============================================================================

class DashboardExport(BaseModel):
    """Dashboard export data"""
    export_id: str = Field(..., description="Export ID")
    format: str = Field(..., description="Export format (pdf, excel)")
    download_url: str = Field(..., description="Download URL")
    expires_at: datetime = Field(..., description="Download expiration")
    file_size: Optional[int] = Field(None, description="File size in bytes")
    
    class Config:
        json_encoders = {
            datetime: lambda v: v.isoformat()
        }
