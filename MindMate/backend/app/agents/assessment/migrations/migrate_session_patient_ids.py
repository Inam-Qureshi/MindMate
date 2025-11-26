"""
Migration Script: Add patient_id to Session Metadata

This script migrates existing assessment sessions to ensure they have
patient_id in their metadata for proper security validation.

SECURITY FIX: Step 1.1 - Session Ownership Validation
This migration ensures all sessions have patient_id in metadata to prevent
security vulnerabilities from the backward compatibility fallback removal.

Usage:
    python -m app.agents.assessment.migrations.migrate_session_patient_ids

Or from project root:
    python -m app.agents.assessment.migrations.migrate_session_patient_ids
"""

import sys
import logging
from typing import Optional, Dict, Any
from datetime import datetime
import uuid

# Setup logging
logging.basicConfig(
    level=logging.INFO,
    format='%(asctime)s - %(name)s - %(levelname)s - %(message)s'
)
logger = logging.getLogger(__name__)

try:
    from app.db.session import SessionLocal
    from app.models.assessment import AssessmentSession
    DATABASE_AVAILABLE = True
except ImportError as e:
    logger.error(f"Failed to import database models: {e}")
    DATABASE_AVAILABLE = False


def get_patient_id_from_session(session_model: AssessmentSession) -> Optional[str]:
    """
    Extract patient_id from session model.
    
    Priority:
    1. Database column (patient_id)
    2. Metadata field (session_metadata.get("patient_id"))
    3. None if not found
    
    Returns:
        Patient ID as string UUID or None
    """
    # First check database column (most reliable)
    if session_model.patient_id:
        try:
            return str(uuid.UUID(str(session_model.patient_id)))
        except (ValueError, TypeError):
            logger.warning(f"Invalid patient_id format in database for session {session_model.session_id}")
    
    # Fallback to metadata
    if session_model.session_metadata and isinstance(session_model.session_metadata, dict):
        metadata_patient_id = session_model.session_metadata.get("patient_id")
        if metadata_patient_id:
            try:
                return str(uuid.UUID(str(metadata_patient_id)))
            except (ValueError, TypeError):
                logger.warning(f"Invalid patient_id format in metadata for session {session_model.session_id}")
    
    return None


def needs_migration(session_model: AssessmentSession) -> bool:
    """
    Check if session needs migration.
    
    A session needs migration if:
    1. patient_id is missing from metadata, OR
    2. patient_id in metadata doesn't match database column
    """
    # Get patient_id from database
    db_patient_id = None
    if session_model.patient_id:
        try:
            db_patient_id = str(uuid.UUID(str(session_model.patient_id)))
        except (ValueError, TypeError):
            pass
    
    # Get patient_id from metadata
    metadata_patient_id = None
    if session_model.session_metadata and isinstance(session_model.session_metadata, dict):
        metadata_patient_id = session_model.session_metadata.get("patient_id")
        if metadata_patient_id:
            try:
                metadata_patient_id = str(uuid.UUID(str(metadata_patient_id)))
            except (ValueError, TypeError):
                metadata_patient_id = None
    
    # Needs migration if:
    # 1. No patient_id in metadata but exists in DB
    # 2. Mismatch between metadata and DB
    if db_patient_id:
        if not metadata_patient_id:
            return True  # Missing in metadata
        if metadata_patient_id != db_patient_id:
            return True  # Mismatch
    elif not db_patient_id and not metadata_patient_id:
        # Both missing - this is a problem but we can't fix it
        logger.error(f"Session {session_model.session_id} has no patient_id in database or metadata")
        return False  # Can't migrate without patient_id
    
    return False


def migrate_session(session_model: AssessmentSession, db_session) -> bool:
    """
    Migrate a single session to include patient_id in metadata.
    
    Returns:
        True if migration succeeded, False otherwise
    """
    try:
        # Get patient_id (prefer database column)
        patient_id = get_patient_id_from_session(session_model)
        
        if not patient_id:
            logger.error(f"Cannot migrate session {session_model.session_id}: no patient_id found")
            return False
        
        # Initialize metadata if needed
        if not session_model.session_metadata or not isinstance(session_model.session_metadata, dict):
            session_model.session_metadata = {}
        
        # Update metadata with patient_id
        session_model.session_metadata["patient_id"] = patient_id
        session_model.session_metadata["migration_date"] = datetime.now().isoformat()
        session_model.session_metadata["migration_version"] = "1.0"
        
        # Commit changes
        db_session.commit()
        
        logger.info(f"✓ Migrated session {session_model.session_id} with patient_id {patient_id}")
        return True
        
    except Exception as e:
        logger.error(f"Failed to migrate session {session_model.session_id}: {e}", exc_info=True)
        db_session.rollback()
        return False


def run_migration(dry_run: bool = False) -> Dict[str, Any]:
    """
    Run the migration for all assessment sessions.
    
    Args:
        dry_run: If True, only report what would be migrated without making changes
        
    Returns:
        Dictionary with migration statistics
    """
    if not DATABASE_AVAILABLE:
        logger.error("Database not available - cannot run migration")
        return {
            "success": False,
            "error": "Database not available"
        }
    
    stats = {
        "total_sessions": 0,
        "needs_migration": 0,
        "migrated": 0,
        "failed": 0,
        "skipped": 0,
        "errors": []
    }
    
    db_session = SessionLocal()
    
    try:
        # Get all assessment sessions
        all_sessions = db_session.query(AssessmentSession).all()
        stats["total_sessions"] = len(all_sessions)
        
        logger.info(f"Found {stats['total_sessions']} assessment sessions")
        
        for session_model in all_sessions:
            try:
                if needs_migration(session_model):
                    stats["needs_migration"] += 1
                    
                    if dry_run:
                        patient_id = get_patient_id_from_session(session_model)
                        logger.info(
                            f"[DRY RUN] Would migrate session {session_model.session_id} "
                            f"with patient_id {patient_id}"
                        )
                        stats["migrated"] += 1
                    else:
                        if migrate_session(session_model, db_session):
                            stats["migrated"] += 1
                        else:
                            stats["failed"] += 1
                else:
                    stats["skipped"] += 1
                    
            except Exception as e:
                logger.error(f"Error processing session {session_model.session_id}: {e}", exc_info=True)
                stats["failed"] += 1
                stats["errors"].append({
                    "session_id": session_model.session_id,
                    "error": str(e)
                })
        
        # Final commit if not dry run
        if not dry_run:
            db_session.commit()
        
        logger.info("=" * 60)
        logger.info("Migration Summary:")
        logger.info(f"  Total sessions: {stats['total_sessions']}")
        logger.info(f"  Needs migration: {stats['needs_migration']}")
        logger.info(f"  Migrated: {stats['migrated']}")
        logger.info(f"  Failed: {stats['failed']}")
        logger.info(f"  Skipped: {stats['skipped']}")
        logger.info("=" * 60)
        
        stats["success"] = True
        return stats
        
    except Exception as e:
        logger.error(f"Migration failed: {e}", exc_info=True)
        db_session.rollback()
        stats["success"] = False
        stats["error"] = str(e)
        return stats
        
    finally:
        db_session.close()


def main():
    """Main entry point for migration script"""
    import argparse
    
    parser = argparse.ArgumentParser(
        description="Migrate assessment sessions to include patient_id in metadata"
    )
    parser.add_argument(
        "--dry-run",
        action="store_true",
        help="Run migration in dry-run mode (no changes made)"
    )
    
    args = parser.parse_args()
    
    logger.info("=" * 60)
    logger.info("Assessment Session Patient ID Migration")
    logger.info("=" * 60)
    
    if args.dry_run:
        logger.info("Running in DRY RUN mode - no changes will be made")
    
    result = run_migration(dry_run=args.dry_run)
    
    if result.get("success"):
        logger.info("Migration completed successfully")
        sys.exit(0)
    else:
        logger.error(f"Migration failed: {result.get('error', 'Unknown error')}")
        sys.exit(1)


if __name__ == "__main__":
    main()

