/**
 * Specialist Profile API Service
 * 
 * Centralized service for all specialist profile-related API calls.
 * Uses the backend endpoints from specialist_profile.py
 */

import apiClient from '../../utils/axiosConfig';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';

/**
 * Get current specialist ID from token or localStorage
 */
const getCurrentSpecialistId = () => {
  // Try to get from localStorage first
  let specialistId = AuthStorage.getUserId();
  
  if (!specialistId) {
    // Try to decode from token (basic decode without verification)
    try {
      const token = AuthStorage.getToken();
      if (token) {
        const payload = JSON.parse(atob(token.split('.')[1]));
        specialistId = payload.sub;
      }
    } catch (e) {
      console.warn('Could not decode token:', e);
    }
  }
  
  return specialistId;
};

export const specialistProfileService = {
  /**
   * Get dropdown options for all enum fields
   * @returns {Promise<Object>} Dropdown options including consultation modes, specialties, etc.
   */
  async getDropdownOptions() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SPECIALISTS.DROPDOWN_OPTIONS);
      return response.data;
    } catch (error) {
      console.error('Error fetching dropdown options:', error);
      throw error;
    }
  },

  /**
   * Get own profile (current authenticated specialist)
   * @returns {Promise<Object>} Specialist profile data
   */
  async getOwnProfile() {
    try {
      const specialistId = getCurrentSpecialistId();
      if (!specialistId) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.get(API_ENDPOINTS.SPECIALISTS.GET(specialistId));
      return response.data;
    } catch (error) {
      console.error('Error fetching own profile:', error);
      throw error;
    }
  },

  /**
   * Get profile by specialist ID
   * @param {string|UUID} specialistId - Specialist ID
   * @returns {Promise<Object>} Specialist profile data
   */
  async getProfile(specialistId) {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SPECIALISTS.GET(specialistId));
      return response.data;
    } catch (error) {
      console.error('Error fetching profile:', error);
      throw error;
    }
  },

  /**
   * Update specialist profile
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Object} profileData - Profile data to update (must match SpecialistProfileUpdate schema)
   * @returns {Promise<Object>} Updated profile data
   */
  async updateProfile(specialistId, profileData) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      
      // Ensure profileData matches backend schema (SpecialistProfileUpdate)
      // Handle both availability_schedule and weekly_schedule (for backward compatibility)
      const availabilitySchedule = profileData.availability_schedule || profileData.weekly_schedule;
      
      const payload = {
        first_name: profileData.first_name,
        last_name: profileData.last_name,
        email: profileData.email,
        phone: profileData.phone,
        date_of_birth: profileData.date_of_birth,
        gender: profileData.gender,
        specialist_type: profileData.specialist_type,
        years_experience: profileData.years_experience,
        qualification: profileData.qualification,
        institution: profileData.institution,
        current_affiliation: profileData.current_affiliation,
        city: profileData.city,
        address: profileData.address,
        clinic_name: profileData.clinic_name,
        clinic_address: profileData.clinic_address,
        bio: profileData.bio,
        consultation_fee: profileData.consultation_fee,
        currency: profileData.currency,
        consultation_modes: profileData.consultation_modes,
        availability_schedule: availabilitySchedule,
        languages_spoken: profileData.languages_spoken,
        profile_image_url: profileData.profile_image_url || profileData.profile_photo_url,
        website_url: profileData.website_url,
        social_media_links: profileData.social_media_links,
        availability_status: profileData.availability_status,
        accepting_new_patients: profileData.accepting_new_patients,
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.GET(id),
        payload
      );
      return response.data;
    } catch (error) {
      console.error('Error updating profile:', error);
      throw error;
    }
  },

  /**
   * Update specialist interests
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Array<string>} interests - Array of interest strings
   * @returns {Promise<Object>} Update response
   */
  async updateInterests(specialistId, interests) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.PROFILE_UPDATE_INTERESTS(id),
        interests
      );
      return response.data;
    } catch (error) {
      console.error('Error updating interests:', error);
      throw error;
    }
  },

  /**
   * Update professional statement
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Object} statement - Professional statement data (must match ProfessionalStatementUpdate schema)
   * @returns {Promise<Object>} Update response
   */
  async updateProfessionalStatement(specialistId, statement) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      
      // Map to backend schema
      const payload = {
        intro: statement.intro || statement.professional_statement_intro,
        role_of_psychologists: statement.role_of_psychologists || statement.professional_statement_role,
        qualifications_detail: statement.qualifications_detail || statement.professional_statement_qualifications,
        experience_detail: statement.experience_detail || statement.professional_statement_experience,
        patient_satisfaction_team: statement.patient_satisfaction_team || statement.professional_statement_patient_satisfaction,
        appointment_details: statement.appointment_details || statement.professional_statement_appointment_details,
        clinic_address: statement.clinic_address || statement.professional_statement_clinic_address,
        fee_details: statement.fee_details || statement.professional_statement_fee_details,
      };
      
      // Remove undefined values
      Object.keys(payload).forEach(key => {
        if (payload[key] === undefined) {
          delete payload[key];
        }
      });
      
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.PROFILE_UPDATE_PROFESSIONAL_STATEMENT(id),
        payload
      );
      return response.data;
    } catch (error) {
      console.error('Error updating professional statement:', error);
      throw error;
    }
  },

  /**
   * Update education records
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Array<Object>} educationRecords - Array of education record objects (must match EducationCreate schema)
   * @returns {Promise<Object>} Update response
   */
  async updateEducation(specialistId, educationRecords) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.PROFILE_UPDATE_EDUCATION(id),
        educationRecords
      );
      return response.data;
    } catch (error) {
      console.error('Error updating education records:', error);
      throw error;
    }
  },

  /**
   * Update certification records
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Array<Object>} certificationRecords - Array of certification record objects (must match CertificationCreate schema)
   * @returns {Promise<Object>} Update response
   */
  async updateCertifications(specialistId, certificationRecords) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.PROFILE_UPDATE_CERTIFICATIONS(id),
        certificationRecords
      );
      return response.data;
    } catch (error) {
      console.error('Error updating certification records:', error);
      throw error;
    }
  },

  /**
   * Update experience records
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @param {Array<Object>} experienceRecords - Array of experience record objects (must match ExperienceCreate schema)
   * @returns {Promise<Object>} Update response
   */
  async updateExperience(specialistId, experienceRecords) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.put(
        API_ENDPOINTS.SPECIALISTS.PROFILE_UPDATE_EXPERIENCE(id),
        experienceRecords
      );
      return response.data;
    } catch (error) {
      console.error('Error updating experience records:', error);
      throw error;
    }
  },

  /**
   * Upload document (license, degree, CNIC, profile photo, etc.)
   * @param {File} file - File to upload
   * @param {string} documentType - Type of document (license, degree, cnic, profile_photo, certification, supporting_document)
   * @returns {Promise<Object>} Upload response with file URL
   */
  async uploadDocument(file, documentType) {
    try {
      const formData = new FormData();
      formData.append('file', file);
      formData.append('document_type', documentType);
      
      const response = await apiClient.post(
        API_ENDPOINTS.SPECIALISTS.UPLOAD_DOCUMENT,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );
      return response.data;
    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  },

  /**
   * Get application/approval status
   * @returns {Promise<Object>} Application status data
   */
  async getApplicationStatus() {
    try {
      const response = await apiClient.get(API_ENDPOINTS.SPECIALISTS.APPLICATION_STATUS);
      return response.data;
    } catch (error) {
      console.error('Error fetching application status:', error);
      throw error;
    }
  },

  /**
   * Delete profile (soft delete)
   * @param {string|UUID} specialistId - Specialist ID (optional, will use current if not provided)
   * @returns {Promise<Object>} Delete response
   */
  async deleteProfile(specialistId) {
    try {
      const id = specialistId || getCurrentSpecialistId();
      if (!id) {
        throw new Error('Specialist ID not found. Please log in again.');
      }
      const response = await apiClient.delete(API_ENDPOINTS.SPECIALISTS.GET(id));
      return response.data;
    } catch (error) {
      console.error('Error deleting profile:', error);
      throw error;
    }
  },

};

export default specialistProfileService;

