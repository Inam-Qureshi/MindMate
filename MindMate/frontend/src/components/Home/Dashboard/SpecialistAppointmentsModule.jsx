import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { 
  Calendar, 
  Clock, 
  User, 
  MapPin, 
  Phone, 
  Video, 
  Search, 
  Filter, 
  Eye, 
  X, 
  Loader, 
  AlertCircle, 
  CheckCircle, 
  Info,
  ChevronDown,
  Edit3,
  Trash2,
  MessageCircle,
  Star,
  DollarSign,
  FileText
} from 'react-feather';
import { API_URL, API_ENDPOINTS } from '../../../config/api';
import { ROUTES } from '../../../config/routes';

// ApiManager for request deduplication
class ApiManager {
  constructor() {
    this.pendingRequests = new Map();
  }

  async deduplicatedRequest(key, requestFn) {
    if (this.pendingRequests.has(key)) {
      return this.pendingRequests.get(key);
    }

    const promise = requestFn().finally(() => {
      this.pendingRequests.delete(key);
    });

    this.pendingRequests.set(key, promise);
    return promise;
  }
}

const SpecialistAppointmentsModule = ({ darkMode, activeSidebarItem }) => {
  const navigate = useNavigate();
  // State management
  const [appointments, setAppointments] = useState([]);
  const [filteredAppointments, setFilteredAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [typeFilter, setTypeFilter] = useState("all");
  const [sortBy, setSortBy] = useState("scheduled_start");
  const [sortOrder, setSortOrder] = useState("asc");
  const [showFilters, setShowFilters] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [actionLoading, setActionLoading] = useState(false);
  const [notification, setNotification] = useState(null);
  const [expandedAppointment, setExpandedAppointment] = useState(null);

  const apiManager = useRef(new ApiManager());

  // Load appointments on component mount
  useEffect(() => {
    loadAppointments();
  }, [activeSidebarItem]);

  // Filter and sort appointments when dependencies change
  useEffect(() => {
    filterAndSortAppointments();
  }, [appointments, searchQuery, statusFilter, typeFilter, sortBy, sortOrder]);

  // Auto-hide notifications
  useEffect(() => {
    if (notification) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [notification]);

  // Load appointments from API
  const loadAppointments = async () => {
    try {
      setLoading(true);
      setError(null);

      const result = await apiManager.current.deduplicatedRequest(
        'appointments_list',
        async () => {
          const token = localStorage.getItem("access_token");
          const response = await axios.get(`${API_URL}${API_ENDPOINTS.APPOINTMENTS.MY_APPOINTMENTS}`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          return response.data;
        }
      );

      setAppointments(result.appointments || []);
    } catch (error) {
      console.error("Error loading appointments:", error);
      setError("Failed to load appointments. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  // Filter and sort appointments
  const filterAndSortAppointments = () => {
    let filtered = [...appointments];

    // Apply search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(apt => 
        apt.specialist_name?.toLowerCase().includes(query) ||
        apt.specialist_type?.toLowerCase().includes(query) ||
        apt.notes?.toLowerCase().includes(query)
      );
    }

    // Apply status filter
    if (statusFilter !== "all") {
      filtered = filtered.filter(apt => apt.status?.toLowerCase() === statusFilter.toLowerCase());
    }

    // Apply type filter
    if (typeFilter !== "all") {
      filtered = filtered.filter(apt => apt.appointment_type?.toLowerCase() === typeFilter.toLowerCase());
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue, bValue;
      
      switch (sortBy) {
        case "specialist_name":
          aValue = a.specialist_name?.toLowerCase() || "";
          bValue = b.specialist_name?.toLowerCase() || "";
          break;
        case "status":
          aValue = a.status?.toLowerCase() || "";
          bValue = b.status?.toLowerCase() || "";
          break;
        case "fee":
          aValue = a.fee || 0;
          bValue = b.fee || 0;
          break;
        case "created_at":
          aValue = new Date(a.created_at);
          bValue = new Date(b.created_at);
          break;
        case "scheduled_start":
        default:
          aValue = a.scheduled_start ? new Date(a.scheduled_start) : new Date(0);
          bValue = b.scheduled_start ? new Date(b.scheduled_start) : new Date(0);
          break;
      }

      if (sortOrder === "asc") {
        return aValue > bValue ? 1 : -1;
      } else {
        return aValue < bValue ? 1 : -1;
      }
    });

    setFilteredAppointments(filtered);
  };

  // Cancel appointment
  const cancelAppointment = async (appointmentId) => {
    try {
      setActionLoading(true);
      const token = localStorage.getItem("access_token");
      
      await axios.patch(
        `${API_URL}${API_ENDPOINTS.APPOINTMENTS.CANCEL(appointmentId)}`,
        {},
        { headers: { Authorization: `Bearer ${token}` } }
      );

      // Update local state
      setAppointments(prev => 
        prev.map(apt => 
          apt.id === appointmentId 
            ? { ...apt, status: 'CANCELLED' }
            : apt
        )
      );

      setNotification({
        type: 'success',
        message: 'Appointment cancelled successfully!'
      });
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      setNotification({
        type: 'error',
        message: 'Failed to cancel appointment. Please try again.'
      });
    } finally {
      setActionLoading(false);
    }
  };

  // View appointment details
  const viewAppointment = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  // Get status color
  const getStatusColor = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return 'text-blue-600 bg-blue-100 dark:text-blue-400 dark:bg-blue-900/20';
      case 'confirmed':
        return 'text-green-600 bg-green-100 dark:text-green-400 dark:bg-green-900/20';
      case 'completed':
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
      case 'cancelled':
        return 'text-red-600 bg-red-100 dark:text-red-400 dark:bg-red-900/20';
      case 'no_show':
        return 'text-orange-600 bg-orange-100 dark:text-orange-400 dark:bg-orange-900/20';
      default:
        return 'text-gray-600 bg-gray-100 dark:text-gray-400 dark:bg-gray-900/20';
    }
  };

  // Get status icon
  const getStatusIcon = (status) => {
    switch (status?.toLowerCase()) {
      case 'scheduled':
        return <Clock className="h-4 w-4" />;
      case 'confirmed':
        return <CheckCircle className="h-4 w-4" />;
      case 'completed':
        return <CheckCircle className="h-4 w-4" />;
      case 'cancelled':
        return <X className="h-4 w-4" />;
      case 'no_show':
        return <AlertCircle className="h-4 w-4" />;
      default:
        return <Info className="h-4 w-4" />;
    }
  };

  // Format status text
  const formatStatus = (status) => {
    if (!status) return 'Unknown';
    return status.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
  };

  // Format date and time
  const formatDateTime = (dateString) => {
    if (!dateString) return 'Not scheduled';
    const date = new Date(dateString);
    return {
      date: date.toLocaleDateString('en-US', {
        weekday: 'short',
        year: 'numeric',
        month: 'short',
        day: 'numeric'
      }),
      time: date.toLocaleTimeString('en-US', {
        hour: '2-digit',
        minute: '2-digit'
      })
    };
  };

  // Get unique statuses for filter
  const getUniqueStatuses = () => {
    const statuses = [...new Set(appointments.map(apt => apt.status).filter(Boolean))];
    return statuses.sort();
  };

  // Get unique appointment types for filter
  const getUniqueTypes = () => {
    const types = [...new Set(appointments.map(apt => apt.appointment_type).filter(Boolean))];
    return types.sort();
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center">
        <div className="text-center">
          <Loader className="h-8 w-8 animate-spin mx-auto mb-4 text-indigo-600" />
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Loading your appointments...
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="h-full overflow-y-auto p-3 sm:p-6">
      {/* Header */}
      <div className="mb-6 sm:mb-8">
        <h1 className={`text-2xl sm:text-3xl font-bold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}>
          My Appointments
        </h1>
        <p className={`text-base sm:text-lg ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          Manage your scheduled consultations and sessions
        </p>
      </div>

      {/* Error Display */}
      {error && (
        <motion.div
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
          exit={{ opacity: 0, y: -20 }}
          className="mb-6 p-4 rounded-lg border bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
          role="alert"
          aria-live="assertive"
        >
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
              <span>{error}</span>
            </div>
            <button
              onClick={() => {
                setError(null);
                loadAppointments();
              }}
              className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
            >
              <X className="h-5 w-5" />
            </button>
          </div>
        </motion.div>
      )}

      {/* Notification */}
      <AnimatePresence>
        {notification && (
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className={`mb-6 p-4 rounded-lg border ${
              notification.type === 'success'
                ? "bg-green-50 border-green-200 text-green-800 dark:bg-green-900/20 dark:border-green-700 dark:text-green-300"
                : "bg-red-50 border-red-200 text-red-800 dark:bg-red-900/20 dark:border-red-700 dark:text-red-300"
            }`}
            role="alert"
            aria-live="polite"
          >
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                {notification.type === 'success' ? (
                  <CheckCircle className="h-5 w-5 text-green-600 flex-shrink-0" />
                ) : (
                  <AlertCircle className="h-5 w-5 text-red-600 flex-shrink-0" />
                )}
                <span>{notification.message}</span>
              </div>
              <button
                onClick={() => setNotification(null)}
                className="text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Search and Filters */}
      <div className={`mb-6 p-4 sm:p-6 rounded-xl shadow-lg ${
        darkMode ? "bg-gray-800/90 border border-gray-700" : "bg-white border border-gray-200"
      }`}>
        {/* Search Bar */}
        <div className="relative mb-4">
          <Search className="absolute left-3 sm:left-4 top-1/2 transform -translate-y-1/2 h-4 w-4 sm:h-5 sm:w-5 text-gray-400" />
          <input
            type="text"
            placeholder="Search appointments by specialist, type, or notes..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 sm:pl-12 pr-4 py-2 sm:py-3 rounded-lg border text-sm sm:text-base focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:border-transparent transition-colors ${
              darkMode
                ? "bg-gray-700 border-gray-600 text-white placeholder-gray-400"
                : "bg-gray-50 border-gray-300 text-gray-900 placeholder-gray-500"
            }`}
          />
        </div>

        {/* Filter Controls */}
        <div className="flex flex-col sm:flex-row gap-4 items-start sm:items-center justify-between">
          <div className="flex flex-wrap gap-2 sm:gap-4 items-center">
            {/* Filter Toggle */}
            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                showFilters
                  ? "bg-indigo-100 text-indigo-700 dark:bg-indigo-900/30 dark:text-indigo-300"
                  : darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              }`}
            >
              <Filter className="h-4 w-4" />
              <span>Filters</span>
              <ChevronDown className={`h-4 w-4 transition-transform ${showFilters ? "rotate-180" : ""}`} />
            </button>

            {/* Quick Stats */}
            <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
              {filteredAppointments.length} of {appointments.length} appointments
            </div>
          </div>

          {/* Quick Actions */}
          <div className="flex items-center space-x-2">
            <button
              onClick={loadAppointments}
              disabled={loading}
              className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
                darkMode
                  ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                  : "bg-gray-100 text-gray-700 hover:bg-gray-200"
              } disabled:opacity-50 disabled:cursor-not-allowed`}
            >
              {loading ? (
                <Loader className="h-4 w-4 animate-spin" />
              ) : (
                <Calendar className="h-4 w-4" />
              )}
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Expanded Filters */}
        <AnimatePresence>
          {showFilters && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
            >
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                {/* Status Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Status
                  </label>
                  <select
                    value={statusFilter}
                    onChange={(e) => setStatusFilter(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="all">All Statuses</option>
                    {getUniqueStatuses().map(status => (
                      <option key={status} value={status}>{formatStatus(status)}</option>
                    ))}
                  </select>
                </div>

                {/* Type Filter */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Type
                  </label>
                  <select
                    value={typeFilter}
                    onChange={(e) => setTypeFilter(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="all">All Types</option>
                    {getUniqueTypes().map(type => (
                      <option key={type} value={type}>{formatStatus(type)}</option>
                    ))}
                  </select>
                </div>

                {/* Sort By */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Sort By
                  </label>
                  <select
                    value={sortBy}
                    onChange={(e) => setSortBy(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="scheduled_start">Appointment Date</option>
                    <option value="created_at">Date Created</option>
                    <option value="specialist_name">Specialist Name</option>
                    <option value="status">Status</option>
                    <option value="fee">Fee</option>
                  </select>
                </div>

                {/* Sort Order */}
                <div>
                  <label className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}>
                    Order
                  </label>
                  <select
                    value={sortOrder}
                    onChange={(e) => setSortOrder(e.target.value)}
                    className={`w-full px-3 py-2 rounded-lg border text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500 ${
                      darkMode
                        ? "bg-gray-700 border-gray-600 text-white"
                        : "bg-white border-gray-300 text-gray-900"
                    }`}
                  >
                    <option value="asc">Ascending</option>
                    <option value="desc">Descending</option>
                  </select>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Appointments List */}
      {filteredAppointments.length === 0 ? (
        <div className={`text-center py-12 ${
          darkMode ? "text-gray-400" : "text-gray-500"
        }`}>
          {appointments.length === 0 ? (
            <>
              <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No appointments yet</h3>
              <p className="text-base mb-4">Book your first appointment with a specialist</p>
              <button
                onClick={() => navigate(ROUTES.SPECIALISTS || '/home/specialists')}
                className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors"
              >
                Find Specialists
              </button>
            </>
          ) : (
            <>
              <Search className="h-16 w-16 mx-auto mb-4 text-gray-300" />
              <h3 className="text-xl font-medium mb-2">No matches found</h3>
              <p className="text-base">Try adjusting your search or filters</p>
            </>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {filteredAppointments.map((appointment) => {
            const dateTime = formatDateTime(appointment.scheduled_start);
            const isExpanded = expandedAppointment === appointment.id;
            
            return (
              <motion.div
                key={appointment.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className={`p-4 sm:p-6 rounded-xl shadow-lg border transition-all duration-200 ${
                  darkMode
                    ? "bg-gray-800/90 border-gray-700 hover:border-indigo-500"
                    : "bg-white border-gray-200 hover:border-indigo-300"
                } hover:shadow-xl`}
              >
                {/* Main Appointment Info */}
                <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                  <div className="flex items-start space-x-4">
                    {/* Specialist Avatar */}
                    <div className={`w-12 h-12 rounded-full flex items-center justify-center text-lg font-bold flex-shrink-0 ${
                      darkMode ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {appointment.specialist_name?.charAt(0) || "S"}
                    </div>

                    {/* Appointment Details */}
                    <div className="flex-1 min-w-0">
                      <h3 className={`text-lg font-bold mb-1 ${
                        darkMode ? "text-white" : "text-gray-900"
                      }`}>
                        {appointment.specialist_name || "Specialist"}
                      </h3>
                      
                      <div className="flex flex-wrap items-center gap-2 mb-2">
                        {/* Status Badge */}
                        <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                          getStatusColor(appointment.status)
                        }`}>
                          {getStatusIcon(appointment.status)}
                          <span>{formatStatus(appointment.status)}</span>
                        </span>

                        {/* Appointment Type */}
                        {appointment.appointment_type && (
                          <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                            darkMode ? "bg-gray-700 text-gray-300" : "bg-gray-100 text-gray-700"
                          }`}>
                            {appointment.appointment_type === 'VIRTUAL' ? (
                              <Video className="h-3 w-3" />
                            ) : (
                              <MapPin className="h-3 w-3" />
                            )}
                            <span>{formatStatus(appointment.appointment_type)}</span>
                          </span>
                        )}
                      </div>

                      {/* Date and Time */}
                      <div className="flex items-center space-x-4 text-sm">
                        <div className="flex items-center space-x-1">
                          <Calendar className="h-4 w-4 text-gray-400" />
                          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                            {dateTime.date}
                          </span>
                        </div>
                        <div className="flex items-center space-x-1">
                          <Clock className="h-4 w-4 text-gray-400" />
                          <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                            {dateTime.time}
                          </span>
                        </div>
                        {appointment.fee && (
                          <div className="flex items-center space-x-1">
                            <DollarSign className="h-4 w-4 text-gray-400" />
                            <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                              ${appointment.fee}
                            </span>
                          </div>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Action Buttons */}
                  <div className="flex items-center space-x-2 flex-shrink-0">
                    <button
                      onClick={() => setExpandedAppointment(isExpanded ? null : appointment.id)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title={isExpanded ? "Collapse" : "Expand"}
                    >
                      <ChevronDown className={`h-4 w-4 transition-transform ${isExpanded ? "rotate-180" : ""}`} />
                    </button>

                    <button
                      onClick={() => viewAppointment(appointment)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode
                          ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                          : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                      }`}
                      title="View Details"
                    >
                      <Eye className="h-4 w-4" />
                    </button>

                    {appointment.status?.toLowerCase() === 'scheduled' && (
                      <button
                        onClick={() => cancelAppointment(appointment.id)}
                        disabled={actionLoading}
                        className="p-2 rounded-lg text-red-600 hover:bg-red-100 dark:hover:bg-red-900/20 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                        title="Cancel Appointment"
                      >
                        <X className="h-4 w-4" />
                      </button>
                    )}
                  </div>
                </div>

                {/* Expanded Details */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      className="mt-4 pt-4 border-t border-gray-200 dark:border-gray-700"
                    >
                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm">
                        {appointment.specialist_type && (
                          <div>
                            <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              Specialist Type:
                            </span>
                            <span className={`ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {appointment.specialist_type}
                            </span>
                          </div>
                        )}

                        <div>
                          <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Created:
                          </span>
                          <span className={`ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                            {formatDateTime(appointment.created_at).date}
                          </span>
                        </div>

                        {appointment.notes && (
                          <div className="sm:col-span-2">
                            <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              Notes:
                            </span>
                            <p className={`mt-1 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {appointment.notes}
                            </p>
                          </div>
                        )}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })}
        </div>
      )}

      {/* Appointment Details Modal */}
      <AnimatePresence>
        {showAppointmentModal && selectedAppointment && (
          <div
            className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
            role="dialog"
            aria-modal="true"
            onClick={() => setShowAppointmentModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              animate={{ opacity: 1, scale: 1 }}
              exit={{ opacity: 0, scale: 0.9 }}
              className={`max-w-md w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
                darkMode ? "bg-gray-800 text-white" : "bg-white text-gray-900"
              }`}
              onClick={(e) => e.stopPropagation()}
            >
              <div className="p-6">
                {/* Header */}
                <div className="flex items-center justify-between mb-6">
                  <h2 className="text-xl font-bold">Appointment Details</h2>
                  <button
                    onClick={() => setShowAppointmentModal(false)}
                    className={`p-2 rounded-full hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors`}
                  >
                    <X className="h-5 w-5" />
                  </button>
                </div>

                {/* Appointment Info */}
                <div className="space-y-4">
                  <div className="flex items-center space-x-4">
                    <div className={`w-16 h-16 rounded-full flex items-center justify-center text-xl font-bold ${
                      darkMode ? "bg-indigo-600 text-white" : "bg-indigo-100 text-indigo-600"
                    }`}>
                      {selectedAppointment.specialist_name?.charAt(0) || "S"}
                    </div>
                    <div>
                      <h3 className="text-lg font-bold">{selectedAppointment.specialist_name || "Specialist"}</h3>
                      <p className={darkMode ? "text-gray-400" : "text-gray-600"}>
                        {selectedAppointment.specialist_type || "Mental Health Professional"}
                      </p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 text-sm">
                    {/* Status */}
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Status:
                      </span>
                      <span className={`inline-flex items-center space-x-1 px-2 py-1 rounded-full text-xs font-medium ${
                        getStatusColor(selectedAppointment.status)
                      }`}>
                        {getStatusIcon(selectedAppointment.status)}
                        <span>{formatStatus(selectedAppointment.status)}</span>
                      </span>
                    </div>

                    {/* Date and Time */}
                    {selectedAppointment.scheduled_start && (
                      <>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Date:
                          </span>
                          <span>{formatDateTime(selectedAppointment.scheduled_start).date}</span>
                        </div>
                        <div className="flex items-center justify-between">
                          <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Time:
                          </span>
                          <span>{formatDateTime(selectedAppointment.scheduled_start).time}</span>
                        </div>
                      </>
                    )}

                    {/* Type */}
                    {selectedAppointment.appointment_type && (
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Type:
                        </span>
                        <span className="flex items-center space-x-1">
                          {selectedAppointment.appointment_type === 'VIRTUAL' ? (
                            <Video className="h-4 w-4" />
                          ) : (
                            <MapPin className="h-4 w-4" />
                          )}
                          <span>{formatStatus(selectedAppointment.appointment_type)}</span>
                        </span>
                      </div>
                    )}

                    {/* Fee */}
                    {selectedAppointment.fee && (
                      <div className="flex items-center justify-between">
                        <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Fee:
                        </span>
                        <span>${selectedAppointment.fee}</span>
                      </div>
                    )}

                    {/* Created */}
                    <div className="flex items-center justify-between">
                      <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Created:
                      </span>
                      <span>{formatDateTime(selectedAppointment.created_at).date}</span>
                    </div>

                    {/* Notes */}
                    {selectedAppointment.notes && (
                      <div>
                        <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Notes:
                        </span>
                        <p className={`mt-1 p-3 rounded-lg ${
                          darkMode ? "bg-gray-700" : "bg-gray-50"
                        }`}>
                          {selectedAppointment.notes}
                        </p>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div className="flex space-x-3 pt-4">
                    {selectedAppointment.status?.toLowerCase() === 'scheduled' && (
                      <button
                        onClick={() => {
                          cancelAppointment(selectedAppointment.id);
                          setShowAppointmentModal(false);
                        }}
                        disabled={actionLoading}
                        className="flex-1 flex items-center justify-center space-x-2 px-4 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {actionLoading ? (
                          <Loader className="h-5 w-5 animate-spin" />
                        ) : (
                          <X className="h-5 w-5" />
                        )}
                        <span>Cancel Appointment</span>
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default SpecialistAppointmentsModule;