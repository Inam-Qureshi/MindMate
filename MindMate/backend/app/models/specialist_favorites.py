"""
Specialist Favorites Model
Allows patients to bookmark/favorite specialists for quick access
"""

from sqlalchemy import Column, ForeignKey, DateTime, Index, UniqueConstraint
from sqlalchemy.dialects.postgresql import UUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func

from .base import BaseModel as SQLBaseModel, Base


class SpecialistFavorite(Base, SQLBaseModel):
    """
    Specialist Favorites - Bookmarks created by patients for specialists
    Similar to ForumBookmark but for specialists
    """
    __tablename__ = "specialist_favorites"
    
    __table_args__ = (
        Index('idx_specialist_favorite_patient', 'patient_id'),
        Index('idx_specialist_favorite_specialist', 'specialist_id'),
        Index('idx_specialist_favorite_created', 'created_at'),
        UniqueConstraint('patient_id', 'specialist_id', name='uq_patient_specialist_favorite'),
        {'extend_existing': True}
    )

    # Foreign Keys
    patient_id = Column(UUID(as_uuid=True), ForeignKey("patients.id", ondelete="CASCADE"), nullable=False, index=True)
    specialist_id = Column(UUID(as_uuid=True), ForeignKey("specialists.id", ondelete="CASCADE"), nullable=False, index=True)
    
    # Favorite Details
    created_at = Column(DateTime(timezone=True), server_default=func.now(), nullable=False, index=True)
    
    # Relationships
    patient = relationship("Patient", back_populates="specialist_favorites")
    specialist = relationship("Specialists", back_populates="favorited_by")
    
    def __repr__(self) -> str:
        return f"<SpecialistFavorite(patient_id={self.patient_id}, specialist_id={self.specialist_id})>"
