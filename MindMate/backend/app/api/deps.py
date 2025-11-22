# app/api/deps.py

"""
Shared dependencies for API endpoints.
"""

from typing import Generator
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from jose import jwt, JWTError

from app.core.config import settings
from app.db.session import get_db
from app.models.patient import Patient, PatientAuthInfo
from app.models.specialist import Specialists, SpecialistsAuthInfo
from app.models.admin import Admin

# OAuth2 scheme for token authentication
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def get_current_user(
    token: str = Depends(oauth2_scheme),
    db: Session = Depends(get_db)
):
    """
    Get current authenticated user from JWT token.
    
    Args:
        token: JWT token from request
        db: Database session
        
    Returns:
        User object (Patient, Specialist, or Admin)
        
    Raises:
        HTTPException: If authentication fails
    """
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.JWT_ALGORITHM])
        user_id: str = payload.get("sub")
        user_type: str = payload.get("user_type") or payload.get("type")
        
        if user_id is None or user_type is None:
            raise credentials_exception
            
    except JWTError:
        raise credentials_exception
    
    # Query appropriate table based on user type
    if user_type == "patient":
        user = db.query(Patient).filter(Patient.id == user_id).first()
    elif user_type == "specialist":
        user = db.query(Specialists).filter(Specialists.id == user_id).first()
    elif user_type == "admin":
        user = db.query(Admin).filter(Admin.id == user_id).first()
    else:
        raise credentials_exception
    
    if user is None:
        raise credentials_exception
        
    return user


def get_current_patient(
    current_user = Depends(get_current_user)
) -> Patient:
    """
    Get current authenticated patient.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Patient object
        
    Raises:
        HTTPException: If user is not a patient
    """
    if not isinstance(current_user, Patient):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as patient"
        )
    return current_user


def get_current_specialist(
    current_user = Depends(get_current_user)
) -> Specialists:
    """
    Get current authenticated specialist.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Specialist object
        
    Raises:
        HTTPException: If user is not a specialist
    """
    if not isinstance(current_user, Specialists):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as specialist"
        )
    return current_user


def get_current_admin(
    current_user = Depends(get_current_user)
) -> Admin:
    """
    Get current authenticated admin.
    
    Args:
        current_user: Current authenticated user
        
    Returns:
        Admin object
        
    Raises:
        HTTPException: If user is not an admin
    """
    if not isinstance(current_user, Admin):
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized as admin"
        )
    return current_user


__all__ = [
    "get_db",
    "get_current_user",
    "get_current_patient",
    "get_current_specialist",
    "get_current_admin",
    "oauth2_scheme",
]

