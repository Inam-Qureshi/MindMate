import { useState, useCallback } from 'react';
import { api } from '../utils/axiosConfig';
import { API_ENDPOINTS } from '../config/api';

/**
 * Custom hook for admin API operations with automatic token refresh
 */
export const useAdminAPI = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Generic API call wrapper
  const makeAPICall = useCallback(async (apiCall, errorMessage = 'Operation failed') => {
    setLoading(true);
    setError(null);

    try {
      const result = await apiCall();
      return result?.data ?? result;
    } catch (err) {
      // Handle different error response formats
      let errorMsg = errorMessage;
      
      if (err.response?.data?.detail) {
        const detail = err.response.data.detail;
        // Handle validation errors (422) with array of errors
        if (typeof detail === 'object' && detail.errors && Array.isArray(detail.errors)) {
          errorMsg = `Validation error: ${detail.errors.join(', ')}`;
        } 
        // Handle simple error messages
        else if (typeof detail === 'string') {
          errorMsg = detail;
        }
        // Handle other error formats
        else if (typeof detail === 'object' && detail.message) {
          errorMsg = detail.message;
        }
      } else if (err.message) {
        errorMsg = err.message;
      }
      
      setError(errorMsg);
      console.error('Admin API Error:', errorMsg);
      throw err;
    } finally {
      setLoading(false);
    }
  }, []);

  const ensureArray = useCallback((value) => {
    if (!value) {
      return [];
    }
    if (Array.isArray(value)) {
      return value.filter((item) => item !== null && item !== undefined);
    }
    if (typeof value === 'string') {
      return value.trim() ? [value] : [];
    }
    if (typeof value === 'object') {
      try {
        return Object.values(value)
          .filter((item) => item !== null && item !== undefined)
          .map((item) => String(item));
      } catch (error) {
        console.warn('Failed to coerce value into array:', value, error);
        return [];
      }
    }
    return [value];
  }, []);

  // Patient operations
  const getPatients = useCallback(async () => {
    try {
      const response = await makeAPICall(
        () => api.get(API_ENDPOINTS.ADMIN.PATIENTS, {
          timeout: 30000, // 30 seconds for admin queries
        }),
        'Failed to fetch patients'
      );
      const data = Array.isArray(response) ? response : response?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching patients:', error);
      // Return empty array on timeout or error to prevent UI crash
      return [];
    }
  }, [makeAPICall]);

  const deletePatient = useCallback((patientId) => {
    return makeAPICall(
      () => api.delete(API_ENDPOINTS.ADMIN.PATIENT_DELETE(patientId)),
      'Failed to delete patient'
    );
  }, [makeAPICall]);

  const activatePatient = useCallback((patientId) => {
    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.PATIENT_ACTIVATE(patientId)),
      'Failed to activate patient'
    );
  }, [makeAPICall]);

  const deactivatePatient = useCallback((patientId) => {
    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.PATIENT_DEACTIVATE(patientId)),
      'Failed to deactivate patient'
    );
  }, [makeAPICall]);

  // Specialist operations
  const getSpecialists = useCallback(async () => {
    try {
      const response = await makeAPICall(
        () => api.get(API_ENDPOINTS.ADMIN.SPECIALISTS, {
          timeout: 30000, // 30 seconds for admin queries
        }),
        'Failed to fetch specialists'
      );
      // Backend returns List[SpecialistResponse] directly as an array
      const data = Array.isArray(response) ? response : response?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching specialists:', error);
      // Return empty array on timeout or error to prevent UI crash
      return [];
    }
  }, [makeAPICall]);

  const getSpecialistDetails = useCallback(async (specialistId) => {
    try {
      const response = await makeAPICall(
        () => api.get(API_ENDPOINTS.ADMIN.SPECIALIST_DETAILS(specialistId), {
          timeout: 30000,
        }),
        'Failed to fetch specialist details'
      );
      // Backend returns SpecialistDetailResponse directly
      return response?.data || response;
    } catch (error) {
      console.error('Error fetching specialist details:', error);
      throw error;
    }
  }, [makeAPICall]);

  const approveSpecialist = useCallback((specialistId, data = {}) => {
    const payload = {
      reason: data.reason,
      admin_notes: data.admin_notes,
      notify_specialist: data.notify_specialist ?? false,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.SPECIALIST_APPROVE(specialistId), payload),
      'Failed to approve specialist'
    );
  }, [makeAPICall]);

  const rejectSpecialist = useCallback((specialistId, data = {}) => {
    const payload = {
      reason: data.reason || "Application rejected by admin",
      admin_notes: data.admin_notes,
      notify_specialist: data.notify_specialist ?? false,
    };

    Object.keys(payload).forEach((key) => {
      if (payload[key] === undefined) {
        delete payload[key];
      }
    });

    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.SPECIALIST_REJECT(specialistId), payload),
      'Failed to reject specialist'
    );
  }, [makeAPICall]);

  const suspendSpecialist = useCallback((specialistId) => {
    // Backend suspend endpoint doesn't accept a body - it only needs the specialist_id in the URL
    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.SPECIALIST_SUSPEND(specialistId)),
      'Failed to suspend specialist'
    );
  }, [makeAPICall]);

  const unsuspendSpecialist = useCallback((specialistId) => {
    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.SPECIALIST_UNSUSPEND(specialistId)),
      'Failed to unsuspend specialist'
    );
  }, [makeAPICall]);

  const normalizeDocuments = useCallback((data) => {
    if (!data) {
      return [];
    }

    const documents = [];
    const seen = new Set();

    const LABELS = {
      license: 'Professional License',
      cnic: 'CNIC Document',
      degree: 'Degree Certificate',
      certifications: 'Certification',
      certification: 'Certification',
      supporting_documents: 'Supporting Document',
      supporting_document: 'Supporting Document',
      supporting: 'Supporting Document',
      identity_card: 'Identity Card',
      experience_letter: 'Experience Letter',
      resume: 'Resume',
    };

    const addDocument = (fileUrl, type, label) => {
      if (!fileUrl || typeof fileUrl !== 'string') {
        return;
      }
      const normalizedUrl = fileUrl.trim();
      if (!normalizedUrl || seen.has(normalizedUrl)) {
        return;
      }

      seen.add(normalizedUrl);
      documents.push({
        id: `${type}-${documents.length}`,
        document_type: type,
        document_name: label,
        file_url: normalizedUrl,
        verification_status: 'pending',
      });
    };

    const registrationDocs = data.registration_documents;
    if (registrationDocs && typeof registrationDocs === 'object') {
      Object.entries(registrationDocs).forEach(([key, value]) => {
        const baseLabel = LABELS[key] || key.replace(/_/g, ' ');

        if (Array.isArray(value)) {
          value.forEach((entry, index) => {
            if (typeof entry === 'string') {
              addDocument(
                entry,
                key,
                `${baseLabel}${value.length > 1 ? ` ${index + 1}` : ''}`
              );
            } else if (entry && typeof entry === 'object' && typeof entry.url === 'string') {
              addDocument(
                entry.url,
                key,
                `${baseLabel}${value.length > 1 ? ` ${index + 1}` : ''}`
              );
            }
          });
        } else if (value && typeof value === 'object' && typeof value.url === 'string') {
          addDocument(value.url, key, baseLabel);
        } else {
          addDocument(value, key, baseLabel);
        }
      });
    }

    addDocument(data.license_document_url, 'license', LABELS.license);
    addDocument(data.cnic_document_url, 'cnic', LABELS.cnic);
    addDocument(data.degree_document_url, 'degree', LABELS.degree);

    if (Array.isArray(data.certification_document_urls)) {
      data.certification_document_urls.forEach((url, index) =>
        addDocument(
          url,
          'certification',
          `Certification${data.certification_document_urls.length > 1 ? ` ${index + 1}` : ''}`
        )
      );
    }

    if (Array.isArray(data.supporting_document_urls)) {
      data.supporting_document_urls.forEach((url, index) =>
        addDocument(
          url,
          'supporting_document',
          `Supporting Document${data.supporting_document_urls.length > 1 ? ` ${index + 1}` : ''}`
        )
      );
    }

    return documents;
  }, []);

  const getSpecialistApplication = useCallback(async (specialistId) => {
    try {
      const response = await makeAPICall(
        () => api.get(API_ENDPOINTS.ADMIN.SPECIALIST_APPLICATION(specialistId)),
        'Failed to fetch specialist application'
      );
      
      // makeAPICall returns the axios response, extract data
      // Transform the flat SpecialistDetailResponse to the nested structure expected by the component
      const data = response?.data || response;
      if (!data || typeof data !== 'object') {
        console.error('Invalid specialist application data:', data);
        return null;
      }
      
      // Safely normalize documents with error handling
      let documentsList = [];
      try {
        documentsList = normalizeDocuments(data);
      } catch (docError) {
        console.warn('Failed to normalize documents, using empty array:', docError);
      }

      // Return in the format expected by SpecialistApplicationPage
      return {
        specialist: {
          id: data.id,
          first_name: data.first_name,
          last_name: data.last_name,
          email: data.email,
          phone: data.phone,
          cnic_number: data.cnic_number,
          gender: data.gender,
          date_of_birth: data.date_of_birth,
          specialist_type: data.specialist_type,
          qualification: data.qualification,
          institution: data.institution,
          years_experience: data.years_experience,
          current_affiliation: data.current_affiliation,
          clinic_address: data.clinic_address,
          consultation_fee: data.consultation_fee,
          currency: data.currency,
          consultation_modes: ensureArray(data.consultation_modes),
          specialties_in_mental_health: ensureArray(data.specialties_in_mental_health),
          therapy_methods: ensureArray(data.therapy_methods),
          experience_summary: data.experience_summary,
          profile_photo_url: data.profile_photo_url,
          profile_completion_percentage: data.profile_completion_percentage,
          mandatory_fields_completed: data.mandatory_fields_completed,
          approval_status: data.approval_status,
          email_verification_status: data.email_verification_status,
          is_active: data.is_active,
          profile_verified: data.profile_verified,
          profile_completed_at: data.profile_completed_at,
          created_at: data.created_at,
          updated_at: data.updated_at,
        },
        approval_data: {
          license_number: data.license_number,
          license_authority: data.license_authority,
          license_expiry_date: data.license_expiry_date,
          certifications: ensureArray(data.certifications),
          languages_spoken: ensureArray(data.languages_spoken),
          approval_notes: data.approval_notes,
          reviewed_at: data.reviewed_at,
          reviewed_by: data.reviewed_by,
          rejection_reason: data.rejection_reason,
          registration_documents: data.registration_documents,
        },
        documents: documentsList,
        documents_meta: data.registration_documents,
        verification_status: {
          email_verification_status: data.email_verification_status,
          profile_verified: data.profile_verified,
          is_active: data.is_active,
        },
        review: {
          approval_status: data.approval_status,
          reviewed_at: data.reviewed_at,
          reviewed_by: data.reviewed_by,
          admin_notes: data.approval_notes,
          rejection_reason: data.rejection_reason,
        },
        admin_notes: {
          verification_notes: data.verification_notes,
          notes: data.notes,
          approved_by: data.approved_by,
          approval_notes: data.approval_notes,
          rejection_reason: data.rejection_reason,
        },
        timeline: [
          data.created_at && {
            step: 'registration',
            description: 'Account created',
            timestamp: data.created_at,
            details: data.email,
          },
          data.profile_completed_at && {
            step: 'profile_completion',
            description: 'Profile completed',
            timestamp: data.profile_completed_at,
            details: `${data.profile_completion_percentage ?? 0}% completion`,
          },
          data.reviewed_at && {
            step: 'review',
            description: 'Application reviewed',
            timestamp: data.reviewed_at,
            details: data.approval_notes || data.rejection_reason || 'Reviewed by admin',
          },
          data.updated_at && {
            step: 'decision',
            description: 'Record last updated',
            timestamp: data.updated_at,
            details: `Status: ${data.approval_status}`,
          },
          data.last_login && {
            step: 'activity',
            description: 'Last login',
            timestamp: data.last_login,
            details: data.is_active ? 'Active session recorded' : 'Inactive account',
          },
        ].filter(Boolean),
      };
    } catch (error) {
      console.error('Error transforming specialist application data:', error);
      throw error;
    }
  }, [makeAPICall, normalizeDocuments]);

  // Reports operations
  const getReports = useCallback(async () => {
    try {
      const response = await makeAPICall(
        () => api.get(API_ENDPOINTS.ADMIN.REPORTS, {
          timeout: 30000, // 30 seconds for admin queries
        }),
        'Failed to fetch reports'
      );
      const data = Array.isArray(response) ? response : response?.data;
      return Array.isArray(data) ? data : [];
    } catch (error) {
      console.error('Error fetching reports:', error);
      // Return empty array on timeout or error to prevent UI crash
      return [];
    }
  }, [makeAPICall]);

  const handleReport = useCallback((reportId, action) => {
    return makeAPICall(
      () => api.post(API_ENDPOINTS.ADMIN.REPORT_ACTION(reportId), {
        action: action,
        notes: `Report ${action}d by admin`
      }),
      `Failed to ${action} report`
    );
  }, [makeAPICall]);

  // Document operations
  const downloadDocument = useCallback(async (documentUrl, { asDownload = false } = {}) => {
    if (!documentUrl || typeof documentUrl !== 'string') {
      throw new Error('Invalid document URL');
    }

    const resolveFilePath = (url) => {
      let path = url.trim();
      if (!path) {
        return null;
      }

      try {
        if (path.startsWith('http')) {
          const parsed = new URL(path);
          path = parsed.pathname;
        }
      } catch (err) {
        console.warn('Failed to parse document URL, continuing with raw path.', err);
      }

      if (path.startsWith('/')) {
        path = path.slice(1);
      }

      const adminPrefix = 'api/admin/specialists/documents/';
      if (path.startsWith(adminPrefix)) {
        path = path.slice(adminPrefix.length);
      }

      const uploadPrefix = 'uploads/specialists/documents/';
      if (path.startsWith(uploadPrefix)) {
        path = path.slice(uploadPrefix.length);
      }

      const docPrefix = 'specialists/documents/';
      if (path.startsWith(docPrefix)) {
        path = path.slice(docPrefix.length);
      }

      return path;
    };

    const filePath = resolveFilePath(documentUrl);
    if (!filePath) {
      throw new Error('Could not determine document path');
    }

    const response = await makeAPICall(
      () => api.get(API_ENDPOINTS.ADMIN.SPECIALIST_DOCUMENT_DOWNLOAD(filePath), {
        responseType: 'blob'
      }),
      'Failed to retrieve document'
    );

    return {
      blob: response,
      fileName: filePath.split('/').pop() || 'document',
      asDownload,
    };
  }, [makeAPICall]);

  // Auth operations
  const getCurrentUser = useCallback(() => {
    return makeAPICall(
      () => api.get(API_ENDPOINTS.AUTH.ME),
      'Failed to get current user'
    );
  }, [makeAPICall]);

  return {
    loading,
    error,
    // Patient operations
    getPatients,
    deletePatient,
    activatePatient,
    deactivatePatient,
    // Specialist operations
    getSpecialists,
    getSpecialistDetails,
    approveSpecialist,
    rejectSpecialist,
    suspendSpecialist,
    unsuspendSpecialist,
    getSpecialistApplication,
    // Reports operations
    getReports,
    handleReport,
    // Document operations
    downloadDocument,
    // Auth operations
    getCurrentUser,
  };
};
