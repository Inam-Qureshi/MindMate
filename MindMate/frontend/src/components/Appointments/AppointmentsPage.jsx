import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Calendar, 
  Clock, 
  User, 
  Video, 
  MapPin, 
  Plus, 
  Search, 
  Filter, 
  RefreshCw,
  CheckCircle,
  XCircle,
  AlertCircle,
  Eye,
  DollarSign,
  Star
} from 'react-feather';
import Header from '../Home/Navigation/Header';
import Footer from '../Home/Navigation/Footer';
import BookingWizard from './BookingWizard';
import ReviewModal from './ReviewModal';
import { APIErrorHandler } from '../../utils/errorHandler';
import { useAppointments } from '../../hooks/useAppointmentState';
import { TableLoader, ListLoader, ErrorState, EmptyState, ButtonLoader } from '../UI/LoadingStates';
import { useToast } from '../UI/Toast';
import { AuthStorage } from '../../utils/localStorage';
import apiClient from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import { resetCircuitBreaker } from '../../utils/apiRetry';
import { useQuestionnaireCheck } from '../../hooks/useQuestionnaireCheck';
import './AppointmentsPage.css';

const AppointmentsPage = ({ darkMode: propDarkMode }) => {
  // Check if questionnaire is completed before accessing appointments
  useQuestionnaireCheck();

  // State management
  const [darkMode, setDarkMode] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  
  // Use custom hook for appointments management
  const { 
    appointments, 
    loading: appointmentsLoading, 
    error, 
    errorObject, // Get error object for circuit breaker checking
    fetchAppointments, 
    cancelAppointment,
    rescheduleAppointment,
    completeAppointment,
    refreshAppointments 
  } = useAppointments();

  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [filter, setFilter] = useState('all'); // all, upcoming, completed, cancelled
  const [searchQuery, setSearchQuery] = useState('');
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [selectedAppointmentForReview, setSelectedAppointmentForReview] = useState(null);
  
  // Toast notifications
  const toast = useToast();

  // Initialize component
  useEffect(() => {
    // Get dark mode preference
    const savedMode = propDarkMode !== undefined 
      ? propDarkMode 
      : localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);

    // Fetch current user
    const fetchUser = async () => {
      try {
        const token = AuthStorage.getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
    };

    fetchUser();
    fetchAppointments();
  }, [fetchAppointments, propDarkMode]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const handleBookingComplete = useCallback((success, data) => {
    if (success) {
      refreshAppointments();
      setShowBookingWizard(false);
      setSelectedSpecialist(null);
      toast.success('Appointment booked successfully!');
    }
  }, [refreshAppointments, toast]);

  const handleCompleteAppointment = useCallback(async (appointmentId) => {
    if (!window.confirm('Mark this appointment as completed?')) {
      return;
    }

    const result = await completeAppointment(appointmentId, '');
    
    if (result.success) {
      toast.success('Appointment marked as completed');
      refreshAppointments();
    } else {
      const errorInfo = APIErrorHandler.handleBookingError(result.error || { response: { data: { detail: result.error } } });
      toast.error(errorInfo.message, {
        duration: 5000,
        icon: errorInfo.severity === 'warning' ? '⚠️' : '❌'
      });
    }
  }, [completeAppointment, refreshAppointments, toast]);

  const handleCancelAppointment = useCallback(async (appointmentId) => {
    if (!window.confirm('Are you sure you want to cancel this appointment?')) {
      return;
    }

    const result = await cancelAppointment(appointmentId, 'Cancelled by patient');
    
    if (result.success) {
      toast.success('Appointment cancelled successfully');
      refreshAppointments();
    } else {
      // Use error handler for better error messages
      const errorInfo = APIErrorHandler.handleBookingError(result.error || { response: { data: { detail: result.error } } });
      toast.error(errorInfo.message, {
        duration: 5000,
        icon: errorInfo.severity === 'warning' ? '⚠️' : '❌'
      });
    }
  }, [cancelAppointment, refreshAppointments, toast]);

  const handleOpenReviewModal = useCallback((appointment) => {
    setSelectedAppointmentForReview(appointment);
    setShowReviewModal(true);
  }, []);

  const handleCloseReviewModal = useCallback(() => {
    setShowReviewModal(false);
    setSelectedAppointmentForReview(null);
  }, []);

  const handleReviewSuccess = useCallback(() => {
    toast.success('Review submitted successfully!');
    refreshAppointments();
    handleCloseReviewModal();
  }, [refreshAppointments, handleCloseReviewModal, toast]);

  const getStatusConfig = (status) => {
    const statusLower = status?.toLowerCase() || '';
    const configs = {
      scheduled: {
        color: darkMode ? 'status-scheduled-dark' : 'status-scheduled',
        icon: CheckCircle,
        label: 'Scheduled'
      },
      confirmed: {
        color: darkMode ? 'status-confirmed-dark' : 'status-confirmed',
        icon: CheckCircle,
        label: 'Confirmed'
      },
      completed: {
        color: darkMode ? 'status-completed-dark' : 'status-completed',
        icon: CheckCircle,
        label: 'Completed'
      },
      cancelled: {
        color: darkMode ? 'status-cancelled-dark' : 'status-cancelled',
        icon: XCircle,
        label: 'Cancelled'
      },
      in_session: {
        color: darkMode ? 'status-in-session-dark' : 'status-in-session',
        icon: AlertCircle,
        label: 'In Session'
      },
      pending_approval: {
        color: darkMode ? 'status-pending-dark' : 'status-pending',
        icon: AlertCircle,
        label: 'Pending Payment Confirmation'
      },
      rejected: {
        color: darkMode ? 'status-rejected-dark' : 'status-rejected',
        icon: XCircle,
        label: 'Rejected'
      },
      in_progress: {
        color: darkMode ? 'status-in-session-dark' : 'status-in-session',
        icon: AlertCircle,
        label: 'In Progress'
      },
      no_show: {
        color: darkMode ? 'status-cancelled-dark' : 'status-cancelled',
        icon: XCircle,
        label: 'No Show'
      }
    };
    return configs[statusLower] || configs.scheduled;
  };

  const filteredAppointments = appointments.filter(appointment => {
    if (!appointment || !appointment.status) return false;
    
    const status = appointment.status.toLowerCase();
    const matchesFilter = filter === 'all' || 
      (filter === 'upcoming' && ['scheduled', 'confirmed', 'pending_approval'].includes(status)) ||
      (filter === 'completed' && status === 'completed') ||
      (filter === 'cancelled' && ['cancelled', 'rejected'].includes(status));
    
    const matchesSearch = !searchQuery.trim() || 
      appointment.specialist_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      appointment.presenting_concern?.toLowerCase().includes(searchQuery.toLowerCase());
    
    return matchesFilter && matchesSearch;
  });

  const formatDate = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  const formatTime = (dateString) => {
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return '';
    }
  };

  const getFilterCounts = () => {
    return {
      all: appointments.length,
      upcoming: appointments.filter(a => ['scheduled', 'confirmed', 'pending_approval'].includes(a.status?.toLowerCase())).length,
      completed: appointments.filter(a => a.status?.toLowerCase() === 'completed').length,
      cancelled: appointments.filter(a => ['cancelled', 'rejected'].includes(a.status?.toLowerCase())).length
    };
  };

  const filterCounts = getFilterCounts();

  if (loading || appointmentsLoading) {
    return (
      <div className={`appointments-page ${darkMode ? 'dark' : ''}`}>
        <Header darkMode={darkMode} setDarkMode={toggleDarkMode} currentUser={currentUser} />
        <div className="appointments-container">
          <div className="appointments-content">
            <div className="loading-container">
              <div className="loading-spinner"></div>
              <p>Loading your appointments...</p>
            </div>
          </div>
        </div>
        <Footer darkMode={darkMode} />
      </div>
    );
  }

  return (
    <div className={`appointments-page ${darkMode ? 'dark' : ''}`}>
      {/* Global Header */}
      <Header darkMode={darkMode} setDarkMode={toggleDarkMode} currentUser={currentUser} />
      
      {/* Main Content Container - matching Forum style */}
      <div className="appointments-container">
        {/* Appointments Header */}
        <div className="appointments-header">
          <div className="header-container">
            <div className="header-left">
              <div className="header-brand">
                <div className="brand-icon">
                  <Calendar size={24} />
                </div>
                <div className="brand-content">
                  <h1>My Appointments</h1>
                  <p>Manage your mental health appointments</p>
                </div>
              </div>
            </div>
            <div className="header-right">
              <div className="header-actions">
                <button
              onClick={() => setShowBookingWizard(true)}
                  className="primary-btn"
            >
              <Plus size={20} />
              Book New Appointment
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="appointments-controls">
            {/* Search */}
          <div className="search-container">
              <Search 
                size={20} 
              className="search-icon"
              />
              <input
                type="text"
                placeholder="Search appointments..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
              />
            </div>

            {/* Filter Tabs */}
          <div className="filter-tabs">
              {[
                { key: 'all', label: 'All' },
                { key: 'upcoming', label: 'Upcoming' },
                { key: 'completed', label: 'Completed' },
                { key: 'cancelled', label: 'Cancelled' }
              ].map(tab => (
                <button
                  key={tab.key}
                  onClick={() => setFilter(tab.key)}
                className={`filter-tab ${filter === tab.key ? 'active' : ''}`}
                >
                  {tab.label} ({filterCounts[tab.key]})
                </button>
              ))}
            </div>

            {/* Refresh Button */}
          <button
              onClick={fetchAppointments}
            className="refresh-btn"
              title="Refresh appointments"
            >
              <RefreshCw size={20} />
          </button>
          </div>

        {/* Error Message */}
        {error && (
          <div className="error-container">
            <ErrorState 
              error={typeof error === 'string' ? error : error.message || 'Failed to load appointments'}
              onRetry={() => {
                // Reset circuit breaker if it's open
                const isCircuitBreakerError = errorObject?.code === 'CIRCUIT_BREAKER_OPEN' || 
                    (typeof error === 'string' && error.includes('Circuit breaker'));
                
                if (isCircuitBreakerError) {
                  resetCircuitBreaker('appointments');
                  toast('Circuit breaker reset. Retrying...');
                }
                fetchAppointments();
                toast('Refreshing appointments...');
              }}
              retryText="Try Again"
            />
            {/* Additional help for circuit breaker errors */}
            {(errorObject?.code === 'CIRCUIT_BREAKER_OPEN' || 
              (typeof error === 'string' && error.includes('Circuit breaker'))) && (
              <div className="circuit-breaker-help" style={{
                marginTop: '1rem',
                padding: '1rem',
                background: darkMode ? 'rgba(239, 68, 68, 0.1)' : 'rgba(239, 68, 68, 0.05)',
                borderRadius: '0.5rem',
                border: `1px solid ${darkMode ? 'rgba(239, 68, 68, 0.3)' : 'rgba(239, 68, 68, 0.2)'}`
              }}>
                <p style={{ margin: 0, fontSize: '0.875rem', color: darkMode ? '#fca5a5' : '#dc2626' }}>
                  <AlertCircle size={16} style={{ display: 'inline', marginRight: '0.5rem', verticalAlign: 'middle' }} />
                  Service is temporarily unavailable. Please wait a moment and try again, or refresh the page.
                </p>
              </div>
            )}
          </div>
        )}

        {/* Main Content */}
        <div className="appointments-content">
          <AnimatePresence mode="wait">
            {filteredAppointments.length === 0 ? (
              <motion.div
                key="empty"
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
              >
                <EmptyState
                  title={filter === 'all' ? 'No Appointments Found' : `No ${filter} appointments found`}
                  message={filter === 'all' 
                    ? "You don't have any appointments yet. Book your first appointment to get started."
                    : `No ${filter} appointments found.`
                  }
                  action={filter === 'all' ? () => setShowBookingWizard(true) : undefined}
                  actionText={filter === 'all' ? 'Book Appointment' : undefined}
                  icon={Calendar}
                />
              </motion.div>
            ) : (
              <div className="appointments-list">
                {filteredAppointments.map((appointment, index) => {
                const statusConfig = getStatusConfig(appointment.status);
                const StatusIcon = statusConfig.icon;
                
                return (
                  <motion.div
                      key={appointment.appointment_id || appointment.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -20 }}
                    transition={{ delay: index * 0.05 }}
                      className="appointment-card"
                  >
                    {/* Card Header */}
                      <div className="appointment-header">
                        <div className="specialist-info">
                          <div className="specialist-avatar">
                            <User size={24} />
                          </div>
                          <div className="specialist-details">
                            <h3>{appointment.specialist_name || 'Unknown Specialist'}</h3>
                            <p>Mental Health Specialist</p>
                          </div>
                        </div>
                        
                        {/* Status Badge */}
                        <div className={`status-badge ${statusConfig.color}`}>
                          <StatusIcon size={14} />
                          <span>{statusConfig.label}</span>
                      </div>
                    </div>

                    {/* Appointment Details Grid */}
                      <div className="appointment-details">
                        <div className="detail-item">
                          <Calendar size={18} />
                        <div>
                            <p className="detail-label">Date</p>
                            <p className="detail-value">{formatDate(appointment.scheduled_start)}</p>
                          </div>
                      </div>
                      
                        <div className="detail-item">
                          <Clock size={18} />
                        <div>
                            <p className="detail-label">Time</p>
                            <p className="detail-value">
                            {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)}
                          </p>
                        </div>
                      </div>
                      
                        <div className="detail-item">
                        {(appointment.appointment_type === 'online' || appointment.appointment_type === 'virtual') ? (
                            <Video size={18} />
                        ) : (
                            <MapPin size={18} />
                        )}
                        <div>
                            <p className="detail-label">Mode</p>
                            <p className="detail-value">
                            {(appointment.appointment_type === 'online' || appointment.appointment_type === 'virtual') 
                              ? 'Online Session' 
                              : 'In-Person'}
                          </p>
                        </div>
                      </div>
                      
                        <div className="detail-item">
                          <DollarSign size={18} />
                        <div>
                            <p className="detail-label">Fee</p>
                            <p className="detail-value">Rs. {appointment.fee || 0}</p>
                          </div>
                      </div>
                    </div>

                    {/* Presenting Concern */}
                    {appointment.presenting_concern && (
                        <div className="appointment-concern">
                          <h4>Presenting Concern:</h4>
                          <p>{appointment.presenting_concern}</p>
                      </div>
                    )}

                    {/* Action Buttons */}
                      <div className="appointment-actions">
                      {['scheduled', 'confirmed'].includes(appointment.status.toLowerCase()) && (
                          <button
                            onClick={() => handleCancelAppointment(appointment.appointment_id || appointment.id)}
                            className="action-btn cancel-btn"
                        >
                          <XCircle size={16} />
                          Cancel
                          </button>
                        )}
                        
                        <button
                          className="action-btn view-btn"
                      >
                        <Eye size={16} />
                        View Details
                        </button>
                        
                        {appointment.meeting_link && 
                         appointment.status?.toLowerCase() !== 'rejected' && 
                         appointment.status?.toLowerCase() !== 'pending_approval' && (
                          <a
                          href={appointment.meeting_link}
                          target="_blank"
                          rel="noopener noreferrer"
                            className="action-btn join-btn"
                        >
                          <Video size={16} />
                          Join Meeting
                          </a>
                        )}

                        {/* Add Review Button - Only for completed appointments that don't have a review */}
                        {appointment.status?.toLowerCase() === 'completed' && 
                         !appointment.patient_rating && (
                          <button
                            onClick={() => handleOpenReviewModal(appointment)}
                            className="action-btn review-btn"
                          >
                            <Star size={16} />
                            Add Review
                          </button>
                      )}
                    </div>
                  </motion.div>
                );
                })}
              </div>
            )}
          </AnimatePresence>
        </div>
      </div>

      {/* Global Footer */}
      <Footer darkMode={darkMode} />

      {/* Booking Wizard Modal */}
      <AnimatePresence>
        {showBookingWizard && (
          <BookingWizard
            selectedSpecialist={selectedSpecialist}
            onClose={() => {
              setShowBookingWizard(false);
              setSelectedSpecialist(null);
            }}
            onBookingComplete={handleBookingComplete}
            darkMode={darkMode}
          />
        )}
      </AnimatePresence>

      {/* Review Modal */}
      <ReviewModal
        isOpen={showReviewModal}
        onClose={handleCloseReviewModal}
        appointment={selectedAppointmentForReview}
        darkMode={darkMode}
        onSuccess={handleReviewSuccess}
      />
    </div>
  );
};

export default AppointmentsPage;
