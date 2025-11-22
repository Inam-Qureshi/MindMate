"""
Profile Service for Specialist Management
Handles specialist profile completion, validation, and management
"""
from sqlalchemy.orm import Session
from typing import Optional, List, Dict, Any
from datetime import datetime, timezone
import uuid

from app.models.specialist import (
    Specialists, 
    SpecialistsApprovalData,
    SpecialistRegistrationProgress
)
from app.services.registration_service import RegistrationService

class ProfileService:
    """Service for handling specialist profile management"""
    
    def __init__(self, db: Session):
        self.db = db
        self.registration_service = RegistrationService(db)
    
    async def update_specialist_profile(self, specialist_id: str, profile_data: Dict[str, Any]) -> Specialists:
        """Update specialist profile with comprehensive data"""
        specialist = await self.registration_service.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        # Update basic information
        if 'phone_number' in profile_data:
            specialist.phone = profile_data['phone_number']
        if 'gender' in profile_data:
            specialist.gender = profile_data['gender']
        if 'date_of_birth' in profile_data:
            specialist.date_of_birth = profile_data['date_of_birth']
        if 'profile_photo_url' in profile_data:
            specialist.profile_image_url = profile_data['profile_photo_url']
        if 'profile_image_url' in profile_data:
            specialist.profile_image_url = profile_data['profile_image_url']
        
        # Update professional information
        if 'qualification' in profile_data:
            specialist.qualification = profile_data['qualification']
        if 'institution' in profile_data:
            specialist.institution = profile_data['institution']
        if 'years_of_experience' in profile_data:
            specialist.years_experience = profile_data['years_of_experience']
        if 'current_affiliation' in profile_data:
            specialist.current_affiliation = profile_data['current_affiliation']
        if 'clinic_address' in profile_data:
            specialist.clinic_address = profile_data['clinic_address']
        
        # Update practice details
        if 'consultation_modes' in profile_data:
            specialist.consultation_modes = profile_data['consultation_modes']
        if 'availability_schedule' in profile_data:
            specialist.availability_schedule = profile_data['availability_schedule']
        if 'weekly_schedule' in profile_data:
            specialist.weekly_schedule = profile_data['weekly_schedule']
        if 'consultation_fee' in profile_data:
            specialist.consultation_fee = profile_data['consultation_fee']
        if 'currency' in profile_data:
            specialist.currency = profile_data['currency']
        if 'experience_summary' in profile_data:
            specialist.experience_summary = profile_data['experience_summary']
        if 'specialties_in_mental_health' in profile_data:
            specialist.specialties_in_mental_health = profile_data['specialties_in_mental_health']
        if 'therapy_methods' in profile_data:
            specialist.therapy_methods = profile_data['therapy_methods']
        if 'accepting_new_patients' in profile_data:
            specialist.accepting_new_patients = profile_data['accepting_new_patients']
        
        # Update extended profile fields
        if 'interests' in profile_data:
            specialist.interests = profile_data['interests']
        if 'professional_statement_intro' in profile_data:
            specialist.professional_statement_intro = profile_data['professional_statement_intro']
        if 'professional_statement_role' in profile_data:
            specialist.professional_statement_role = profile_data['professional_statement_role']
        if 'professional_statement_qualifications' in profile_data:
            specialist.professional_statement_qualifications = profile_data['professional_statement_qualifications']
        if 'professional_statement_experience' in profile_data:
            specialist.professional_statement_experience = profile_data['professional_statement_experience']
        if 'professional_statement_patient_satisfaction' in profile_data:
            specialist.professional_statement_patient_satisfaction = profile_data['professional_statement_patient_satisfaction']
        if 'professional_statement_appointment_details' in profile_data:
            specialist.professional_statement_appointment_details = profile_data['professional_statement_appointment_details']
        if 'professional_statement_clinic_address' in profile_data:
            specialist.professional_statement_clinic_address = profile_data['professional_statement_clinic_address']
        if 'professional_statement_fee_details' in profile_data:
            specialist.professional_statement_fee_details = profile_data['professional_statement_fee_details']
        if 'education_records' in profile_data:
            specialist.education_records = profile_data['education_records']
        if 'certification_records' in profile_data:
            specialist.certification_records = profile_data['certification_records']
        if 'experience_records' in profile_data:
            specialist.experience_records = profile_data['experience_records']
        
        # Update document URLs
        if 'cnic_document_url' in profile_data:
            # Store in approval_data registration_documents
            pass  # Will be handled in update_approval_data
        if 'degree_document_url' in profile_data:
            pass  # Will be handled in update_approval_data
        if 'license_document_url' in profile_data:
            pass  # Will be handled in update_approval_data
        if 'certification_document_urls' in profile_data:
            pass  # Will be handled in update_approval_data
        if 'supporting_document_urls' in profile_data:
            pass  # Will be handled in update_approval_data
        
        # Update completion status
        specialist.updated_at = datetime.now(timezone.utc)
        
        self.db.commit()
        self.db.refresh(specialist)
        return specialist
    
    async def update_approval_data(self, specialist_id: str, profile_data: Dict[str, Any]):
        """Update approval data with profile information"""
        import logging
        logger = logging.getLogger(__name__)
        
        try:
            approval_data = self.db.query(SpecialistsApprovalData).filter(
                SpecialistsApprovalData.specialist_id == specialist_id
            ).first()
        except Exception as query_error:
            # Handle case where columns don't exist in database
            error_str = str(query_error).lower()
            if "undefinedcolumn" in error_str or "registration_documents" in error_str or "document_verification_status" in error_str or "compliance_check_status" in error_str:
                logger.debug(f"Schema mismatch detected, rolling back and retrying query for specialist {specialist_id}: {str(query_error)}")
                self.db.rollback()
                # Retry query - SQLAlchemy should work after rollback if columns are removed from model
                try:
                    approval_data = self.db.query(SpecialistsApprovalData).filter(
                        SpecialistsApprovalData.specialist_id == specialist_id
                    ).first()
                except Exception as retry_error:
                    logger.error(f"Failed to query approval_data after rollback for specialist {specialist_id}: {str(retry_error)}")
                    # Create new approval_data if query still fails
                    approval_data = None
            else:
                raise
        
        if not approval_data:
            try:
                approval_data = SpecialistsApprovalData(specialist_id=specialist_id)
                self.db.add(approval_data)
            except Exception as create_error:
                error_str = str(create_error).lower()
                if "undefinedcolumn" in error_str:
                    logger.error(f"Cannot create approval_data due to schema mismatch: {str(create_error)}")
                    raise ValueError(f"Database schema mismatch: {str(create_error)}")
                raise
        
        # Update approval data fields
        if 'license_number' in profile_data:
            approval_data.license_number = profile_data['license_number']
        if 'license_authority' in profile_data:
            approval_data.license_issuing_authority = profile_data['license_authority']
        if 'license_expiry_date' in profile_data:
            approval_data.license_expiry_date = profile_data['license_expiry_date']
        if 'certifications' in profile_data:
            approval_data.certifications = profile_data['certifications']
        # Note: languages_spoken is stored in the Specialists table, not in SpecialistsApprovalData
        
        # Update document URLs in registration_documents (if column exists)
        try:
            if not approval_data.registration_documents:
                approval_data.registration_documents = {}
            
            # Store mandatory documents
            if 'cnic_document_url' in profile_data and profile_data['cnic_document_url']:
                approval_data.registration_documents['cnic'] = profile_data['cnic_document_url']
            if 'degree_document_url' in profile_data and profile_data['degree_document_url']:
                approval_data.registration_documents['degree'] = profile_data['degree_document_url']
            if 'license_document_url' in profile_data and profile_data['license_document_url']:
                approval_data.registration_documents['license'] = profile_data['license_document_url']
            if 'certification_document_urls' in profile_data and profile_data['certification_document_urls']:
                approval_data.registration_documents['certifications'] = profile_data['certification_document_urls']
            if 'supporting_document_urls' in profile_data and profile_data['supporting_document_urls']:
                approval_data.registration_documents['supporting_documents'] = profile_data['supporting_document_urls']
        except (AttributeError, Exception) as e:
            # registration_documents column doesn't exist in database, skip this update
            import logging
            logger = logging.getLogger(__name__)
            error_str = str(e).lower()
            if "registration_documents" in error_str or "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                logger.debug(f"registration_documents column not available in database for specialist {approval_data.specialist_id}, skipping document URL storage")
            else:
                logger.warning(f"Error updating registration_documents: {str(e)}")
        
        # Update timeline (column now exists after migration)
        if approval_data.approval_timeline:
            approval_data.approval_timeline["profile_completion"] = datetime.now(timezone.utc).isoformat()
        else:
            approval_data.approval_timeline = {
                "profile_completion": datetime.now(timezone.utc).isoformat()
            }
        
        approval_data.updated_at = datetime.now(timezone.utc)
        
        try:
            self.db.commit()
        except Exception as commit_error:
            error_str = str(commit_error).lower()
            if "undefinedcolumn" in error_str or "infailedsqltransaction" in error_str:
                logger.error(f"Failed to commit approval_data due to schema mismatch: {str(commit_error)}")
                self.db.rollback()
                raise ValueError(f"Database schema mismatch: {str(commit_error)}")
            raise
    
    async def update_registration_progress(self, specialist_id: str, step_name: str):
        """Update registration progress"""
        await self.registration_service.update_registration_progress(
            specialist_id, step_name, 
            {"completed": True, "timestamp": datetime.now(timezone.utc).isoformat()}
        )
        self.db.commit()
    
    async def calculate_completion_percentage(self, specialist_id: str) -> int:
        """Calculate profile completion percentage"""
        specialist = await self.registration_service.get_specialist_by_id(specialist_id)
        if not specialist:
            return 0
        
        # Define required fields
        required_fields = {
            'phone': specialist.phone,
            'gender': specialist.gender,
            'date_of_birth': specialist.date_of_birth,
            'qualification': specialist.qualification,
            'institution': specialist.institution,
            'years_experience': specialist.years_experience,
            'current_affiliation': specialist.current_affiliation,
            'clinic_address': specialist.clinic_address,
            'consultation_modes': specialist.consultation_modes,
            'availability_schedule': specialist.availability_schedule,
            'consultation_fee': specialist.consultation_fee,
            'experience_summary': specialist.experience_summary,
            'specialties_in_mental_health': specialist.specialties_in_mental_health,
            'therapy_methods': specialist.therapy_methods
        }
        
        # Count completed fields
        completed_fields = sum(1 for value in required_fields.values() if value is not None and value != "")
        total_fields = len(required_fields)
        
        # Calculate percentage
        percentage = int((completed_fields / total_fields) * 100)
        
        # Update specialist record
        specialist.profile_completion_percentage = percentage
        self.db.commit()
        
        return percentage
    
    async def get_profile_progress(self, specialist_id: str) -> Dict[str, Any]:
        """Get profile completion progress"""
        specialist = await self.registration_service.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        # Get completion percentage
        completion_percentage = await self.calculate_completion_percentage(specialist_id)
        
        # Get missing fields
        missing_fields = []
        if not specialist.phone:
            missing_fields.append("phone")
        if not specialist.cnic_number:
            missing_fields.append("cnic_number")
        if not specialist.gender:
            missing_fields.append("gender")
        if not specialist.date_of_birth:
            missing_fields.append("date_of_birth")
        if not specialist.qualification:
            missing_fields.append("qualification")
        if not specialist.institution:
            missing_fields.append("institution")
        if not specialist.years_experience:
            missing_fields.append("years_experience")
        if not specialist.current_affiliation:
            missing_fields.append("current_affiliation")
        if not specialist.clinic_address:
            missing_fields.append("clinic_address")
        if not specialist.consultation_modes:
            missing_fields.append("consultation_modes")
        # availability_schedule is now optional, so we don't add it to missing_fields
        if not specialist.consultation_fee:
            missing_fields.append("consultation_fee")
        if not specialist.experience_summary:
            missing_fields.append("experience_summary")
        if not specialist.specialties_in_mental_health:
            missing_fields.append("specialties_in_mental_health")
        if not specialist.therapy_methods:
            missing_fields.append("therapy_methods")
        
        return {
            "specialist_id": specialist_id,
            "completion_percentage": completion_percentage,
            "missing_fields": missing_fields,
            "mandatory_fields_completed": specialist.mandatory_fields_completed,
            "profile_completed_at": specialist.profile_completed_at.isoformat() if specialist.profile_completed_at else None,
            "next_steps": self._get_next_steps(completion_percentage, missing_fields)
        }
    
    def _get_next_steps(self, completion_percentage: int, missing_fields: List[str]) -> List[str]:
        """Get next steps based on completion status"""
        if completion_percentage < 100:
            return [
                f"Complete missing fields: {', '.join(missing_fields[:3])}",
                "Upload required documents",
                "Submit for approval"
            ]
        elif completion_percentage == 100:
            return [
                "Upload required documents",
                "Submit for approval",
                "Wait for admin review"
            ]
        else:
            return ["Profile completed successfully"]
    
    async def mark_profile_complete(self, specialist_id: str) -> Specialists:
        """Mark profile as complete and update status"""
        specialist = await self.registration_service.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        # Mark profile as complete
        specialist.mandatory_fields_completed = True
        specialist.profile_completion_percentage = 100
        specialist.profile_completed_at = datetime.now(timezone.utc)
        specialist.updated_at = datetime.now(timezone.utc)
        
        # Update registration progress
        await self.update_registration_progress(specialist_id, "profile_completion")
        
        self.db.commit()
        self.db.refresh(specialist)
        return specialist
    
    async def get_specialist_profile_summary(self, specialist_id: str) -> Dict[str, Any]:
        """Get comprehensive profile summary for specialist"""
        specialist = await self.registration_service.get_specialist_by_id(specialist_id)
        if not specialist:
            raise ValueError(f"Specialist not found: {specialist_id}")
        
        progress = await self.get_profile_progress(specialist_id)
        
        return {
            "specialist": {
                "id": str(specialist.id),
                "email": specialist.email,
                "first_name": specialist.first_name,
                "last_name": specialist.last_name,
                "phone": specialist.phone,
                "cnic_number": specialist.cnic_number,
                "gender": specialist.gender.value if specialist.gender else None,
                "date_of_birth": specialist.date_of_birth.isoformat() if specialist.date_of_birth else None,
                "profile_photo_url": specialist.profile_image_url,  # Using profile_image_url as profile_photo_url doesn't exist in DB
                "qualification": specialist.qualification,
                "institution": specialist.institution,
                "years_experience": specialist.years_experience,
                "current_affiliation": specialist.current_affiliation,
                "clinic_address": specialist.clinic_address,
                "consultation_modes": specialist.consultation_modes,
                "availability_schedule": specialist.availability_schedule,
                "consultation_fee": float(specialist.consultation_fee) if specialist.consultation_fee else None,
                "currency": specialist.currency,
                "experience_summary": specialist.experience_summary,
                "specialties_in_mental_health": specialist.specialties_in_mental_health,
                "therapy_methods": specialist.therapy_methods,
                "accepting_new_patients": specialist.accepting_new_patients,
                "interests": specialist.interests,
                "professional_statement_intro": specialist.professional_statement_intro,
                "professional_statement_role": specialist.professional_statement_role,
                "professional_statement_qualifications": specialist.professional_statement_qualifications,
                "professional_statement_experience": specialist.professional_statement_experience,
                "professional_statement_patient_satisfaction": specialist.professional_statement_patient_satisfaction,
                "professional_statement_appointment_details": specialist.professional_statement_appointment_details,
                "professional_statement_clinic_address": specialist.professional_statement_clinic_address,
                "professional_statement_fee_details": specialist.professional_statement_fee_details,
                "education_records": specialist.education_records,
                "certification_records": specialist.certification_records,
                "experience_records": specialist.experience_records,
                "approval_status": specialist.approval_status.value if specialist.approval_status else None,
                "profile_completion_percentage": specialist.profile_completion_percentage,
                "mandatory_fields_completed": specialist.mandatory_fields_completed,
                "profile_completed_at": specialist.profile_completed_at.isoformat() if specialist.profile_completed_at else None,
                "created_at": specialist.created_at.isoformat() if specialist.created_at else None,
                "updated_at": specialist.updated_at.isoformat() if specialist.updated_at else None
            },
            "progress": progress
        }
