#!/usr/bin/env python3
"""
Fix AppointmentStatusEnum in PostgreSQL Database
================================================
This script adds missing enum values to the appointmentstatusenum type in PostgreSQL.
Run this script to fix the enum mismatch between code and database.
"""

import sys
import os
from pathlib import Path

# Add the backend directory to the path
backend_dir = Path(__file__).parent.parent
sys.path.insert(0, str(backend_dir))

from sqlalchemy import create_engine, text
from app.core.config import settings
import logging

logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)


def fix_appointment_enum():
    """Add missing enum values to appointmentstatusenum."""
    # Create database connection string
    database_url = (
        f"postgresql://{settings.DB_USER}:{settings.DB_PASSWORD}"
        f"@{settings.DB_HOST}:{settings.DB_PORT}/{settings.DB_NAME}"
    )
    
    engine = create_engine(database_url)
    
    # Enum values that should exist (all lowercase as per Python enum)
    enum_values = [
        'pending_approval',
        'approved',
        'rejected',
        'scheduled',
        'confirmed',
        'in_session',  # This is the missing one causing issues
        'completed',
        'reviewed',
        'cancelled',
        'no_show'
    ]
    
    try:
        with engine.connect() as conn:
            # Check current enum values
            logger.info("Checking current enum values...")
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                WHERE enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'appointmentstatusenum'
                )
                ORDER BY enumlabel;
            """))
            existing_values = [row[0] for row in result]
            logger.info(f"Existing enum values: {existing_values}")
            
            # Add missing values
            added_count = 0
            for value in enum_values:
                if value not in existing_values:
                    try:
                        # PostgreSQL 12+ supports IF NOT EXISTS
                        conn.execute(text(
                            f"ALTER TYPE appointmentstatusenum ADD VALUE IF NOT EXISTS '{value}'"
                        ))
                        conn.commit()
                        logger.info(f"✓ Added enum value: {value}")
                        added_count += 1
                    except Exception as e:
                        # If IF NOT EXISTS is not supported, try without it
                        try:
                            conn.execute(text(
                                f"ALTER TYPE appointmentstatusenum ADD VALUE '{value}'"
                            ))
                            conn.commit()
                            logger.info(f"✓ Added enum value: {value}")
                            added_count += 1
                        except Exception as e2:
                            # Check if value was added by another process
                            if 'already exists' in str(e2).lower() or 'duplicate' in str(e2).lower():
                                logger.info(f"⊘ Enum value '{value}' already exists")
                            else:
                                logger.error(f"✗ Failed to add enum value '{value}': {e2}")
                else:
                    logger.info(f"⊘ Enum value '{value}' already exists")
            
            if added_count > 0:
                logger.info(f"\n✓ Successfully added {added_count} enum value(s)")
            else:
                logger.info("\n✓ All enum values already exist in database")
            
            # Verify final state
            result = conn.execute(text("""
                SELECT enumlabel 
                FROM pg_enum 
                WHERE enumtypid = (
                    SELECT oid FROM pg_type WHERE typname = 'appointmentstatusenum'
                )
                ORDER BY enumlabel;
            """))
            final_values = [row[0] for row in result]
            logger.info(f"\nFinal enum values: {final_values}")
            
            # Check if in_session exists
            if 'in_session' in final_values:
                logger.info("\n✓ 'in_session' enum value is now available!")
                return True
            else:
                logger.error("\n✗ 'in_session' enum value is still missing!")
                return False
                
    except Exception as e:
        logger.error(f"Error fixing enum: {e}", exc_info=True)
        return False
    finally:
        engine.dispose()


if __name__ == "__main__":
    logger.info("=" * 60)
    logger.info("Fixing AppointmentStatusEnum in PostgreSQL Database")
    logger.info("=" * 60)
    
    success = fix_appointment_enum()
    
    if success:
        logger.info("\n" + "=" * 60)
        logger.info("✓ Enum fix completed successfully!")
        logger.info("=" * 60)
        sys.exit(0)
    else:
        logger.error("\n" + "=" * 60)
        logger.error("✗ Enum fix failed. Please check the errors above.")
        logger.error("=" * 60)
        sys.exit(1)

