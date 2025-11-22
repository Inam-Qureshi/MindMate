"""
Validation Service for Specialist Management
Handles validation of registration data, profile data, and documents
"""
from typing import Optional, List, Dict, Any
from fastapi import UploadFile
from datetime import datetime
import re

class ValidationService:
    """Service for handling validation of specialist data"""
    
    def __init__(self):
        self.email_regex = re.compile(r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$')
        self.phone_regex = re.compile(r'^\+?1?\d{9,15}$')
        self.cnic_regex = re.compile(r'^\d{5}-\d{7}-\d{1}$')
    
    async def validate_registration_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Validate registration data"""
        errors = []
        
        # Validate email
        if 'email' in request:
            if not self.email_regex.match(request['email']):
                errors.append("Invalid email format")
        
        # Validate password
        if 'password' in request:
            if len(request['password']) < 8:
                errors.append("Password must be at least 8 characters long")
            else:
                # Password strength validation
                if not re.search(r'[A-Z]', request['password']):
                    errors.append("Password must contain at least one uppercase letter")
                if not re.search(r'[a-z]', request['password']):
                    errors.append("Password must contain at least one lowercase letter")
                if not re.search(r'\d', request['password']):
                    errors.append("Password must contain at least one digit")
                if not re.search(r'[!@#$%^&*(),.?":{}|<>]', request['password']):
                    errors.append("Password must contain at least one special character")
        
        # Validate phone (if provided)
        if 'phone' in request and request['phone'] and not self.phone_regex.match(request['phone']):
            errors.append("Invalid phone number format")
        
        # Validate specialist_type (if provided)
        if 'specialist_type' in request and request['specialist_type']:
            valid_types = ['psychiatrist', 'psychologist', 'counselor', 'therapist', 'social_worker']
            if request['specialist_type'] not in valid_types:
                errors.append(f"Invalid specialist type. Must be one of: {', '.join(valid_types)}")
        
        # Validate terms acceptance
        if 'accepts_terms_and_conditions' in request and not request['accepts_terms_and_conditions']:
            errors.append("Terms and conditions must be accepted")
        
        # Validate required fields
        required_fields = ['first_name', 'last_name', 'email', 'password']
        for field in required_fields:
            if field not in request or not request[field]:
                errors.append(f"{field} is required")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_profile_data(self, request: Dict[str, Any]) -> Dict[str, Any]:
        """Validate profile completion data"""
        errors = []
        
        # Validate phone
        if 'phone_number' in request and not self.phone_regex.match(request['phone_number']):
            errors.append("Invalid phone number format")
        
        # Validate CNIC
        if 'cnic_number' in request and not self.cnic_regex.match(request['cnic_number']):
            errors.append("Invalid CNIC format (should be XXXXX-XXXXXXX-X)")
        
        # Validate date of birth
        if 'date_of_birth' in request:
            try:
                dob = datetime.strptime(request['date_of_birth'], "%Y-%m-%d")
                if dob.year > 2005:  # Must be at least 18 years old
                    errors.append("Must be at least 18 years old")
            except ValueError:
                errors.append("Invalid date of birth format")
        
        # Validate years of experience
        if 'years_of_experience' in request:
            try:
                years = int(request['years_of_experience'])
                if years < 0 or years > 50:
                    errors.append("Years of experience must be between 0 and 50")
            except (ValueError, TypeError):
                errors.append("Years of experience must be a valid number")
        
        # Validate consultation fee
        if 'consultation_fee' in request:
            try:
                fee = float(request['consultation_fee'])
                if fee < 0:
                    errors.append("Consultation fee cannot be negative")
            except (ValueError, TypeError):
                errors.append("Consultation fee must be a valid number")
        
        # Validate required fields (availability_schedule is now optional)
        required_fields = [
            'phone_number', 'cnic_number', 'gender', 'date_of_birth',
            'qualification', 'institution', 'years_of_experience',
            'current_affiliation', 'clinic_address', 'consultation_modes',
            'consultation_fee', 'experience_summary',
            'specialties_in_mental_health', 'therapy_methods'
        ]
        
        for field in required_fields:
            if field not in request or request[field] is None or request[field] == "":
                errors.append(f"{field} is required")
        
        # Validate mandatory documents
        mandatory_documents = ['cnic_document_url', 'degree_document_url', 'license_document_url']
        for doc_field in mandatory_documents:
            if doc_field not in request or request[doc_field] is None or request[doc_field] == "":
                errors.append(f"{doc_field.replace('_', ' ').title()} is required for profile completion")
        
        # Validate arrays/lists
        array_fields = ['consultation_modes', 'specialties_in_mental_health', 'therapy_methods']
        for field in array_fields:
            if field in request and request[field] is not None:
                if not isinstance(request[field], list) or len(request[field]) == 0:
                    errors.append(f"{field} must be a non-empty list")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_document(self, file: UploadFile, document_type: str, document_name: str) -> Dict[str, Any]:
        """Validate document upload"""
        errors = []
        
        # Validate file type
        allowed_types = {
            'image/jpeg', 'image/jpg', 'image/png', 'application/pdf'
        }
        
        if file.content_type not in allowed_types:
            errors.append(f"Invalid file type: {file.content_type}. Allowed: JPEG, PNG, PDF")
        
        # Validate file size (5MB max)
        file_content = await file.read()
        file_size = len(file_content)
        
        if file_size > 5 * 1024 * 1024:  # 5MB
            errors.append("File too large. Maximum size is 5MB")
        
        if file_size == 0:
            errors.append("File is empty")
        
        # Validate document type
        allowed_document_types = ['license', 'degree', 'cnic', 'profile_photo', 'experience_letter']
        if document_type not in allowed_document_types:
            errors.append(f"Invalid document type: {document_type}")
        
        # Validate document name
        if len(document_name) < 3 or len(document_name) > 255:
            errors.append("Document name must be between 3 and 255 characters")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_email_verification(self, email: str, otp: str) -> Dict[str, Any]:
        """Validate email verification data"""
        errors = []
        
        # Validate email format
        if not self.email_regex.match(email):
            errors.append("Invalid email format")
        
        # Validate OTP format (6 digits)
        if not re.match(r'^\d{6}$', otp):
            errors.append("OTP must be 6 digits")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_approval_data(self, approval_data: Dict[str, Any]) -> Dict[str, Any]:
        """Validate approval data"""
        errors = []
        
        # Validate required approval fields
        required_fields = ['approval_status', 'admin_notes']
        for field in required_fields:
            if field not in approval_data or not approval_data[field]:
                errors.append(f"{field} is required")
        
        # Validate approval status
        valid_statuses = ['approved', 'rejected', 'pending', 'under_review']
        if 'approval_status' in approval_data and approval_data['approval_status'] not in valid_statuses:
            errors.append(f"Invalid approval status. Must be one of: {', '.join(valid_statuses)}")
        
        # Validate rejection reason if status is rejected
        if (approval_data.get('approval_status') == 'rejected' and 
            'rejection_reason' not in approval_data):
            errors.append("Rejection reason is required when status is rejected")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_availability_schedule(self, schedule: Optional[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate availability schedule (optional)"""
        errors = []
        
        # If schedule is None or empty, it's valid (optional field)
        if schedule is None or (isinstance(schedule, dict) and len(schedule) == 0):
            return {"is_valid": True, "errors": []}
        
        if not isinstance(schedule, dict):
            errors.append("Availability schedule must be a dictionary")
            return {"is_valid": False, "errors": errors}
        
        # Validate day structure
        valid_days = ['monday', 'tuesday', 'wednesday', 'thursday', 'friday', 'saturday', 'sunday']
        
        for day, day_schedule in schedule.items():
            if day.lower() not in valid_days:
                errors.append(f"Invalid day: {day}")
                continue
            
            if not isinstance(day_schedule, dict):
                errors.append(f"Day schedule for {day} must be a dictionary")
                continue
            
            # Validate required fields for each day
            required_day_fields = ['is_available', 'start_time', 'end_time']
            for field in required_day_fields:
                if field not in day_schedule:
                    errors.append(f"Missing {field} for {day}")
            
            # Validate time format
            if 'start_time' in day_schedule and 'end_time' in day_schedule:
                try:
                    start_time = datetime.strptime(day_schedule['start_time'], '%H:%M')
                    end_time = datetime.strptime(day_schedule['end_time'], '%H:%M')
                    
                    if start_time >= end_time:
                        errors.append(f"Start time must be before end time for {day}")
                except ValueError:
                    errors.append(f"Invalid time format for {day}. Use HH:MM format")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_consultation_modes(self, modes: List[str]) -> Dict[str, Any]:
        """Validate consultation modes"""
        errors = []
        
        if not isinstance(modes, list):
            errors.append("Consultation modes must be a list")
            return {"is_valid": False, "errors": errors}
        
        if len(modes) == 0:
            errors.append("At least one consultation mode is required")
        
        valid_modes = ['online', 'in_person', 'hybrid']
        for mode in modes:
            if mode not in valid_modes:
                errors.append(f"Invalid consultation mode: {mode}. Must be one of: {', '.join(valid_modes)}")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_education_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate education records"""
        errors = []
        
        if not isinstance(records, list):
            errors.append("Education records must be a list")
            return {"is_valid": False, "errors": errors}
        
        for i, record in enumerate(records):
            if not isinstance(record, dict):
                errors.append(f"Education record {i+1} must be a dictionary")
                continue
            
            required_fields = ['degree', 'field_of_study', 'institution', 'year']
            for field in required_fields:
                if field not in record or not record[field]:
                    errors.append(f"Education record {i+1}: {field} is required")
            
            # Validate year
            if 'year' in record:
                try:
                    year = int(record['year'])
                    if year < 1950 or year > datetime.now().year:
                        errors.append(f"Education record {i+1}: Invalid year")
                except (ValueError, TypeError):
                    errors.append(f"Education record {i+1}: Year must be a valid number")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_certification_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate certification records"""
        errors = []
        
        if not isinstance(records, list):
            errors.append("Certification records must be a list")
            return {"is_valid": False, "errors": errors}
        
        for i, record in enumerate(records):
            if not isinstance(record, dict):
                errors.append(f"Certification record {i+1} must be a dictionary")
                continue
            
            required_fields = ['name', 'issuing_body', 'year']
            for field in required_fields:
                if field not in record or not record[field]:
                    errors.append(f"Certification record {i+1}: {field} is required")
            
            # Validate year
            if 'year' in record:
                try:
                    year = int(record['year'])
                    if year < 1950 or year > datetime.now().year:
                        errors.append(f"Certification record {i+1}: Invalid year")
                except (ValueError, TypeError):
                    errors.append(f"Certification record {i+1}: Year must be a valid number")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
    
    async def validate_experience_records(self, records: List[Dict[str, Any]]) -> Dict[str, Any]:
        """Validate experience records"""
        errors = []
        
        if not isinstance(records, list):
            errors.append("Experience records must be a list")
            return {"is_valid": False, "errors": errors}
        
        for i, record in enumerate(records):
            if not isinstance(record, dict):
                errors.append(f"Experience record {i+1} must be a dictionary")
                continue
            
            required_fields = ['title', 'company', 'start_date']
            for field in required_fields:
                if field not in record or not record[field]:
                    errors.append(f"Experience record {i+1}: {field} is required")
            
            # Validate dates
            if 'start_date' in record:
                try:
                    start_date = datetime.strptime(record['start_date'], '%Y-%m-%d')
                except ValueError:
                    errors.append(f"Experience record {i+1}: Invalid start_date format. Use YYYY-MM-DD")
            
            if 'end_date' in record and record['end_date']:
                try:
                    end_date = datetime.strptime(record['end_date'], '%Y-%m-%d')
                    if 'start_date' in record:
                        start_date = datetime.strptime(record['start_date'], '%Y-%m-%d')
                        if end_date <= start_date:
                            errors.append(f"Experience record {i+1}: End date must be after start date")
                except ValueError:
                    errors.append(f"Experience record {i+1}: Invalid end_date format. Use YYYY-MM-DD")
        
        return {
            "is_valid": len(errors) == 0,
            "errors": errors
        }
