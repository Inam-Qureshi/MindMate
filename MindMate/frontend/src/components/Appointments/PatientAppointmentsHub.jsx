/**
 * Patient Appointments Hub
 * =======================
 * Comprehensive appointments management page for patients
 * Combines booking, viewing, and managing appointments
 */

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
  Phone,
  Mail,
  Edit,
  Trash2,
  Eye,
  Download,
  BookOpen,
  Users,
  Settings,
  Bell,
  Star,
  MessageSquare,
  ChevronRight,
  Calendar as CalendarIcon,
  Clock as ClockIcon
} from 'react-feather';
import { useAppointments, useSpecialistSearch } from '../../hooks/useAppointmentState';
import BookingWizard from './BookingWizard';
import FindSpecialists from './FindSpecialists';
import AppointmentsPage from './AppointmentsPage';
import { useToast } from '../UI/Toast';
import { ButtonLoader, ErrorState, EmptyState } from '../UI/LoadingStates';
import { ROUTES } from '../../config/routes';
import './PatientAppointmentsHub.css';

const PatientAppointmentsHub = ({ darkMode = false }) => {
  // Main navigation state
  const [activeTab, setActiveTab] = useState('overview'); // overview, book, manage, specialists
  
  // Booking state
  const [showBookingWizard, setShowBookingWizard] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  
  // Appointments management
  const { 
    appointments, 
    loading: appointmentsLoading, 
    error: appointmentsError, 
    fetchAppointments, 
    cancelAppointment, 
    rescheduleAppointment,
    completeAppointment,
    refreshAppointments 
  } = useAppointments();

  // Specialist search
  const {
    specialists,
    loading: specialistsLoading,
    error: specialistsError,
    searchSpecialists,
    updateFilters,
    updatePagination,
    pagination
  } = useSpecialistSearch();

  // Toast notifications
  const toast = useToast();

  // Filter and search state
  const [appointmentFilter, setAppointmentFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showFilters, setShowFilters] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);

  // Load appointments on mount
  useEffect(() => {
    fetchAppointments();
    setLastUpdated(new Date());
  }, [fetchAppointments]);

  // Manual refresh handler
  const handleManualRefresh = useCallback(() => {
    refreshAppointments();
    setLastUpdated(new Date());
    toast.success('Appointments refreshed');
  }, [refreshAppointments, toast]);

  // Real-time appointment status updates (polling every 30 seconds)
  // Pauses when tab is inactive to save resources
  useEffect(() => {
    // Only poll when on manage or overview tabs
    if (activeTab !== 'manage' && activeTab !== 'overview') {
      return;
    }

    let pollingInterval = null;
    let isTabVisible = !document.hidden;

    // Function to refresh appointments
    const performRefresh = () => {
      if (isTabVisible) {
        refreshAppointments();
        setLastUpdated(new Date());
      }
    };

    // Handle visibility change (tab focus/blur)
    const handleVisibilityChange = () => {
      isTabVisible = !document.hidden;
      
      if (isTabVisible && pollingInterval === null) {
        // Tab became visible - restart polling
        pollingInterval = setInterval(performRefresh, 60000); // Poll every 60 seconds (reduced frequency)
      } else if (!isTabVisible && pollingInterval !== null) {
        // Tab became hidden - stop polling
        clearInterval(pollingInterval);
        pollingInterval = null;
      }
    };

    // Start polling if tab is visible
    if (isTabVisible) {
      pollingInterval = setInterval(performRefresh, 60000); // Poll every 60 seconds (optimized from 30s)
    }

    // Listen for visibility changes
    document.addEventListener('visibilitychange', handleVisibilityChange);

    // Cleanup function
    return () => {
      if (pollingInterval !== null) {
        clearInterval(pollingInterval);
      }
      document.removeEventListener('visibilitychange', handleVisibilityChange);
    };
  }, [activeTab, refreshAppointments]);

  // Filter appointments based on current filter
  const filteredAppointments = useCallback(() => {
    if (!appointments) return [];
    
    let filtered = appointments;
    
    // Apply status filter
    switch (appointmentFilter) {
      case 'upcoming':
        filtered = filtered.filter(apt => {
          const status = apt.status?.toLowerCase();
          return status === 'scheduled' || status === 'confirmed';
        });
        break;
      case 'completed':
        filtered = filtered.filter(apt => apt.status?.toLowerCase() === 'completed');
        break;
      case 'cancelled':
        filtered = filtered.filter(apt => apt.status?.toLowerCase() === 'cancelled');
        break;
      default:
        // Show all
        break;
    }
    
    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.specialist_name?.toLowerCase().includes(query) ||
        apt.specialization?.toLowerCase().includes(query) ||
        apt.presenting_concern?.toLowerCase().includes(query)
      );
    }
    
    return filtered;
  }, [appointments, appointmentFilter, searchQuery]);

  // Handle booking wizard
  const handleBookAppointment = useCallback((specialist = null) => {
    setSelectedSpecialist(specialist);
    setShowBookingWizard(true);
  }, []);

  const handleBookingComplete = useCallback((success, data) => {
    setShowBookingWizard(false);
    setSelectedSpecialist(null);
    
    if (success) {
      toast.success('Appointment booked successfully!');
      refreshAppointments();
      setActiveTab('manage');
    } else {
      toast.error('Failed to book appointment. Please try again.');
    }
  }, [toast, refreshAppointments]);

  // Handle appointment actions
  const handleCancelAppointment = useCallback(async (appointmentId, reason = 'Patient requested cancellation') => {
    try {
      const result = await cancelAppointment(appointmentId, reason);
      if (result.success) {
        toast.success('Appointment cancelled successfully');
        refreshAppointments();
      } else {
        toast.error(result.error || 'Failed to cancel appointment');
      }
    } catch (error) {
      console.error('Error cancelling appointment:', error);
      toast.error('Failed to cancel appointment');
    }
  }, [cancelAppointment, refreshAppointments, toast]);

  const handleRescheduleAppointment = useCallback(async (appointmentId, newSlotId) => {
    try {
      const result = await rescheduleAppointment(appointmentId, newSlotId);
      if (result.success) {
        toast.success('Appointment rescheduled successfully');
        refreshAppointments();
      } else {
        toast.error(result.error || 'Failed to reschedule appointment');
      }
    } catch (error) {
      console.error('Error rescheduling appointment:', error);
      toast.error('Failed to reschedule appointment');
    }
  }, [rescheduleAppointment, refreshAppointments, toast]);

  // Navigation handlers
  const handleTabChange = useCallback((tab) => {
    setActiveTab(tab);
    if (tab === 'manage') {
      refreshAppointments();
    }
  }, [refreshAppointments]);

  // Get appointment statistics
  const getAppointmentStats = useCallback(() => {
    if (!appointments) return { total: 0, upcoming: 0, completed: 0, cancelled: 0 };
    
    const stats = {
      total: appointments.length,
      upcoming: appointments.filter(apt => {
        const status = apt.status?.toLowerCase();
        return status === 'scheduled' || status === 'confirmed';
      }).length,
      completed: appointments.filter(apt => apt.status?.toLowerCase() === 'completed').length,
      cancelled: appointments.filter(apt => apt.status?.toLowerCase() === 'cancelled').length
    };
    
    return stats;
  }, [appointments]);

  const stats = getAppointmentStats();

  // Render tab content
  const renderTabContent = () => {
    switch (activeTab) {
      case 'overview':
        return (
          <div className="appointments-overview">
            <div className="overview-header">
              <h2>Appointments Overview</h2>
              <p>Manage your appointments and book new ones</p>
            </div>
            
            {/* Quick Stats */}
            <div className="stats-grid">
              <div className="stat-card">
                <div className="stat-icon">
                  <CalendarIcon size={24} />
                </div>
                <div className="stat-content">
                  <h3>{stats.total}</h3>
                  <p>Total Appointments</p>
                </div>
              </div>
              
              <div className="stat-card upcoming">
                <div className="stat-icon">
                  <ClockIcon size={24} />
                </div>
                <div className="stat-content">
                  <h3>{stats.upcoming}</h3>
                  <p>Upcoming</p>
                </div>
              </div>
              
              <div className="stat-card completed">
                <div className="stat-icon">
                  <CheckCircle size={24} />
                </div>
                <div className="stat-content">
                  <h3>{stats.completed}</h3>
                  <p>Completed</p>
                </div>
              </div>
              
              <div className="stat-card cancelled">
                <div className="stat-icon">
                  <XCircle size={24} />
                </div>
                <div className="stat-content">
                  <h3>{stats.cancelled}</h3>
                  <p>Cancelled</p>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="quick-actions">
              <h3>Quick Actions</h3>
              <div className="action-buttons">
                <button 
                  className="action-btn primary"
                  onClick={() => handleBookAppointment()}
                >
                  <Plus size={20} />
                  Book New Appointment
                </button>
                
                <button 
                  className="action-btn secondary"
                  onClick={() => setActiveTab('specialists')}
                >
                  <Users size={20} />
                  Find Specialists
                </button>
                
                <button 
                  className="action-btn secondary"
                  onClick={() => setActiveTab('manage')}
                >
                  <Calendar size={20} />
                  Manage Appointments
                </button>
              </div>
            </div>

            {/* Recent Appointments */}
            <div className="recent-appointments">
              <h3>Recent Appointments</h3>
              {appointmentsLoading ? (
                <div className="loading-state">
                  <ButtonLoader />
                  <p>Loading appointments...</p>
                </div>
              ) : appointmentsError ? (
                <ErrorState 
                  message="Failed to load appointments"
                  onRetry={refreshAppointments}
                />
              ) : filteredAppointments().length === 0 ? (
                <EmptyState 
                  message="No appointments found"
                  actionText="Book your first appointment"
                  action={() => handleBookAppointment()}
                />
              ) : (
                <div className="appointments-list">
                  {filteredAppointments().slice(0, 5).map((appointment) => (
                    <div key={appointment.appointment_id || appointment.id} className="appointment-item">
                      <div className="appointment-info">
                        <h4>{appointment.specialist_name}</h4>
                        <p>{appointment.specialization}</p>
                        <span className={`status ${appointment.status}`}>
                          {appointment.status}
                        </span>
                      </div>
                      <div className="appointment-actions">
                        <button 
                          className="btn-icon"
                          onClick={() => setActiveTab('manage')}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                      </div>
                    </div>
                  ))}
                  
                  {filteredAppointments().length > 5 && (
                    <button 
                      className="view-all-btn"
                      onClick={() => setActiveTab('manage')}
                    >
                      View All Appointments
                      <ChevronRight size={16} />
                    </button>
                  )}
                </div>
              )}
            </div>
          </div>
        );

      case 'book':
        return (
          <div className="booking-section">
            <div className="section-header">
              <h2>Book New Appointment</h2>
              <p>Choose a specialist and book your appointment</p>
            </div>
            
            <BookingWizard 
              darkMode={darkMode}
              onComplete={handleBookingComplete}
              selectedSpecialist={selectedSpecialist}
            />
          </div>
        );

      case 'manage':
        return (
          <div className="management-section">
            <div className="section-header">
              <h2>Manage Appointments</h2>
              <p>View, cancel, or reschedule your appointments</p>
            </div>
            
            <AppointmentsPage 
              darkMode={darkMode}
              onBookAppointment={handleBookAppointment}
            />
          </div>
        );

      case 'specialists':
        return (
          <div className="specialists-section">
            <div className="section-header">
              <h2>Find Specialists</h2>
              <p>Search and browse available specialists</p>
            </div>
            
            <FindSpecialists 
              darkMode={darkMode}
              onSpecialistSelect={handleBookAppointment}
            />
          </div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`patient-appointments-hub ${darkMode ? 'dark' : ''}`}>
      {/* Header */}
      <div className="hub-header">
        <div className="header-content">
          <h1>My Appointments</h1>
          <p>Book, manage, and track your appointments</p>
        </div>
        
        <div className="header-actions">
          {lastUpdated && (
            <span className="last-updated-text" style={{ marginRight: '12px', fontSize: '0.875rem', opacity: 0.7 }}>
              Last updated: {lastUpdated.toLocaleTimeString()}
            </span>
          )}
          <button 
            className="refresh-btn"
            onClick={handleManualRefresh}
            disabled={appointmentsLoading}
            title="Refresh appointments"
          >
            <RefreshCw size={16} className={appointmentsLoading ? 'spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      {/* Navigation Tabs */}
      <div className="hub-navigation">
        <nav className="tab-nav">
          <button 
            className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
            onClick={() => handleTabChange('overview')}
          >
            <Calendar size={18} />
            Overview
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'book' ? 'active' : ''}`}
            onClick={() => handleTabChange('book')}
          >
            <Plus size={18} />
            Book Appointment
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'manage' ? 'active' : ''}`}
            onClick={() => handleTabChange('manage')}
          >
            <Calendar size={18} />
            Manage
          </button>
          
          <button 
            className={`tab-btn ${activeTab === 'specialists' ? 'active' : ''}`}
            onClick={() => handleTabChange('specialists')}
          >
            <Users size={18} />
            Find Specialists
          </button>
        </nav>
      </div>

      {/* Main Content */}
      <div className="hub-content">
        <AnimatePresence mode="wait">
          <motion.div
            key={activeTab}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            transition={{ duration: 0.3 }}
            className="tab-content"
          >
            {renderTabContent()}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* Booking Wizard Modal */}
      {showBookingWizard && (
        <div className="modal-overlay">
          <div className="modal-content">
            <div className="modal-header">
              <h3>Book Appointment</h3>
              <button 
                className="modal-close"
                onClick={() => setShowBookingWizard(false)}
              >
                <XCircle size={20} />
              </button>
            </div>
            
            <div className="modal-body">
              <BookingWizard 
                darkMode={darkMode}
                onComplete={handleBookingComplete}
                selectedSpecialist={selectedSpecialist}
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default PatientAppointmentsHub;
