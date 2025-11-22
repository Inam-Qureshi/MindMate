"""
Progress Service - Business Logic for Progress Tracking
=======================================================
Handles all business logic for exercise progress tracking, streaks,
achievements, goals, and analytics.

Author: MindMate Team
Version: 1.0.0
"""

from sqlalchemy.orm import Session
from sqlalchemy import func, and_, or_, desc
from datetime import datetime, date, timedelta
from typing import List, Dict, Any, Optional, Tuple
from uuid import UUID
import logging

from app.models.patient import (
    ExerciseProgress, ExerciseSession, UserGoal, UserAchievement,
    UserStreak, PracticeCalendar,
    MasteryLevel, GoalType, GoalStatus,
)
from app.utils.achievements_config import (
    ACHIEVEMENTS,
    get_achievement_by_id,
    check_session_count_achievements,
    check_streak_achievements,
    check_variety_achievements,
    check_mastery_achievements,
    check_practice_time_achievements,
)

logger = logging.getLogger(__name__)


class ProgressService:
    """Service for managing exercise progress tracking"""
    
    # ========================================================================
    # EXERCISE PROGRESS METHODS
    # ========================================================================
    
    @staticmethod
    def get_or_create_exercise_progress(
        db: Session,
        patient_id: UUID,
        exercise_name: str,
        exercise_category: Optional[str] = None
    ) -> ExerciseProgress:
        """Get existing or create new exercise progress record"""
        progress = db.query(ExerciseProgress).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.exercise_name == exercise_name,
            ExerciseProgress.is_deleted == False
        ).first()
        
        if not progress:
            progress = ExerciseProgress(
                patient_id=patient_id,
                exercise_name=exercise_name,
                exercise_category=exercise_category,
                status="not_started",
                completion_count=0,
                total_time_seconds=0,
            )
            db.add(progress)
            db.commit()
            db.refresh(progress)
        
        return progress
    
    @staticmethod
    def update_exercise_progress(
        db: Session,
        patient_id: UUID,
        session: ExerciseSession
    ) -> ExerciseProgress:
        """Update exercise progress after session completion"""
        progress = ProgressService.get_or_create_exercise_progress(
            db, patient_id, session.exercise_name, session.exercise_category
        )
        
        # Update metrics
        progress.completion_count += 1
        if session.duration_seconds:
            progress.total_time_seconds += session.duration_seconds
        
        # Update dates
        if not progress.first_attempted_at:
            progress.first_attempted_at = session.start_time
        progress.last_practiced_at = session.end_time or session.start_time
        
        # Update status
        if progress.status == "not_started":
            progress.status = "in_progress"
        if progress.completion_count >= 10:
            progress.status = "completed"
        
        # Update mood improvement average
        if session.mood_improvement is not None:
            progress.average_mood_improvement = ProgressService._calculate_average_mood(
                db, patient_id, session.exercise_name
            )
        
        # Update mastery level
        progress.mastery_level = ProgressService._calculate_mastery_level(
            progress.completion_count,
            progress.average_mood_improvement
        )
        
        db.commit()
        db.refresh(progress)
        return progress
    
    @staticmethod
    def process_session_completion(
        db: Session,
        patient_id: UUID,
        session: ExerciseSession
    ) -> Dict[str, Any]:
        """Run all downstream updates when a session is completed."""
        progress = ProgressService.update_exercise_progress(db, patient_id, session)
        streak = ProgressService.update_streak(db, patient_id, session.start_time.date())
        calendar = ProgressService.update_practice_calendar(db, patient_id, session)
        achievements = ProgressService.check_and_unlock_achievements(db, patient_id)
        updated_goals = ProgressService.check_and_update_goals(db, patient_id)
        
        return {
            "progress": progress,
            "streak": streak,
            "calendar": calendar,
            "achievements": achievements,
            "updated_goals": updated_goals,
        }


    @staticmethod
    def _calculate_average_mood(
        db: Session,
        patient_id: UUID,
        exercise_name: str
    ) -> float:
        """Calculate average mood improvement for an exercise"""
        result = db.query(func.avg(ExerciseSession.mood_improvement)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.exercise_name == exercise_name,
            ExerciseSession.mood_improvement.isnot(None),
            ExerciseSession.is_deleted == False
        ).scalar()
        
        return round(result, 2) if result else None
    
    @staticmethod
    def _calculate_mastery_level(
        completion_count: int,
        avg_mood_improvement: Optional[float]
    ) -> str:
        """Calculate mastery level based on completions and effectiveness"""
        if completion_count >= 20 and (avg_mood_improvement or 0) >= 3:
            return MasteryLevel.ADVANCED
        elif completion_count >= 10 and (avg_mood_improvement or 0) >= 2:
            return MasteryLevel.INTERMEDIATE
        else:
            return MasteryLevel.BEGINNER
    
    # ========================================================================
    # STREAK METHODS
    # ========================================================================
    
    @staticmethod
    def get_or_create_streak(db: Session, patient_id: UUID) -> UserStreak:
        """Get existing or create new streak record"""
        streak = db.query(UserStreak).filter(
            UserStreak.patient_id == patient_id,
            UserStreak.is_deleted == False
        ).first()
        
        if not streak:
            streak = UserStreak(
                patient_id=patient_id,
                current_streak=0,
                longest_streak=0,
                total_practice_days=0
            )
            db.add(streak)
            db.commit()
            db.refresh(streak)
        
        return streak
    
    @staticmethod
    def update_streak(
        db: Session,
        patient_id: UUID,
        practice_date: date = None
    ) -> UserStreak:
        """Update user streak after practice"""
        if practice_date is None:
            practice_date = date.today()
        
        streak = ProgressService.get_or_create_streak(db, patient_id)
        
        # Check if already practiced today
        if streak.last_practice_date == practice_date:
            return streak
        
        # Calculate days since last practice
        if streak.last_practice_date:
            days_diff = (practice_date - streak.last_practice_date).days
            
            if days_diff == 1:
                # Consecutive day - increase streak
                streak.current_streak += 1
            elif days_diff == 0:
                # Same day - no change
                pass
            else:
                # Streak broken - reset
                streak.current_streak = 1
                streak.streak_start_date = practice_date
        else:
            # First practice ever
            streak.current_streak = 1
            streak.streak_start_date = practice_date
        
        # Update longest streak
        if streak.current_streak > streak.longest_streak:
            streak.longest_streak = streak.current_streak
            streak.longest_streak_start = streak.streak_start_date
            streak.longest_streak_end = practice_date
        
        # Update last practice date and total days
        if streak.last_practice_date != practice_date:
            streak.total_practice_days += 1
        streak.last_practice_date = practice_date
        
        db.commit()
        db.refresh(streak)
        return streak
    
    # ========================================================================
    # PRACTICE CALENDAR METHODS
    # ========================================================================
    
    @staticmethod
    def update_practice_calendar(
        db: Session,
        patient_id: UUID,
        session: ExerciseSession
    ) -> PracticeCalendar:
        """Update practice calendar after session"""
        practice_date = session.start_time.date()
        
        calendar = db.query(PracticeCalendar).filter(
            PracticeCalendar.patient_id == patient_id,
            PracticeCalendar.practice_date == practice_date,
            PracticeCalendar.is_deleted == False
        ).first()
        
        if not calendar:
            calendar = PracticeCalendar(
                patient_id=patient_id,
                practice_date=practice_date,
                session_count=0,
                total_duration_seconds=0,
                exercises_practiced=[],
                intensity_level=0
            )
            db.add(calendar)
        
        # Update metrics
        calendar.session_count += 1
        if session.duration_seconds:
            calendar.total_duration_seconds += session.duration_seconds
        
        # Add exercise to practiced list (if not already there)
        if not calendar.exercises_practiced:
            calendar.exercises_practiced = []
        if session.exercise_name not in calendar.exercises_practiced:
            calendar.exercises_practiced.append(session.exercise_name)
        
        # Calculate intensity level (0-4 scale based on session count)
        if calendar.session_count == 1:
            calendar.intensity_level = 1
        elif calendar.session_count == 2:
            calendar.intensity_level = 2
        elif calendar.session_count == 3:
            calendar.intensity_level = 3
        elif calendar.session_count >= 4:
            calendar.intensity_level = 4
        
        db.commit()
        db.refresh(calendar)
        return calendar
    
    # ========================================================================
    # ACHIEVEMENT METHODS
    # ========================================================================
    
    @staticmethod
    def check_and_unlock_achievements(
        db: Session,
        patient_id: UUID
    ) -> List[UserAchievement]:
        """Check and unlock any earned achievements"""
        newly_unlocked = []
        
        # Get already unlocked achievement IDs
        unlocked_ids = {
            a.achievement_id for a in db.query(UserAchievement.achievement_id).filter(
                UserAchievement.patient_id == patient_id,
                UserAchievement.is_deleted == False
            ).all()
        }
        
        # Get user stats
        stats = ProgressService.get_user_stats(db, patient_id)
        
        # Check session count achievements
        session_achievements = check_session_count_achievements(stats['total_sessions'])
        for achievement_id in session_achievements:
            if achievement_id not in unlocked_ids:
                achievement = ProgressService._unlock_achievement(
                    db, patient_id, achievement_id, stats['total_sessions']
                )
                if achievement:
                    newly_unlocked.append(achievement)
                    unlocked_ids.add(achievement_id)
        
        # Check streak achievements
        streak_achievements = check_streak_achievements(stats['current_streak'])
        for achievement_id in streak_achievements:
            if achievement_id not in unlocked_ids:
                achievement = ProgressService._unlock_achievement(
                    db, patient_id, achievement_id, stats['current_streak']
                )
                if achievement:
                    newly_unlocked.append(achievement)
                    unlocked_ids.add(achievement_id)
        
        # Check variety achievements
        variety_achievements = check_variety_achievements(stats['exercises_tried'])
        for achievement_id in variety_achievements:
            if achievement_id not in unlocked_ids:
                achievement = ProgressService._unlock_achievement(
                    db, patient_id, achievement_id, stats['exercises_tried']
                )
                if achievement:
                    newly_unlocked.append(achievement)
                    unlocked_ids.add(achievement_id)
        
        # Check mastery achievements
        mastery_achievements = check_mastery_achievements(
            stats['advanced_exercises'],
            stats['intermediate_exercises']
        )
        for achievement_id in mastery_achievements:
            if achievement_id not in unlocked_ids:
                achievement = ProgressService._unlock_achievement(
                    db, patient_id, achievement_id,
                    max(stats['advanced_exercises'], stats['intermediate_exercises'])
                )
                if achievement:
                    newly_unlocked.append(achievement)
                    unlocked_ids.add(achievement_id)
        
        # Check practice time achievements
        time_achievements = check_practice_time_achievements(stats['total_time_seconds'])
        for achievement_id in time_achievements:
            if achievement_id not in unlocked_ids:
                achievement = ProgressService._unlock_achievement(
                    db, patient_id, achievement_id, stats['total_time_seconds']
                )
                if achievement:
                    newly_unlocked.append(achievement)
                    unlocked_ids.add(achievement_id)
        
        return newly_unlocked
    
    @staticmethod
    def _unlock_achievement(
        db: Session,
        patient_id: UUID,
        achievement_id: str,
        progress_value: int
    ) -> Optional[UserAchievement]:
        """Unlock a specific achievement"""
        achievement_def = get_achievement_by_id(achievement_id)
        if not achievement_def:
            logger.warning(f"Achievement not found: {achievement_id}")
            return None
        
        try:
            achievement = UserAchievement(
                patient_id=patient_id,
                achievement_id=achievement_id,
                achievement_name=achievement_def["name"],
                achievement_description=achievement_def["description"],
                achievement_icon=achievement_def["icon"],
                achievement_category=achievement_def["category"],
                unlocked_at=datetime.utcnow(),
                progress_value=progress_value,
                rarity=achievement_def["rarity"],
                is_featured=achievement_def["rarity"] in ["epic", "legendary"],
                is_notified=False
            )
            db.add(achievement)
            db.commit()
            db.refresh(achievement)
            
            logger.info(f"Achievement unlocked: {achievement_id} for patient {patient_id}")
            return achievement
        except Exception as e:
            logger.error(f"Error unlocking achievement: {e}")
            db.rollback()
            return None
    
    # ========================================================================
    # GOAL METHODS
    # ========================================================================
    
    @staticmethod
    def check_and_update_goals(db: Session, patient_id: UUID) -> List[UserGoal]:
        """Check and update all active goals"""
        updated_goals = []
        
        # Get all active goals
        active_goals = db.query(UserGoal).filter(
            UserGoal.patient_id == patient_id,
            UserGoal.status == GoalStatus.ACTIVE,
            UserGoal.is_deleted == False
        ).all()
        
        stats = ProgressService.get_user_stats(db, patient_id)
        
        for goal in active_goals:
            updated = False
            old_value = goal.current_value
            
            if goal.goal_type == GoalType.DAILY_PRACTICE:
                # Check if practiced today
                today = date.today()
                practiced_today = db.query(ExerciseSession).filter(
                    ExerciseSession.patient_id == patient_id,
                    func.date(ExerciseSession.start_time) == today,
                    ExerciseSession.is_deleted == False
                ).count() > 0
                goal.current_value = 1 if practiced_today else 0
                updated = True
            
            elif goal.goal_type == GoalType.WEEKLY_PRACTICE:
                # Count sessions this week
                week_start = date.today() - timedelta(days=date.today().weekday())
                sessions_this_week = db.query(ExerciseSession).filter(
                    ExerciseSession.patient_id == patient_id,
                    func.date(ExerciseSession.start_time) >= week_start,
                    ExerciseSession.is_deleted == False
                ).count()
                goal.current_value = sessions_this_week
                updated = True
            
            elif goal.goal_type == GoalType.EXERCISE_VARIETY:
                goal.current_value = stats['exercises_tried']
                updated = True
            
            elif goal.goal_type == GoalType.STREAK_MILESTONE:
                goal.current_value = stats['current_streak']
                updated = True
            
            elif goal.goal_type == GoalType.TOTAL_SESSIONS:
                goal.current_value = stats['total_sessions']
                updated = True
            
            elif goal.goal_type == GoalType.SPECIFIC_EXERCISE:
                if goal.target_exercise_name:
                    count = db.query(ExerciseSession).filter(
                        ExerciseSession.patient_id == patient_id,
                        ExerciseSession.exercise_name == goal.target_exercise_name,
                        ExerciseSession.session_completed == True,
                        ExerciseSession.is_deleted == False
                    ).count()
                    goal.current_value = count
                    updated = True
            
            elif goal.goal_type == GoalType.TIME_BASED:
                goal.current_value = stats['total_time_seconds']
                updated = True
            
            # Check if goal is completed
            if goal.current_value >= goal.target_value and goal.status == GoalStatus.ACTIVE:
                goal.status = GoalStatus.COMPLETED
                goal.completed_at = datetime.utcnow()
                updated = True
            
            # Check if deadline passed
            if goal.deadline and goal.deadline < date.today() and goal.status == GoalStatus.ACTIVE:
                if goal.current_value >= goal.target_value:
                    goal.status = GoalStatus.COMPLETED
                    goal.completed_at = datetime.utcnow()
                else:
                    goal.status = GoalStatus.FAILED
                updated = True
            
            if updated and goal.current_value != old_value:
                updated_goals.append(goal)
        
        if updated_goals:
            db.commit()
        
        return updated_goals
    
    # ========================================================================
    # STATISTICS AND ANALYTICS METHODS
    # ========================================================================
    
    @staticmethod
    def get_user_stats(db: Session, patient_id: UUID) -> Dict[str, Any]:
        """Get comprehensive user statistics"""
        # Total sessions
        total_sessions = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.session_completed == True,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Total time
        total_time = db.query(func.sum(ExerciseSession.duration_seconds)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Exercises tried
        exercises_tried = db.query(func.count(func.distinct(ExerciseProgress.exercise_name))).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.is_deleted == False
        ).scalar() or 0
        
        # Mastery levels
        intermediate_count = db.query(func.count(ExerciseProgress.id)).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.mastery_level == MasteryLevel.INTERMEDIATE,
            ExerciseProgress.is_deleted == False
        ).scalar() or 0
        
        advanced_count = db.query(func.count(ExerciseProgress.id)).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.mastery_level == MasteryLevel.ADVANCED,
            ExerciseProgress.is_deleted == False
        ).scalar() or 0
        
        # Streak
        streak = ProgressService.get_or_create_streak(db, patient_id)
        
        return {
            'total_sessions': total_sessions,
            'total_time_seconds': total_time,
            'exercises_tried': exercises_tried,
            'intermediate_exercises': intermediate_count,
            'advanced_exercises': advanced_count,
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
        }
    
    @staticmethod
    def get_dashboard_stats(db: Session, patient_id: UUID) -> Dict[str, Any]:
        """Get comprehensive dashboard statistics"""
        streak = ProgressService.get_or_create_streak(db, patient_id)
        
        # Total sessions
        total_sessions = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.session_completed == True,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Total practice time
        total_time = db.query(func.sum(ExerciseSession.duration_seconds)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Sessions this week
        week_start = date.today() - timedelta(days=date.today().weekday())
        sessions_this_week = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == patient_id,
            func.date(ExerciseSession.start_time) >= week_start,
            ExerciseSession.session_completed == True,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Sessions this month
        month_start = date.today().replace(day=1)
        sessions_this_month = db.query(func.count(ExerciseSession.id)).filter(
            ExerciseSession.patient_id == patient_id,
            func.date(ExerciseSession.start_time) >= month_start,
            ExerciseSession.session_completed == True,
            ExerciseSession.is_deleted == False
        ).scalar() or 0
        
        # Exercises tried
        exercises_tried = db.query(func.count(func.distinct(ExerciseProgress.exercise_name))).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.is_deleted == False
        ).scalar() or 0
        
        # Most practiced exercise
        most_practiced = db.query(
            ExerciseProgress.exercise_name
        ).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.is_deleted == False
        ).order_by(desc(ExerciseProgress.completion_count)).first()
        
        # Favorite exercise
        favorite = db.query(ExerciseProgress.exercise_name).filter(
            ExerciseProgress.patient_id == patient_id,
            ExerciseProgress.is_favorite == True,
            ExerciseProgress.is_deleted == False
        ).first()
        
        # Average mood improvement
        avg_mood = db.query(func.avg(ExerciseSession.mood_improvement)).filter(
            ExerciseSession.patient_id == patient_id,
            ExerciseSession.mood_improvement.isnot(None),
            ExerciseSession.is_deleted == False
        ).scalar()
        
        # Total achievements
        total_achievements = db.query(func.count(UserAchievement.id)).filter(
            UserAchievement.patient_id == patient_id,
            UserAchievement.is_deleted == False
        ).scalar() or 0
        
        # Achievements this month
        achievements_this_month = db.query(func.count(UserAchievement.id)).filter(
            UserAchievement.patient_id == patient_id,
            func.date(UserAchievement.unlocked_at) >= month_start,
            UserAchievement.is_deleted == False
        ).scalar() or 0
        
        # Active and completed goals
        active_goals = db.query(func.count(UserGoal.id)).filter(
            UserGoal.patient_id == patient_id,
            UserGoal.status == GoalStatus.ACTIVE,
            UserGoal.is_deleted == False
        ).scalar() or 0
        
        completed_goals = db.query(func.count(UserGoal.id)).filter(
            UserGoal.patient_id == patient_id,
            UserGoal.status == GoalStatus.COMPLETED,
            UserGoal.is_deleted == False
        ).scalar() or 0
        
        # Days since last practice
        days_since_last = None
        if streak.last_practice_date:
            days_since_last = (date.today() - streak.last_practice_date).days
        
        return {
            'current_streak': streak.current_streak,
            'longest_streak': streak.longest_streak,
            'total_sessions': total_sessions,
            'total_practice_time_hours': round(total_time / 3600, 2) if total_time else 0,
            'sessions_this_week': sessions_this_week,
            'sessions_this_month': sessions_this_month,
            'exercises_tried': exercises_tried,
            'favorite_exercise': favorite[0] if favorite else None,
            'most_practiced_exercise': most_practiced[0] if most_practiced else None,
            'average_mood_improvement': round(avg_mood, 2) if avg_mood else None,
            'total_achievements': total_achievements,
            'achievements_this_month': achievements_this_month,
            'active_goals': active_goals,
            'completed_goals': completed_goals,
            'last_practice_date': streak.last_practice_date,
            'days_since_last_practice': days_since_last,
        }


# ============================================================================
# EXPORTS
# ============================================================================

__all__ = ['ProgressService']

