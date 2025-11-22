"""
Specialist Favorites Router
Handles favoriting/unfavoriting specialists and retrieving favorites
"""

from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from sqlalchemy.exc import IntegrityError
from pydantic import BaseModel
from datetime import datetime

from app.db.session import get_db
from app.api.v1.endpoints.auth import get_current_user_from_token
from app.models.specialist_favorites import SpecialistFavorite
from app.models.specialist import Specialists
from app.models.patient import Patient

router = APIRouter(prefix="/specialists", tags=["specialist-favorites"])


# ============================================================================
# PYDANTIC MODELS
# ============================================================================

class FavoriteResponse(BaseModel):
    """Response model for favorite status"""
    is_favorited: bool
    favorited_at: datetime = None
    
    class Config:
        from_attributes = True


class SpecialistFavoriteResponse(BaseModel):
    """Response model for favorited specialist"""
    specialist_id: str
    specialist_name: str
    specialist_type: Optional[str] = None
    consultation_fee: Optional[float] = None
    average_rating: Optional[float] = None
    city: Optional[str] = None
    favorited_at: datetime
    
    class Config:
        from_attributes = True


# ============================================================================
# ENDPOINTS
# ============================================================================

@router.post("/{specialist_id}/favorite", response_model=FavoriteResponse)
async def toggle_specialist_favorite(
    specialist_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Toggle favorite status for a specialist
    Creates favorite if doesn't exist, removes if exists
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]
        
        if user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients can favorite specialists"
            )
        
        # Verify specialist exists
        specialist = db.query(Specialists).filter(Specialists.id == specialist_id).first()
        if not specialist:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Specialist not found"
            )
        
        # Check if favorite already exists
        existing_favorite = db.query(SpecialistFavorite).filter(
            SpecialistFavorite.patient_id == user.id,
            SpecialistFavorite.specialist_id == specialist_id
        ).first()
        
        if existing_favorite:
            # Remove favorite
            db.delete(existing_favorite)
            db.commit()
            return FavoriteResponse(is_favorited=False)
        else:
            # Add favorite
            new_favorite = SpecialistFavorite(
                patient_id=user.id,
                specialist_id=specialist_id
            )
            db.add(new_favorite)
            db.commit()
            db.refresh(new_favorite)
            
            return FavoriteResponse(
                is_favorited=True,
                favorited_at=new_favorite.created_at
            )
            
    except IntegrityError:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Error updating favorite status"
        )
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to update favorite: {str(e)}"
        )


@router.get("/{specialist_id}/favorite", response_model=FavoriteResponse)
async def get_specialist_favorite_status(
    specialist_id: str,
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get favorite status for a specific specialist
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]
        
        if user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients can check favorite status"
            )
        
        # Check if favorite exists
        favorite = db.query(SpecialistFavorite).filter(
            SpecialistFavorite.patient_id == user.id,
            SpecialistFavorite.specialist_id == specialist_id
        ).first()
        
        if favorite:
            return FavoriteResponse(
                is_favorited=True,
                favorited_at=favorite.created_at
            )
        else:
            return FavoriteResponse(is_favorited=False)
            
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorite status: {str(e)}"
        )


@router.get("/favorites", response_model=List[SpecialistFavoriteResponse])
async def get_patient_favorites(
    current_user_data: dict = Depends(get_current_user_from_token),
    db: Session = Depends(get_db)
):
    """
    Get all favorited specialists for the current patient
    """
    try:
        user = current_user_data["user"]
        user_type = current_user_data["user_type"]
        
        if user_type != "patient":
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only patients can view favorites"
            )
        
        # Get all favorites with specialist details
        favorites = db.query(SpecialistFavorite, Specialists).join(
            Specialists, SpecialistFavorite.specialist_id == Specialists.id
        ).filter(
            SpecialistFavorite.patient_id == user.id
        ).order_by(SpecialistFavorite.created_at.desc()).all()
        
        result = []
        for favorite, specialist in favorites:
            result.append(SpecialistFavoriteResponse(
                specialist_id=str(specialist.id),
                specialist_name=f"{specialist.first_name} {specialist.last_name}",
                specialist_type=specialist.specialist_type.value if specialist.specialist_type else None,
                consultation_fee=float(specialist.consultation_fee) if specialist.consultation_fee else None,
                average_rating=float(specialist.average_rating) if specialist.average_rating is not None else None,
                city=specialist.city if specialist.city else None,
                favorited_at=favorite.created_at
            ))
        
        return result
        
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Failed to get favorites: {str(e)}"
        )
