import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import apiClient from '../../utils/axiosConfig';
import { 
  Star, 
  MapPin, 
  Clock, 
  Video, 
  Calendar, 
  DollarSign,
  Award,
  Shield,
  CheckCircle,
  ArrowLeft,
  MessageSquare,
  Phone,
  Globe,
  User,
  TrendingUp,
  Share2,
  ChevronDown,
  ChevronUp,
  Loader,
  AlertCircle
} from 'react-feather';
import { toast } from 'react-hot-toast';
import Header from '../Home/Navigation/Header';
import Footer from '../Home/Navigation/Footer';
import { API_ENDPOINTS } from '../../config/api';
import { ROUTES } from '../../config/routes';
import { getSafeImageUrl, getInitials } from '../../utils/imageUtils';
import './SpecialistProfilePage.css';

const SpecialistProfilePage = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [specialist, setSpecialist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [showAllReviews, setShowAllReviews] = useState(false);
  const [selectedConsultationMode, setSelectedConsultationMode] = useState('video');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [presentingConcern, setPresentingConcern] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [imageError, setImageError] = useState(false);
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  const [currentUser, setCurrentUser] = useState(null);

  useEffect(() => {
    loadSpecialistProfile();
    loadCurrentUser();
  }, [id]);

  useEffect(() => {
    if (specialist) {
      // Set default consultation mode if not set and specialist has modes
      if (!selectedConsultationMode && specialist.consultation_modes) {
        const hasOnline = specialist.consultation_modes.some(mode => 
          mode === 'online' || mode === 'ONLINE'
        );
        if (hasOnline) {
          setSelectedConsultationMode('video');
        } else if (specialist.consultation_modes.some(mode => 
          mode === 'in_person' || mode === 'IN_PERSON'
        )) {
          setSelectedConsultationMode('clinic');
        }
      }
    }
  }, [specialist]);

  useEffect(() => {
    if (specialist) {
      // Set default consultation mode if not set and specialist has modes
      if (!selectedConsultationMode && specialist.consultation_modes) {
        const hasOnline = specialist.consultation_modes.some(mode => 
          mode === 'online' || mode === 'ONLINE'
        );
        if (hasOnline) {
          setSelectedConsultationMode('video');
        } else if (specialist.consultation_modes.some(mode => 
          mode === 'in_person' || mode === 'IN_PERSON'
        )) {
          setSelectedConsultationMode('clinic');
        }
      }
    }
  }, [specialist]);

  useEffect(() => {
    if (specialist && selectedConsultationMode) {
      // Reset selections when consultation mode changes
      setSelectedDate('');
      setSelectedTime('');
      setSelectedSlotId('');
      setAvailableSlots([]);
      // Don't load slots on mount - wait for date selection
    }
  }, [specialist, selectedConsultationMode]);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
  }, [darkMode]);

  const loadCurrentUser = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
      setCurrentUser(response.data);
    } catch (err) {
      console.error('Error loading current user:', err);
    }
  };

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const loadSpecialistProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load specialist public profile
        const specialistResponse = await apiClient.get(
          API_ENDPOINTS.SPECIALISTS.PUBLIC_PROFILE(id)
        );
        setSpecialist(specialistResponse.data);

      // Load reviews
      try {
        const reviewsResponse = await apiClient.get(
          API_ENDPOINTS.SPECIALISTS.REVIEWS(id)
        );
        setReviews(reviewsResponse.data || []);
      } catch (err) {
        console.error('Error loading reviews:', err);
        setReviews([]);
      }
    } catch (err) {
      console.error('Error loading specialist profile:', err);
      if (err.response?.status === 404) {
        setError('Specialist not found or not approved');
      } else {
      setError('Failed to load specialist profile');
      }
    } finally {
      setLoading(false);
    }
  };

  const loadSlotsForDate = async (targetDate) => {
    if (!id || !selectedConsultationMode || !targetDate) {
      console.log('loadSlotsForDate: Missing required parameters', { id, selectedConsultationMode, targetDate });
      return;
    }

    try {
      setLoadingSlots(true);
      setBookingError(null);

      // Validate date is within 7 days
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      const selected = new Date(targetDate);
      selected.setHours(0, 0, 0, 0);
      const maxDate = new Date(today);
      maxDate.setDate(maxDate.getDate() + 7);

      if (selected < today) {
        setBookingError('Cannot select past dates');
        setAvailableSlots([]);
        return;
      }

      if (selected > maxDate) {
        setBookingError('Cannot book more than 7 days in advance');
        setAvailableSlots([]);
        return;
      }

      // Map consultation mode: 'video'/'online' -> 'online', 'clinic' -> 'in_person'
      const appointmentType = (selectedConsultationMode === 'video' || selectedConsultationMode === 'online') 
        ? 'online' 
        : 'in_person';

      console.log('Loading slots for date:', { 
        id, 
        selectedConsultationMode,
        appointmentType, 
        date: targetDate
      });

      // Format date as YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return null;
        if (typeof date === 'string') {
          // If already in YYYY-MM-DD format, return as is
          if (/^\d{4}-\d{2}-\d{2}$/.test(date)) {
            return date;
          }
          // Otherwise parse it
          return new Date(date).toISOString().split('T')[0];
        }
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // Backend uses "online" for slots, not "virtual"
      const slotAppointmentType = appointmentType === 'virtual' ? 'online' : appointmentType;

      // Use new single-date endpoint
      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS_DATE(id),
        {
          params: {
            date: formatDate(targetDate),
            appointment_type: slotAppointmentType
          }
        }
      );

      console.log('Slots response for date:', response.data);

      // Endpoint returns an array of slots for the selected date
      const slots = Array.isArray(response.data)
        ? response.data
        : (response.data?.slots || response.data?.available_slots || []);
      
      console.log('Processed slots for date:', slots.length);
      
      if (slots.length > 0) {
        console.log('First slot structure:', slots[0]);
      }
      
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading slots for date:', err);
      console.error('Error details:', err.response?.data);
      
      // Handle errors
      if (err.response?.status === 400) {
        setBookingError(err.response.data.detail || 'Invalid date or date range');
      } else if (err.response?.status === 401) {
        console.warn('User not authenticated - slots require authentication');
      } else if (err.response?.status === 404) {
        setBookingError('No slots available for this date. Please try another date.');
      } else {
        setBookingError('Failed to load slots. Please try again.');
      }
      
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };

  // Keep old function for backward compatibility (used by date range loading if needed)
  const loadAvailableSlots = async () => {
    if (!id || !selectedConsultationMode) {
      console.log('loadAvailableSlots: Missing id or consultation mode', { id, selectedConsultationMode });
      return;
    }

    try {
      setLoadingSlots(true);
      // Load slots for next 7 days only
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6); // 7 days total (today + 6 more)

      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };

      // Map consultation mode: 'video'/'online' -> 'online', 'clinic' -> 'in_person'
      // Backend uses "online" for slot generation, not "virtual"
      const appointmentType = (selectedConsultationMode === 'video' || selectedConsultationMode === 'online') 
        ? 'online' 
        : 'in_person';
      
      const startDateStr = formatDate(today);
      const endDateStr = formatDate(endDate);
      
      console.log('Loading slots for range:', { 
        id, 
        selectedConsultationMode,
        appointmentType, 
        start_date: startDateStr, 
        end_date: endDateStr 
      });

      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(id),
        {
          params: {
            start_date: startDateStr,
            end_date: endDateStr,
            appointment_type: appointmentType
          }
        }
      );

      console.log('Slots response:', response.data);

      // Endpoint returns an array of slots
      const slots = Array.isArray(response.data)
        ? response.data
        : (response.data?.slots || response.data?.available_slots || []);
      
      console.log('Processed slots:', slots);
      console.log('Number of slots:', slots.length);
      
      if (slots.length > 0) {
        console.log('First slot structure:', slots[0]);
      }
      
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading available slots:', err);
      console.error('Error details:', err.response?.data);
      
      // Handle authentication errors
      if (err.response?.status === 401) {
        console.warn('User not authenticated - slots require authentication');
      } else if (err.response?.status === 404) {
        console.warn('Specialist not found or no slots available');
      } else {
        console.error('Unexpected error loading slots:', err.response?.data || err.message);
      }
      
      setAvailableSlots([]);
    } finally {
      setLoadingSlots(false);
    }
  };


  const getRatingStars = (rating) => {
    const stars = [];
    const fullStars = Math.floor(rating || 0);
    const hasHalfStar = (rating || 0) % 1 !== 0;

    for (let i = 0; i < 5; i++) {
      if (i < fullStars) {
        stars.push(<Star key={i} size={16} className="star filled" fill="#fbbf24" />);
      } else if (i === fullStars && hasHalfStar) {
        stars.push(<Star key={i} size={16} className="star half" fill="#fbbf24" />);
      } else {
        stars.push(<Star key={i} size={16} className="star empty" />);
      }
    }
    return stars;
  };

  const calculateAverageRating = () => {
    if (!reviews || reviews.length === 0) return 0;
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  const calculateSatisfaction = (rating) => {
    if (!rating) return 95;
    return Math.round(rating * 20);
  };

  const formatDate = (dateString) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-GB', { 
      day: '2-digit', 
      month: 'short', 
      year: 'numeric' 
    });
  };

  const getAvailabilitySchedule = () => {
    if (!specialist?.availability_schedule) return {};
    return specialist.availability_schedule;
  };

  const formatAvailabilityTimes = (times, consultationMode = 'video') => {
    if (!times) return 'Not available';
    
    // If times is already a string or array, return as is
    if (typeof times === 'string') return times;
    if (Array.isArray(times)) return times.join(', ');
    
    // If times is an object with online/in_person structure
    if (typeof times === 'object') {
      const modeKey = consultationMode === 'video' ? 'online' : 'in_person';
      const timeData = times[modeKey] || times.online || times.in_person;
      
      if (!timeData) {
        // Fallback: show all available modes
        const parts = [];
        if (times.online) {
          if (typeof times.online === 'object' && times.online.from && times.online.to) {
            parts.push(`Online: ${times.online.from} - ${times.online.to}`);
          } else if (typeof times.online === 'string') {
            parts.push(`Online: ${times.online}`);
          }
        }
        if (times.in_person) {
          if (typeof times.in_person === 'object' && times.in_person.from && times.in_person.to) {
            parts.push(`In-Person: ${times.in_person.from} - ${times.in_person.to}`);
          } else if (typeof times.in_person === 'string') {
            parts.push(`In-Person: ${times.in_person}`);
          }
        }
        return parts.length > 0 ? parts.join(', ') : 'Not available';
      }
      
      // Format the time data
      if (typeof timeData === 'object' && timeData.from && timeData.to) {
        return `${timeData.from} - ${timeData.to}`;
      } else if (typeof timeData === 'string') {
        return timeData;
      }
    }
    
    // Fallback: convert to string
    return String(times);
  };

  const getAvailableDates = () => {
    console.log('getAvailableDates called:', { 
      slotsCount: availableSlots.length, 
      selectedConsultationMode,
      firstSlot: availableSlots[0]
    });

    if (!availableSlots || availableSlots.length === 0) {
      console.log('No slots available');
      return [];
    }

    // Backend already filters by appointment_type, so use all slots returned
    // Just filter by can_be_booked and is_available
    const bookableSlots = availableSlots.filter(slot => {
      const canBook = (slot.can_be_booked !== false && slot.can_be_booked !== undefined) || 
                     (slot.is_available !== false && slot.is_available !== undefined);
      return canBook;
    });

    console.log('Bookable slots count:', bookableSlots.length);

    // Extract dates from all bookable slots
    const dateSet = new Set();
    bookableSlots.forEach((slot, index) => {
      // Try slot_date first (from backend response), then start_time
      const dateField = slot.slot_date || slot.start_time;
      if (dateField) {
        try {
          // Parse ISO date string - handle both ISO format and date-only format
          let dateObj;
          if (typeof dateField === 'string') {
            // If it's a date-only string (YYYY-MM-DD), add time for parsing
            if (dateField.match(/^\d{4}-\d{2}-\d{2}$/)) {
              dateObj = new Date(dateField + 'T00:00:00Z');
            } else {
              dateObj = new Date(dateField);
            }
          } else {
            dateObj = new Date(dateField);
          }
          
          if (!isNaN(dateObj.getTime())) {
            // Get date in YYYY-MM-DD format using UTC to avoid timezone issues
            const year = dateObj.getUTCFullYear();
            const month = String(dateObj.getUTCMonth() + 1).padStart(2, '0');
            const day = String(dateObj.getUTCDate()).padStart(2, '0');
            const dateStr = `${year}-${month}-${day}`;
            dateSet.add(dateStr);
            if (index < 3) { // Log first few for debugging
              console.log(`Slot ${index} date extracted:`, { dateField, dateStr, dateObj: dateObj.toISOString() });
            }
          } else {
            console.warn('Invalid date object:', dateField, dateObj);
          }
        } catch (e) {
          console.error('Error parsing date:', dateField, e);
        }
      } else {
        console.warn('Slot has no date field:', slot);
      }
    });

    const dates = Array.from(dateSet).sort();
    console.log('Available dates found:', dates);
    
    return dates.map(date => {
      const dateObj = new Date(date + 'T00:00:00'); // Add time to avoid timezone issues
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      return {
        value: date,
        label: `${dayName}, ${day} ${month}`
      };
    });
  };

  const getAvailableTimes = () => {
    if (!selectedDate) return [];
    
    const slotType = selectedConsultationMode === 'video' ? 'online' : 'in_person';
    
    return availableSlots
      .filter(slot => {
        const slotDate = slot.slot_date || slot.start_time;
        const slotDateStr = new Date(slotDate).toISOString().split('T')[0];
        const appointmentType = (slot.appointment_type || '').toLowerCase();
        return (
          slotDateStr === selectedDate &&
          (appointmentType === slotType || (appointmentType === 'virtual' && slotType === 'online')) &&
          slot.can_be_booked
        );
      })
      .map(slot => {
        const slotDate = slot.slot_date || slot.start_time;
        const time = new Date(slotDate).toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true
        });
        const endTime = slot.end_time 
          ? new Date(slot.end_time).toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true
            })
          : null;
        return {
          value: slot.slot_id, // Use slot_id as value
          label: endTime ? `${time} - ${endTime}` : time,
          slot_id: slot.slot_id,
          time: time,
          duration: slot.duration_minutes || 60
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
  };

  const getConsultationModes = () => {
    const modes = [];
    
    if (specialist?.consultation_modes?.includes('online') || specialist?.consultation_modes?.includes('ONLINE')) {
      modes.push({
        type: 'video',
        name: 'Video Consultation',
        price: specialist.consultation_fee || 1000,
        available: true,
        status: 'Online',
        currency: specialist.currency || 'PKR'
      });
    }
    
    if (specialist?.consultation_modes?.includes('in_person') || specialist?.consultation_modes?.includes('IN_PERSON')) {
      modes.push({
        type: 'clinic',
        name: specialist.clinic_name || 'Mental Health Clinic',
        price: specialist.consultation_fee || 2000,
        available: true,
        location: specialist.clinic_address || specialist.city || 'Location not specified',
        currency: specialist.currency || 'PKR'
      });
    }
    
    // If no consultation modes specified, default to online
    if (modes.length === 0) {
      modes.push({
        type: 'video',
        name: 'Video Consultation',
        price: specialist.consultation_fee || 1000,
        available: true,
        status: 'Online',
        currency: specialist.currency || 'PKR'
      });
    }
    
    return modes;
  };

  const handlePaymentReceiptUpload = async (file) => {
    if (!file) return;

    // Validate file type
    const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
    if (!allowedTypes.includes(file.type)) {
      setBookingError('Invalid file type. Please upload PDF, JPEG, or PNG file.');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      setBookingError('File too large. Maximum size is 5MB.');
      return;
    }

    try {
      setUploadingReceipt(true);
      setBookingError(null);

      const formData = new FormData();
      formData.append('file', file);

      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.UPLOAD_PAYMENT_RECEIPT,
        formData,
        {
          headers: {
            'Content-Type': 'multipart/form-data',
          },
        }
      );

      setPaymentReceiptUrl(response.data.file_url);
      setPaymentReceipt(response.data.file_url);
      setPaymentReceiptFile(file);
      toast.success('Payment receipt uploaded successfully');
    } catch (err) {
      console.error('Error uploading payment receipt:', err);
      setBookingError(err.response?.data?.detail || 'Failed to upload payment receipt');
    } finally {
      setUploadingReceipt(false);
    }
  };

  const handleBookAppointment = async () => {
    // Validation
    if (!selectedDate) {
      setBookingError('Please select a date');
      return;
    }

    if (!selectedSlotId) {
      setBookingError('Please select a time slot');
      return;
    }

    if (!presentingConcern.trim()) {
      setBookingError('Please enter your presenting concern');
      return;
    }

    // For online appointments, payment info is required
    if (selectedConsultationMode === 'video') {
      if (!paymentMethodId.trim()) {
        setBookingError('Please select a payment method');
        return;
      }
      if (!paymentReceiptUrl.trim() && !paymentReceipt.trim()) {
        setBookingError('Please upload payment receipt');
        return;
      }
    }

    try {
      setBookingLoading(true);
      setBookingError(null);

      // Token is handled by apiClient; still guard UX
      const token = localStorage.getItem('access_token');
      if (!token) {
        setBookingError('Please log in to book an appointment');
        navigate(ROUTES.LOGIN);
        return;
      }
      
      // Build patient notes (only from patientNotes field)
      const combinedPatientNotes = patientNotes.trim() || null;
      
      // Use payment receipt URL if available, otherwise use payment receipt text
      const paymentReceiptValue = paymentReceiptUrl.trim() || paymentReceipt.trim();

      const bookingRequest = {
        specialist_id: specialist.id,
        slot_id: selectedSlotId,
        appointment_type: selectedConsultationMode === 'video' ? 'online' : 'in_person',
        presenting_concern: presentingConcern.trim(),
        patient_notes: combinedPatientNotes,
        ...(selectedConsultationMode === 'video' && {
          payment_method_id: paymentMethodId.trim(),
          payment_receipt: paymentReceiptValue
        })
      };

      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.BOOK,
        bookingRequest
      );

      // Booking successful - instant confirmation
      toast.success(`Appointment booked successfully! Appointment ID: ${response.data.appointment_id}`);
      
      // Reset form
      setPresentingConcern('');
      setPatientNotes('');
      setPaymentMethodId('');
      setPaymentReceipt('');
      setPaymentReceiptFile(null);
      setPaymentReceiptUrl('');
      setSelectedDate('');
      setSelectedTime('');
      setSelectedSlotId('');
      
      // Reload slots
      await loadAvailableSlots();
      
      // Navigate to appointments page or show success message
      setTimeout(() => {
        navigate(ROUTES.APPOINTMENTS);
      }, 2000);

    } catch (err) {
      console.error("Error booking appointment:", err);
      
      if (err.response?.status === 401) {
        setBookingError('Please log in to book an appointment');
        navigate(ROUTES.LOGIN);
      } else if (err.response?.status === 400) {
        setBookingError(err.response.data.detail || 'Invalid booking request. Please check your details.');
      } else if (err.response?.status === 409) {
        setBookingError('This time slot is no longer available. Please select another time.');
        await loadAvailableSlots(); // Reload slots
      } else {
        setBookingError('Failed to book appointment. Please try again.');
      }
    } finally {
      setBookingLoading(false);
    }
  };


  const scrollToBooking = () => {
    const bookingPanel = document.querySelector('.booking-panel');
    if (bookingPanel) {
      bookingPanel.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleConsultationModeChange = (mode) => {
    console.log('Consultation mode changed to:', mode);
    setSelectedConsultationMode(mode);
    // Reset selections when mode changes
    setSelectedDate('');
    setSelectedTime('');
    setSelectedSlotId('');
    scrollToBooking();
  };

  if (loading) {
    return (
      <div className="specialist-profile-page">
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading specialist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className="specialist-profile-page">
        <div className="error-container">
          <p>{error || 'Specialist not found'}</p>
          <button onClick={() => navigate('/home/specialists')} className="btn-primary">
            <ArrowLeft size={16} />
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 3);
  const consultationModes = getConsultationModes();
  const availabilitySchedule = getAvailabilitySchedule();

  return (
    <div className={`specialist-profile-page ${darkMode ? 'dark' : ''}`}>
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        currentUser={currentUser}
      />
      
      {/* Header Section */}
      <div className="profile-header-section">
        <div className="profile-header-content">
          <div className="specialist-info-header">
            <div className="specialist-avatar">
              {getSafeImageUrl(specialist.profile_image_url) && !imageError ? (
                <img 
                  src={getSafeImageUrl(specialist.profile_image_url)} 
                  alt={specialist.full_name}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(specialist.full_name)}
                </div>
              )}
            </div>
            <div className="specialist-details">
              <h1 className="specialist-name">{specialist.full_name}</h1>
              <p className="specialist-title">{specialist.specialist_type}</p>
              {specialist.qualifications && (
                <p className="qualifications">{specialist.qualifications}</p>
              )}
              <div className="experience-info">
                <span className="consultant-badge">Consultant</span>
                <span className="experience-years">{specialist.years_experience || 0} Yrs Experience</span>
              </div>
              <div className="specialist-badges">
                {specialist.is_verified && (
                  <div className="verified-badge">
                    <CheckCircle size={16} />
                    <span>Verified</span>
                  </div>
                )}
                {specialist.specializations && specialist.specializations.length > 0 && (
                  <div className="specializations-badge">
                    <Award size={16} />
                    <span>{specialist.specializations.length} Specializations</span>
            </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-main-content">
        {/* Left Column - All Sections */}
        <div className="profile-left-column">
          {/* Bio Section */}
          {specialist.bio && (
            <div className="bio-section">
              <h3>About</h3>
              <div className="bio-content">
                <p>{specialist.bio}</p>
              </div>
            </div>
          )}

          {/* Experience Summary Section */}
          {specialist.experience_summary && (
            <div className="experience-summary-section">
              <h3>Experience Summary</h3>
              <div className="experience-content">
                <p>{specialist.experience_summary}</p>
              </div>
            </div>
          )}

          {/* Specializations Section */}
          {specialist.specializations && specialist.specializations.length > 0 && (
            <div className="specializations-section">
              <h3>Specializations</h3>
              <div className="specializations-list">
                {specialist.specializations.map((spec, index) => (
                  <div key={index} className="specialization-item">
                    <Award size={16} />
                    <span className="specialization-name">{spec.specialization}</span>
                    {spec.years_experience && (
                      <span className="specialization-experience">
                        {spec.years_experience} years
                      </span>
                    )}
                </div>
              ))}
            </div>
            </div>
          )}

          {/* Practice Address and Timings */}
          <div className="practice-details-section">
            <h3>Practice Details</h3>
            
            {consultationModes.map((mode, index) => (
              <div key={index} className="consultation-mode-card">
                <div className="mode-header">
                  <span className="mode-status">{mode.status || 'Available'}</span>
                  <span className="mode-price">{mode.currency} {mode.price}</span>
                </div>
                {mode.type === 'clinic' && mode.location && (
                  <div className="clinic-location">
                    <MapPin size={16} />
                    <span>{mode.location}</span>
                  </div>
                )}
                <h4>Available Timings</h4>
                <div className="timings-table">
                  {Object.keys(availabilitySchedule).length > 0 ? (
                    Object.entries(availabilitySchedule).map(([day, times]) => (
                    <div key={day} className="timing-row">
                      <span className="day">{day.substring(0, 3)}:</span>
                      <span className="times">{formatAvailabilityTimes(times, mode.type)}</span>
                      </div>
                    ))
                  ) : (
                    <div className="no-schedule">
                      <p>Schedule not available. Please contact for availability.</p>
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>

          {/* Mental Health Specialties Section */}
          {specialist.specialties_in_mental_health && specialist.specialties_in_mental_health.length > 0 && (
            <div className="mental-health-specialties-section">
              <h3>Mental Health Specialties</h3>
              <div className="specialties-list">
                {specialist.specialties_in_mental_health.map((specialty, index) => (
                  <div key={index} className="specialty-item">
                    <Shield size={16} />
                    <span className="specialty-name">{specialty}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Therapy Methods Section */}
          {specialist.therapy_methods && specialist.therapy_methods.length > 0 && (
            <div className="therapy-methods-section">
              <h3>Therapy Methods</h3>
              <div className="therapy-methods-list">
                {specialist.therapy_methods.map((method, index) => (
                  <div key={index} className="therapy-method-item">
                    <TrendingUp size={16} />
                    <span className="method-name">{method}</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Reviews Section - Moved to End */}
          <div className="reviews-section">
            <div className="reviews-header">
              <h2>{reviews.length} Reviews</h2>
              <div className="overall-rating">
                <div className="rating-stars">
                  {getRatingStars(specialist.rating || 0)}
                </div>
                <span className="rating-text">{specialist.rating || 0}/5 Average rating based on {reviews.length} reviews</span>
              </div>
            </div>

            <div className="reviews-list">
              {displayedReviews.length > 0 ? (
                displayedReviews.map((review, index) => (
                  <div key={index} className="review-card">
                    <div className="review-header">
                      <span className="reviewer-initial">{getInitials(review.patient_name || 'Anonymous')}</span>
                      <div className="review-rating">
                        {getRatingStars(review.rating || 0)}
                      </div>
                      <span className="review-date">{formatDate(review.created_at)}</span>
                    </div>
                    <p className="review-text">{review.review_text || 'No review text provided.'}</p>
                    {review.tags && review.tags.length > 0 && (
                      <div className="review-tags">
                        {review.tags.map((tag, tagIndex) => (
                          <span key={tagIndex} className="review-tag">{tag}</span>
                        ))}
                      </div>
                    )}
                    {review.consultation_mode && (
                      <div className="consultation-type">
                        {review.consultation_mode === 'online' || review.consultation_mode === 'ONLINE' 
                          ? 'Video Consultation' 
                          : 'In-Person Consultation'}
                      </div>
                    )}
                  </div>
                ))
              ) : (
                <div className="no-reviews">
                  <p>No reviews available yet.</p>
                </div>
              )}
            </div>

            <div className="reviews-actions">
              <button className="btn-view-all-reviews" onClick={() => setShowAllReviews(!showAllReviews)}>
                {showAllReviews ? 'Show Less Reviews' : 'View All Reviews'}
              </button>
            </div>
          </div>
        </div>

        {/* Right Column - Header Actions and Appointment Booking */}
        <div className="profile-right-column">
          {/* Header Actions Section */}
          <div className="header-actions-section">
            <div className="consultation-buttons">
              <button 
                className="btn-consult-online"
                onClick={() => handleConsultationModeChange('video')}
              >
                <Video size={16} />
                Consult Online
              </button>
              <button 
                className="btn-visit-clinic"
                onClick={() => handleConsultationModeChange('clinic')}
              >
                <MapPin size={16} />
                Visit In Clinic
              </button>
            </div>
          </div>

          <div className="booking-panel">
            <h3>Get Confirmed Appointment Online</h3>
            
            {/* Step 1: Select Hospital/Clinic */}
            <div className="booking-step">
              <h4>Step 1: Select Hospital/Clinic</h4>
              {consultationModes.map((mode, index) => (
                <div 
                  key={index} 
                  className={`consultation-option ${selectedConsultationMode === mode.type ? 'selected' : ''}`}
                  onClick={() => handleConsultationModeChange(mode.type)}
                >
                  <div className="option-header">
                    <span className="option-name">{mode.name}</span>
                    <span className="option-price">{mode.currency} {mode.price}</span>
                  </div>
                  <div className="option-availability">
                    {mode.type === 'video' ? 'Available for online consultation' : `Available at ${mode.location}`}
                  </div>
                  <div className="option-status">
                    {mode.status || mode.location}
                  </div>
                </div>
              ))}
            </div>

            {/* Step 2: Select Date & Time */}
            <div className="booking-step">
              <h4>Step 2: Select Date & Time</h4>
            <div className="datetime-selectors">
              <div className="date-selector">
                <label>Select Date <span className="required">*</span></label>
                <input
                  type="date"
                  value={selectedDate}
                  min={new Date().toISOString().split('T')[0]}
                  max={new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]}
                  onChange={async (e) => {
                    const dateValue = e.target.value;
                    setSelectedDate(dateValue);
                    setSelectedTime('');
                    setSelectedSlotId('');
                    setAvailableSlots([]);
                    setBookingError(null);
                    
                    // Load slots for the selected date immediately
                    if (dateValue && selectedConsultationMode) {
                      await loadSlotsForDate(dateValue);
                    }
                  }}
                  disabled={loadingSlots || !selectedConsultationMode}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    marginTop: '0.5rem'
                  }}
                />
                {!selectedConsultationMode && (
                  <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                    Please select a consultation mode first
                  </p>
                )}
                {selectedConsultationMode && !selectedDate && (
                  <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                    Select a date to see available time slots (next 7 days only)
                  </p>
                )}
                {loadingSlots && selectedDate && (
                  <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#3b82f6'}}>
                    Loading slots for selected date...
                  </p>
                )}
                {bookingError && (
                  <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#ef4444'}}>
                    {bookingError}
                  </p>
                )}
              </div>
              <div className="time-selector">
                <label>Select Time <span className="required">*</span></label>
                <select 
                  value={selectedSlotId} 
                  onChange={(e) => {
                    const slotId = e.target.value;
                    setSelectedSlotId(slotId);
                    // Find the time label for display
                    const selectedSlot = getAvailableTimes().find(slot => slot.slot_id === slotId);
                    setSelectedTime(selectedSlot ? selectedSlot.label : '');
                  }}
                  disabled={!selectedDate || loadingSlots || getAvailableTimes().length === 0}
                  style={{
                    width: '100%',
                    padding: '0.75rem',
                    border: '1px solid #d1d5db',
                    borderRadius: '0.375rem',
                    fontSize: '1rem',
                    marginTop: '0.5rem'
                  }}
                >
                  <option value="">
                    {!selectedDate ? 'Select a date first' : 
                     loadingSlots ? 'Loading times...' : 
                     getAvailableTimes().length === 0 ? 'No times available' : 
                     'Select Time'}
                  </option>
                  {getAvailableTimes().map(slot => (
                    <option key={slot.slot_id} value={slot.slot_id}>
                      {slot.label} ({slot.duration} min)
                    </option>
                  ))}
                </select>
                {selectedDate && !loadingSlots && getAvailableTimes().length === 0 && (
                  <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#ef4444'}}>
                    No available time slots for this date. Please try another date.
                  </p>
                )}
              </div>
            </div>
            </div>

            {/* Presenting Concern */}
            <div className="booking-step">
              <h4>Presenting Concern <span style={{color: '#ef4444'}}>*</span></h4>
              <textarea
                value={presentingConcern}
                onChange={(e) => setPresentingConcern(e.target.value)}
                placeholder="Please describe the reason for your appointment..."
                rows={3}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>


            {/* Additional Notes */}
            <div className="booking-step">
              <h4>Additional Notes (Optional)</h4>
              <textarea
                value={patientNotes}
                onChange={(e) => setPatientNotes(e.target.value)}
                placeholder="Any additional information you'd like to share..."
                rows={2}
                style={{
                  width: '100%',
                  padding: '0.75rem',
                  border: '1px solid #d1d5db',
                  borderRadius: '0.5rem',
                  fontSize: '0.875rem',
                  fontFamily: 'inherit'
                }}
              />
            </div>

            {/* Payment Fields for Online Appointments */}
            {selectedConsultationMode === 'video' && (
              <div className="booking-step">
                <h4>Payment Information <span style={{color: '#ef4444'}}>*</span></h4>
                <div className="booking-field">
                  <label>Payment Method</label>
                  <select 
                    value={paymentMethodId} 
                    onChange={(e) => setPaymentMethodId(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '0.75rem',
                      border: '1px solid #d1d5db',
                      borderRadius: '0.5rem',
                      fontSize: '0.875rem'
                    }}
                  >
                    <option value="">Select payment method</option>
                    <option value="easypaisa">EasyPaisa</option>
                    <option value="jazzcash">JazzCash</option>
                    <option value="bank_transfer">Bank Transfer</option>
                    <option value="other">Other</option>
                  </select>
                </div>
                  <div className="booking-field" style={{marginTop: '1rem'}}>
                    <label>Payment Receipt File <span style={{color: '#ef4444'}}>*</span></label>
                    <div>
                      <input
                        type="file"
                        accept=".pdf,.jpg,.jpeg,.png"
                        onChange={(e) => {
                          const file = e.target.files[0];
                          if (file) {
                            handlePaymentReceiptUpload(file);
                          }
                        }}
                        disabled={uploadingReceipt}
                        style={{
                          width: '100%',
                          padding: '0.75rem',
                          border: '1px solid #d1d5db',
                          borderRadius: '0.5rem',
                          fontSize: '0.875rem'
                        }}
                      />
                      {uploadingReceipt && (
                        <div style={{marginTop: '0.5rem', color: '#0369a1'}}>
                          <Loader size={16} className="animate-spin" style={{display: 'inline-block', marginRight: '0.5rem'}} />
                          Uploading...
                        </div>
                      )}
                      {paymentReceiptFile && !uploadingReceipt && (
                        <div style={{marginTop: '0.5rem', color: '#166534'}}>
                          ✓ {paymentReceiptFile.name} uploaded
                        </div>
                      )}
                      {paymentReceiptUrl && (
                        <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                          File uploaded: {paymentReceiptUrl}
                        </div>
                      )}
                    </div>
                    <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                      Accepted formats: PDF, JPEG, PNG (Max 5MB)
                    </p>
                  </div>
              </div>
            )}

            {bookingError && (
              <div className="booking-error">
                <AlertCircle size={16} />
                <span>{bookingError}</span>
              </div>
            )}
            
            <button 
              className="btn-book-consultation"
              onClick={handleBookAppointment}
              disabled={bookingLoading || uploadingReceipt || !selectedDate || !selectedSlotId || !presentingConcern.trim() || (selectedConsultationMode === 'video' && (!paymentMethodId.trim() || (!paymentReceiptUrl.trim() && !paymentReceipt.trim())))}
            >
              {bookingLoading ? (
                <>
                  <Loader size={16} className="animate-spin" />
                  Booking...
                </>
              ) : (
                `Book ${selectedConsultationMode === 'video' ? 'Video' : 'In-Person'} Consultation`
              )}
            </button>
          </div>
        </div>
      </div>
      
      <Footer darkMode={darkMode} />
    </div>
  );
};

export default SpecialistProfilePage;
