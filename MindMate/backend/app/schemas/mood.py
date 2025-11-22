"""
Daily Mood Tracker Schemas - Pydantic models for API validation
"""

from datetime import date, datetime
from typing import Dict, List, Optional
from uuid import UUID

from pydantic import BaseModel, Field, field_validator, ConfigDict


class MoodEntryBase(BaseModel):
    """Shared fields for mood entry scoring inputs."""

    mood_score: float = Field(..., ge=0, le=10, description="Overall mood / valence (0-10)")
    energy_level: float = Field(..., ge=0, le=10, description="Energy / fatigue level (0-10)")
    stress_level: float = Field(..., ge=0, le=10, description="Stress vs calmness (0-10)")
    sleep_quality: float = Field(..., ge=0, le=10, description="Sleep quality rating (0-10)")
    motivation_level: float = Field(..., ge=0, le=10, description="Motivation / interest (0-10)")
    notes: Optional[str] = Field(default=None, max_length=2000, description="Optional daily reflection")

    @field_validator(
        "mood_score",
        "energy_level",
        "stress_level",
        "sleep_quality",
        "motivation_level",
        mode="before",
    )
    @classmethod
    def numeric_only(cls, value: float) -> float:
        if value is None:
            raise ValueError("Value is required")
        return float(value)


class MoodEntryCreate(MoodEntryBase):
    """Payload for creating or updating a daily mood entry."""

    entry_date: Optional[date] = Field(
        default=None, description="Date for the entry (defaults to today if not provided)"
    )


class MoodEntryResponse(MoodEntryBase):
    """Persisted mood entry response."""

    model_config = ConfigDict(from_attributes=True)

    id: UUID
    patient_id: UUID
    entry_date: date
    created_at: datetime
    updated_at: datetime
    interpretation: str = Field(description="Mood interpretation label")
    alerts: Dict[str, Optional[str]] = Field(
        default_factory=dict,
        description="Any generated alerts such as low mood streaks or significant changes",
    )


class MoodEntrySummary(BaseModel):
    """Aggregated statistics for mood history."""

    average_7_day: Optional[float] = Field(default=None, ge=0, le=10)
    average_30_day: Optional[float] = Field(default=None, ge=0, le=10)
    best_mood: Optional[float] = Field(default=None, ge=0, le=10)
    lowest_mood: Optional[float] = Field(default=None, ge=0, le=10)
    entry_count: int = 0
    consecutive_low_mood_days: int = 0
    last_entry_date: Optional[date] = None


class MoodHeatmapPoint(BaseModel):
    """Single point used for calendar or heatmap visualizations."""

    entry_date: date
    mood_score: float = Field(ge=0, le=10)


class MoodHistoryResponse(BaseModel):
    """Trend data payload combining entries and aggregated analytics."""

    entries: List[MoodEntryResponse]
    summary: MoodEntrySummary
    heatmap: List[MoodHeatmapPoint]

