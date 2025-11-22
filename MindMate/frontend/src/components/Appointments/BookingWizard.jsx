import React, { useState, useEffect, useCallback, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  Video, 
  MapPin, 
  CheckCircle, 
  X,
  AlertCircle,
  Loader,
  Phone,
  User,
  DollarSign,
  Search,
  Star,
  Users,
  ChevronDown,
  ChevronUp,
  Upload,
  FileText,
  Image,
  XCircle as XCircleIcon
} from 'react-feather';
import apiClient from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import { mapTimeSlotFields, mapSpecialistFields } from '../../types/api';
import { APIErrorHandler } from '../../utils/errorHandler';
import { FormValidator, bookingValidation } from '../../utils/validation';
import { retryOperations } from '../../utils/apiRetry';
import { useAvailableSlots, useBooking, useFormState } from '../../hooks/useAppointmentState';
import { ButtonLoader, InlineLoader, ErrorState } from '../UI/LoadingStates';
import { useToast } from '../UI/Toast';
import { ROUTES } from '../../config/routes';
import { getSafeImageUrl } from '../../utils/imageUtils';
import './BookingWizard.css';

const BookingWizard = ({ 
  selectedSpecialist: initialSpecialist, 
  onClose, 
  onBookingComplete,
  darkMode 
}) => {
  const navigate = useNavigate();
  // Specialist search state
  const [specialists, setSpecialists] = useState([]);
  const [specialistSearchLoading, setSpecialistSearchLoading] = useState(false);
  const [specialistSearchError, setSpecialistSearchError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [showSpecialistSuggestions, setShowSpecialistSuggestions] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(initialSpecialist || null);
  const [imageErrors, setImageErrors] = useState({});
  
  // Payment receipt upload state
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentReceiptPreview, setPaymentReceiptPreview] = useState(null);
  const [paymentReceiptUploading, setPaymentReceiptUploading] = useState(false);
  const [paymentReceiptUploadError, setPaymentReceiptUploadError] = useState(null);
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  
  // Get specialist ID - handle both id formats
  const specialistId = selectedSpecialist?.id || selectedSpecialist?.specialist_id;
  
  // Initialize form state FIRST before using it in other hooks
  const {
    formData: bookingData,
    errors: validationErrors,
    updateField,
    markFieldTouched,
    getFieldError,
    clearErrors,
    hasErrors
  } = useFormState({
    consultation_mode: 'online',
    selected_date: null,
    selected_time: null,
    phone_number: '',
    patient_name: '',
    presenting_concern: '',
    payment_method_id: '',
    payment_receipt: '',
    payment_receipt_file: null
  }, bookingValidation);
  
  // Use custom hooks for state management (now bookingData is available)
  const { slots: availableSlots, loading: slotsLoading, error: slotsError, fetchSlots } = useAvailableSlots(
    specialistId, 
    bookingData?.consultation_mode || 'online'
  );
  
  const { loading: bookingLoading, error: bookingError, success: bookingSuccess, bookAppointment, clearBookingState } = useBooking();

  // Initialize form validator
  const validator = new FormValidator(bookingValidation);
  
  // Toast notifications
  const toast = useToast();

  // Initialize selected specialist from prop
  useEffect(() => {
    if (initialSpecialist && !selectedSpecialist) {
      setSelectedSpecialist(initialSpecialist);
      const specialistName = initialSpecialist.full_name || initialSpecialist.name || initialSpecialist.specialist_name || '';
      if (specialistName) {
        setSearchQuery(specialistName);
      }
      // Hide suggestions when specialist is pre-selected
      setShowSpecialistSuggestions(false);
    }
  }, [initialSpecialist]);

  // Load suggested specialists on mount if no specialist selected
  useEffect(() => {
    if (!selectedSpecialist && !initialSpecialist) {
      loadSuggestedSpecialists();
    }
  }, []);

  // Load slots when specialist or consultation mode changes
  // Use ref to prevent infinite loops
  const lastFetchRef = useRef({ specialistId: null, mode: null, date: null });
  
  useEffect(() => {
    const specialistId = selectedSpecialist?.id || selectedSpecialist?.specialist_id;
    const mode = bookingData.consultation_mode;
    
    // Only fetch if values actually changed
    if (specialistId && mode && 
        (lastFetchRef.current.specialistId !== specialistId || 
         lastFetchRef.current.mode !== mode)) {
      lastFetchRef.current.specialistId = specialistId;
      lastFetchRef.current.mode = mode;
      fetchSlots();
    }
  }, [selectedSpecialist?.id, selectedSpecialist?.specialist_id, bookingData.consultation_mode, fetchSlots]);

  // Load slots when date is selected (only for specific date)
  useEffect(() => {
    const specialistId = selectedSpecialist?.id || selectedSpecialist?.specialist_id;
    const mode = bookingData.consultation_mode;
    const date = bookingData.selected_date;
    
    // Only fetch if all required values are present and date changed
    if (specialistId && mode && date && lastFetchRef.current.date !== date) {
      lastFetchRef.current.date = date;
      // Fetch slots for specific date - this will trigger date-specific endpoint
      fetchSlots();
    }
  }, [bookingData.selected_date, selectedSpecialist?.id, selectedSpecialist?.specialist_id, bookingData.consultation_mode, fetchSlots]);

  // Load suggested specialists
  const loadSuggestedSpecialists = useCallback(async () => {
    try {
      setSpecialistSearchLoading(true);
      setSpecialistSearchError(null);

      // Use specialists search (approved only); backend doesn't support text query, so just fetch top 3
      const response = await apiClient.get(`${API_ENDPOINTS.SPECIALISTS.SEARCH}?page=1&size=3`);
      
      if (response.data?.specialists && Array.isArray(response.data.specialists)) {
        const mappedSpecialists = response.data.specialists.map(specialist => mapSpecialistFields(specialist));
        setSpecialists(mappedSpecialists);
      } else {
        setSpecialists([]);
      }
    } catch (err) {
      console.error("Error loading suggested specialists:", err);
      setSpecialistSearchError('Failed to load specialists');
    } finally {
      setSpecialistSearchLoading(false);
    }
  }, []);

  // Search specialists
  const searchSpecialists = useCallback(async (query) => {
    if (!query.trim()) {
      loadSuggestedSpecialists();
      return;
    }

    try {
      setSpecialistSearchLoading(true);
      setSpecialistSearchError(null);

      // Backend specialists search does not support text query; fetch a page and filter client-side by name/specialization
      const response = await apiClient.get(`${API_ENDPOINTS.SPECIALISTS.SEARCH}?page=1&size=20`);
      
      if (response.data?.specialists && Array.isArray(response.data.specialists)) {
        const mappedSpecialists = response.data.specialists
          .map(specialist => mapSpecialistFields(specialist))
          .filter(s => {
            const q = query.toLowerCase();
            const name = (s.full_name || '').toLowerCase();
            const type = (s.specialist_type || '').toLowerCase();
            const specs = Array.isArray(s.specializations) ? s.specializations.join(' ').toLowerCase() : '';
            return name.includes(q) || type.includes(q) || specs.includes(q);
          })
          .slice(0, 3);
        setSpecialists(mappedSpecialists);
      } else {
        setSpecialists([]);
      }
    } catch (err) {
      console.error("Error searching specialists:", err);
      setSpecialistSearchError('Failed to search specialists');
    } finally {
      setSpecialistSearchLoading(false);
    }
  }, [loadSuggestedSpecialists]);

  // Handle specialist selection
  const handleSpecialistSelect = useCallback((specialist) => {
    setSelectedSpecialist(specialist);
    setShowSpecialistSuggestions(false);
    // Handle different field names from different sources
    const specialistName = specialist.name || specialist.specialist_name || specialist.full_name || 'Specialist';
    setSearchQuery(specialistName);
    
    // Reset form when specialist changes
    updateField('selected_date', null);
    updateField('selected_time', null);
  }, [updateField]);

  // Handle payment receipt file upload
  const handlePaymentReceiptUpload = useCallback(async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setPaymentReceiptUploadError('Invalid file type. Please upload PDF, JPEG, or PNG file.');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setPaymentReceiptUploadError('File size too large. Maximum size is 5MB.');
      return;
    }

    setPaymentReceiptFile(file);
    setPaymentReceiptUploadError(null);
    setPaymentReceiptUploading(true);

    try {
      // Create FormData for file upload
      const formData = new FormData();
      formData.append('file', file);

      // Upload file to backend
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.UPLOAD_PAYMENT_RECEIPT,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        }
      );

      if (response.data?.file_url) {
        const fileUrl = response.data.file_url;
        setPaymentReceiptUrl(fileUrl);
        updateField('payment_receipt', fileUrl);
        updateField('payment_receipt_file', file);
        
        // Create preview for images
        if (file.type.startsWith('image/')) {
          const reader = new FileReader();
          reader.onloadend = () => {
            setPaymentReceiptPreview(reader.result);
          };
          reader.readAsDataURL(file);
        } else {
          setPaymentReceiptPreview(null);
        }
        
        toast.success('Payment receipt uploaded successfully');
      } else {
        throw new Error('No file URL returned from server');
      }
    } catch (error) {
      console.error('Error uploading payment receipt:', error);
      setPaymentReceiptUploadError(
        error.response?.data?.detail || 
        error.message || 
        'Failed to upload payment receipt. Please try again.'
      );
      setPaymentReceiptFile(null);
      setPaymentReceiptPreview(null);
      setPaymentReceiptUrl('');
      updateField('payment_receipt', '');
      toast.error('Failed to upload payment receipt');
    } finally {
      setPaymentReceiptUploading(false);
    }
  }, [updateField, toast]);

  // Handle file input change
  const handleFileInputChange = useCallback((e) => {
    const file = e.target.files?.[0];
    if (file) {
      handlePaymentReceiptUpload(file);
    }
  }, [handlePaymentReceiptUpload]);

  // Remove payment receipt
  const handleRemovePaymentReceipt = useCallback(() => {
    setPaymentReceiptFile(null);
    setPaymentReceiptPreview(null);
    setPaymentReceiptUrl('');
    setPaymentReceiptUploadError(null);
    updateField('payment_receipt', '');
    updateField('payment_receipt_file', null);
  }, [updateField]);

  // Handle search input change
  const handleSearchChange = useCallback((e) => {
    const query = e.target.value;
    setSearchQuery(query);
    
    if (query.trim()) {
      setShowSpecialistSuggestions(true);
      searchSpecialists(query);
    } else {
      setShowSpecialistSuggestions(false);
      loadSuggestedSpecialists();
    }
  }, [searchSpecialists, loadSuggestedSpecialists]);

  // Real-time validation
  const validateField = useCallback((fieldName, value) => {
    const result = validator.validateField(fieldName, value, bookingData);
    return result;
  }, [validator, bookingData]);

  // Get available time slots for selected date
  const getAvailableSlotsForDate = useCallback((date) => {
    if (!availableSlots || !date) return [];
    
    // Normalize date format for comparison
    const normalizeDate = (dateStr) => {
      if (!dateStr) return null;
      // If already in YYYY-MM-DD format, return as is
      if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
        return dateStr;
      }
      // Otherwise parse and format
      try {
        return new Date(dateStr).toISOString().split('T')[0];
      } catch {
        return null;
      }
    };
    
    const targetDate = normalizeDate(date);
    if (!targetDate) return [];
    
    return availableSlots.filter(slot => {
      if (!slot || !slot.slot_date) return false;
      const slotDate = normalizeDate(slot.slot_date);
      return slotDate === targetDate && slot.can_be_booked !== false && slot.is_available !== false;
    }).sort((a, b) => {
      // Sort by time - use start_time if available, otherwise slot_date
      const timeAStr = a.start_time || a.slot_date;
      const timeBStr = b.start_time || b.slot_date;
      if (!timeAStr || !timeBStr) return 0;
      const timeA = new Date(timeAStr).getTime();
      const timeB = new Date(timeBStr).getTime();
      return timeA - timeB;
    });
  }, [availableSlots]);

  const handleBookingSubmit = async () => {
    // Clear previous errors
    clearBookingState();
    clearErrors();
    
    // Mark all fields as touched for validation display
    const allFields = ['phone_number', 'patient_name', 'selected_date', 'selected_time', 'presenting_concern'];
    // Add payment fields for online appointments
    if (bookingData.consultation_mode === 'online') {
      allFields.push('payment_method_id', 'payment_receipt');
    }
    allFields.forEach(field => markFieldTouched(field));
    
    // Prepare form data for validation
    const formData = {
      ...bookingData,
      specialist_id: selectedSpecialist?.id,
      slot_id: bookingData.selected_time ? 'selected' : null,
      appointment_type: bookingData.consultation_mode
    };
    
    // Validate payment fields for online appointments
    if (bookingData.consultation_mode === 'online') {
      if (!bookingData.payment_method_id) {
        toast.error('Payment method is required for online appointments');
        markFieldTouched('payment_method_id');
        return;
      }
      if (!paymentReceiptUrl && !bookingData.payment_receipt) {
        toast.error('Payment receipt is required for online appointments');
        markFieldTouched('payment_receipt');
        return;
      }
    }
    
    // Validate form
    const validation = validator.validateForm(formData);
    if (!validation.isValid) {
      return;
    }

    if (!selectedSpecialist) {
      toast.error('Please select a specialist');
      return;
    }

    try {
      // Find the selected slot - bookingData.selected_time now contains slot_id
      const slotsForDate = getAvailableSlotsForDate(bookingData.selected_date);
      const selectedSlot = slotsForDate.find(slot => slot.slot_id === bookingData.selected_time);

      if (!selectedSlot) {
        toast.error('Selected time slot is no longer available. Please select another time.');
        // Refresh slots to get latest availability
        fetchSlots();
        return;
      }

      // Additional validation: Check if slot is marked as available
      if (!selectedSlot.is_available) {
        toast.error('This time slot has been booked. Please select another available time.');
        fetchSlots(); // Refresh to get updated slots
        return;
      }

      // Validate slot hasn't expired
      const slotDateTime = new Date(selectedSlot.slot_date);
      if (slotDateTime < new Date()) {
        toast.error('This time slot has passed. Please select a future time.');
        fetchSlots();
        return;
      }
      
      // Build booking request matching backend AppointmentBookingRequest model
      // Backend expects: specialist_id, slot_id, appointment_type, presenting_concern, 
      // patient_notes (optional), payment_method_id (optional), payment_receipt (optional)
      const bookingRequest = {
        specialist_id: selectedSpecialist.id || selectedSpecialist.specialist_id,
        slot_id: selectedSlot.slot_id,
        appointment_type: bookingData.consultation_mode === 'online' ? 'online' : 'in_person',
        presenting_concern: bookingData.presenting_concern.trim(),
        // Optional fields - only include if they have values
        ...(bookingData.patient_name || bookingData.phone_number ? {
          patient_notes: `Phone: ${bookingData.phone_number || 'N/A'}, Patient: ${bookingData.patient_name || 'N/A'}`.trim()
        } : {})
      };

      // Payment fields - required for online appointments, omit for in_person
      if (bookingData.consultation_mode === 'online') {
        if (bookingData.payment_method_id) {
          bookingRequest.payment_method_id = bookingData.payment_method_id;
        }
        // Use uploaded file URL or fallback to text input
        const receiptValue = paymentReceiptUrl || bookingData.payment_receipt;
        if (receiptValue) {
          bookingRequest.payment_receipt = receiptValue.trim();
        }
      }

      const result = await bookAppointment(bookingRequest);
      
      if (result.success) {
        toast.success('Appointment booked successfully!');
        
        if (onBookingComplete) {
          // Call with both success flag and data - caller can handle either signature
          try {
            onBookingComplete(true, result.data);
          } catch {
            // Fallback for single-parameter callback
            try {
              onBookingComplete(result.data);
            } catch (err) {
              console.error('Error in onBookingComplete callback:', err);
            }
          }
        }
        
        setTimeout(() => {
          onClose();
        }, 1000);
      } else {
        // Use error handler for better error messages
        const errorInfo = APIErrorHandler.handleBookingError(result.error || { response: { data: { detail: result.error } } });
        
        toast.error(errorInfo.message, {
          duration: 5000,
          icon: errorInfo.severity === 'warning' ? '⚠️' : '❌'
        });

        // Handle specific error actions
        if (errorInfo.action === 'refresh_slots') {
          // Refresh slots when slot is unavailable
          fetchSlots();
        }
      }
    } catch (err) {
      console.error("Error booking appointment:", err);
      
      // Use error handler for better error messages
      const errorInfo = APIErrorHandler.handleBookingError(err);
      
      toast.error(errorInfo.message, {
        duration: 5000,
        icon: errorInfo.severity === 'warning' ? '⚠️' : '❌'
      });

      // Handle specific error actions
      if (errorInfo.action === 'refresh_slots') {
        // Refresh slots when slot conflict detected
        fetchSlots();
      } else if (errorInfo.action === 'login') {
        // Redirect to login if authentication error
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { replace: true });
        }, 2000);
      }
    }
  };

  // Consultation modes
  const consultationModes = [
    {
      mode: 'online',
      title: 'Online Consultation',
      description: 'Video call with specialist',
      icon: Video,
      price: selectedSpecialist?.consultation_fee || 2000,
      discount: 150,
      available: selectedSpecialist?.consultation_modes?.includes('online') || true
    },
    {
      mode: 'in_person',
      title: 'In-Person Visit',
      description: 'Visit specialist at clinic',
      icon: MapPin,
      price: selectedSpecialist?.consultation_fee || 2000,
      discount: 0,
      available: selectedSpecialist?.consultation_modes?.includes('in_person') || true
    }
  ];

  return (
    <motion.div 
      className={`booking-wizard-overlay ${darkMode ? 'dark' : ''}`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      onClick={(e) => {
        if (e.target === e.currentTarget || e.target.classList.contains('overlay')) {
          onClose();
        }
      }}
    >
      <motion.div 
        className="booking-wizard-simple"
        initial={{ scale: 0.9, y: 20 }}
        animate={{ scale: 1, y: 0 }}
        exit={{ scale: 0.9, y: 20 }}
        transition={{ duration: 0.3 }}
      >
        {/* Header */}
        <div className="booking-header">
          <h2>Book Appointment</h2>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        <div className="booking-content">
          {/* Step 1: Specialist Search and Selection */}
          <div className="booking-step">
            <div className="step-header">
              <h3>1. Select Specialist</h3>
              <p>Search and choose your preferred specialist</p>
            </div>

            <div className="specialist-search-container">
              <div className="search-input-wrapper">
                <Search size={20} />
                <input
                  type="text"
                  placeholder="Search specialists by name or specialization..."
                  value={searchQuery}
                  onChange={handleSearchChange}
                  onFocus={() => setShowSpecialistSuggestions(true)}
                  className="specialist-search-input"
                />
                {specialistSearchLoading && <Loader size={16} className="search-loading" />}
              </div>

              {/* Selected Specialist Display */}
              {selectedSpecialist && (
                <div className="selected-specialist">
                  <div className="specialist-info">
                    <div className="specialist-avatar">
                      {getSafeImageUrl(selectedSpecialist.profile_image_url || selectedSpecialist.profile_picture) && !imageErrors['selected'] ? (
                        <img 
                          src={getSafeImageUrl(selectedSpecialist.profile_image_url || selectedSpecialist.profile_picture)} 
                          alt={selectedSpecialist.full_name || selectedSpecialist.name || selectedSpecialist.specialist_name || 'Specialist'}
                          onError={() => setImageErrors(prev => ({ ...prev, selected: true }))}
                        />
                      ) : (
                        <User size={24} />
                      )}
                    </div>
                    <div className="specialist-details">
                      <h4>{selectedSpecialist.full_name || selectedSpecialist.name || selectedSpecialist.specialist_name || 'Specialist'}</h4>
                      <p>{selectedSpecialist.specialist_type || selectedSpecialist.specialization || 'Mental Health Specialist'}</p>
                      <div className="specialist-meta">
                        <span className="rating">
                          <Star size={14} fill="currentColor" />
                          {selectedSpecialist.average_rating || selectedSpecialist.rating || '4.5'}
                        </span>
                        <span className="fee">Rs. {selectedSpecialist.consultation_fee || 2000}</span>
                      </div>
                    </div>
                  </div>
                  <button 
                    className="change-specialist-btn"
                    onClick={() => {
                      setSelectedSpecialist(null);
                      setSearchQuery('');
                      setShowSpecialistSuggestions(true);
                    }}
                  >
                    Change
                  </button>
                </div>
              )}

              {/* Specialist Suggestions */}
              <AnimatePresence>
                {showSpecialistSuggestions && (
                  <motion.div 
                    className="specialist-suggestions"
                    initial={{ opacity: 0, y: -10 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -10 }}
                  >
                    {specialistSearchLoading ? (
                      <div className="loading-specialists">
                        <Loader size={20} />
                        <span>Searching specialists...</span>
                      </div>
                    ) : specialistSearchError ? (
                      <div className="error-specialists">
                        <AlertCircle size={20} />
                        <span>{specialistSearchError}</span>
                      </div>
                    ) : specialists.length > 0 ? (
                      <div className="suggestions-list">
                        {specialists.map((specialist) => (
                          <div
                            key={specialist.id}
                            className="specialist-suggestion"
                            onClick={() => handleSpecialistSelect(specialist)}
                          >
                            <div className="specialist-avatar">
                              {getSafeImageUrl(specialist.profile_image_url || specialist.profile_picture) && !imageErrors[specialist.id] ? (
                                <img 
                                  src={getSafeImageUrl(specialist.profile_image_url || specialist.profile_picture)} 
                                  alt={specialist.full_name || specialist.name || specialist.specialist_name || 'Specialist'}
                                  onError={() => setImageErrors(prev => ({ ...prev, [specialist.id]: true }))}
                                />
                              ) : (
                                <User size={20} />
                              )}
                            </div>
                            <div className="specialist-info">
                              <h4>{specialist.full_name || specialist.name || specialist.specialist_name || 'Specialist'}</h4>
                              <p>{specialist.specialist_type || specialist.specialization || 'Mental Health Specialist'}</p>
                              <div className="specialist-meta">
                                <span className="rating">
                                  <Star size={12} fill="currentColor" />
                                  {specialist.average_rating || specialist.rating || '4.5'}
                                </span>
                                <span className="fee">Rs. {specialist.consultation_fee || 2000}</span>
                              </div>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="no-specialists">
                        <Users size={20} />
                        <span>No specialists found</span>
                      </div>
                    )}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </div>

          {/* Step 2: Consultation Mode Selection */}
          {selectedSpecialist && (
            <div className="booking-step">
              <div className="step-header">
                <h3>2. Choose Consultation Type</h3>
                <p>Select your preferred consultation method</p>
              </div>

              <div className="consultation-modes">
                {consultationModes.map((item, index) => (
                  <div
                    key={item.mode}
                    className={`consultation-card ${bookingData.consultation_mode === item.mode ? 'selected' : ''} ${!item.available ? 'disabled' : ''}`}
                    onClick={() => {
                      if (item.available) {
                        updateField('consultation_mode', item.mode);
                        updateField('selected_date', null);
                        updateField('selected_time', null);
                      }
                    }}
                  >
                    {index === 0 && item.discount > 0 && (
                      <div className="discount-badge">
                        Save PKR {item.discount}
                      </div>
                    )}
                    
                    <div className="consultation-icon">
                      <item.icon size={24} />
                    </div>
                    
                    <div className="consultation-content">
                      <h4>{item.title}</h4>
                      <p>{item.description}</p>
                      <div className="consultation-price">
                        <span className="price">PKR {item.price - item.discount}</span>
                        {item.discount > 0 && (
                          <span className="original-price">PKR {item.price}</span>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Step 3: Date and Time Selection */}
          {selectedSpecialist && bookingData.consultation_mode && (
            <div className="booking-step">
              <div className="step-header">
                <h3>3. Select Date & Time</h3>
                <p>Choose your preferred appointment time</p>
              </div>

              <div className="datetime-selection">
                <div className="datetime-field">
                  <Calendar size={20} />
                  <input
                    type="date"
                    min={new Date().toISOString().split('T')[0]}
                    max={new Date(Date.now() + 10 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                    value={bookingData.selected_date || ''}
                    onChange={(e) => {
                      updateField('selected_date', e.target.value);
                      updateField('selected_time', null);
                    }}
                  />
                </div>
                
                {bookingData.selected_date && (
                  <div className="datetime-field">
                    <Clock size={20} />
                    <select
                      value={bookingData.selected_time || ''}
                      onChange={(e) => updateField('selected_time', e.target.value)}
                      disabled={slotsLoading}
                    >
                      <option value="">Select Time</option>
                      {slotsLoading ? (
                        <option disabled>Loading slots...</option>
                      ) : getAvailableSlotsForDate(bookingData.selected_date).length > 0 ? (
                        getAvailableSlotsForDate(bookingData.selected_date).map((slot) => {
                          if (!slot.slot_id) return null;
                          
                          // Use start_time if available, otherwise use slot_date
                          const startTimeStr = slot.start_time || slot.slot_date;
                          const endTimeStr = slot.end_time;
                          
                          // Parse times and format with AM/PM in PKT
                          const startDate = new Date(startTimeStr);
                          const endDate = endTimeStr ? new Date(endTimeStr) : null;
                          
                          // Format times with AM/PM in PKT timezone
                          const slotTime = startDate.toLocaleTimeString('en-US', {
                            hour: '2-digit',
                            minute: '2-digit',
                            hour12: true,
                            timeZone: 'Asia/Karachi' // PKT timezone
                          });
                          
                          const slotEndTime = endDate 
                            ? endDate.toLocaleTimeString('en-US', {
                                hour: '2-digit',
                                minute: '2-digit',
                                hour12: true,
                                timeZone: 'Asia/Karachi' // PKT timezone
                              })
                            : null;
                          
                          const timeLabel = slotEndTime ? `${slotTime} - ${slotEndTime}` : slotTime;
                          
                          // Use slot_id as value for better reliability
                          return (
                            <option key={slot.slot_id} value={slot.slot_id}>
                              {timeLabel}
                            </option>
                          );
                        }).filter(Boolean)
                      ) : (
                        <option disabled>No slots available for this date</option>
                      )}
                    </select>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Step 4: Patient Information */}
          {selectedSpecialist && bookingData.consultation_mode && bookingData.selected_date && bookingData.selected_time && (
            <div className="booking-step">
              <div className="step-header">
                <h3>4. Patient Information</h3>
                <p>Provide your contact details and concerns</p>
              </div>

              <div className="patient-info">
                <div className="contact-field">
                  <Phone size={18} />
                  <input
                    type="tel"
                    placeholder="Phone Number"
                    value={bookingData.phone_number}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateField('phone_number', value);
                      validateField('phone_number', value);
                    }}
                    onBlur={() => markFieldTouched('phone_number')}
                    className={getFieldError('phone_number') ? 'error' : ''}
                  />
                  {getFieldError('phone_number') && (
                    <span className="field-error">{getFieldError('phone_number')}</span>
                  )}
                </div>
                
                <div className="contact-field">
                  <User size={18} />
                  <input
                    type="text"
                    placeholder="Patient Name"
                    value={bookingData.patient_name}
                    onChange={(e) => {
                      const value = e.target.value;
                      updateField('patient_name', value);
                      validateField('patient_name', value);
                    }}
                    onBlur={() => markFieldTouched('patient_name')}
                    className={getFieldError('patient_name') ? 'error' : ''}
                  />
                  {getFieldError('patient_name') && (
                    <span className="field-error">{getFieldError('patient_name')}</span>
                  )}
                </div>
              </div>

              <div className="presenting-concern-field">
                <label>What's your concern?</label>
                <textarea
                  placeholder="Brief description of your symptoms or concerns..."
                  rows={3}
                  value={bookingData.presenting_concern}
                  onChange={(e) => {
                    const value = e.target.value;
                    updateField('presenting_concern', value);
                    validateField('presenting_concern', value);
                  }}
                  onBlur={() => markFieldTouched('presenting_concern')}
                  className={getFieldError('presenting_concern') ? 'error' : ''}
                />
                {getFieldError('presenting_concern') && (
                  <span className="field-error">{getFieldError('presenting_concern')}</span>
                )}
              </div>

              {/* Payment Information - Only for Online Appointments */}
              {bookingData.consultation_mode === 'online' && (
                <div className="payment-info">
                  <div className="payment-header">
                    <DollarSign size={20} />
                    <h4>Payment Information</h4>
                  </div>
                  <p className="payment-description">
                    Please provide payment details for online appointment. Upload a receipt or enter transaction ID. Specialist will verify before confirming.
                  </p>
                  
                  <div className="payment-field">
                    <label>
                      Payment Method *
                    </label>
                    <select
                      value={bookingData.payment_method_id}
                      onChange={(e) => {
                        const value = e.target.value;
                        updateField('payment_method_id', value);
                        validateField('payment_method_id', value, bookingData);
                      }}
                      onBlur={() => markFieldTouched('payment_method_id')}
                      className={getFieldError('payment_method_id') ? 'error' : ''}
                    >
                      <option value="">Select payment method</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="cash">Cash (deposit)</option>
                    </select>
                    {getFieldError('payment_method_id') && (
                      <span className="field-error">
                        {getFieldError('payment_method_id')}
                      </span>
                    )}
                  </div>

                  <div className="payment-field">
                    <label>
                      Payment Receipt *
                    </label>
                    <div className="payment-receipt-upload">
                      {!paymentReceiptUrl && !paymentReceiptFile && (
                        <div className="file-upload-area">
                          <input
                            type="file"
                            id="payment-receipt-upload"
                            accept=".pdf,.jpg,.jpeg,.png"
                            onChange={handleFileInputChange}
                            disabled={paymentReceiptUploading}
                            style={{ display: 'none' }}
                          />
                          <label htmlFor="payment-receipt-upload" className="upload-label">
                            {paymentReceiptUploading ? (
                              <>
                                <Loader size={20} className="spinning" />
                                <span>Uploading...</span>
                              </>
                            ) : (
                              <>
                                <Upload size={20} />
                                <span>Upload Receipt (PDF, JPEG, PNG - Max 5MB)</span>
                              </>
                            )}
                          </label>
                        </div>
                      )}
                      
                      {paymentReceiptUploadError && (
                        <div className="upload-error">
                          <AlertCircle size={16} />
                          <span>{paymentReceiptUploadError}</span>
                        </div>
                      )}
                      
                      {(paymentReceiptPreview || paymentReceiptFile) && (
                        <div className="file-preview">
                          {paymentReceiptPreview ? (
                            <div className="image-preview">
                              <img src={paymentReceiptPreview} alt="Payment receipt preview" />
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={handleRemovePaymentReceipt}
                                title="Remove file"
                              >
                                <XCircleIcon size={18} />
                              </button>
                            </div>
                          ) : (
                            <div className="file-info">
                              <FileText size={20} />
                              <div className="file-details">
                                <span className="file-name">{paymentReceiptFile?.name}</span>
                                <span className="file-size">
                                  {(paymentReceiptFile?.size / 1024).toFixed(2)} KB
                                </span>
                              </div>
                              <button
                                type="button"
                                className="remove-file-btn"
                                onClick={handleRemovePaymentReceipt}
                                title="Remove file"
                              >
                                <XCircleIcon size={18} />
                              </button>
                            </div>
                          )}
                          {paymentReceiptUrl && (
                            <div className="upload-success">
                              <CheckCircle size={16} />
                              <span>Receipt uploaded successfully</span>
                            </div>
                          )}
                        </div>
                      )}
                      
                      {!paymentReceiptUrl && !paymentReceiptFile && (
                        <div className="payment-receipt-alt">
                          <div className="alt-divider">
                            <span>OR</span>
                          </div>
                          <input
                            type="text"
                            placeholder="Enter transaction ID or receipt number"
                            value={bookingData.payment_receipt}
                            onChange={(e) => {
                              const value = e.target.value;
                              updateField('payment_receipt', value);
                              validateField('payment_receipt', value, bookingData);
                            }}
                            onBlur={() => markFieldTouched('payment_receipt')}
                            className={getFieldError('payment_receipt') ? 'error' : ''}
                          />
                          <small>
                            Enter the transaction ID from your payment if you don't have a receipt image.
                          </small>
                          {getFieldError('payment_receipt') && (
                            <span className="field-error">
                              {getFieldError('payment_receipt')}
                            </span>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Booking Summary and Submit */}
          {selectedSpecialist && bookingData.consultation_mode && bookingData.selected_date && bookingData.selected_time && bookingData.phone_number && bookingData.patient_name && bookingData.presenting_concern && (bookingData.consultation_mode !== 'online' || (bookingData.payment_method_id && (paymentReceiptUrl || bookingData.payment_receipt))) && (
            <div className="booking-summary">
              <h3>Booking Summary</h3>
              <div className="summary-details">
                <div className="summary-item">
                  <span>Specialist:</span>
                  <span>{selectedSpecialist.full_name || selectedSpecialist.name || selectedSpecialist.specialist_name || 'Specialist'}</span>
                </div>
                <div className="summary-item">
                  <span>Type:</span>
                  <span>{bookingData.consultation_mode === 'online' ? 'Online Consultation' : 'In-Person Visit'}</span>
                </div>
                <div className="summary-item">
                  <span>Date & Time:</span>
                  <span>{bookingData.selected_date} at {bookingData.selected_time}</span>
                </div>
                <div className="summary-item">
                  <span>Fee:</span>
                  <span>Rs. {selectedSpecialist.consultation_fee || 2000}</span>
                </div>
              </div>

              <button 
                className="book-appointment-btn"
                onClick={handleBookingSubmit}
                disabled={bookingLoading || hasErrors}
              >
                {bookingLoading ? (
                  <>
                    <ButtonLoader />
                    Booking...
                  </>
                ) : (
                  <>
                    <CheckCircle size={20} />
                    Confirm Booking
                  </>
                )}
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default BookingWizard;