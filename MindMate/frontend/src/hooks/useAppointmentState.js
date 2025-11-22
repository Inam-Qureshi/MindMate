/**
 * Custom Hooks for State Management
 * =================================
 * Reusable hooks for appointment system state management
 */

import { useState, useEffect, useCallback, useMemo } from 'react';
import { mapSpecialistFields, mapTimeSlotFields, mapAppointmentFields } from '../types/api';
import { APIErrorHandler } from '../utils/errorHandler';
import { retryOperations } from '../utils/apiRetry';
import apiClient from '../utils/axiosConfig';
import { AuthStorage } from '../utils/localStorage';
import { API_URL, API_ENDPOINTS } from '../config/api';

/**
 * Hook for managing specialist search state
 */
export const useSpecialistSearch = (initialFilters = {}) => {
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [filters, setFilters] = useState(initialFilters);
  const [searchQuery, setSearchQuery] = useState('');
  const [pagination, setPagination] = useState({
    page: 1,
    size: 12,
    total: 0,
    total_pages: 0,
    has_more: false
  });

  const searchSpecialists = useCallback(async (searchTerm = searchQuery) => {
    try {
      setLoading(true);
      setError(null);

      // Public search: do not force login; token is added automatically if present

      const params = new URLSearchParams();
      // Note: specialists search does not support text query; we'll filter client-side
      if (filters.city) params.append('city', filters.city);
      if (filters.specializations?.length) {
        const specialization = Array.isArray(filters.specializations) 
          ? filters.specializations[0] 
          : filters.specializations;
        params.append('specialization', specialization);
      }
      if (filters.consultation_mode && filters.consultation_mode !== 'both') {
        params.append('consultation_mode', filters.consultation_mode);
      }
      params.append('page', pagination.page);
      params.append('size', pagination.size);

      console.log('Starting specialist search...');
      
      // Use specialists search (approved only)
      const response = await apiClient.get(`${API_ENDPOINTS.SPECIALISTS.SEARCH}?${params}`);
      console.log('API response received:', response);
      
      console.log('Processing response data...');
      console.log('Response structure:', {
        hasData: !!response?.data,
        dataKeys: response?.data ? Object.keys(response.data) : 'no data',
        hasSpecialists: !!response?.data?.specialists,
        specialistsType: typeof response?.data?.specialists,
        specialistsLength: Array.isArray(response?.data?.specialists) ? response.data.specialists.length : 'not array'
      });
      
      if (response?.data?.specialists && Array.isArray(response.data.specialists)) {
        console.log('Mapping specialists...');
        let mappedSpecialists = response.data.specialists.map(specialist => mapSpecialistFields(specialist));
        // Client-side filter by name/specialization when search term provided
        if (searchTerm?.trim()) {
          const q = searchTerm.trim().toLowerCase();
          mappedSpecialists = mappedSpecialists.filter(s => {
            const name = (s.full_name || '').toLowerCase();
            const type = (s.specialist_type || '').toLowerCase();
            const specs = Array.isArray(s.specializations) ? s.specializations.join(' ').toLowerCase() : '';
            const city = (s.city || '').toLowerCase();
            return name.includes(q) || type.includes(q) || specs.includes(q) || city.includes(q);
          });
        }
        setSpecialists(mappedSpecialists);
        console.log('Specialists mapped successfully:', mappedSpecialists.length);
        
        // Update pagination info
        setPagination(prev => ({
          ...prev,
          total: response.data?.pagination?.total_count || mappedSpecialists.length,
          total_pages: response.data?.pagination?.total_pages || Math.ceil(mappedSpecialists.length / prev.size),
          has_more: response.data?.pagination?.has_next || (mappedSpecialists.length === prev.size)
        }));
      } else {
        console.log('No specialists found in response, setting empty array');
        setSpecialists([]);
        setPagination(prev => ({
          ...prev,
          total: 0,
          total_pages: 0,
          has_more: false
        }));
      }
    } catch (err) {
      console.error("Error searching specialists:", err);
      
      // Handle undefined or null error
      if (!err) {
        console.error("Received undefined error in searchSpecialists");
        setError('An unexpected error occurred while searching specialists');
        return;
      }
      
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'search');
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  }, [filters, pagination.page, pagination.size, searchQuery]);

  const updateFilters = useCallback((newFilters) => {
    setFilters(prev => ({ ...prev, ...newFilters }));
    setPagination(prev => ({ ...prev, page: 1 })); // Reset to first page
  }, []);

  const updatePagination = useCallback((newPagination) => {
    setPagination(prev => ({ ...prev, ...newPagination }));
  }, []);

  const clearFilters = useCallback(() => {
    setFilters(initialFilters);
    setSearchQuery('');
    setPagination(prev => ({ ...prev, page: 1 }));
  }, [initialFilters]);

  return {
    specialists,
    loading,
    error,
    filters,
    searchQuery,
    pagination,
    searchSpecialists,
    updateFilters,
    updatePagination,
    setSearchQuery,
    clearFilters,
    setError
  };
};

/**
 * Hook for managing available slots
 */
export const useAvailableSlots = (specialistId, appointmentType) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const fetchSlots = useCallback(async (startDate, endDate) => {
    if (!specialistId) {
      setSlots([]);
      return;
    }

    try {
      setLoading(true);
      setError(null);

      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // Default to next 7 days if not provided
      const today = new Date();
      const defaultEndDate = new Date(today);
      defaultEndDate.setDate(defaultEndDate.getDate() + 6); // 7 days total (today + 6 more)

      const startDateStr = formatDate(startDate) || formatDate(today);
      const endDateStr = formatDate(endDate) || formatDate(defaultEndDate);

      // Backend expects: start_date, end_date, appointment_type (online/in_person)
      // Backend uses "online" for slot generation, not "virtual"
      const slotAppointmentType = appointmentType === 'virtual' ? 'online' : (appointmentType || 'online');

      // Ensure apiCall returns a proper Promise
      const apiCall = async () => {
        try {
          const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(specialistId),
        {
          params: {
                start_date: startDateStr,
                end_date: endDateStr,
                appointment_type: slotAppointmentType
              }
            }
          );
          
          // Validate response
          if (!response) {
            throw new Error('No response received from server');
          }
          
          return response;
        } catch (err) {
          // Ensure error is properly structured
          if (!err.isAxiosError && err.response) {
            err.isAxiosError = true;
          }
          // Re-throw to let retry mechanism handle it
          throw err;
        }
      };

      const response = await retryOperations.fetchSlots(apiCall);
      
      // Validate response structure
      if (!response || !response.data) {
        console.warn('Invalid response structure:', response);
        setSlots([]);
        return;
      }
      
      // Backend returns array directly
      if (Array.isArray(response.data)) {
        const mappedSlots = response.data
          .map(slot => mapTimeSlotFields(slot))
          .filter(slot => slot !== null); // Filter out null mappings
        setSlots(mappedSlots);
      } else if (response.data?.slots && Array.isArray(response.data.slots)) {
        const mappedSlots = response.data.slots
          .map(slot => mapTimeSlotFields(slot))
          .filter(slot => slot !== null);
        setSlots(mappedSlots);
      } else {
        console.warn('Unexpected response format for slots:', response.data);
        setSlots([]);
      }
    } catch (err) {
      console.error("Error fetching slots:", err);
      
      // Ensure we have a valid error object
      if (!err) {
        const undefinedError = new Error('Undefined error occurred while fetching slots');
        setError(undefinedError.message);
        setSlots([]);
        return;
      }
      
      // Get error message using error handler
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'slots');
      setError(errorInfo.message || 'Failed to fetch available slots');
      setSlots([]); // Set empty array on error
    } finally {
      setLoading(false);
    }
  }, [specialistId, appointmentType]);

  const refreshSlots = useCallback(() => {
    fetchSlots();
  }, [fetchSlots]);

  return {
    slots,
    loading,
    error,
    fetchSlots,
    refreshSlots,
    setError
  };
};

/**
 * Hook for managing appointments
 */
export const useAppointments = () => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [errorObject, setErrorObject] = useState(null); // Store error object for circuit breaker checking

  const fetchAppointments = useCallback(async (filters = {}) => {
    try {
      setLoading(true);
      setError(null);
      setErrorObject(null); // Clear error object

      const params = new URLSearchParams();
      if (filters.status) params.append('status_filter', filters.status);
      if (filters.limit) params.append('limit', filters.limit);
      if (filters.offset) params.append('offset', filters.offset);

      const apiCall = () => apiClient.get(
        `${API_ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS}?${params}`
      );

      const response = await retryOperations.manageAppointment(apiCall);
      
      // Validate response
      if (!response) {
        throw new Error('No response received from server');
      }
      
      if (!response.data) {
        throw new Error('Invalid response format: missing data');
      }
      
      // Handle array response
      if (Array.isArray(response.data)) {
        const mappedAppointments = response.data
          .map(appointment => mapAppointmentFields(appointment))
          .filter(appointment => appointment !== null); // Filter out null values
        setAppointments(mappedAppointments);
      } else if (response.data.appointments && Array.isArray(response.data.appointments)) {
        // Handle wrapped response format
        const mappedAppointments = response.data.appointments
          .map(appointment => mapAppointmentFields(appointment))
          .filter(appointment => appointment !== null);
        setAppointments(mappedAppointments);
      } else {
        // Empty response or unexpected format
        console.warn('Unexpected response format:', response.data);
        setAppointments([]);
      }
    } catch (err) {
      console.error('Error fetching appointments:', err);
      
      // Handle undefined or null error
      if (!err || err === undefined) {
        console.error('Received undefined error in fetchAppointments');
        const undefinedError = new Error('An unexpected error occurred while fetching appointments');
        setError(undefinedError.message);
        setAppointments([]); // Set empty array on error
        setLoading(false);
        return;
      }
      
      // Store error object for circuit breaker checking
      setErrorObject(err);
      
      // Handle circuit breaker errors
      if (err.code === 'CIRCUIT_BREAKER_OPEN') {
        const errorMessage = err.message || 'Service temporarily unavailable. Please try again later or refresh the page.';
        setError(errorMessage);
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      // Handle network errors
      if (!err.response && err.message) {
        setError(`Network error: ${err.message}. Please check your connection.`);
        setAppointments([]);
        setLoading(false);
        return;
      }
      
      // Handle API errors with response
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      setError(errorInfo.message || 'Failed to fetch appointments');
      setAppointments([]); // Set empty array on error
      
      // Handle authentication errors
      if (err.response?.status === 401 || err.response?.status === 403) {
        AuthStorage.clearAuth();
        setTimeout(() => {
        window.location.href = '/login';
        }, 2000);
      }
    } finally {
      setLoading(false);
    }
  }, []);

  const cancelAppointment = useCallback(async (appointmentId, reason) => {
    try {
      const apiCall = () => apiClient.put(
        API_ENDPOINTS.APPOINTMENTS.CANCEL(appointmentId),
        { reason }
      );

      await retryOperations.manageAppointment(apiCall);
      
      // Refresh appointments after cancellation
      await fetchAppointments();
      
      return { success: true };
    } catch (err) {
      console.error('Error cancelling appointment:', err);
      
      // Handle undefined or null error
      if (!err) {
        console.error('Received undefined error in cancelAppointment');
        return { success: false, error: 'An unexpected error occurred while cancelling appointment' };
      }
      
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      return { success: false, error: errorInfo.message };
    }
  }, [fetchAppointments]);

  const refreshAppointments = useCallback(() => {
    fetchAppointments();
  }, [fetchAppointments]);

  const rescheduleAppointment = useCallback(async (appointmentId, newSlotId) => {
    try {
      const apiCall = () => apiClient.put(
        API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(appointmentId),
        { new_slot_id: newSlotId }
      );

      await retryOperations.manageAppointment(apiCall);
      
      // Refresh appointments after rescheduling
      await fetchAppointments();
      
      return { success: true };
    } catch (err) {
      console.error('Error rescheduling appointment:', err);
      
      // Handle undefined or null error
      if (!err) {
        console.error('Received undefined error in rescheduleAppointment');
        return { success: false, error: 'An unexpected error occurred while rescheduling appointment' };
      }
      
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      return { success: false, error: errorInfo.message };
    }
  }, [fetchAppointments]);

  const completeAppointment = useCallback(async (appointmentId, notes = '') => {
    try {
      const apiCall = () => apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.COMPLETE(appointmentId),
        { notes }
      );

      await retryOperations.manageAppointment(apiCall);
      
      // Refresh appointments after completion
      await fetchAppointments();
      
      return { success: true };
    } catch (err) {
      console.error('Error completing appointment:', err);
      
      // Handle undefined or null error
      if (!err) {
        console.error('Received undefined error in completeAppointment');
        return { success: false, error: 'An unexpected error occurred while completing appointment' };
      }
      
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      return { success: false, error: errorInfo.message };
    }
  }, [fetchAppointments]);

  return {
    appointments,
    loading,
    error,
    errorObject, // Export error object for circuit breaker checking
    fetchAppointments,
    cancelAppointment,
    rescheduleAppointment,
    completeAppointment,
    refreshAppointments,
    setError
  };
};

/**
 * Hook for managing booking state
 */
export const useBooking = () => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);

  const bookAppointment = useCallback(async (bookingData) => {
    try {
      setLoading(true);
      setError(null);
      setSuccess(false);

      const apiCall = () => apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.BOOK,
        bookingData
      );

      const response = await retryOperations.bookAppointment(apiCall);
      
      setSuccess(true);
      return { success: true, data: response.data };
    } catch (err) {
      console.error('Error booking appointment:', err);
      
      // Handle undefined or null error
      if (!err) {
        console.error('Received undefined error in bookAppointment');
        const errorMessage = 'An unexpected error occurred while booking appointment';
        setError(errorMessage);
        return { success: false, error: errorMessage };
      }
      
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'booking');
      setError(errorInfo.message);
      return { success: false, error: errorInfo.message };
    } finally {
      setLoading(false);
    }
  }, []);

  const clearBookingState = useCallback(() => {
    setError(null);
    setSuccess(false);
  }, []);

  return {
    loading,
    error,
    success,
    bookAppointment,
    clearBookingState,
    setError
  };
};

/**
 * Hook for managing form state with validation
 */
export const useFormState = (initialState = {}, validationRules = {}) => {
  const [formData, setFormData] = useState(initialState);
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});

  const updateField = useCallback((fieldName, value) => {
    setFormData(prev => ({ ...prev, [fieldName]: value }));
    
    // Clear error when field is updated
    if (errors[fieldName]) {
      setErrors(prev => ({ ...prev, [fieldName]: null }));
    }
  }, [errors]);

  const markFieldTouched = useCallback((fieldName) => {
    setTouched(prev => ({ ...prev, [fieldName]: true }));
  }, []);

  const setFieldError = useCallback((fieldName, error) => {
    setErrors(prev => ({ ...prev, [fieldName]: error }));
  }, []);

  const clearErrors = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const resetForm = useCallback(() => {
    setFormData(initialState);
    setErrors({});
    setTouched({});
  }, [initialState]);

  const hasErrors = useMemo(() => {
    return Object.values(errors).some(error => error !== null);
  }, [errors]);

  const isFieldTouched = useCallback((fieldName) => {
    return touched[fieldName] || false;
  }, [touched]);

  const getFieldError = useCallback((fieldName) => {
    return isFieldTouched(fieldName) ? errors[fieldName] : null;
  }, [errors, isFieldTouched]);

  return {
    formData,
    errors,
    touched,
    updateField,
    markFieldTouched,
    setFieldError,
    clearErrors,
    resetForm,
    hasErrors,
    isFieldTouched,
    getFieldError,
    setFormData
  };
};

/**
 * Hook for managing pagination state
 */
export const usePagination = (initialPage = 1, initialSize = 12) => {
  const [pagination, setPagination] = useState({
    page: initialPage,
    size: initialSize,
    total: 0,
    total_pages: 0,
    has_more: false
  });

  const updatePage = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
  }, []);

  const updateSize = useCallback((newSize) => {
    setPagination(prev => ({ 
      ...prev, 
      size: newSize, 
      page: 1 // Reset to first page when changing size
    }));
  }, []);

  const updateTotal = useCallback((total) => {
    setPagination(prev => ({
      ...prev,
      total,
      total_pages: Math.ceil(total / prev.size),
      has_more: prev.page * prev.size < total
    }));
  }, []);

  const resetPagination = useCallback(() => {
    setPagination({
      page: initialPage,
      size: initialSize,
      total: 0,
      total_pages: 0,
      has_more: false
    });
  }, [initialPage, initialSize]);

  return {
    pagination,
    updatePage,
    updateSize,
    updateTotal,
    resetPagination,
    setPagination
  };
};

export default {
  useSpecialistSearch,
  useAvailableSlots,
  useAppointments,
  useBooking,
  useFormState,
  usePagination
};
