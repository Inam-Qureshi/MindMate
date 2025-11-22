"""
Achievements Configuration - Predefined Achievements System
===========================================================
Defines all available achievements and their unlock requirements.

Author: MindMate Team
Version: 1.0.0
"""

from typing import List, Dict, Any
from enum import Enum


class AchievementTrigger(str, Enum):
    """Types of triggers for achievement unlocks"""
    SESSION_COUNT = "session_count"
    STREAK_MILESTONE = "streak_milestone"
    EXERCISE_VARIETY = "exercise_variety"
    MASTERY_LEVEL = "mastery_level"
    TIME_OF_DAY = "time_of_day"
    MOOD_IMPROVEMENT = "mood_improvement"
    PRACTICE_TIME = "practice_time"
    SPECIAL = "special"


# ============================================================================
# ACHIEVEMENT DEFINITIONS
# ============================================================================

ACHIEVEMENTS: List[Dict[str, Any]] = [
    # ========================================================================
    # STREAK ACHIEVEMENTS
    # ========================================================================
    {
        "achievement_id": "first_step",
        "name": "First Step",
        "description": "Complete your very first mental health exercise session",
        "icon": "🌱",
        "category": "streak",
        "rarity": "common",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 1,
        "requirement_description": "Complete 1 session",
    },
    {
        "achievement_id": "3_day_warrior",
        "name": "3-Day Warrior",
        "description": "Maintain a 3-day practice streak",
        "icon": "🔥",
        "category": "streak",
        "rarity": "common",
        "trigger": AchievementTrigger.STREAK_MILESTONE,
        "requirement_value": 3,
        "requirement_description": "Achieve a 3-day streak",
    },
    {
        "achievement_id": "week_champion",
        "name": "Week Champion",
        "description": "Maintain a 7-day practice streak",
        "icon": "⭐",
        "category": "streak",
        "rarity": "rare",
        "trigger": AchievementTrigger.STREAK_MILESTONE,
        "requirement_value": 7,
        "requirement_description": "Achieve a 7-day streak",
    },
    {
        "achievement_id": "two_week_master",
        "name": "Two Week Master",
        "description": "Maintain a 14-day practice streak",
        "icon": "💎",
        "category": "streak",
        "rarity": "rare",
        "trigger": AchievementTrigger.STREAK_MILESTONE,
        "requirement_value": 14,
        "requirement_description": "Achieve a 14-day streak",
    },
    {
        "achievement_id": "month_master",
        "name": "Month Master",
        "description": "Maintain a 30-day practice streak",
        "icon": "👑",
        "category": "streak",
        "rarity": "epic",
        "trigger": AchievementTrigger.STREAK_MILESTONE,
        "requirement_value": 30,
        "requirement_description": "Achieve a 30-day streak",
    },
    {
        "achievement_id": "century_club",
        "name": "Century Club",
        "description": "Maintain a 100-day practice streak - incredible dedication!",
        "icon": "🏆",
        "category": "streak",
        "rarity": "legendary",
        "trigger": AchievementTrigger.STREAK_MILESTONE,
        "requirement_value": 100,
        "requirement_description": "Achieve a 100-day streak",
    },
    
    # ========================================================================
    # COMPLETION ACHIEVEMENTS
    # ========================================================================
    {
        "achievement_id": "getting_started",
        "name": "Getting Started",
        "description": "Complete 5 exercise sessions",
        "icon": "🎯",
        "category": "completion",
        "rarity": "common",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 5,
        "requirement_description": "Complete 5 sessions",
    },
    {
        "achievement_id": "regular_practitioner",
        "name": "Regular Practitioner",
        "description": "Complete 25 exercise sessions",
        "icon": "📚",
        "category": "completion",
        "rarity": "rare",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 25,
        "requirement_description": "Complete 25 sessions",
    },
    {
        "achievement_id": "dedicated",
        "name": "Dedicated",
        "description": "Complete 50 exercise sessions",
        "icon": "💪",
        "category": "completion",
        "rarity": "epic",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 50,
        "requirement_description": "Complete 50 sessions",
    },
    {
        "achievement_id": "committed",
        "name": "Committed",
        "description": "Complete 100 exercise sessions",
        "icon": "🌟",
        "category": "completion",
        "rarity": "epic",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 100,
        "requirement_description": "Complete 100 sessions",
    },
    {
        "achievement_id": "expert",
        "name": "Expert",
        "description": "Complete 250 exercise sessions",
        "icon": "🎖️",
        "category": "completion",
        "rarity": "legendary",
        "trigger": AchievementTrigger.SESSION_COUNT,
        "requirement_value": 250,
        "requirement_description": "Complete 250 sessions",
    },
    
    # ========================================================================
    # VARIETY ACHIEVEMENTS
    # ========================================================================
    {
        "achievement_id": "explorer",
        "name": "Explorer",
        "description": "Try 5 different mental health exercises",
        "icon": "🧭",
        "category": "variety",
        "rarity": "common",
        "trigger": AchievementTrigger.EXERCISE_VARIETY,
        "requirement_value": 5,
        "requirement_description": "Try 5 different exercises",
    },
    {
        "achievement_id": "adventurer",
        "name": "Adventurer",
        "description": "Try 10 different mental health exercises",
        "icon": "🗺️",
        "category": "variety",
        "rarity": "rare",
        "trigger": AchievementTrigger.EXERCISE_VARIETY,
        "requirement_value": 10,
        "requirement_description": "Try 10 different exercises",
    },
    {
        "achievement_id": "master_explorer",
        "name": "Master Explorer",
        "description": "Try 20 different mental health exercises",
        "icon": "🎒",
        "category": "variety",
        "rarity": "epic",
        "trigger": AchievementTrigger.EXERCISE_VARIETY,
        "requirement_value": 20,
        "requirement_description": "Try 20 different exercises",
    },
    {
        "achievement_id": "jack_of_all_trades",
        "name": "Jack of All Trades",
        "description": "Try 30+ different mental health exercises",
        "icon": "🌈",
        "category": "variety",
        "rarity": "legendary",
        "trigger": AchievementTrigger.EXERCISE_VARIETY,
        "requirement_value": 30,
        "requirement_description": "Try 30+ different exercises",
    },
    
    # ========================================================================
    # MASTERY ACHIEVEMENTS
    # ========================================================================
    {
        "achievement_id": "quick_learner",
        "name": "Quick Learner",
        "description": "Reach intermediate level in any exercise",
        "icon": "📖",
        "category": "mastery",
        "rarity": "rare",
        "trigger": AchievementTrigger.MASTERY_LEVEL,
        "requirement_value": 1,  # 1 intermediate exercise
        "requirement_description": "Reach intermediate in 1 exercise",
    },
    {
        "achievement_id": "specialist",
        "name": "Specialist",
        "description": "Reach advanced level in any exercise",
        "icon": "🎓",
        "category": "mastery",
        "rarity": "epic",
        "trigger": AchievementTrigger.MASTERY_LEVEL,
        "requirement_value": 1,  # 1 advanced exercise
        "requirement_description": "Reach advanced in 1 exercise",
    },
    {
        "achievement_id": "expert_practitioner",
        "name": "Expert Practitioner",
        "description": "Reach advanced level in 3 different exercises",
        "icon": "🏅",
        "category": "mastery",
        "rarity": "epic",
        "trigger": AchievementTrigger.MASTERY_LEVEL,
        "requirement_value": 3,  # 3 advanced exercises
        "requirement_description": "Reach advanced in 3 exercises",
    },
    {
        "achievement_id": "master_of_all",
        "name": "Master of All",
        "description": "Reach advanced level in 10 different exercises",
        "icon": "🎯",
        "category": "mastery",
        "rarity": "legendary",
        "trigger": AchievementTrigger.MASTERY_LEVEL,
        "requirement_value": 10,  # 10 advanced exercises
        "requirement_description": "Reach advanced in 10 exercises",
    },
    
    # ========================================================================
    # SPECIAL ACHIEVEMENTS
    # ========================================================================
    {
        "achievement_id": "early_bird",
        "name": "Early Bird",
        "description": "Practice 10 times in the morning",
        "icon": "🌅",
        "category": "special",
        "rarity": "rare",
        "trigger": AchievementTrigger.TIME_OF_DAY,
        "requirement_value": 10,
        "requirement_description": "Complete 10 morning sessions",
        "metadata": {"time_of_day": "morning"},
    },
    {
        "achievement_id": "night_owl",
        "name": "Night Owl",
        "description": "Practice 10 times at night",
        "icon": "🌙",
        "category": "special",
        "rarity": "rare",
        "trigger": AchievementTrigger.TIME_OF_DAY,
        "requirement_value": 10,
        "requirement_description": "Complete 10 night sessions",
        "metadata": {"time_of_day": "night"},
    },
    {
        "achievement_id": "mood_booster",
        "name": "Mood Booster",
        "description": "Complete 10 sessions with +5 or more mood improvement",
        "icon": "😊",
        "category": "special",
        "rarity": "epic",
        "trigger": AchievementTrigger.MOOD_IMPROVEMENT,
        "requirement_value": 10,
        "requirement_description": "10 sessions with +5 mood boost",
        "metadata": {"min_mood_improvement": 5},
    },
    {
        "achievement_id": "perfect_week",
        "name": "Perfect Week",
        "description": "Practice every single day for a week",
        "icon": "✨",
        "category": "special",
        "rarity": "epic",
        "trigger": AchievementTrigger.SPECIAL,
        "requirement_value": 7,
        "requirement_description": "Practice 7 consecutive days",
    },
    {
        "achievement_id": "meditation_master",
        "name": "Meditation Master",
        "description": "Accumulate 10+ hours of total practice time",
        "icon": "🧘",
        "category": "special",
        "rarity": "epic",
        "trigger": AchievementTrigger.PRACTICE_TIME,
        "requirement_value": 36000,  # 10 hours in seconds
        "requirement_description": "Practice for 10+ total hours",
    },
    {
        "achievement_id": "consistency_king",
        "name": "Consistency King",
        "description": "Practice at least 3 times per week for 4 consecutive weeks",
        "icon": "👑",
        "category": "special",
        "rarity": "legendary",
        "trigger": AchievementTrigger.SPECIAL,
        "requirement_value": 12,  # 3 sessions x 4 weeks
        "requirement_description": "3+ sessions/week for 4 weeks",
    },
    {
        "achievement_id": "transformation",
        "name": "Transformation",
        "description": "Achieve an average mood improvement of +3 across 20+ sessions",
        "icon": "🦋",
        "category": "special",
        "rarity": "legendary",
        "trigger": AchievementTrigger.MOOD_IMPROVEMENT,
        "requirement_value": 20,
        "requirement_description": "Average +3 mood boost over 20 sessions",
        "metadata": {"min_avg_improvement": 3, "min_sessions": 20},
    },
]


# ============================================================================
# UTILITY FUNCTIONS
# ============================================================================

def get_achievement_by_id(achievement_id: str) -> Dict[str, Any]:
    """Get achievement definition by ID"""
    for achievement in ACHIEVEMENTS:
        if achievement["achievement_id"] == achievement_id:
            return achievement
    return None


def get_achievements_by_category(category: str) -> List[Dict[str, Any]]:
    """Get all achievements in a category"""
    return [a for a in ACHIEVEMENTS if a["category"] == category]


def get_achievements_by_rarity(rarity: str) -> List[Dict[str, Any]]:
    """Get all achievements of a certain rarity"""
    return [a for a in ACHIEVEMENTS if a["rarity"] == rarity]


def get_achievements_by_trigger(trigger: AchievementTrigger) -> List[Dict[str, Any]]:
    """Get all achievements with a specific trigger"""
    return [a for a in ACHIEVEMENTS if a["trigger"] == trigger]


def get_all_achievement_ids() -> List[str]:
    """Get list of all achievement IDs"""
    return [a["achievement_id"] for a in ACHIEVEMENTS]


# ============================================================================
# ACHIEVEMENT CHECK FUNCTIONS
# ============================================================================

def check_session_count_achievements(total_sessions: int) -> List[str]:
    """Check which session count achievements should be unlocked"""
    achievements_to_unlock = []
    session_achievements = get_achievements_by_trigger(AchievementTrigger.SESSION_COUNT)
    
    for achievement in session_achievements:
        if total_sessions >= achievement["requirement_value"]:
            achievements_to_unlock.append(achievement["achievement_id"])
    
    return achievements_to_unlock


def check_streak_achievements(current_streak: int) -> List[str]:
    """Check which streak achievements should be unlocked"""
    achievements_to_unlock = []
    streak_achievements = get_achievements_by_trigger(AchievementTrigger.STREAK_MILESTONE)
    
    for achievement in streak_achievements:
        if current_streak >= achievement["requirement_value"]:
            achievements_to_unlock.append(achievement["achievement_id"])
    
    return achievements_to_unlock


def check_variety_achievements(unique_exercises_count: int) -> List[str]:
    """Check which variety achievements should be unlocked"""
    achievements_to_unlock = []
    variety_achievements = get_achievements_by_trigger(AchievementTrigger.EXERCISE_VARIETY)
    
    for achievement in variety_achievements:
        if unique_exercises_count >= achievement["requirement_value"]:
            achievements_to_unlock.append(achievement["achievement_id"])
    
    return achievements_to_unlock


def check_mastery_achievements(advanced_count: int, intermediate_count: int) -> List[str]:
    """Check which mastery achievements should be unlocked"""
    achievements_to_unlock = []
    mastery_achievements = get_achievements_by_trigger(AchievementTrigger.MASTERY_LEVEL)
    
    for achievement in mastery_achievements:
        achievement_id = achievement["achievement_id"]
        req_value = achievement["requirement_value"]
        
        # Check intermediate achievements
        if "intermediate" in achievement["name"].lower():
            if intermediate_count >= req_value:
                achievements_to_unlock.append(achievement_id)
        # Check advanced achievements
        elif advanced_count >= req_value:
            achievements_to_unlock.append(achievement_id)
    
    return achievements_to_unlock


def check_practice_time_achievements(total_time_seconds: int) -> List[str]:
    """Check which practice time achievements should be unlocked"""
    achievements_to_unlock = []
    time_achievements = get_achievements_by_trigger(AchievementTrigger.PRACTICE_TIME)
    
    for achievement in time_achievements:
        if total_time_seconds >= achievement["requirement_value"]:
            achievements_to_unlock.append(achievement["achievement_id"])
    
    return achievements_to_unlock


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    'AchievementTrigger',
    'ACHIEVEMENTS',
    'get_achievement_by_id',
    'get_achievements_by_category',
    'get_achievements_by_rarity',
    'get_achievements_by_trigger',
    'get_all_achievement_ids',
    'check_session_count_achievements',
    'check_streak_achievements',
    'check_variety_achievements',
    'check_mastery_achievements',
    'check_practice_time_achievements',
]

