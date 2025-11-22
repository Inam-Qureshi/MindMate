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
  AlertCircle,
  Loader,
  Check
} from 'react-feather';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { ROUTES } from '../../config/routes';
import { toast } from 'react-hot-toast';
import { getSafeImageUrl, getInitials } from '../../utils/imageUtils';
import './SpecialistProfile.css';

const SpecialistProfile = ({ darkMode, onBookAppointment }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [specialist, setSpecialist] = useState(null);
  const [reviews, setReviews] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showAllReviews, setShowAllReviews] = useState(false);
  
  // Booking states
  const [selectedAppointmentType, setSelectedAppointmentType] = useState('online');
  const [selectedDate, setSelectedDate] = useState('');
  const [selectedTime, setSelectedTime] = useState('');
  const [selectedSlotId, setSelectedSlotId] = useState('');
  const [presentingConcern, setPresentingConcern] = useState('');
  const [patientNotes, setPatientNotes] = useState('');
  const [paymentMethodId, setPaymentMethodId] = useState('');
  const [paymentReceipt, setPaymentReceipt] = useState('');
  const [paymentReceiptFile, setPaymentReceiptFile] = useState(null);
  const [paymentReceiptUrl, setPaymentReceiptUrl] = useState('');
  const [uploadingReceipt, setUploadingReceipt] = useState(false);
  const [loadingSlots, setLoadingSlots] = useState(false);
  const [bookingLoading, setBookingLoading] = useState(false);
  const [bookingError, setBookingError] = useState(null);
  const [bookingSuccess, setBookingSuccess] = useState(false);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [imageError, setImageError] = useState(false);

  useEffect(() => {
    loadSpecialistProfile();
    checkAuthentication();
  }, [id]);

  useEffect(() => {
    if (specialist) {
      loadAvailableSlots();
    }
  }, [specialist, selectedAppointmentType]);

  useEffect(() => {
    if (specialist) {
      // Set default appointment type based on available consultation modes (only once when specialist loads)
      const consultationModes = specialist.consultation_modes || [];
      if (consultationModes.length > 0) {
        const hasOnline = consultationModes.some(mode => 
          mode === 'online' || mode === 'ONLINE'
        );
        const hasInPerson = consultationModes.some(mode => 
          mode === 'in_person' || mode === 'IN_PERSON'
        );
        
        // Set default to online if available, otherwise in_person
        if (!hasOnline && hasInPerson && selectedAppointmentType === 'online') {
          setSelectedAppointmentType('in_person');
        } else if (!hasInPerson && hasOnline && selectedAppointmentType === 'in_person') {
          setSelectedAppointmentType('online');
        }
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [specialist]);

  useEffect(() => {
    // Reset slot selection when date or appointment type changes
    setSelectedSlotId('');
  }, [selectedDate, selectedAppointmentType]);

  const checkAuthentication = () => {
    const token = localStorage.getItem('access_token');
    setIsAuthenticated(!!token);
  };

  const loadSpecialistProfile = async () => {
    try {
      setLoading(true);
      setError(null);

      // Load specialist details
      const specialistResponse = await apiClient.get(
        API_ENDPOINTS.SPECIALISTS.PUBLIC_PROFILE(id)
      );

      setSpecialist(specialistResponse.data);

      // Load reviews
      try {
        const reviewsResponse = await apiClient.get(
          API_ENDPOINTS.SPECIALISTS.REVIEWS(id),
          {
            params: {
              limit: 100,
              offset: 0
            }
          }
        );
        // Backend returns a list directly (not wrapped in an object)
        const reviewsList = Array.isArray(reviewsResponse.data) 
          ? reviewsResponse.data 
          : (reviewsResponse.data?.reviews || reviewsResponse.data?.data || []);
        console.log('Loaded reviews for specialist:', id, 'Count:', reviewsList.length, 'Reviews:', reviewsList);
        setReviews(reviewsList);
      } catch (err) {
        console.error('Error loading reviews:', err.response?.data || err.message || err);
        // Don't fail the whole page if reviews fail to load
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

  const loadAvailableSlots = async () => {
    if (!id || !selectedAppointmentType) return;

    try {
      setLoadingSlots(true);
      // Load slots for next 7 days only
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6); // 7 days total (today + 6 more)

      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(id),
        {
          params: {
            start_date: today.toISOString().split('T')[0],
            end_date: endDate.toISOString().split('T')[0],
            appointment_type: selectedAppointmentType
          }
        }
      );

      // Handle both array response and object with slots property
      const slots = Array.isArray(response.data) 
        ? response.data 
        : (response.data?.slots || response.data?.available_slots || []);
      
      setAvailableSlots(slots);
    } catch (err) {
      console.error('Error loading available slots:', err);
      setAvailableSlots([]);
      // Don't show error to user for slots - they might not be authenticated
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
    if (!reviews || reviews.length === 0) {
      // Use specialist's average rating if available and no reviews loaded
      const specialistRating = specialist?.average_rating || specialist?.rating;
      return specialistRating ? parseFloat(specialistRating).toFixed(1) : '0.0';
    }
    const sum = reviews.reduce((acc, review) => acc + (review.rating || 0), 0);
    return (sum / reviews.length).toFixed(1);
  };

  const getAvailableDates = () => {
    const dates = [...new Set(availableSlots
      .filter(slot => {
        const slotType = (slot.appointment_type || '').toLowerCase();
        const selectedType = selectedAppointmentType.toLowerCase();
        return slot.can_be_booked && (slotType === selectedType || slotType === 'virtual' && selectedType === 'online');
      })
      .map(slot => {
        const slotDate = slot.slot_date || slot.start_time;
        return new Date(slotDate).toISOString().split('T')[0];
      })
    )].sort();
    
    return dates.map(date => {
      const dateObj = new Date(date);
      const dayName = dateObj.toLocaleDateString('en-US', { weekday: 'short' });
      const day = dateObj.getDate();
      const month = dateObj.toLocaleDateString('en-US', { month: 'short' });
      return {
        value: date,
        label: `${dayName}, ${day} ${month}`
      };
    });
  };

  const getAvailableTimesForDate = () => {
    if (!selectedDate) return [];

    return availableSlots
      .filter(slot => {
        const slotDate = slot.slot_date || slot.start_time;
        const slotDateStr = new Date(slotDate).toISOString().split('T')[0];
        const slotType = (slot.appointment_type || '').toLowerCase();
        const selectedType = selectedAppointmentType.toLowerCase();
        return (
          slotDateStr === selectedDate &&
          (slotType === selectedType || slotType === 'virtual' && selectedType === 'online') &&
          slot.can_be_booked
        );
      })
      .map(slot => {
        // Use start_time if available, otherwise use slot_date
        const startTimeStr = slot.start_time || slot.slot_date;
        const endTimeStr = slot.end_time;
        
        // Parse times and convert to PKT (Pakistan Standard Time)
        // If timezone info is missing, assume it's already in PKT
        let startDate = new Date(startTimeStr);
        let endDate = endTimeStr ? new Date(endTimeStr) : null;
        
        // Format times with AM/PM in PKT
        const time = startDate.toLocaleTimeString('en-US', {
          hour: '2-digit',
          minute: '2-digit',
          hour12: true,
          timeZone: 'Asia/Karachi' // PKT timezone
        });
        
        const endTime = endDate 
          ? endDate.toLocaleTimeString('en-US', {
              hour: '2-digit',
              minute: '2-digit',
              hour12: true,
              timeZone: 'Asia/Karachi' // PKT timezone
            })
          : null;
        
        return {
          slot_id: slot.slot_id,
          time: time,
          timeLabel: endTime ? `${time} - ${endTime}` : time,
          duration: slot.duration_minutes || 60
        };
      })
      .sort((a, b) => a.time.localeCompare(b.time));
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
    if (!isAuthenticated) {
      toast.error('Please log in to book an appointment');
      navigate(ROUTES.LOGIN);
      return;
    }

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

    if (selectedAppointmentType === 'online') {
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

      // Use payment receipt URL if available, otherwise use payment receipt text
      const paymentReceiptValue = paymentReceiptUrl.trim() || paymentReceipt.trim();

      const bookingRequest = {
        specialist_id: id,
        slot_id: selectedSlotId,
        appointment_type: selectedAppointmentType,
        presenting_concern: presentingConcern.trim(),
        patient_notes: patientNotes.trim() || null,
        ...(selectedAppointmentType === 'online' && {
          payment_method_id: paymentMethodId.trim(),
          payment_receipt: paymentReceiptValue
        })
      };

      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.BOOK,
        bookingRequest
      );

      // Success
      setBookingSuccess(true);
      toast.success('Appointment booked successfully!');
      
      // Reset form
      setPresentingConcern('');
      setPatientNotes('');
      setPaymentMethodId('');
      setPaymentReceipt('');
      setPaymentReceiptFile(null);
      setPaymentReceiptUrl('');
      setSelectedDate('');
      setSelectedSlotId('');
      
      // Reload slots
      await loadAvailableSlots();

      // Navigate to appointments page after delay
      setTimeout(() => {
        navigate(ROUTES.APPOINTMENTS);
      }, 2000);

    } catch (err) {
      console.error('Error booking appointment:', err);
      
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

  const handleAppointmentTypeChange = (type) => {
    setSelectedAppointmentType(type);
    setSelectedDate('');
    setSelectedSlotId('');
  };

  if (loading) {
    return (
      <div className={`specialist-profile ${darkMode ? 'dark' : ''}`}>
        <div className="loading-container">
          <div className="spinner"></div>
          <p>Loading specialist profile...</p>
        </div>
      </div>
    );
  }

  if (error || !specialist) {
    return (
      <div className={`specialist-profile ${darkMode ? 'dark' : ''}`}>
        <div className="error-container">
          <p>{error || 'Specialist not found'}</p>
          <button onClick={() => navigate('/appointments')} className="btn-primary">
            <ArrowLeft size={16} />
            Back to Search
          </button>
        </div>
      </div>
    );
  }

  const displayedReviews = showAllReviews ? reviews : reviews.slice(0, 10);

  return (
    <div className={`specialist-profile ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="profile-header">
        <button onClick={() => navigate('/appointments')} className="back-button">
          <ArrowLeft size={16} />
          Back
        </button>
        <div className="profile-header-content">
          <h1>{specialist.full_name}</h1>
          <p className="specialization">{specialist.specialist_type}</p>
        </div>
      </div>

      {/* Main Content */}
      <div className="profile-content">
        {/* Left Sidebar - Specialist Info */}
        <div className="profile-sidebar">
          <div className="specialist-card-main">
            <div className="avatar-container">
              {getSafeImageUrl(specialist.image_url || specialist.profile_image_url) && !imageError ? (
                <img 
                  src={getSafeImageUrl(specialist.image_url || specialist.profile_image_url)} 
                  alt={specialist.full_name}
                  onError={() => setImageError(true)}
                />
              ) : (
                <div className="avatar-placeholder">
                  {getInitials(specialist.full_name)}
                </div>
              )}
              {specialist.is_verified && (
                <div className="verified-badge">
                  <CheckCircle size={20} />
                  <span>Verified</span>
                </div>
              )}
            </div>

            <div className="specialist-info-main">
              <h2>{specialist.full_name}</h2>
              <p className="specialization-text">{specialist.specialist_type}</p>
              
              {specialist.qualifications && (
                <p className="qualifications">{specialist.qualifications}</p>
              )}

              <div className="stats">
                <div className="stat-item">
                  <Star size={16} className="star-icon" />
                  <div>
                    <span className="stat-value">{calculateAverageRating()}/5</span>
                    <span className="stat-label">Rating</span>
                  </div>
                </div>
                <div className="stat-item">
                  <User size={16} />
                  <div>
                    <span className="stat-value">{reviews.length}</span>
                    <span className="stat-label">Reviews</span>
                  </div>
                </div>
                {specialist.experience && (
                  <div className="stat-item">
                    <Clock size={16} />
                    <div>
                      <span className="stat-value">{specialist.experience}</span>
                      <span className="stat-label">Experience</span>
                    </div>
                  </div>
                )}
              </div>

              <div className="rating-breakdown">
                {[5, 4, 3, 2, 1].map((star) => {
                  const count = reviews.filter(r => Math.floor(r.rating || 0) === star).length;
                  const percentage = reviews.length > 0 ? (count / reviews.length) * 100 : 0;
                  return (
                    <div key={star} className="rating-bar">
                      <span className="star-label">{star} Star</span>
                      <div className="bar-container">
                        <div className="bar" style={{ width: `${percentage}%` }}></div>
                      </div>
                      <span className="bar-count">{count}</span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Session Fee */}
            {specialist.session_fee && (
              <div className="session-fee-card">
                <DollarSign size={24} />
                <div>
                  <span className="fee-label">Session Fee</span>
                  <span className="fee-amount">PKR {specialist.session_fee}</span>
                </div>
              </div>
            )}

            {/* Contact Buttons */}
            <div className="contact-buttons">
              <button className="btn-secondary">
                <MessageSquare size={18} />
                Message
              </button>
              <button className="btn-secondary">
                <Phone size={18} />
                Call
              </button>
            </div>
          </div>
        </div>

        {/* Right Content - Reviews and Details */}
        <div className="profile-main-content">
          {/* Description */}
          {specialist.description && (
            <div className="description-section">
              <h3>About</h3>
              <p>{specialist.description}</p>
            </div>
          )}

          {/* Reviews Section */}
          <div className="reviews-section">
            <div className="reviews-header">
              <h3>{reviews.length} Reviews</h3>
              <div className="overall-rating">
                <span className="rating-value">{calculateAverageRating()}</span>
                <div className="stars-container">
                  {getRatingStars(calculateAverageRating())}
                </div>
              </div>
            </div>

            {reviews.length === 0 ? (
              <div className="no-reviews">
                <p>No reviews yet. Be the first to leave a review!</p>
              </div>
            ) : (
              <>
                <div className="reviews-list">
                  {displayedReviews.map((review, index) => (
                    <div key={review.id || index} className="review-card">
                      <div className="review-header">
                        <div className="reviewer-info">
                          <div className="reviewer-avatar">
                            {getInitials(review.patient_name || 'Anonymous Patient' || 'U')}
                          </div>
                          <div>
                            <h4>{review.is_anonymous ? 'Anonymous Patient' : (review.patient_name || 'Patient')}</h4>
                            <p className="review-date">
                              {review.created_at ? new Date(review.created_at).toLocaleDateString('en-US', {
                                year: 'numeric',
                                month: 'long',
                                day: 'numeric'
                              }) : 'N/A'}
                            </p>
                          </div>
                        </div>
                        <div className="review-rating">
                          {getRatingStars(review.rating || 0)}
                        </div>
                      </div>
                      {review.review_text && (
                        <p className="review-text">{review.review_text}</p>
                      )}
                      {/* Show detailed ratings if available */}
                      {(review.communication_rating || review.professionalism_rating || review.effectiveness_rating) && (
                        <div className="detailed-ratings">
                          {review.communication_rating && (
                            <span>Communication: {review.communication_rating}/5</span>
                          )}
                          {review.professionalism_rating && (
                            <span>Professionalism: {review.professionalism_rating}/5</span>
                          )}
                          {review.effectiveness_rating && (
                            <span>Effectiveness: {review.effectiveness_rating}/5</span>
                          )}
                        </div>
                      )}
                    </div>
                  ))}
                </div>

                {reviews.length > 10 && (
                  <button 
                    className="show-more-button"
                    onClick={() => setShowAllReviews(!showAllReviews)}
                  >
                    {showAllReviews ? 'Show Less' : `Show All ${reviews.length} Reviews`}
                  </button>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      {/* Booking Sidebar */}
      <div className="booking-sidebar">
        <div className="booking-card">
          <h3>Book Appointment</h3>
          
          {!isAuthenticated ? (
            <div className="auth-prompt">
              <AlertCircle size={20} />
              <p>Please log in to book an appointment</p>
              <button 
                className="btn-primary"
                onClick={() => navigate(ROUTES.LOGIN)}
              >
                Log In
              </button>
            </div>
          ) : (
            <>
              {/* Appointment Type Selection */}
              <div className="consultation-modes">
                {(specialist.consultation_modes?.includes('online') || specialist.consultation_modes?.includes('ONLINE')) && (
                  <div 
                    className={`mode-option ${selectedAppointmentType === 'online' ? 'selected' : ''}`}
                    onClick={() => handleAppointmentTypeChange('online')}
                  >
                    <Video size={20} />
                    <div>
                      <span className="mode-type">Video Consultation</span>
                      <span className="mode-fee">PKR {specialist.session_fee || specialist.consultation_fee || 'N/A'}</span>
                    </div>
                    {selectedAppointmentType === 'online' && <Check size={16} />}
                  </div>
                )}
                {(specialist.consultation_modes?.includes('in_person') || specialist.consultation_modes?.includes('IN_PERSON')) && (
                  <div 
                    className={`mode-option ${selectedAppointmentType === 'in_person' ? 'selected' : ''}`}
                    onClick={() => handleAppointmentTypeChange('in_person')}
                  >
                    <MapPin size={20} />
                    <div>
                      <span className="mode-type">In-Person</span>
                      <span className="mode-location">{specialist.city || specialist.clinic_address || 'Clinic'}</span>
                    </div>
                    {selectedAppointmentType === 'in_person' && <Check size={16} />}
                  </div>
                )}
              </div>

              {/* Date Selection */}
              <div className="booking-field">
                <label>Select Date</label>
                <select 
                  value={selectedDate} 
                  onChange={(e) => {
                    setSelectedDate(e.target.value);
                    setSelectedSlotId('');
                    setSelectedTime('');
                  }}
                  disabled={loadingSlots}
                >
                  <option value="">Choose a date</option>
                  {getAvailableDates().map(date => (
                    <option key={date.value} value={date.value}>
                      {date.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Time Slot Selection */}
              <div className="booking-field">
                <label>Select Time</label>
                <select 
                  value={selectedSlotId} 
                  onChange={(e) => {
                    setSelectedSlotId(e.target.value);
                    // Update selectedTime for display
                    const selectedSlot = getAvailableTimesForDate().find(s => s.slot_id === e.target.value);
                    if (selectedSlot) {
                      setSelectedTime(selectedSlot.timeLabel);
                    }
                  }}
                  disabled={!selectedDate || loadingSlots}
                >
                  <option value="">Choose a time</option>
                  {getAvailableTimesForDate().map(slot => (
                    <option key={slot.slot_id} value={slot.slot_id}>
                      {slot.timeLabel} ({slot.duration} min)
                    </option>
                  ))}
                </select>
              </div>

              {/* Presenting Concern */}
              <div className="booking-field">
                <label>Presenting Concern <span className="required">*</span></label>
                <textarea
                  value={presentingConcern}
                  onChange={(e) => setPresentingConcern(e.target.value)}
                  placeholder="Please describe the reason for your appointment..."
                  rows={3}
                />
              </div>

              {/* Patient Notes */}
              <div className="booking-field">
                <label>Additional Notes (Optional)</label>
                <textarea
                  value={patientNotes}
                  onChange={(e) => setPatientNotes(e.target.value)}
                  placeholder="Any additional information you'd like to share..."
                  rows={2}
                />
              </div>

              {/* Payment Fields for Online Appointments */}
              {selectedAppointmentType === 'online' && (
                <>
                  <div className="booking-field">
                    <label>Payment Method <span className="required">*</span></label>
                    <select 
                      value={paymentMethodId} 
                      onChange={(e) => setPaymentMethodId(e.target.value)}
                    >
                      <option value="">Select payment method</option>
                      <option value="easypaisa">EasyPaisa</option>
                      <option value="jazzcash">JazzCash</option>
                      <option value="bank_transfer">Bank Transfer</option>
                      <option value="other">Other</option>
                    </select>
                  </div>

                  <div className="booking-field">
                    <label>Payment Receipt File <span className="required">*</span></label>
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
                    />
                    {uploadingReceipt && (
                      <div className="loading-slots" style={{marginTop: '0.5rem'}}>
                        <Loader size={16} className="animate-spin" />
                        <span>Uploading...</span>
                      </div>
                    )}
                    {paymentReceiptFile && !uploadingReceipt && (
                      <div style={{marginTop: '0.5rem', color: '#166534', fontSize: '0.875rem'}}>
                        ✓ {paymentReceiptFile.name} uploaded
                      </div>
                    )}
                    {paymentReceiptUrl && (
                      <div style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                        File uploaded: {paymentReceiptUrl}
                      </div>
                    )}
                    <p style={{marginTop: '0.5rem', fontSize: '0.75rem', color: '#6b7280'}}>
                      Accepted formats: PDF, JPEG, PNG (Max 5MB)
                    </p>
                  </div>
                </>
              )}

              {/* Loading Slots Indicator */}
              {loadingSlots && (
                <div className="loading-slots">
                  <Loader size={16} className="animate-spin" />
                  <span>Loading available slots...</span>
                </div>
              )}

              {/* Error Message */}
              {bookingError && (
                <div className="booking-error">
                  <AlertCircle size={16} />
                  <span>{bookingError}</span>
                </div>
              )}

              {/* Success Message */}
              {bookingSuccess && (
                <div className="booking-success">
                  <Check size={16} />
                  <span>Appointment booked successfully! Redirecting...</span>
                </div>
              )}

              {/* Book Button */}
              <button 
                className="btn-book-appointment"
                onClick={handleBookAppointment}
                disabled={bookingLoading || uploadingReceipt || loadingSlots || !selectedDate || !selectedSlotId || !presentingConcern.trim() || (selectedAppointmentType === 'online' && (!paymentMethodId.trim() || (!paymentReceiptUrl.trim() && !paymentReceipt.trim())))}
              >
                {bookingLoading ? (
                  <>
                    <Loader size={20} className="animate-spin" />
                    Booking...
                  </>
                ) : (
                  <>
                    <Calendar size={20} />
                    Book Appointment
                  </>
                )}
              </button>

              {/* Fee Display */}
              <div className="booking-fee">
                <span>Fee: PKR {specialist.session_fee || specialist.consultation_fee || 'N/A'}</span>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

export default SpecialistProfile;
