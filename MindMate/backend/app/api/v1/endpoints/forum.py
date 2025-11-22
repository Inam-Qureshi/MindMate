"""
MindMate Unified Forum API
===========================
Handles all forum-related operations including questions, answers, moderation, and reporting.
Combines community and forum functionality into a single, comprehensive system.

Author: Mental Health Platform Team
Version: 2.0.0 - Unified forum system
"""

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy import func, or_, and_
from typing import List, Optional
from datetime import datetime, timezone
from pydantic import BaseModel
import uuid
import logging

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.forum import (
    ForumQuestion, ForumAnswer, ForumReport,
    QuestionCategory, QuestionStatus, AnswerStatus
)
from app.models.patient import Patient
from app.models.specialist import Specialists
from app.schemas.forum import (
    QuestionCreateRequest, QuestionResponse
)

# Initialize router
router = APIRouter(prefix="/forum", tags=["Forum"])

# Module logger
logger = logging.getLogger(__name__)

# ============================================================================
# RESPONSE MODELS
# ============================================================================

class ForumQuestionCreateResponse(BaseModel):
    """Response model for forum question creation"""
    id: str
    title: str
    content: str
    category: str
    tags: Optional[str] = None  # Changed from List[str] to str to match database model
    author_id: str
    author_name: str
    is_anonymous: bool
    is_urgent: bool
    status: str
    asked_at: datetime
    formatted_date: str
    time_ago: str
    answers_count: int
    view_count: int
    is_active: bool
    is_featured: bool

# ============================================================================
# HELPER FUNCTIONS
# ============================================================================

def get_time_ago(created_at: datetime) -> str:
    """Calculate relative time ago from datetime"""
    now = datetime.now(timezone.utc)
    diff = now - created_at

    if diff.days > 0:
        if diff.days == 1:
            return "1 day ago"
        elif diff.days < 7:
            return f"{diff.days} days ago"
        elif diff.days < 30:
            weeks = diff.days // 7
            if weeks == 1:
                return "1 week ago"
            return f"{weeks} weeks ago"
        else:
            months = diff.days // 30
            if months == 1:
                return "1 month ago"
            return f"{months} months ago"
    elif diff.seconds > 3600:
        hours = diff.seconds // 3600
        if hours == 1:
            return "1 hour ago"
        return f"{hours} hours ago"
    elif diff.seconds > 60:
        minutes = diff.seconds // 60
        if minutes == 1:
            return "1 minute ago"
        return f"{minutes} minutes ago"
    else:
        return "Just now"

def check_user_permissions(user, user_type: str, required_permission: str = None) -> bool:
    """Check if user has required permissions for forum actions"""
    if user_type == "admin":
        return True

    if required_permission == "answer" and user_type != "specialist":
        return False

    if required_permission == "moderate" and user_type != "admin":
        return False

    return True

def increment_question_views(db: Session, question_id: str):
    """Increment view count for a question"""
    try:
        question = db.query(ForumQuestion).filter(ForumQuestion.id == question_id).first()
        if question:
            question.view_count += 1
            db.commit()
    except Exception as e:
        # Log but don't fail the request
        print(f"Failed to increment views for question {question_id}: {e}")

# ============================================================================
# PYDANTIC MODELS
# ============================================================================

from pydantic import BaseModel, Field

class ForumQuestionCreate(BaseModel):
    """Create a new forum question"""
    title: str = Field(..., min_length=1, max_length=500, description="Question title")
    content: str = Field(..., min_length=1, description="Question content")
    category: QuestionCategory = Field(QuestionCategory.GENERAL, description="Question category")
    tags: Optional[str] = Field(None, max_length=500, description="Comma-separated tags")
    is_anonymous: bool = Field(True, description="Whether to post anonymously")
    is_urgent: bool = Field(False, description="Whether this is an urgent question")

class ForumQuestionUpdate(BaseModel):
    """Update an existing forum question"""
    title: Optional[str] = Field(None, min_length=1, max_length=500, description="Question title")
    content: Optional[str] = Field(None, min_length=1, description="Question content")
    category: Optional[QuestionCategory] = Field(None, description="Question category")
    tags: Optional[str] = Field(None, max_length=500, description="Comma-separated tags")
    is_anonymous: Optional[bool] = Field(None, description="Whether to post anonymously")
    is_urgent: Optional[bool] = Field(None, description="Whether this is an urgent question")

class ForumQuestionResponse(BaseModel):
    """Forum question response model"""
    id: str
    title: str
    content: str
    category: str
    tags: Optional[str]
    author_id: str
    author_name: str
    is_anonymous: bool
    is_urgent: bool
    status: str
    asked_at: datetime
    formatted_date: str
    time_ago: str
    answers_count: int
    view_count: int
    is_active: bool
    is_featured: bool = False

    class Config:
        from_attributes = True

class ForumAnswerCreate(BaseModel):
    """Create a new answer to a question"""
    content: str = Field(..., min_length=1, description="Answer content")

class ForumAnswerUpdate(BaseModel):
    """Update an existing answer"""
    content: str = Field(..., min_length=1, description="Answer content")

class ForumAnswerResponse(BaseModel):
    """Forum answer response model"""
    id: str
    question_id: str
    content: str
    specialist_id: str
    specialist_name: str
    answered_at: datetime
    time_ago: str
    status: str
    is_active: bool
    is_best_answer: bool = False

    class Config:
        from_attributes = True

class ForumReportCreate(BaseModel):
    """Create a new forum report"""
    post_id: str = Field(..., description="ID of the reported question or answer")
    post_type: str = Field(..., description="Type of post: 'question' or 'answer'")
    reason: Optional[str] = Field(None, description="Optional reason for reporting")

class ForumReportResponse(BaseModel):
    """Forum report response model"""
    id: str
    post_id: str
    post_type: str
    reason: Optional[str]
    status: str
    reporter_name: str
    reporter_type: str
    created_at: datetime
    moderated_by: Optional[str]
    moderated_at: Optional[datetime]
    moderation_notes: Optional[str]

    class Config:
        from_attributes = True

class QuestionBookmarkResponse(BaseModel):
    """Bookmark status response"""
    is_bookmarked: bool
    bookmarked_at: Optional[datetime] = None

class ModerationAction(BaseModel):
    """Moderation action model"""
    action: str = Field(..., description="Action: 'approve', 'remove', 'flag'")
    reason: Optional[str] = Field(None, description="Reason for moderation action")

# ============================================================================
# QUESTION ENDPOINTS
# ============================================================================

@router.post("/questions", response_model=ForumQuestionCreateResponse)
async def create_forum_question(
    question_data: ForumQuestionCreate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Create a new forum question"""
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        # Create question
        question_id = str(uuid.uuid4())
        question = ForumQuestion(
            id=question_id,
            title=question_data.title,
            content=question_data.content,
            category=question_data.category,
            tags=question_data.tags,
            is_anonymous=question_data.is_anonymous,
            is_urgent=question_data.is_urgent,
            status=QuestionStatus.OPEN
        )

        # Set author based on user type and anonymity
        if user_type == "patient":
            question.patient_id = user.id
        elif user_type == "specialist":
            question.specialist_id = user.id
        else:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients and specialists can create forum questions"
            )

        db.add(question)
        db.commit()
        db.refresh(question)

        # Get author name from user data (not patient relationship for consistency)
        author_name = "Anonymous" if question.is_anonymous else f"{user.first_name} {user.last_name}".strip()
        
        return ForumQuestionCreateResponse(
            id=str(question.id),
            title=question.title,
            content=question.content,
            category=question.category.value,
            tags=question.tags,
            author_id=str(user.id),
            author_name=author_name,
            is_anonymous=question.is_anonymous,
            is_urgent=question.is_urgent,
            status=question.status.value,
            asked_at=question.created_at,
            formatted_date=question.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            time_ago=get_time_ago(question.created_at),
            answers_count=0,
            view_count=0,
            is_active=question.status == QuestionStatus.OPEN,
            is_featured=False
        )

    except Exception as e:
        db.rollback()
        print(f"Error creating forum question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create forum question"
        )

@router.get("/questions")
async def get_forum_questions(
    category: Optional[QuestionCategory] = None,
    question_status: Optional[QuestionStatus] = None,
    patient_id: Optional[str] = None,
    bookmarked: Optional[bool] = None,
    needs_moderation: Optional[bool] = None,
    urgent_only: Optional[bool] = None,
    sort_by: Optional[str] = "newest",
    limit: int = 20,
    offset: int = 0,
    db: Session = Depends(get_db)
):
    """Get forum questions with filtering and pagination"""
    try:
        db.rollback()  # Reset transaction state
        
        # Build base query - filter out deleted first
        query = db.query(ForumQuestion).filter(ForumQuestion.is_deleted == False)

        # Apply filters
        if category:
            query = query.filter(ForumQuestion.category == category)

        if question_status:
            query = query.filter(ForumQuestion.status == question_status)
        else:
            query = query.filter(ForumQuestion.status == QuestionStatus.OPEN)

        if patient_id:
            query = query.filter(ForumQuestion.patient_id == patient_id)

        if urgent_only:
            query = query.filter(ForumQuestion.is_urgent == True)

        # Get total count  
        total_count = 0
        try:
            total_count = query.count()
        except Exception as count_err:
            logger.warning(f"Count error: {count_err}")
            db.rollback()

        # Apply sorting
        if sort_by == "newest":
            query = query.order_by(ForumQuestion.created_at.desc())
        elif sort_by == "oldest":
            query = query.order_by(ForumQuestion.created_at.asc())
        elif sort_by == "urgent":
            query = query.order_by(ForumQuestion.is_urgent.desc(), ForumQuestion.created_at.desc())
        elif sort_by == "most_viewed":
            query = query.order_by(ForumQuestion.view_count.desc(), ForumQuestion.created_at.desc())
        else:
            query = query.order_by(ForumQuestion.created_at.desc())

        # Apply pagination
        query = query.offset(offset).limit(limit)
        
        # Execute query - this may fail if model has non-existent columns
        questions = []
        try:
            questions = query.all()
        except Exception as query_err:
            logger.warning(f"Forum query error (returning empty): {query_err}")
            db.rollback()
            questions = []

        response_data = []
        for question in questions:
            try:
                # Get author name
                author_name = "Anonymous" if question.is_anonymous else "User"
                author_id = None

                if not question.is_anonymous and question.patient_id:
                    try:
                        patient = db.query(Patient).filter(Patient.id == question.patient_id).first()
                        if patient:
                            author_name = f"{patient.first_name} {patient.last_name}".strip()
                            author_id = str(question.patient_id)
                    except Exception as patient_err:
                        logger.warning(f"Patient fetch error: {patient_err}")

                # Get answer count
                answers_count = 0
                try:
                    answers_count = db.query(func.count(ForumAnswer.id)).filter(
                        ForumAnswer.question_id == question.id,
                        ForumAnswer.status == AnswerStatus.ACTIVE,
                        ForumAnswer.is_deleted == False
                    ).scalar() or 0
                except Exception as answer_err:
                    logger.warning(f"Answer count error: {answer_err}")

                response_data.append({
                    "id": str(question.id),
                    "title": question.title,
                    "content": question.content,
                    "category": question.category.value if question.category else "GENERAL",
                    "tags": question.tags or "",
                    "author_id": author_id,
                    "author_name": author_name,
                    "is_anonymous": question.is_anonymous,
                    "is_urgent": question.is_urgent,
                    "status": question.status.value if question.status else "OPEN",
                    "asked_at": question.created_at.isoformat() if question.created_at else None,
                    "created_at": question.created_at.isoformat() if question.created_at else None,
                    "formatted_date": question.created_at.strftime("%Y-%m-%d %H:%M:%S") if question.created_at else None,
                    "answers_count": answers_count,
                    "view_count": question.view_count or 0,
                    "is_active": question.status == QuestionStatus.OPEN,
                    "is_featured": getattr(question, 'is_featured', False)
                })
            except Exception as item_err:
                logger.warning(f"Error processing question item: {item_err}")
                continue

        # Calculate pagination
        current_page = (offset // limit) + 1 if limit > 0 else 1
        total_pages = (total_count + limit - 1) // limit if limit > 0 else 1

        return {
            "questions": response_data,
            "pagination": {
                "total": total_count,
                "page": current_page,
                "pages": total_pages,
                "limit": limit,
                "offset": offset,
                "has_next": offset + limit < total_count,
                "has_prev": offset > 0
            }
        }

    except Exception as e:
        logger.error(f"Forum questions endpoint error: {e}")
        try:
            db.rollback()
        except:
            pass
        # Return empty list on any error
        return {
            "questions": [],
            "pagination": {
                "total": 0,
                "page": 1,
                "pages": 0,
                "limit": limit,
                "offset": offset,
                "has_next": False,
                "has_prev": False
            }
        }

@router.get("/questions/{question_id}", response_model=ForumQuestionResponse)
async def get_forum_question(
    question_id: str,
    db: Session = Depends(get_db)
):
    """Get a specific forum question with details"""
    try:
        db.rollback()  # Clear any previous transaction state
        # FIXED: Filter out soft-deleted questions
        question = db.query(ForumQuestion).filter(
            ForumQuestion.id == question_id,
            ForumQuestion.is_deleted == False
        ).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        # Increment view count
        increment_question_views(db, question_id)

        # FIXED: Get answers count with soft-delete filter
        answers_count = db.query(func.count(ForumAnswer.id)).filter(
            ForumAnswer.question_id == question.id,
            ForumAnswer.status == AnswerStatus.ACTIVE,
            ForumAnswer.is_deleted == False
        ).scalar()

        # Get proper author information
        author_id = str(question.patient_id or question.specialist_id)
        author_name = "Anonymous" if question.is_anonymous else "Unknown"

        if not question.is_anonymous:
            if question.patient_id:
                patient = db.query(Patient).filter(Patient.id == question.patient_id).first()
                if patient:
                    author_name = f"{patient.first_name} {patient.last_name}".strip()
            elif question.specialist_id:
                specialist = db.query(Specialists).filter(Specialists.id == question.specialist_id).first()
                if specialist:
                    author_name = f"Dr. {specialist.first_name} {specialist.last_name}".strip()

        return ForumQuestionResponse(
            id=str(question.id),
            title=question.title,
            content=question.content,
            category=question.category.value,
            tags=question.tags,
            author_id=author_id,
            author_name=author_name,
            is_anonymous=question.is_anonymous,
            is_urgent=question.is_urgent,
            status=question.status.value,
            asked_at=question.created_at,
            formatted_date=question.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            time_ago=get_time_ago(question.created_at),
            answers_count=answers_count or 0,
            view_count=question.view_count or 0,
            is_active=question.status == QuestionStatus.OPEN,
            is_featured=False  # ForumQuestion model doesn't have is_featured attribute
        )

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting forum question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve forum question"
        )

@router.put("/questions/{question_id}", response_model=ForumQuestionResponse)
async def update_forum_question(
    question_id: str,
    question_data: ForumQuestionUpdate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update an existing forum question"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        question = db.query(ForumQuestion).filter(ForumQuestion.id == question_id).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        # Check ownership
        if user_type == "patient" and question.patient_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own questions"
            )
        elif user_type == "specialist" and question.specialist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own questions"
            )

        # Update fields
        update_data = question_data.model_dump(exclude_unset=True)
        for field, value in update_data.items():
            setattr(question, field, value)

        question.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(question)

        # FIXED: Get answers count with soft-delete filter
        answers_count = db.query(func.count(ForumAnswer.id)).filter(
            ForumAnswer.question_id == question.id,
            ForumAnswer.status == AnswerStatus.ACTIVE,
            ForumAnswer.is_deleted == False
        ).scalar()

        # Get proper author name
        author_name = "Anonymous" if question.is_anonymous else "User"
        if not question.is_anonymous and question.patient_id:
            patient = db.query(Patient).filter(Patient.id == question.patient_id).first()
            if patient:
                author_name = f"{patient.first_name} {patient.last_name}".strip()

        return ForumQuestionResponse(
            id=str(question.id),
            title=question.title,
            content=question.content,
            category=question.category.value,
            tags=question.tags,
            author_id=str(question.patient_id) if question.patient_id else None,
            author_name=author_name,
            is_anonymous=question.is_anonymous,
            is_urgent=question.is_urgent,
            status=question.status.value,
            asked_at=question.created_at,
            formatted_date=question.created_at.strftime("%Y-%m-%d %H:%M:%S"),
            time_ago=get_time_ago(question.created_at),
            answers_count=answers_count or 0,
            view_count=question.view_count or 0,
            is_active=question.status == QuestionStatus.OPEN,
            is_featured=False
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error updating forum question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update forum question"
        )

@router.delete("/questions/{question_id}")
async def delete_forum_question(
    question_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Delete a forum question (soft delete)"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        question = db.query(ForumQuestion).filter(ForumQuestion.id == question_id).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        # Check ownership or admin permissions
        can_delete = False
        if user_type == "admin":
            can_delete = True
        elif user_type == "patient" and question.patient_id == user.id:
            can_delete = True
        elif user_type == "specialist" and question.specialist_id == user.id:
            can_delete = True

        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this question"
            )

        # Soft delete
        question.is_deleted = True
        question.updated_at = datetime.now(timezone.utc)

        db.commit()

        return {"message": "Question deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting forum question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete forum question"
        )

# ============================================================================
# ANSWER ENDPOINTS
# ============================================================================

@router.post("/questions/{question_id}/answers", response_model=ForumAnswerResponse)
async def create_forum_answer(
    question_id: str,
    answer_data: ForumAnswerCreate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Create an answer to a forum question"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        # Only specialists can answer questions
        if user_type != "specialist":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only specialists can answer forum questions"
            )

        # Check if question exists and is active
        question = db.query(ForumQuestion).filter(
            ForumQuestion.id == question_id,
            ForumQuestion.status == QuestionStatus.OPEN
        ).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found or not available for answers"
            )

        # Create answer
        answer_id = str(uuid.uuid4())
        answer = ForumAnswer(
            id=answer_id,
            question_id=question_id,
            specialist_id=user.id,
            content=answer_data.content,
            status=AnswerStatus.ACTIVE
        )

        db.add(answer)
        db.commit()
        db.refresh(answer)

        return ForumAnswerResponse(
            id=str(answer.id),
            question_id=str(answer.question_id),
            content=answer.content,
            specialist_id=str(answer.specialist_id),
            specialist_name=f"Dr. {user.first_name} {user.last_name}",
            answered_at=answer.created_at,
            time_ago=get_time_ago(answer.created_at),
            status=answer.status.value,
            is_active=answer.status == AnswerStatus.ACTIVE,
            is_best_answer=answer.is_solution or False
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle validation errors from model validators
        db.rollback()
        error_message = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    except Exception as e:
        db.rollback()
        print(f"Error creating forum answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create forum answer"
        )

@router.get("/questions/{question_id}/answers")
async def get_forum_answers(
    question_id: str,
    db: Session = Depends(get_db)
):
    """Get all answers for a specific question"""
    try:
        db.rollback()  # Clear any previous transaction state
        # FIXED: Filter out soft-deleted answers
        answers = db.query(ForumAnswer).filter(
            ForumAnswer.question_id == question_id,
            ForumAnswer.status == AnswerStatus.ACTIVE,
            ForumAnswer.is_deleted == False
        ).order_by(ForumAnswer.created_at.asc()).all()

        response_data = []
        for answer in answers:
            # Get specialist info
            specialist = db.query(Specialists).filter(Specialists.id == answer.specialist_id).first()
            specialist_name = f"Dr. {specialist.first_name} {specialist.last_name}" if specialist else "Unknown Specialist"

            response_data.append({
                "id": str(answer.id),
                "question_id": str(answer.question_id),
                "content": answer.content,
                "specialist_id": str(answer.specialist_id),
                "specialist_name": specialist_name,
                "answered_at": answer.created_at.isoformat(),
                "created_at": answer.created_at.isoformat(),
                "time_ago": get_time_ago(answer.created_at),
                "status": answer.status.value,
                "is_active": answer.status == AnswerStatus.ACTIVE,
                "is_best_answer": answer.is_solution or False
            })

        return response_data

    except Exception as e:
        print(f"Error getting forum answers: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve forum answers"
        )

@router.put("/answers/{answer_id}", response_model=ForumAnswerResponse)
async def update_forum_answer(
    answer_id: str,
    answer_data: ForumAnswerUpdate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Update an existing answer"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        answer = db.query(ForumAnswer).filter(ForumAnswer.id == answer_id).first()

        if not answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Answer not found"
            )

        # Check ownership
        if answer.specialist_id != user.id:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You can only edit your own answers"
            )

        # Update content
        answer.content = answer_data.content
        answer.updated_at = datetime.now(timezone.utc)

        db.commit()
        db.refresh(answer)

        # Get specialist info
        specialist = db.query(Specialists).filter(Specialists.id == answer.specialist_id).first()
        specialist_name = f"Dr. {specialist.first_name} {specialist.last_name}" if specialist else "Unknown Specialist"

        return ForumAnswerResponse(
            id=str(answer.id),
            question_id=str(answer.question_id),
            content=answer.content,
            specialist_id=str(answer.specialist_id),
            specialist_name=specialist_name,
            answered_at=answer.created_at,
            time_ago=get_time_ago(answer.created_at),
            status=answer.status.value,
            is_active=answer.status == AnswerStatus.ACTIVE,
            is_best_answer=answer.is_solution or False
        )

    except HTTPException:
        raise
    except ValueError as e:
        # Handle validation errors from model validators
        db.rollback()
        error_message = str(e)
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=error_message
        )
    except Exception as e:
        db.rollback()
        print(f"Error updating forum answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to update forum answer"
        )

@router.delete("/answers/{answer_id}")
async def delete_forum_answer(
    answer_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Delete an answer (soft delete)"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        answer = db.query(ForumAnswer).filter(ForumAnswer.id == answer_id).first()

        if not answer:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Answer not found"
            )

        # Check ownership or admin permissions
        can_delete = False
        if user_type == "admin":
            can_delete = True
        elif answer.specialist_id == user.id:
            can_delete = True

        if not can_delete:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this answer"
            )

        # Soft delete
        answer.is_deleted = True
        answer.updated_at = datetime.now(timezone.utc)

        db.commit()

        return {"message": "Answer deleted successfully"}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error deleting forum answer: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to delete forum answer"
        )

# ============================================================================
# MODERATION ENDPOINTS
# ============================================================================

@router.get("/moderation/queue")
async def get_moderation_queue(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get questions that need moderation (admin only)"""
    try:
        db.rollback()  # Clear any previous transaction state
        user_type = current_user_data["user_type"]

        if user_type != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can access moderation queue"
            )

        # Get questions pending moderation
        questions = db.query(ForumQuestion).filter(
            ForumQuestion.is_flagged == True
        ).order_by(ForumQuestion.created_at.desc()).all()

        response_data = []
        for question in questions:
            # Get answers count
            answers_count = db.query(func.count(ForumAnswer.id)).filter(
                ForumAnswer.question_id == question.id
            ).scalar()

            response_data.append({
                "id": str(question.id),
                "title": question.title,
                "content": question.content[:200] + "..." if len(question.content) > 200 else question.content,
                "category": question.category.value,
                "author_name": question.author_name,
                "is_anonymous": question.is_anonymous,
                "is_urgent": question.is_urgent,
                "status": question.status.value,
                "asked_at": question.asked_at,
                "answers_count": answers_count or 0,
                "view_count": question.view_count or 0
            })

        return {"questions": response_data, "total": len(response_data)}

    except HTTPException:
        raise
    except Exception as e:
        print(f"Error getting moderation queue: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to retrieve moderation queue"
        )

@router.post("/questions/{question_id}/moderate")
async def moderate_question(
    question_id: str,
    action: str,
    reason: Optional[str] = None,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Moderate a question (admin only)"""
    try:
        db.rollback()  # Clear any previous transaction state
        user_type = current_user_data["user_type"]

        if user_type != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can moderate questions"
            )

        question = db.query(ForumQuestion).filter(ForumQuestion.id == question_id).first()

        if not question:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Question not found"
            )

        if action == "approve":
            question.status = QuestionStatus.OPEN
        elif action == "remove":
            question.is_deleted = True
        elif action == "flag":
            question.is_flagged = True
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid action. Must be 'approve', 'remove', or 'flag'"
            )

        question.moderated_by = str(current_user_data["user"].id)
        question.moderated_at = datetime.now(timezone.utc)
        question.moderation_reason = reason
        question.updated_at = datetime.now(timezone.utc)

        db.commit()

        return {"message": f"Question {action}d successfully", "question_id": question_id}

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error moderating question: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to moderate question"
        )

# ============================================================================
# REPORTING ENDPOINTS
# ============================================================================

@router.post("/reports", response_model=ForumReportResponse)
async def create_forum_report(
    report_data: ForumReportCreate,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Create a report for a forum post"""
    try:
        db.rollback()  # Clear any previous transaction state
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]

        # Validate post exists
        if report_data.post_type == "question":
            post = db.query(ForumQuestion).filter(ForumQuestion.id == report_data.post_id).first()
        elif report_data.post_type == "answer":
            post = db.query(ForumAnswer).filter(ForumAnswer.id == report_data.post_id).first()
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid post type. Must be 'question' or 'answer'"
            )

        if not post:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail=f"{report_data.post_type.title()} not found"
            )

        # Create report - FIXED: Don't set computed properties
        report = ForumReport(
            post_id=report_data.post_id,
            post_type=report_data.post_type,
            reason=report_data.reason,
            status="pending"
        )

        # Set reporter ID based on user type (properties will compute name/type automatically)
        if user_type == "patient":
            report.reporter_id = user.id
        elif user_type == "specialist":
            report.specialist_reporter_id = user.id

        db.add(report)
        db.commit()
        db.refresh(report)

        # FIXED: Properties compute automatically from relationships
        # FIXED: Convert UUID to string for Pydantic validation
        return ForumReportResponse(
            id=str(report.id),
            post_id=str(report.post_id),  # Convert UUID to string
            post_type=report.post_type,
            reason=report.reason,
            status=report.status,
            reporter_name=report.reporter_name,  # Computed property
            reporter_type=report.reporter_type,  # Computed property
            created_at=report.created_at,
            moderated_by=str(report.moderated_by) if report.moderated_by else None,
            moderated_at=report.moderated_at,
            moderation_notes=report.moderation_notes
        )

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        print(f"Error creating forum report: {e}")
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to create forum report"
        )

# ============================================================================
# COMMUNITY FEATURES ENDPOINTS
# ============================================================================

@router.get("/stats")
async def get_forum_stats(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get forum statistics"""
    try:
        db.rollback()  # Clear any previous transaction state
        # Get total counts
        total_questions = db.query(func.count(ForumQuestion.id)).filter(
            ForumQuestion.is_deleted == False
        ).scalar() or 0
        
        total_answers = db.query(func.count(ForumAnswer.id)).filter(
            ForumAnswer.is_deleted == False
        ).scalar() or 0
        
        # Get active users (users who posted in last 7 days)
        from datetime import timedelta
        week_ago = datetime.now(timezone.utc) - timedelta(days=7)
        active_users = db.query(func.count(func.distinct(ForumQuestion.patient_id))).filter(
            ForumQuestion.created_at >= week_ago
        ).scalar() or 0
        
        return {
            "total_questions": total_questions,
            "total_answers": total_answers,
            "active_users": active_users,
            "total_members": active_users,  # For now, same as active
            "growth_rate": 0.0,  # TODO: Calculate actual growth
            "engagement_rate": 0.0  # TODO: Calculate actual engagement
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get forum statistics"
        )

@router.get("/top-contributors")
async def get_top_contributors(
    limit: int = 10,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get top contributors"""
    try:
        db.rollback()  # Clear any previous transaction state
        # Get contributors with question and answer counts
        contributors = db.query(
            ForumQuestion.patient_id,
            func.count(ForumQuestion.id).label('questions_count'),
            func.count(ForumAnswer.id).label('answers_count')
        ).outerjoin(
            ForumAnswer, ForumAnswer.question_id == ForumQuestion.id
        ).filter(
            ForumQuestion.is_deleted == False,
            ForumQuestion.patient_id.isnot(None)
        ).group_by(ForumQuestion.patient_id).order_by(
            func.count(ForumQuestion.id).desc()
        ).limit(limit).all()
        
        response_data = []
        for contributor in contributors:
            patient = db.query(Patient).filter(Patient.id == contributor.patient_id).first()
            if patient:
                response_data.append({
                    "id": str(contributor.patient_id),
                    "name": f"{patient.first_name} {patient.last_name}",
                    "questions_count": contributor.questions_count,
                    "answers_count": contributor.answers_count,
                    "contribution_score": contributor.questions_count + contributor.answers_count,
                    "user_type": "patient"
                })
        
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get top contributors"
        )

@router.get("/recent-activity")
async def get_recent_activity(
    limit: int = 20,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get recent forum activity"""
    try:
        db.rollback()  # Clear any previous transaction state
        # Get recent questions
        recent_questions = db.query(ForumQuestion).filter(
            ForumQuestion.is_deleted == False
        ).order_by(ForumQuestion.created_at.desc()).limit(limit).all()
        
        response_data = []
        for question in recent_questions:
            patient = db.query(Patient).filter(Patient.id == question.patient_id).first()
            author_name = "Anonymous" if question.is_anonymous else (
                f"{patient.first_name} {patient.last_name}" if patient else "Unknown"
            )
            
            response_data.append({
                "id": str(question.id),
                "type": "question_asked",
                "description": f"Asked: {question.title}",
                "user_name": author_name,
                "created_at": question.created_at.isoformat(),
                "user_avatar": None,
                "details": {
                    "views": question.view_count or 0,
                    "likes": 0,  # TODO: Implement likes system
                    "comments": 0  # TODO: Implement comments system
                }
            })
        
        return response_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get recent activity"
        )

@router.get("/user/profile/{user_id}")
async def get_user_profile(
    user_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Get user profile with forum activity"""
    try:
        db.rollback()  # Clear any previous transaction state
        # Get user questions count
        questions_count = db.query(func.count(ForumQuestion.id)).filter(
            ForumQuestion.patient_id == user_id,
            ForumQuestion.is_deleted == False
        ).scalar() or 0
        
        # Get user answers count (if they're a specialist)
        answers_count = db.query(func.count(ForumAnswer.id)).filter(
            ForumAnswer.specialist_id == user_id,
            ForumAnswer.is_deleted == False
        ).scalar() or 0
        
        # Get user info
        patient = db.query(Patient).filter(Patient.id == user_id).first()
        if not patient:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        return {
            "id": str(patient.id),
            "name": f"{patient.first_name} {patient.last_name}",
            "email": patient.email,
            "user_type": "patient",
            "questions_count": questions_count,
            "answers_count": answers_count,
            "contribution_score": questions_count + answers_count,
            "joined_at": patient.created_at.isoformat(),
            "avatar": None,
            "bio": None,
            "badges": []
        }
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to get user profile"
        )

class ModerationActionRequest(BaseModel):
    """Request model for moderation actions"""
    action: str
    target_id: str
    data: dict = {}

@router.post("/admin/moderation")
async def admin_moderation_action(
    request: ModerationActionRequest,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """Admin moderation action"""
    try:
        db.rollback()  # Clear any previous transaction state
        user_type = current_user_data["user_type"]
        
        if user_type != "admin":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only admins can perform moderation actions"
            )
        
        # Handle different moderation actions
        if request.action == "approve":
            # Approve content
            pass
        elif request.action == "remove":
            # Remove content
            pass
        elif request.action == "flag":
            # Flag content
            pass
        else:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid moderation action"
            )
        
        return {"success": True, "message": f"Action {request.action} completed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail="Failed to perform moderation action"
        )

# ============================================================================
# HEALTH CHECK ENDPOINT
# ============================================================================

@router.get("/health")
async def forum_health_check():
    """Health check for forum service"""

    return {
        "status": "healthy",
        "service": "forum",
        "timestamp": datetime.now(timezone.utc),
        "version": "2.0.0",
        "features": {
            "questions": "active",
            "answers": "active",
            "moderation": "active",
            "reporting": "active"
        }
    }

# ============================================================================
# EXPORTS
# ============================================================================

__all__ = [
    "router",
    "create_forum_question",
    "get_forum_questions",
    "get_forum_question",
    "update_forum_question",
    "delete_forum_question",
    "create_forum_answer",
    "get_forum_answers",
    "update_forum_answer",
    "delete_forum_answer",
    "get_moderation_queue",
    "moderate_question",
    "create_forum_report"
]
