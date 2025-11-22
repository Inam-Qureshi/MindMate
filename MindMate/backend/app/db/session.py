# app/db/session.py
import logging
from typing import Generator, Optional
from contextlib import contextmanager
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker, Session
from sqlalchemy.exc import SQLAlchemyError
import redis
from app.core.config import settings
from app.core.logging_config import get_logger

# Configure logging
logger = get_logger(__name__)

# Create SQLAlchemy engine
engine = create_engine(
    settings.database_url,
    pool_pre_ping=settings.DB_POOL_PRE_PING,
    pool_recycle=300,  # Recycle connections every 5 minutes
    pool_size=settings.DB_MAX_CONNECTIONS,
    max_overflow=20,
    echo=settings.DB_ECHO,
    connect_args={
        "connect_timeout": settings.DB_TIMEOUT,
        "application_name": settings.APP_NAME
    }
)

# Create session factory
SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

# Import the declarative base from models (which has all models registered)
from app.models import Base

# Create Redis client (singleton)
redis_client = redis.Redis(
    host=settings.REDIS_HOST,
    port=settings.REDIS_PORT,
    password=settings.REDIS_PASSWORD or None,
    db=settings.REDIS_DB,
    decode_responses=True,
    socket_connect_timeout=5,
    socket_timeout=5,
    retry_on_timeout=True
)


def get_db() -> Generator[Session, None, None]:
    """
    Dependency function to get database session for FastAPI.
    
    Yields:
        Session: SQLAlchemy database session
    
    Raises:
        SQLAlchemyError: If database operation fails
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def get_db_session() -> Generator[Session, None, None]:
    """
    Alternative dependency function to get database session.
    This is an alias for get_db() to match import expectations.
    
    Yields:
        Session: SQLAlchemy database session
    
    Raises:
        SQLAlchemyError: If database operation fails
    """
    db = SessionLocal()
    try:
        yield db
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


@contextmanager
def get_sync_db_session() -> Generator[Session, None, None]:
    """
    Context manager to get synchronous database session.
    Use this for non-FastAPI contexts where you need a database session.
    
    Usage:
        with get_sync_db_session() as db:
            # Use db session here
            
    Yields:
        Session: SQLAlchemy database session
    
    Raises:
        SQLAlchemyError: If database operation fails
    """
    db = SessionLocal()
    try:
        yield db
        db.commit()
    except SQLAlchemyError as e:
        logger.error(f"Database session error: {e}")
        db.rollback()
        raise
    finally:
        db.close()


def create_session() -> Session:
    """
    Create a new database session.
    Remember to close the session when done.
    
    Returns:
        Session: SQLAlchemy database session
    """
    return SessionLocal()


def create_tables() -> None:
    """
    Create all tables in the database.
    
    Raises:
        SQLAlchemyError: If table creation fails
    """
    try:
        Base.metadata.create_all(bind=engine)
        logger.info("Database tables created successfully")
    except SQLAlchemyError as e:
        logger.error(f"Failed to create tables: {e}")
        raise


def drop_tables() -> None:
    """
    Drop all tables from the database.
    WARNING: This will delete all data!
    
    Raises:
        SQLAlchemyError: If table dropping fails
    """
    try:
        Base.metadata.drop_all(bind=engine)
        logger.info("Database tables dropped successfully")
    except SQLAlchemyError as e:
        logger.error(f"Failed to drop tables: {e}")
        raise


def check_db_health() -> bool:
    """
    Check database connectivity and health.
    
    Returns:
        bool: True if database is healthy, False otherwise
    """
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT 1"))
            result.fetchone()
        return True
    except Exception as e:
        logger.error(f"Database health check failed: {e}")
        return False


def check_redis_health() -> bool:
    """
    Check Redis connectivity and health.
    Redis is optional - returns True if not configured/available.

    Returns:
        bool: True if Redis is healthy or not required, False if configured but failing
    """
    try:
        # Try to ping Redis
        redis_client.ping()
        return True
    except redis.ConnectionError:
        logger.debug("Redis not available - caching and session management disabled")
        return True  # Redis is optional, so we consider it "healthy" when not available
    except Exception as e:
        logger.error(f"Redis health check failed: {e}")
        return False


def get_redis_client() -> redis.Redis:
    """
    Get Redis client instance.
    
    Returns:
        redis.Redis: Redis client instance
    """
    return redis_client


def test_db_connection() -> dict:
    """
    Test database connection and return detailed status.
    
    Returns:
        dict: Connection status details
    """
    status = {
        "database": {"connected": False, "error": None},
        "redis": {"connected": False, "error": None}
    }
    
    # Test database
    try:
        with engine.connect() as conn:
            result = conn.execute(text("SELECT version()"))
            db_version = result.fetchone()
            status["database"]["connected"] = True
            status["database"]["version"] = str(db_version[0]) if db_version else "Unknown"
    except Exception as e:
        status["database"]["error"] = str(e)
        logger.error(f"Database connection test failed: {e}")
    
    # Test Redis
    try:
        redis_info = redis_client.info()
        status["redis"]["connected"] = True
        status["redis"]["version"] = redis_info.get("redis_version", "Unknown")
    except Exception as e:
        status["redis"]["error"] = str(e)
        logger.error(f"Redis connection test failed: {e}")
    
    return status


def initialize_database() -> None:
    """
    Initialize database connection and create tables.
    
    Raises:
        Exception: If initialization fails
    """
    try:
        # Test database connection
        if not check_db_health():
            raise Exception("Database connection failed")
        
        # Create tables
        create_tables()

        # Ensure schema is up-to-date for recent appointment and mood fields
        _ensure_appointment_columns()
        _ensure_mood_assessment_columns()
        
        # Test Redis connection (optional)
        redis_available = check_redis_health()
        
        logger.info(
            f"Database initialized | Tables: ready | Redis: {'available' if redis_available else 'unavailable (optional)'}"
        )
        
    except Exception as e:
        logger.error(f"Database initialization failed: {e}")
        raise


def _ensure_appointment_columns() -> None:
    """Ensure newly added appointment columns exist to avoid runtime errors.

    This provides a safe fallback when migrations haven't been applied yet.
    """
    try:
        with engine.begin() as conn:
            # Add payment_method_id
            conn.execute(text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='appointments' AND column_name='payment_method_id'
                    ) THEN
                        ALTER TABLE appointments ADD COLUMN payment_method_id VARCHAR(100);
                    END IF;
                END$$;
                """
            ))

            # Add payment_receipt
            conn.execute(text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='appointments' AND column_name='payment_receipt'
                    ) THEN
                        ALTER TABLE appointments ADD COLUMN payment_receipt TEXT;
                    END IF;
                END$$;
                """
            ))

            # Add payment_confirmed_by (FK to specialists)
            conn.execute(text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='appointments' AND column_name='payment_confirmed_by'
                    ) THEN
                        ALTER TABLE appointments ADD COLUMN payment_confirmed_by UUID REFERENCES specialists(id);
                    END IF;
                END$$;
                """
            ))

            # Add payment_confirmed_at
            conn.execute(text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='appointments' AND column_name='payment_confirmed_at'
                    ) THEN
                        ALTER TABLE appointments ADD COLUMN payment_confirmed_at TIMESTAMPTZ;
                    END IF;
                END$$;
                """
            ))

            # Add meeting_link
            conn.execute(text(
                """
                DO $$
                BEGIN
                    IF NOT EXISTS (
                        SELECT 1 FROM information_schema.columns
                        WHERE table_name='appointments' AND column_name='meeting_link'
                    ) THEN
                        ALTER TABLE appointments ADD COLUMN meeting_link VARCHAR(500);
                    END IF;
                END$$;
                """
            ))

        logger.info("Ensured appointment columns exist (payment and meeting fields)")
    except Exception as e:
        # Don't block app startup; just log
        logger.warning(f"Schema ensure step failed: {e}")


def _ensure_mood_assessment_columns() -> None:
    """Ensure mood assessment metric columns exist when migrations lag behind."""
    column_definitions = [
        ("mood_score", "NUMERIC(3,2)"),
        ("intensity_level", "NUMERIC(3,2)"),
        ("energy_index", "NUMERIC(3,2)"),
        ("trigger_index", "NUMERIC(3,2)"),
        ("coping_effectiveness", "NUMERIC(3,2)"),
        ("msi", "NUMERIC(3,2)"),
        ("dominant_emotions", "TEXT[]"),
        ("summary", "TEXT"),
        ("positive_triggers", "TEXT[]"),
        ("negative_triggers", "TEXT[]"),
        ("reasoning", "TEXT"),
        ("llm_summary", "TEXT"),
        ("responses", "JSONB"),
        ("assessment_type", "VARCHAR(50) NOT NULL DEFAULT 'conversational'"),
        ("completed", "BOOLEAN NOT NULL DEFAULT TRUE"),
    ]

    try:
        with engine.begin() as conn:
            for column_name, column_type in column_definitions:
                conn.execute(
                    text(
                        f"""
                        DO $$
                        BEGIN
                            IF NOT EXISTS (
                                SELECT 1
                                FROM information_schema.columns
                                WHERE table_name='mood_assessments'
                                  AND column_name='{column_name}'
                            ) THEN
                                ALTER TABLE mood_assessments
                                ADD COLUMN {column_name} {column_type};
                            END IF;
                        END$$;
                        """
                    )
                )

        logger.info("Ensured mood assessment columns exist")
    except Exception as e:
        logger.warning(f"Failed to ensure mood assessment columns: {e}")

def reset_database() -> None:
    """
    Reset database by dropping and recreating all tables.
    WARNING: This will delete all data!
    """
    try:
        logger.warning("Resetting database - all data will be lost")
        drop_tables()
        create_tables()
        logger.info("Database reset completed")
    except Exception as e:
        logger.error(f"Database reset failed: {e}")
        raise



# Export commonly used functions
__all__ = [
    'get_db',
    'get_db_session',
    'get_sync_db_session',
    'create_session',
    'create_tables',
    'drop_tables',
    'check_db_health',
    'check_redis_health',
    'get_redis_client',
    'test_db_connection',
    'initialize_database',
    'reset_database',
    'Base',
    'engine',
    'SessionLocal',
    'redis_client'
]


# Initialize on direct execution
if __name__ == "__main__":
    print("🔍 Testing database and Redis connections...")
    
    # Test connections
    status = test_db_connection()
    
    # Print results
    print(f"Database: {'✓ Connected' if status['database']['connected'] else '✗ Failed'}")
    if status['database']['connected']:
        print(f"  Version: {status['database'].get('version', 'Unknown')}")
    else:
        print(f"  Error: {status['database']['error']}")
    
    print(f"Redis: {'✓ Connected' if status['redis']['connected'] else '✗ Failed'}")
    if status['redis']['connected']:
        print(f"  Version: {status['redis'].get('version', 'Unknown')}")
    else:
        print(f"  Error: {status['redis']['error']}")
    
    # Initialize database if connection is successful
    if status['database']['connected']:
        try:
            initialize_database()
        except Exception as e:
            print(f"❌ Initialization failed: {e}")
    else:
        print("❌ Skipping initialization due to connection failure")

