import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  MapPin,
  AlertCircle,
  Loader,
  Search,
  RefreshCw,
  Video,
  Phone,
  MessageSquare,
  X as XIcon,
  CheckCircle,
  AlertTriangle
} from 'react-feather';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';
import apiClient from '../../utils/axiosConfig';
import { APIErrorHandler } from '../../utils/errorHandler';
import './PatientDashboard.css';

const PatientDashboard = ({ darkMode }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState('upcoming');
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [cancelReason, setCancelReason] = useState('');
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  useEffect(() => {
    loadAppointments();
  }, [selectedFilter]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = AuthStorage.getToken();
      if (!token) {
        setError('Please log in to view appointments');
        return;
      }

      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('status_filter', selectedFilter);
      }

      const response = await apiClient.get(
        `${API_ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS}?${params}`
      );

      // Backend returns array directly, not wrapped in appointments property
      setAppointments(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error loading appointments:", err);
      const errorInfo = APIErrorHandler.handleBookingError(err);
      setError(errorInfo.message || "Failed to load your appointments.");
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const handleCancelAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowCancelModal(true);
    setCancelReason('');
  };

  const handleRescheduleAppointment = async (appointment) => {
    setSelectedAppointment(appointment);
    setShowRescheduleModal(true);
    setRescheduleDate('');
    setRescheduleTime('');
    setAvailableSlots([]);
    
    // Load available slots for this specialist
    try {
      const token = AuthStorage.getToken();
      if (!token) {
        setError('Please log in to reschedule appointments');
        return;
      }
      
      // Format dates as YYYY-MM-DD
      const formatDate = (date) => {
        if (!date) return null;
        const d = new Date(date);
        return d.toISOString().split('T')[0];
      };
      
      const today = new Date();
      const endDate = new Date();
      endDate.setDate(endDate.getDate() + 6); // Next 7 days only (backend limit)
      
      // Map appointment type: backend uses "virtual" for appointments but "online" for slots
      const appointmentType = appointment.appointment_type === 'virtual' || appointment.appointment_type === 'online'
        ? 'online'
        : 'in_person';
      
      const response = await apiClient.get(
        API_ENDPOINTS.APPOINTMENTS.SPECIALIST_AVAILABLE_SLOTS(appointment.specialist_id),
        {
          params: {
            start_date: formatDate(today),
            end_date: formatDate(endDate),
            appointment_type: appointmentType,
            limit: 50
          }
        }
      );
      
      // Backend returns array directly, not wrapped in available_slots
      setAvailableSlots(Array.isArray(response.data) ? response.data : []);
    } catch (err) {
      console.error("Error loading slots:", err);
      const errorInfo = APIErrorHandler.handleBookingError(err);
      // Silently handle slot loading errors - user will see no slots available
    }
  };

  const handleConfirmReschedule = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = AuthStorage.getToken();
      if (!token) {
        setError('Please log in to reschedule appointments');
        return;
      }

      // Backend expects new_slot_id in request body
      // Find the slot by matching date and time
      const formatDate = (dateStr) => {
        if (!dateStr) return null;
        if (typeof dateStr === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(dateStr)) {
          return dateStr;
        }
        try {
          return new Date(dateStr).toISOString().split('T')[0];
        } catch {
          return null;
        }
      };
      
      const targetDate = formatDate(rescheduleDate);
      const selectedSlot = availableSlots.find(slot => {
        if (!slot || !slot.slot_id) return false;
        const slotDate = formatDate(slot.slot_date || slot.start_time);
        if (slotDate !== targetDate) return false;
        
        // Match by time (HH:MM format)
        if (rescheduleTime) {
          const slotDateTime = new Date(slot.slot_date || slot.start_time);
          const slotTime = slotDateTime.toTimeString().split(' ')[0].substring(0, 5);
          return slotTime === rescheduleTime;
        }
        return true;
      });

      if (!selectedSlot || !selectedSlot.slot_id) {
        setError('Please select a valid time slot');
        return;
      }

      await apiClient.put(
        API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(selectedAppointment.appointment_id || selectedAppointment.id),
        {
          new_slot_id: selectedSlot.slot_id
        }
      );

      setShowRescheduleModal(false);
      setSelectedAppointment(null);
      setRescheduleDate('');
      setRescheduleTime('');
      loadAppointments();
    } catch (err) {
      console.error("Error rescheduling appointment:", err);
      const errorInfo = APIErrorHandler.handleBookingError(err);
      setError(errorInfo.message || "Failed to reschedule appointment.");
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmCancel = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = AuthStorage.getToken();
      if (!token) {
        setError('Please log in to cancel appointments');
        return;
      }

      await apiClient.put(
        API_ENDPOINTS.APPOINTMENTS.CANCEL(selectedAppointment?.appointment_id || selectedAppointment?.id),
        {
          reason: cancelReason || 'Cancelled by patient'
        }
      );

      setShowCancelModal(false);
      setSelectedAppointment(null);
      setCancelReason('');
      loadAppointments();
    } catch (err) {
      console.error("Error cancelling appointment:", err);
      const errorInfo = APIErrorHandler.handleBookingError(err);
      setError(errorInfo.message || "Failed to cancel appointment.");
    } finally {
      setLoading(false);
    }
  };

  const filteredAppointments = appointments.filter(apt => {
    // Apply search filter
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      if (
        !apt.specialist_name?.toLowerCase().includes(query) &&
        !apt.presenting_concern?.toLowerCase().includes(query)
      ) {
        return false;
      }
    }
    
    // Apply status filter
    if (selectedFilter === 'history') {
      // Show completed and cancelled appointments
      return apt.status === 'completed' || apt.status === 'cancelled';
    } else if (selectedFilter !== 'all') {
      return apt.status === selectedFilter;
    }
    
    return true;
  });

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending Approval', color: '#f59e0b', bg: '#fef3c7' },
      confirmed: { label: 'Confirmed', color: '#10b981', bg: '#d1fae5' },
      rejected: { label: 'Rejected', color: '#ef4444', bg: '#fee2e2' },
      completed: { label: 'Completed', color: '#6366f1', bg: '#e0e7ff' },
      cancelled: { label: 'Cancelled', color: '#6b7280', bg: '#f3f4f6' }
    };
    
    const badge = badges[status] || badges.pending;
    return (
      <span 
        className="status-badge"
        style={{ 
          color: badge.color, 
          backgroundColor: badge.bg,
          borderColor: badge.color
        }}
      >
        {badge.label}
      </span>
    );
  };

  const getConsultationModeIcon = (mode) => {
    return mode === 'online' ? <Video size={16} /> : <User size={16} />;
  };

  const upcomingAppointments = appointments.filter(apt => 
    apt.status === 'confirmed' && 
    new Date(apt.scheduled_date) >= new Date()
  );

  return (
    <div className={`patient-dashboard ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="dashboard-header">
        <div>
          <h1>My Appointments</h1>
          <p>Manage your appointments and view your schedule</p>
        </div>
        <button className="refresh-btn" onClick={loadAppointments} disabled={loading}>
          <RefreshCw size={20} className={loading ? 'spinning' : ''} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="error-message">
          <AlertCircle size={20} />
          <span>{error}</span>
          <button onClick={() => setError(null)}>
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Upcoming Appointments Summary */}
      {upcomingAppointments.length > 0 && (
        <div className="upcoming-summary">
          <h2>Upcoming Appointments</h2>
          <div className="upcoming-grid">
            {upcomingAppointments.slice(0, 3).map((apt) => (
              <div key={apt.id} className="upcoming-card">
                <div className="upcoming-header">
                  <h3>{apt.specialist_name}</h3>
                  {getStatusBadge(apt.status)}
                </div>
                <div className="upcoming-details">
                  <div className="upcoming-date">
                    <Calendar size={16} />
                    {new Date(apt.scheduled_date).toLocaleDateString()}
                  </div>
                  <div className="upcoming-time">
                    <Clock size={16} />
                    {apt.scheduled_time}
                  </div>
                  <div className="upcoming-mode">
                    {getConsultationModeIcon(apt.consultation_mode)}
                    {apt.consultation_mode === 'online' ? 'Online' : 'In-Person'}
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Filters and Search */}
      <div className="dashboard-controls">
        <div className="filter-tabs">
          <button
            className={`filter-tab ${selectedFilter === 'all' ? 'active' : ''}`}
            onClick={() => handleFilterChange('all')}
          >
            All
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'upcoming' ? 'active' : ''}`}
            onClick={() => handleFilterChange('confirmed')}
          >
            Upcoming
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'pending' ? 'active' : ''}`}
            onClick={() => handleFilterChange('pending')}
          >
            Pending
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'completed' ? 'active' : ''}`}
            onClick={() => handleFilterChange('completed')}
          >
            Completed
          </button>
          <button
            className={`filter-tab ${selectedFilter === 'history' ? 'active' : ''}`}
            onClick={() => handleFilterChange('history')}
          >
            History
          </button>
        </div>

        <div className="search-container">
          <Search size={20} className="search-icon" />
          <input
            type="text"
            placeholder="Search by specialist or concern..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="search-input"
          />
        </div>
      </div>

      {/* Appointments List */}
      {loading ? (
        <div className="loading-state">
          <Loader size={32} className="spinning" />
          <p>Loading appointments...</p>
        </div>
      ) : filteredAppointments.length === 0 ? (
        <div className="empty-state">
          <Calendar size={48} />
          <h3>No appointments found</h3>
          <p>You don't have any appointments yet. Start by booking with a specialist!</p>
        </div>
      ) : (
        <div className="appointments-list">
          <AnimatePresence>
            {filteredAppointments.map((appointment) => (
              <motion.div
                key={appointment.appointment_id || appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
                className={`appointment-card ${appointment.status}`}
              >
                <div className="appointment-header">
                  <div>
                    <h3>{appointment.specialist_name}</h3>
                    {getStatusBadge(appointment.status)}
                  </div>
                  <div className="appointment-date">
                    <Calendar size={16} />
                    {new Date(appointment.created_at).toLocaleDateString()}
                  </div>
                </div>

                <div className="appointment-details">
                  <p className="concern">{appointment.presenting_concern}</p>
                  
                  {appointment.scheduled_date && (
                    <div className="appointment-schedule">
                      <div className="schedule-item">
                        <Calendar size={14} />
                        <span>{new Date(appointment.scheduled_date).toLocaleDateString()}</span>
                      </div>
                      <div className="schedule-item">
                        <Clock size={14} />
                        <span>{appointment.scheduled_time}</span>
                      </div>
                      <div className="schedule-item">
                        {getConsultationModeIcon(appointment.consultation_mode)}
                        <span>{appointment.consultation_mode === 'online' ? 'Online' : 'In-Person'}</span>
                      </div>
                    </div>
                  )}

                  {appointment.response_message && (
                    <div className="specialist-message">
                      <MessageSquare size={14} />
                      <p>{appointment.response_message}</p>
                    </div>
                  )}

                  {appointment.alternative_suggestions && (
                    <div className="alternative-suggestions">
                      <AlertTriangle size={14} />
                      <p><strong>Alternative:</strong> {appointment.alternative_suggestions}</p>
                    </div>
                  )}
                </div>

                {appointment.status === 'confirmed' && (
                  <div className="appointment-actions">
                    <button
                      className="btn-reschedule"
                      onClick={() => handleRescheduleAppointment(appointment)}
                    >
                      <Clock size={18} />
                      Reschedule
                    </button>
                    <button
                      className="btn-cancel"
                      onClick={() => handleCancelAppointment(appointment)}
                    >
                      <XIcon size={18} />
                      Cancel
                    </button>
                    <button className="btn-secondary">
                      <MessageSquare size={18} />
                      Contact
                    </button>
                  </div>
                )}

                {appointment.status === 'pending' && (
                  <div className="appointment-info">
                    <AlertCircle size={16} />
                    <span>Awaiting specialist approval</span>
                  </div>
                )}
              </motion.div>
            ))}
          </AnimatePresence>
        </div>
      )}

      {/* Cancel Modal */}
      <AnimatePresence>
        {showCancelModal && selectedAppointment && (
          <div className="modal-overlay" onClick={() => setShowCancelModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Cancel Appointment</h2>
                <button className="close-btn" onClick={() => setShowCancelModal(false)}>
                  <XIcon size={24} />
                </button>
              </div>

              <div className="modal-body">
                <div className="appointment-info-section">
                  <h4>Appointment Details</h4>
                  <p><strong>Specialist:</strong> {selectedAppointment.specialist_name}</p>
                  <p><strong>Date:</strong> {selectedAppointment.scheduled_date ? new Date(selectedAppointment.scheduled_date).toLocaleDateString() : 'Not scheduled'}</p>
                  <p><strong>Time:</strong> {selectedAppointment.scheduled_time || 'Not scheduled'}</p>
                </div>

                <div className="modal-form">
                  <div className="form-group">
                    <label>Reason for Cancellation *</label>
                    <textarea
                      value={cancelReason}
                      onChange={(e) => setCancelReason(e.target.value)}
                      placeholder="Please let us know why you're cancelling..."
                      rows={4}
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowCancelModal(false)}>
                  Keep Appointment
                </button>
                <button
                  className="btn-cancel"
                  onClick={handleConfirmCancel}
                  disabled={loading || !cancelReason.trim()}
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="spinning" />
                      Cancelling...
                    </>
                  ) : (
                    <>
                      <XIcon size={16} />
                      Confirm Cancellation
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Reschedule Modal */}
      <AnimatePresence>
        {showRescheduleModal && selectedAppointment && (
          <div className="modal-overlay" onClick={() => setShowRescheduleModal(false)}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>Reschedule Appointment</h2>
                <button className="close-btn" onClick={() => setShowRescheduleModal(false)}>
                  <XIcon size={24} />
                </button>
              </div>

              <div className="modal-body">
                <div className="appointment-info-section">
                  <h4>Current Appointment</h4>
                  <p><strong>Specialist:</strong> {selectedAppointment.specialist_name}</p>
                  <p><strong>Current Date:</strong> {selectedAppointment.scheduled_date ? new Date(selectedAppointment.scheduled_date).toLocaleDateString() : 'Not scheduled'}</p>
                  <p><strong>Current Time:</strong> {selectedAppointment.scheduled_time || 'Not scheduled'}</p>
                </div>

                <div className="modal-form">
                  <div className="form-group">
                    <label>Select New Date *</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      required
                    />
                  </div>

                  {rescheduleDate && (
                    <div className="form-group">
                      <label>Select New Time *</label>
                      <div className="slot-grid-reschedule">
                        {availableSlots
                          .filter(slot => {
                            const slotDate = new Date(slot.slot_date).toISOString().split('T')[0];
                            const selectedDate = rescheduleDate.split('T')[0];
                            return slotDate === selectedDate;
                          })
                          .map((slot) => (
                            <button
                              key={slot.slot_id}
                              type="button"
                              className={`slot-button ${rescheduleTime === slot.slot_date ? 'selected' : ''}`}
                              onClick={() => setRescheduleTime(slot.slot_date)}
                            >
                              {new Date(slot.slot_date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </button>
                          ))}
                      </div>
                      {availableSlots.filter(slot => {
                        const slotDate = new Date(slot.slot_date).toISOString().split('T')[0];
                        return slotDate === rescheduleDate.split('T')[0];
                      }).length === 0 && (
                        <p className="no-slots-message">No available slots for this date</p>
                      )}
                    </div>
                  )}
                </div>
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={() => setShowRescheduleModal(false)}>
                  Keep Original Time
                </button>
                <button
                  className="btn-reschedule"
                  onClick={handleConfirmReschedule}
                  disabled={loading || !rescheduleDate || !rescheduleTime}
                >
                  {loading ? (
                    <>
                      <Loader size={16} className="spinning" />
                      Rescheduling...
                    </>
                  ) : (
                    <>
                      <Clock size={16} />
                      Confirm Reschedule
                    </>
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default PatientDashboard;
