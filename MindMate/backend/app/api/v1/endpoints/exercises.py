"""
Exercises Router - Mental Health Exercises API
Serves mental health exercises from exercises.json
"""

from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json
from pathlib import Path
import logging

logger = logging.getLogger(__name__)

router = APIRouter(prefix="/exercises", tags=["Exercises"])

# Path to exercises.json
EXERCISES_FILE = Path(__file__).parent.parent.parent.parent / "static" / "exercises.json"


@router.get("", response_class=JSONResponse)
async def get_exercises():
    """
    Get all mental health exercises
    
    Returns:
        JSON object containing all exercises
    """
    try:
        if not EXERCISES_FILE.exists():
            logger.error(f"Exercises file not found at: {EXERCISES_FILE}")
            raise HTTPException(
                status_code=404,
                detail="Exercises file not found"
            )
        
        with open(EXERCISES_FILE, 'r', encoding='utf-8') as f:
            exercises_data = json.load(f)
        
        logger.info(f"Successfully loaded {len(exercises_data.get('exercises', []))} exercises")
        return JSONResponse(content=exercises_data)
        
    except json.JSONDecodeError as e:
        logger.error(f"Invalid JSON in exercises file: {e}")
        raise HTTPException(
            status_code=500,
            detail="Invalid exercises data format"
        )
    except Exception as e:
        logger.error(f"Error loading exercises: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load exercises: {str(e)}"
        )


@router.get("/{exercise_name}")
async def get_exercise_by_name(exercise_name: str):
    """
    Get a specific exercise by name
    
    Args:
        exercise_name: Name of the exercise to retrieve
        
    Returns:
        JSON object containing the exercise details
    """
    try:
        if not EXERCISES_FILE.exists():
            raise HTTPException(
                status_code=404,
                detail="Exercises file not found"
            )
        
        with open(EXERCISES_FILE, 'r', encoding='utf-8') as f:
            exercises_data = json.load(f)
        
        # Find exercise by name (case-insensitive)
        for exercise in exercises_data.get('exercises', []):
            if exercise.get('name', '').lower() == exercise_name.lower():
                return JSONResponse(content=exercise)
        
        raise HTTPException(
            status_code=404,
            detail=f"Exercise '{exercise_name}' not found"
        )
        
    except HTTPException:
        raise
    except Exception as e:
        logger.error(f"Error loading exercise: {e}")
        raise HTTPException(
            status_code=500,
            detail=f"Failed to load exercise: {str(e)}"
        )

