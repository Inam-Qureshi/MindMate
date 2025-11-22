#!/usr/bin/env python3
"""
Script to manually verify specialist email for testing
"""
import sys
import os

# Add parent directory to path
sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

from database.database import SessionLocal
from models.sql_models.specialist_models import (
    Specialists, 
    SpecialistsAuthInfo, 
    EmailVerificationStatusEnum
)
from datetime import datetime, timezone

def verify_specialist_email(email: str):
    """Manually verify specialist email"""
    db = SessionLocal()
    try:
        # Find specialist
        specialist = db.query(Specialists).filter(
            Specialists.email == email.lower()
        ).first()
        
        if not specialist:
            print(f"No specialist found with email: {email}")
            return False
        
        # Get auth info
        auth_info = db.query(SpecialistsAuthInfo).filter(
            SpecialistsAuthInfo.specialist_id == specialist.id
        ).first()
        
        if not auth_info:
            print(f"No auth info found for specialist: {email}")
            return False
        
        # Mark as verified
        auth_info.email_verification_status = EmailVerificationStatusEnum.VERIFIED
        auth_info.email_verified_at = datetime.now(timezone.utc)
        auth_info.otp_code = None
        auth_info.otp_expires_at = None
        auth_info.updated_at = datetime.now(timezone.utc)
        
        db.commit()
        
        print(f"✅ Successfully verified email for {specialist.first_name} {specialist.last_name} ({email})")
        print(f"   Specialist ID: {specialist.id}")
        print(f"   Verification time: {datetime.now(timezone.utc).isoformat()}")
        return True
        
    except Exception as e:
        print(f"❌ Error: {str(e)}")
        db.rollback()
        return False
    finally:
        db.close()

if __name__ == "__main__":
    email = "ahmed.alam121@gmail.com"
    print(f"Verifying email for: {email}")
    verify_specialist_email(email)
