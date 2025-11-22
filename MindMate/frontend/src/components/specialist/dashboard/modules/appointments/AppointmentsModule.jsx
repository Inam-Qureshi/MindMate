import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Calendar,
  Clock,
  User,
  Mail,
  Phone,
  MapPin,
  CheckCircle,
  X as XIcon,
  AlertCircle,
  Loader,
  MessageSquare,
  Filter,
  Search,
  RefreshCw,
  Video,
  DollarSign,
  Eye,
  Download
} from 'react-feather';
import axios from 'axios';
import { TableSkeleton, AppointmentCardSkeleton, GridSkeleton } from '../../../../UI/SkeletonLoader';
import { API_URL, API_ENDPOINTS } from '../../../../../config/api';
import apiClient from '../../../../../utils/axiosConfig';
import { useToast } from '../../../../UI/Toast';
import { APIErrorHandler } from '../../../../../utils/errorHandler';
import './AppointmentsModule.css';

const AppointmentsModule = ({ darkMode, activeSidebarItem }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [selectedFilter, setSelectedFilter] = useState(activeSidebarItem || 'all');
  const [searchQuery, setSearchQuery] = useState('');
  
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showModal, setShowModal] = useState(false);
  const [modalAction, setModalAction] = useState(null); // 'complete', 'cancel', 'reschedule'
  const [showPaymentDetails, setShowPaymentDetails] = useState(false);
  const [selectedPaymentAppointment, setSelectedPaymentAppointment] = useState(null);
  const [rejectionReason, setRejectionReason] = useState('');
  const [processing, setProcessing] = useState(false);
  const [pendingPayments, setPendingPayments] = useState([]);
  const [showPendingPayments, setShowPendingPayments] = useState(false);
  const [imageLoadError, setImageLoadError] = useState(false);
  const [receiptImageUrl, setReceiptImageUrl] = useState(null);
  
  const toast = useToast();
  
  // Modal form data
  const [modalData, setModalData] = useState({
    scheduled_date: '',
    scheduled_time: '',
    response_message: '',
    alternative_suggestions: '',
    new_slot_id: ''
  });

  useEffect(() => {
    loadAppointments();
    loadPendingPayments();
  }, [selectedFilter, activeSidebarItem]);

  // Update filter when sidebar item changes
  useEffect(() => {
    if (activeSidebarItem && activeSidebarItem !== selectedFilter) {
      setSelectedFilter(activeSidebarItem);
    }
  }, [activeSidebarItem]);

  // Real-time polling for appointment updates (every 30 seconds)
  useEffect(() => {
    const pollingInterval = setInterval(() => {
      if (!loading) { // Only poll if not currently loading
        loadAppointments();
      }
    }, 30000); // Poll every 30 seconds

    return () => clearInterval(pollingInterval);
  }, [selectedFilter, loading]);


  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      if (!token) {
        setError("Authentication required. Please log in again.");
        return;
      }

      const headers = { Authorization: `Bearer ${token}` };

      // Use API_ENDPOINTS for consistency
      const params = new URLSearchParams();
      if (selectedFilter !== 'all') {
        params.append('status_filter', selectedFilter);
      }
      params.append('limit', '100');
      params.append('offset', '0');

      const response = await apiClient.get(
        `${API_ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS}?${params}`
      );

      // Handle both array and object response formats
      const appointmentsData = Array.isArray(response.data) 
        ? response.data 
        : (response.data.appointments || response.data || []);
      
      setAppointments(appointmentsData);
    } catch (err) {
      console.error("Error loading appointments:", err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const handleFilterChange = (filter) => {
    setSelectedFilter(filter);
  };

  const handleViewDetails = (appointment) => {
    setSelectedAppointment(appointment);
  };

  const handleOpenModal = (appointment, action) => {
    setSelectedAppointment(appointment);
    setModalAction(action);
    
    if (action === 'complete') {
      setModalData({
        scheduled_date: '',
        scheduled_time: '',
        response_message: '',
        alternative_suggestions: '',
        new_slot_id: ''
      });
    } else if (action === 'reschedule') {
      setModalData({
        scheduled_date: '',
        scheduled_time: '',
        response_message: '',
        alternative_suggestions: '',
        new_slot_id: ''
      });
    } else {
      setModalData({
        scheduled_date: appointment.preferred_date || '',
        scheduled_time: appointment.preferred_time || '',
        response_message: '',
        alternative_suggestions: '',
        new_slot_id: ''
      });
    }
    setShowModal(true);
  };

  const handleCloseModal = () => {
    setShowModal(false);
    setSelectedAppointment(null);
    setModalAction(null);
    setModalData({
      scheduled_date: '',
      scheduled_time: '',
      response_message: '',
      alternative_suggestions: '',
      new_slot_id: ''
    });
  };

  const handleModalSubmit = async () => {
    try {
      setLoading(true);
      setError(null);

      const token = localStorage.getItem('access_token');
      const headers = token ? { Authorization: `Bearer ${token}` } : {};

      if (modalAction === 'complete') {
        const response = await apiClient.post(
          API_ENDPOINTS.APPOINTMENTS.COMPLETE(selectedAppointment.id),
          {
            notes: modalData.response_message || ''
          }
        );
        toast.success(response.data?.message || 'Appointment marked as completed');
      } else if (modalAction === 'cancel') {
        const response = await apiClient.put(
          API_ENDPOINTS.APPOINTMENTS.CANCEL(selectedAppointment.id),
          {
            reason: modalData.response_message || 'Cancelled by specialist'
          }
        );
        toast.success(response.data?.message || 'Appointment cancelled');
      }

      handleCloseModal();
      loadAppointments();
      loadPendingPayments();
    } catch (err) {
      console.error("Error processing appointment:", err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      toast.error(errorInfo.message);
      setError(errorInfo.message);
    } finally {
      setLoading(false);
    }
  };

  const loadPendingPayments = async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.APPOINTMENTS.PENDING_PAYMENTS);
      // Backend returns: { pending_payments: [...], total: number }
      setPendingPayments(response.data?.pending_payments || []);
    } catch (err) {
      console.error("Error loading pending payments:", err);
      // Don't show error for pending payments, just log it
      setPendingPayments([]);
    }
  };

  const handleReschedule = async (appointmentId, newSlotId) => {
    try {
      setProcessing(true);
      const response = await apiClient.put(
        API_ENDPOINTS.APPOINTMENTS.RESCHEDULE(appointmentId),
        {
          new_slot_id: newSlotId
        }
      );
      toast.success(response.data?.message || 'Appointment rescheduled successfully');
      loadAppointments();
      handleCloseModal();
    } catch (err) {
      console.error("Error rescheduling appointment:", err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'appointment');
      toast.error(errorInfo.message);
    } finally {
      setProcessing(false);
    }
  };

  // Filter appointments by type and status
  const filteredAppointments = appointments.filter(apt => {
    const status = apt.status?.toLowerCase() || '';
    
    // Filter by status
    if (selectedFilter !== 'all') {
      if (selectedFilter === 'pending' && status !== 'pending' && status !== 'pending_approval') {
        return false;
      }
      if (selectedFilter === 'scheduled' && status !== 'scheduled' && status !== 'confirmed') {
        return false;
      }
      if (selectedFilter === 'completed' && status !== 'completed') {
        return false;
      }
      if (selectedFilter !== 'pending' && selectedFilter !== 'scheduled' && selectedFilter !== 'completed') {
        if (status !== selectedFilter) {
          return false;
        }
      }
    }
    
    // Filter by search query
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      return (
        apt.patient_name?.toLowerCase().includes(query) ||
        apt.presenting_concern?.toLowerCase().includes(query) ||
        apt.specialist_name?.toLowerCase().includes(query)
      );
    }
    
    return true;
  });

  // Separate appointments by type
  const onlineAppointments = filteredAppointments.filter(apt => 
    apt.appointment_type === 'online' || apt.appointment_type === 'virtual'
  );
  const inPersonAppointments = filteredAppointments.filter(apt => 
    apt.appointment_type === 'in_person' || apt.appointment_type === 'in-person'
  );

  // Format date helper
  const formatDate = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      });
    } catch {
      return 'N/A';
    }
  };

  // Format time helper
  const formatTime = (dateString) => {
    if (!dateString) return 'N/A';
    try {
      const date = new Date(dateString);
      return date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      });
    } catch {
      return 'N/A';
    }
  };

  // Handle payment confirmation
  const handleConfirmPayment = async (appointmentId) => {
    try {
      setProcessing(true);
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.CONFIRM_PAYMENT(appointmentId)
      );
      if (response.data && response.data.success) {
        toast.success('Payment confirmed and appointment approved');
        setShowPaymentDetails(false);
        setSelectedPaymentAppointment(null);
        loadAppointments();
      }
    } catch (err) {
      console.error('Error confirming payment:', err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
      toast.error(errorInfo.message);
    } finally {
      setProcessing(false);
    }
  };

  // Handle payment rejection
  const handleRejectPayment = async (appointmentId) => {
    if (!rejectionReason.trim()) {
      toast.error('Please provide a reason for rejection');
      return;
    }
    try {
      setProcessing(true);
      const response = await apiClient.post(
        API_ENDPOINTS.APPOINTMENTS.REJECT_PAYMENT(appointmentId),
        { reason: rejectionReason }
      );
      if (response.data && response.data.success) {
        toast.success('Payment rejected and appointment cancelled');
        setShowPaymentDetails(false);
        setSelectedPaymentAppointment(null);
        setRejectionReason('');
        setModalAction(null);
        loadAppointments();
      }
    } catch (err) {
      console.error('Error rejecting payment:', err);
      // Show backend error message if available, otherwise use error handler
      const errorMessage = err.response?.data?.detail || err.response?.data?.message;
      if (errorMessage) {
        toast.error(errorMessage);
      } else {
        const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
        toast.error(errorInfo.message);
      }
    } finally {
      setProcessing(false);
    }
  };

  // Helper function to extract filename from receipt path
  const getReceiptFilename = (receiptPath) => {
    if (!receiptPath) return null;
    
    // If it's a full URL, extract the filename from the path
    if (receiptPath.startsWith('http://') || receiptPath.startsWith('https://')) {
      try {
        const url = new URL(receiptPath);
        const pathParts = url.pathname.split('/');
        return pathParts[pathParts.length - 1];
      } catch {
        // Fallback: extract from path string
        const parts = receiptPath.split('/');
        return parts[parts.length - 1];
      }
    }
    
    // If it's a path like /media/payment_receipts/filename.jpg, extract filename
    if (receiptPath.includes('/')) {
      const parts = receiptPath.split('/');
      return parts[parts.length - 1];
    }
    
    // If it's just a filename, return as is
    return receiptPath;
  };

  // Helper function to get API endpoint for receipt
  const getReceiptApiEndpoint = (receiptPath) => {
    const filename = getReceiptFilename(receiptPath);
    if (!filename) return null;
    
    // Use the authenticated API endpoint instead of direct media access
    // This endpoint has proper CORS headers and authentication
    return API_ENDPOINTS.APPOINTMENTS.GET_PAYMENT_RECEIPT 
      ? API_ENDPOINTS.APPOINTMENTS.GET_PAYMENT_RECEIPT(filename)
      : `/api/appointments/payment-receipt/${filename}`;
  };

  // Load receipt image as blob through API client to avoid CORS issues
  // Note: Cleanup is handled by useEffect, so this function only loads the image
  const loadReceiptImage = async (receiptPath) => {
    try {
      if (!receiptPath) {
        setReceiptImageUrl(null);
        setImageLoadError(true);
        return;
      }

      // Get the API endpoint for the receipt (uses authenticated endpoint)
      const apiEndpoint = getReceiptApiEndpoint(receiptPath);
      if (!apiEndpoint) {
        setReceiptImageUrl(null);
        setImageLoadError(true);
        return;
      }

      // Load image as blob through API client (with authentication)
      // This endpoint has proper CORS headers and authentication
      const response = await apiClient.get(apiEndpoint, {
        responseType: 'blob',
        timeout: 30000, // 30 second timeout
        validateStatus: (status) => status >= 200 && status < 300
      });

      if (response.data && response.data instanceof Blob) {
        // Verify it's actually an image/blob
        if (response.data.size === 0) {
          throw new Error('Empty file received');
        }
        
        // Create object URL from blob
        const blobUrl = window.URL.createObjectURL(response.data);
        setReceiptImageUrl(blobUrl);
        setImageLoadError(false);
      } else {
        throw new Error('Invalid response data received');
      }
    } catch (err) {
      console.error('Error loading receipt image:', err);
      // Only set error if it's a real error (not a cancellation)
      if (err.name !== 'CanceledError' && err.code !== 'ECONNABORTED') {
        setImageLoadError(true);
        setReceiptImageUrl(null);
      }
      // Re-throw to let caller handle if needed
      throw err;
    }
  };

  // Helper function to check if receipt is an image
  const isImageFile = (receiptPath) => {
    if (!receiptPath) return false;
    const imageExtensions = ['.jpg', '.jpeg', '.png', '.gif', '.webp'];
    const lowerPath = receiptPath.toLowerCase();
    return imageExtensions.some(ext => lowerPath.endsWith(ext));
  };

  // Handle download receipt image
  const handleDownloadReceipt = async (receiptPath) => {
    try {
      if (!receiptPath) {
        toast.error('Invalid receipt path');
        return;
      }

      // Get the API endpoint for the receipt (uses authenticated endpoint)
      const apiEndpoint = getReceiptApiEndpoint(receiptPath);
      if (!apiEndpoint) {
        toast.error('Invalid receipt path');
        return;
      }

      // Use apiClient to fetch the image with authentication
      // This endpoint has proper CORS headers and authentication
      const response = await apiClient.get(apiEndpoint, {
        responseType: 'blob'
      });

      if (!response.data) {
        throw new Error('Failed to download image');
      }

      // Create blob URL and trigger download
      const blob = response.data;
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      
      // Extract filename from path
      const filename = getReceiptFilename(receiptPath) || 'payment-receipt';
      link.download = filename;
      
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      toast.success('Receipt downloaded successfully');
    } catch (err) {
      console.error('Error downloading receipt:', err);
      const errorInfo = APIErrorHandler.getErrorMessage(err, 'payment');
      toast.error(errorInfo.message || 'Failed to download receipt. Please try again.');
    }
  };

  // Load receipt image when payment details modal opens
  useEffect(() => {
    // Track if component is mounted to prevent state updates after unmount
    let isMounted = true;
    let currentBlobUrl = null;
    
    if (showPaymentDetails && selectedPaymentAppointment?.payment_receipt) {
      // Reset image error state when modal opens
      if (isMounted) {
        setImageLoadError(false);
      }
      
      // Load image if it's an image file
      if (isImageFile(selectedPaymentAppointment.payment_receipt)) {
        // Clean up previous blob URL BEFORE loading new one
        setReceiptImageUrl(prevUrl => {
          if (prevUrl) {
            window.URL.revokeObjectURL(prevUrl);
          }
          return null;
        });
        
        // Load new image after cleanup (async, but we track it)
        loadReceiptImage(selectedPaymentAppointment.payment_receipt).then(() => {
          // Image loaded successfully (state is set in loadReceiptImage)
        }).catch(err => {
          console.error('Error in loadReceiptImage:', err);
          if (isMounted) {
            setImageLoadError(true);
          }
        });
      } else {
        // Clean up any existing blob URL for non-image files
        setReceiptImageUrl(prevUrl => {
          if (prevUrl) {
            window.URL.revokeObjectURL(prevUrl);
          }
          return null;
        });
      }
    } else {
      // Clean up blob URL when modal closes
      setReceiptImageUrl(prevUrl => {
        if (prevUrl) {
          window.URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    }
    
    // Cleanup on unmount or dependency change
    return () => {
      isMounted = false;
      setReceiptImageUrl(prevUrl => {
        if (prevUrl) {
          window.URL.revokeObjectURL(prevUrl);
        }
        return null;
      });
    };
  }, [showPaymentDetails, selectedPaymentAppointment?.payment_receipt]);

  const getStatusBadge = (status) => {
    const badges = {
      pending: { label: 'Pending', color: '#f59e0b', bg: '#fef3c7' },
      pending_approval: { label: 'Pending Approval', color: '#f59e0b', bg: '#fef3c7' },
      scheduled: { label: 'Scheduled', color: '#3b82f6', bg: '#dbeafe' },
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

  return (
    <div className={`appointments-module h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>My Appointments</h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>Manage your appointment requests and schedule</p>
        </div>
        <div className="flex items-center space-x-2">
          {pendingPayments.length > 0 && (
            <button 
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                darkMode ? 'bg-yellow-600 hover:bg-yellow-700 text-white' : 'bg-yellow-500 hover:bg-yellow-600 text-white'
              }`}
              onClick={() => setShowPendingPayments(!showPendingPayments)}
            >
              <DollarSign size={20} />
              <span>Pending Payments ({pendingPayments.length})</span>
            </button>
          )}
          <button 
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
            }`}
            onClick={() => {
              loadAppointments();
              loadPendingPayments();
            }} 
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className={`flex items-center justify-between p-4 rounded-lg mb-6 ${
          darkMode ? 'bg-red-900/20 border border-red-800 text-red-400' : 'bg-red-50 border border-red-200 text-red-800'
        }`}>
          <div className="flex items-center space-x-2">
            <AlertCircle size={20} />
            <span>{error}</span>
          </div>
          <button onClick={() => setError(null)} className={darkMode ? 'hover:text-red-300' : 'hover:text-red-600'}>
            <XIcon size={16} />
          </button>
        </div>
      )}

      {/* Filters and Search */}
      <div className="mb-6">
          <div className="flex flex-wrap gap-2 mb-4">
            {['all', 'pending', 'scheduled', 'completed', 'cancelled'].map((filter) => (
              <button
                key={filter}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  selectedFilter === filter
                    ? darkMode
                      ? 'bg-emerald-600 text-white'
                      : 'bg-emerald-600 text-white'
                    : darkMode
                    ? 'bg-gray-800 text-gray-300 hover:bg-gray-700'
                    : 'bg-white text-gray-700 hover:bg-gray-50 border border-gray-200'
                }`}
                onClick={() => handleFilterChange(filter)}
              >
                {filter.charAt(0).toUpperCase() + filter.slice(1)}
              </button>
            ))}
          </div>

          <div className="relative">
            <Search size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search by patient name or concern..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg ${
                darkMode 
                  ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 border'
              }`}
            />
          </div>
        </div>

          {/* Appointment Type Sections */}
          <div className="appointment-sections">
            {/* Online Appointments Section */}
            <div className="appointment-section">
              <div className="section-header">
                <Video size={20} />
                <h2>Online Appointments ({onlineAppointments.length})</h2>
              </div>
              
              {loading && onlineAppointments.length === 0 ? (
                <div className="appointments-list">
                  <GridSkeleton count={2} columns={1} ItemComponent={AppointmentCardSkeleton} />
                </div>
              ) : onlineAppointments.length === 0 ? (
                <div className="empty-state-small">
                  <Video size={32} />
                  <p>No online appointments</p>
                </div>
              ) : (
                <div className="appointments-list">
                  <AnimatePresence>
                    {onlineAppointments.map((appointment) => (
                      <motion.div
                        key={appointment.id || appointment.appointment_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`appointment-card ${appointment.status}`}
                      >
                        <div className="appointment-header">
                          <div>
                            <h3>{appointment.patient_name || 'Unknown Patient'}</h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="appointment-date">
                            <Calendar size={16} />
                            {formatDate(appointment.scheduled_start || appointment.created_at)}
                          </div>
                        </div>

                        <div className="appointment-details">
                          <p className="concern">{appointment.presenting_concern || 'No concern specified'}</p>
                          
                          <div className="appointment-meta">
                            <span className="meta-item">
                              <Clock size={14} />
                              {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)}
                            </span>
                            <span className="meta-item">
                              <DollarSign size={14} />
                              Rs. {appointment.fee || '0.00'}
                            </span>
                            {appointment.payment_status && (
                              <span className={`meta-item payment-status ${appointment.payment_status}`}>
                                Payment: {appointment.payment_status}
                              </span>
                            )}
                          </div>

                          {appointment.meeting_link && (
                            <div className="meeting-link">
                              <Video size={14} />
                              <a href={appointment.meeting_link} target="_blank" rel="noopener noreferrer">
                                Join Meeting
                              </a>
                            </div>
                          )}
                        </div>

                        {/* Show payment details button for pending approval online appointments */}
                        {(appointment.status === 'pending_approval' || appointment.payment_status === 'unpaid') && 
                         (appointment.appointment_type === 'online' || appointment.appointment_type === 'virtual') && (
                          <div className="appointment-actions">
                            <button
                              className="btn-payment-details"
                              onClick={() => {
                                setSelectedPaymentAppointment(appointment);
                                setImageLoadError(false);
                                // Let useEffect handle cleanup and loading
                                setShowPaymentDetails(true);
                              }}
                            >
                              <Eye size={18} />
                              View Payment Details
                            </button>
                          </div>
                        )}

                        {/* Mark as Completed button for scheduled/confirmed online appointments */}
                        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') &&
                         (appointment.appointment_type === 'online' || appointment.appointment_type === 'virtual') && (
                          <div className="appointment-actions">
                            <button
                              className="btn-complete"
                              onClick={() => handleOpenModal(appointment, 'complete')}
                            >
                              <CheckCircle size={18} />
                              Mark as Completed
                            </button>
                          </div>
                        )}

                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>

            {/* In-Person Appointments Section */}
            <div className="appointment-section">
              <div className="section-header">
                <MapPin size={20} />
                <h2>In-Person Appointments ({inPersonAppointments.length})</h2>
              </div>
              
              {loading && inPersonAppointments.length === 0 ? (
                <div className="appointments-list">
                  <GridSkeleton count={2} columns={1} ItemComponent={AppointmentCardSkeleton} />
                </div>
              ) : inPersonAppointments.length === 0 ? (
                <div className="empty-state-small">
                  <MapPin size={32} />
                  <p>No in-person appointments</p>
                </div>
              ) : (
                <div className="appointments-list">
                  <AnimatePresence>
                    {inPersonAppointments.map((appointment) => (
                      <motion.div
                        key={appointment.id || appointment.appointment_id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        exit={{ opacity: 0, y: -20 }}
                        className={`appointment-card ${appointment.status}`}
                      >
                        <div className="appointment-header">
                          <div>
                            <h3>{appointment.patient_name || 'Unknown Patient'}</h3>
                            {getStatusBadge(appointment.status)}
                          </div>
                          <div className="appointment-date">
                            <Calendar size={16} />
                            {formatDate(appointment.scheduled_start || appointment.created_at)}
                          </div>
                        </div>

                        <div className="appointment-details">
                          <p className="concern">{appointment.presenting_concern || 'No concern specified'}</p>
                          
                          <div className="appointment-meta">
                            <span className="meta-item">
                              <Clock size={14} />
                              {formatTime(appointment.scheduled_start)} - {formatTime(appointment.scheduled_end)}
                            </span>
                            <span className="meta-item">
                              <DollarSign size={14} />
                              Rs. {appointment.fee || '0.00'}
                            </span>
                          </div>
                        </div>

                        {/* Cancel action for pending appointments */}
                        {(appointment.status === 'pending' || appointment.status === 'pending_approval') && (
                          <div className="appointment-actions">
                            <button
                              className="btn-reject"
                              onClick={() => handleOpenModal(appointment, 'cancel')}
                            >
                              <XIcon size={18} />
                              Cancel
                            </button>
                          </div>
                        )}

                        {(appointment.status === 'scheduled' || appointment.status === 'confirmed') && (
                          <div className="appointment-actions">
                            <button
                              className="btn-complete"
                              onClick={() => handleOpenModal(appointment, 'complete')}
                            >
                              <CheckCircle size={18} />
                              Mark as Completed
                            </button>
                          </div>
                        )}
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>
              )}
            </div>
      </div>

      {/* Modal for Approve/Reject */}
      <AnimatePresence>
        {showModal && selectedAppointment && (
          <div className="modal-overlay" onClick={handleCloseModal}>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className="modal-content"
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  {modalAction === 'complete' ? 'Mark as Completed' : 
                   modalAction === 'cancel' ? 'Cancel Appointment' : 
                   modalAction === 'reschedule' ? 'Reschedule Appointment' : 
                   'Appointment Action'}
                </h2>
                <button className="close-btn" onClick={handleCloseModal}>
                  <XIcon size={24} />
                </button>
              </div>

              <div className="modal-body">
                <div className="patient-info">
                  <h4>Patient: {selectedAppointment.patient_name || 'Unknown Patient'}</h4>
                  <p><strong>Concern:</strong> {selectedAppointment.presenting_concern || 'No concern specified'}</p>
                </div>

                {modalAction === 'complete' && (
                  <div className="modal-form">
                    <div className="completion-message">
                      <CheckCircle size={48} style={{ color: '#10b981', marginBottom: '16px' }} />
                      <h4>Mark this appointment as completed?</h4>
                      <p>This will mark the appointment with {selectedAppointment.patient_name || 'the patient'} as completed.</p>
                      <div className="form-group" style={{ marginTop: '20px' }}>
                        <label>Completion Notes (Optional)</label>
                        <textarea
                          value={modalData.response_message}
                          onChange={(e) => setModalData({ ...modalData, response_message: e.target.value })}
                          placeholder="Add any notes about the appointment..."
                          rows={3}
                        />
                      </div>
                    </div>
                  </div>
                )}

                {modalAction === 'cancel' && (
                  <div className="modal-form">
                    <div className="form-group">
                      <label>Reason for Cancellation *</label>
                      <textarea
                        value={modalData.response_message}
                        onChange={(e) => setModalData({ ...modalData, response_message: e.target.value })}
                        placeholder="Please explain why you are cancelling this appointment..."
                        rows={4}
                        required
                      />
                    </div>
                  </div>
                )}

                {modalAction === 'reschedule' && (
                  <div className="modal-form">
                    <div className="form-group">
                      <label>New Slot ID *</label>
                      <input
                        type="text"
                        value={modalData.new_slot_id || ''}
                        onChange={(e) => setModalData({ ...modalData, new_slot_id: e.target.value })}
                        placeholder="Enter the new slot ID to reschedule to..."
                        required
                      />
                      <small>Note: You need to select an available slot first. This feature will be enhanced with slot selection UI.</small>
                    </div>
                    <div className="form-group">
                      <label>Message to Patient (Optional)</label>
                      <textarea
                        value={modalData.response_message}
                        onChange={(e) => setModalData({ ...modalData, response_message: e.target.value })}
                        placeholder="Optional message to the patient about the reschedule..."
                        rows={3}
                      />
                    </div>
                  </div>
                )}
              </div>

              <div className="modal-footer">
                <button className="btn-secondary" onClick={handleCloseModal}>
                  Cancel
                </button>
                <button
                  className={modalAction === 'complete' ? 'btn-complete' : modalAction === 'cancel' ? 'btn-reject' : 'btn-secondary'}
                  onClick={() => {
                    if (modalAction === 'reschedule') {
                      if (modalData.new_slot_id) {
                        handleReschedule(selectedAppointment.id, modalData.new_slot_id);
                      } else {
                        toast.error('Please enter a new slot ID');
                      }
                    } else {
                      handleModalSubmit();
                    }
                  }}
                  disabled={loading || processing || (modalAction === 'cancel' && !modalData.response_message) || (modalAction === 'reschedule' && !modalData.new_slot_id)}
                >
                  {loading || processing ? (
                    <>
                      <Loader size={16} className="spinning" />
                      Processing...
                    </>
                  ) : (
                    modalAction === 'complete' ? 'Mark Completed' : 
                    modalAction === 'cancel' ? 'Confirm Cancellation' :
                    modalAction === 'reschedule' ? 'Confirm Reschedule' :
                    'Confirm'
                  )}
                </button>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Payment Details Modal */}
      <AnimatePresence>
        {showPaymentDetails && selectedPaymentAppointment && (
          <div className="modal-overlay" onClick={() => {
            if (!processing) {
              setShowPaymentDetails(false);
              setSelectedPaymentAppointment(null);
              setRejectionReason('');
              setModalAction(null);
              setImageLoadError(false);
              // useEffect will handle blob URL cleanup
            }
          }}>
            <motion.div
              className="modal-content payment-details-modal"
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="modal-header">
                <h2>
                  <DollarSign size={20} />
                  Payment Details
                </h2>
                <button className="modal-close" onClick={() => {
                  if (!processing) {
                    setShowPaymentDetails(false);
                    setSelectedPaymentAppointment(null);
                    setRejectionReason('');
                    setModalAction(null);
                    setImageLoadError(false);
                    // useEffect will handle blob URL cleanup
                  }
                }}>
                  <XIcon size={24} />
                </button>
              </div>

              <div className="payment-details-content">
                <div className="patient-info-card">
                  <h3>
                    <User size={18} />
                    {selectedPaymentAppointment.patient_name || 'Unknown Patient'}
                  </h3>
                  <p className="patient-id">Patient ID: {selectedPaymentAppointment.patient_id || 'N/A'}</p>
                </div>

                <div className="payment-info-grid">
                  <div className="info-item">
                    <label>Appointment Date</label>
                    <p>{formatDate(selectedPaymentAppointment.scheduled_start || selectedPaymentAppointment.created_at)}</p>
                  </div>
                  <div className="info-item">
                    <label>Appointment Time</label>
                    <p>
                      {formatTime(selectedPaymentAppointment.scheduled_start || selectedPaymentAppointment.created_at)} - 
                      {formatTime(selectedPaymentAppointment.scheduled_end)}
                    </p>
                  </div>
                  <div className="info-item">
                    <label>Fee Amount</label>
                    <p className="fee-amount">Rs. {selectedPaymentAppointment.fee?.toFixed(2) || '0.00'}</p>
                  </div>
                  <div className="info-item">
                    <label>Payment Method</label>
                    <p>{selectedPaymentAppointment.payment_method_id || 'N/A'}</p>
                  </div>
                  <div className="info-item full-width">
                    <label>Payment Receipt</label>
                    {selectedPaymentAppointment.payment_receipt ? (
                      isImageFile(selectedPaymentAppointment.payment_receipt) ? (
                        receiptImageUrl && !imageLoadError ? (
                          <div className="receipt-image-container">
                            <div className="receipt-image-wrapper">
                              <img
                                src={receiptImageUrl}
                                alt="Payment Receipt"
                                className="receipt-image"
                                onError={() => setImageLoadError(true)}
                              />
                            </div>
                            <button
                              className="btn-download-receipt"
                              onClick={() => handleDownloadReceipt(selectedPaymentAppointment.payment_receipt)}
                              title="Download Receipt"
                            >
                              <Download size={16} />
                              Download Receipt
                            </button>
                          </div>
                        ) : imageLoadError ? (
                          <div className="receipt-text-container">
                            <p className="transaction-id">
                              Failed to load image: {selectedPaymentAppointment.payment_receipt}
                            </p>
                            <button
                              className="btn-download-receipt"
                              onClick={() => handleDownloadReceipt(selectedPaymentAppointment.payment_receipt)}
                              title="Download Receipt"
                            >
                              <Download size={16} />
                              Download Receipt
                            </button>
                          </div>
                        ) : (
                          <div className="receipt-image-container">
                            <div className="receipt-image-wrapper" style={{ minHeight: '200px', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                              <Loader size={24} className="spinning" style={{ color: '#6b7280' }} />
                              <span style={{ marginLeft: '0.5rem', color: '#6b7280' }}>Loading image...</span>
                            </div>
                          </div>
                        )
                      ) : (
                        <div className="receipt-text-container">
                          <p className="transaction-id">{selectedPaymentAppointment.payment_receipt}</p>
                          <button
                            className="btn-download-receipt"
                            onClick={() => handleDownloadReceipt(selectedPaymentAppointment.payment_receipt)}
                            title="Download Receipt"
                          >
                            <Download size={16} />
                            Download Receipt
                          </button>
                        </div>
                      )
                    ) : (
                      <p className="transaction-id">N/A</p>
                    )}
                  </div>
                  <div className="info-item full-width">
                    <label>Payment Status</label>
                    <p className={`payment-status-badge ${selectedPaymentAppointment.payment_status || 'unpaid'}`}>
                      {(selectedPaymentAppointment.payment_status || 'unpaid').toUpperCase()}
                    </p>
                  </div>
                </div>

                {selectedPaymentAppointment.presenting_concern && (
                  <div className="concern-section">
                    <h4>Patient Concern</h4>
                    <p>{selectedPaymentAppointment.presenting_concern}</p>
                  </div>
                )}

                {selectedPaymentAppointment.request_message && (
                  <div className="message-section">
                    <h4>Patient Notes</h4>
                    <p>{selectedPaymentAppointment.request_message}</p>
                  </div>
                )}

                {/* Rejection Reason Input (shown when reject button is clicked) */}
                {modalAction === 'reject' && (
                  <div className="rejection-reason-section">
                    <label>Reason for Rejection *</label>
                    <textarea
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Please provide a reason for rejecting this payment..."
                      rows={4}
                      className="rejection-textarea"
                    />
                  </div>
                )}
              </div>

              <div className="payment-modal-actions">
                {modalAction !== 'reject' ? (
                  <>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        if (!processing) {
                          setShowPaymentDetails(false);
                          setSelectedPaymentAppointment(null);
                          setRejectionReason('');
                          setModalAction(null);
                          setImageLoadError(false);
                          // useEffect will handle blob URL cleanup
                        }
                      }}
                      disabled={processing}
                    >
                      Cancel
                    </button>
                    <button
                      className="btn-reject"
                      onClick={() => setModalAction('reject')}
                      disabled={processing}
                    >
                      <XIcon size={16} />
                      Reject Payment
                    </button>
                    <button
                      className="btn-confirm"
                      onClick={() => handleConfirmPayment(selectedPaymentAppointment.id || selectedPaymentAppointment.appointment_id)}
                      disabled={processing}
                    >
                      {processing ? (
                        <>
                          <Loader size={16} className="spinning" />
                          Confirming...
                        </>
                      ) : (
                        <>
                          <CheckCircle size={16} />
                          Confirm Payment
                        </>
                      )}
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      className="btn-cancel"
                      onClick={() => {
                        setModalAction(null);
                        setRejectionReason('');
                      }}
                      disabled={processing}
                    >
                      Back
                    </button>
                    <button
                      className="btn-confirm-reject"
                      onClick={() => handleRejectPayment(selectedPaymentAppointment.id || selectedPaymentAppointment.appointment_id)}
                      disabled={processing || !rejectionReason.trim()}
                    >
                      {processing ? (
                        <>
                          <Loader size={16} className="spinning" />
                          Rejecting...
                        </>
                      ) : (
                        <>
                          <XIcon size={16} />
                          Confirm Rejection
                        </>
                      )}
                    </button>
                  </>
                )}
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Pending Payments Section */}
      {showPendingPayments && pendingPayments.length > 0 && (
        <div className={`mt-6 p-4 rounded-lg ${darkMode ? 'bg-gray-800' : 'bg-white border border-gray-200'}`}>
          <h2 className={`text-xl font-bold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            Pending Payments ({pendingPayments.length})
          </h2>
          <div className="space-y-4">
            {pendingPayments.map((payment) => (
              <div
                key={payment.id}
                className={`p-4 rounded-lg ${darkMode ? 'bg-gray-700' : 'bg-gray-50 border border-gray-200'}`}
              >
                <div className="flex justify-between items-start">
                  <div>
                    <h3 className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                      {payment.patient_name || 'Unknown Patient'}
                    </h3>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      {formatDate(payment.scheduled_start)} at {formatTime(payment.scheduled_start)}
                    </p>
                    <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                      Fee: Rs. {payment.fee?.toFixed(2) || '0.00'}
                    </p>
                    {payment.payment_receipt && (
                      <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                        Receipt: {payment.payment_receipt}
                      </p>
                    )}
                  </div>
                  <div className="flex space-x-2">
                    <button
                      className="px-3 py-1 text-sm rounded bg-emerald-600 text-white hover:bg-emerald-700"
                      onClick={() => {
                        setSelectedPaymentAppointment(payment);
                        setImageLoadError(false);
                        // Let useEffect handle cleanup and loading
                        setShowPaymentDetails(true);
                      }}
                    >
                      View Details
                    </button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentsModule;
