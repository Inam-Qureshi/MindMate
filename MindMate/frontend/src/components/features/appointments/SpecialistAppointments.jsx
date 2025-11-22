import { motion } from "framer-motion";
import React, { useState, useEffect, useCallback } from "react";
import axios from "axios";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  User,
  MapPin,
  Phone,
  Mail,
  CheckCircle,
  XCircle,
  AlertCircle,
  MessageSquare,
  FileText,
  Eye,
  Edit
} from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const SpecialistAppointmentsModule = ({ darkMode, activeSidebarItem = "all" }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(false);
  const [selectedAppointment, setSelectedAppointment] = useState(null);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);




  const fetchAppointments = useCallback(async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem("access_token");
      const userId = localStorage.getItem("user_id");

      if (!userId) {
        console.error("No user ID found");
        setAppointments([]);
        return;
      }

      // Map sidebar items to status filters
      let statusFilter = "all";
      switch (activeSidebarItem) {
        case "scheduled":
          statusFilter = "scheduled";
          break;
        case "completed":
          statusFilter = "completed";
          break;
        case "cancelled":
          statusFilter = "cancelled";
          break;
        default:
          statusFilter = "all";
      }

      const requestData = {
        status: statusFilter,
        date_from: null,
        date_to: null,
        patient_type: "all",
        page: 1,
        size: 20
      };

      // Build query parameters for GET request
      const queryParams = new URLSearchParams({
        page: requestData.page,
        size: requestData.size,
        ...(requestData.status !== "all" && { status: requestData.status })
      });

      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.APPOINTMENTS.SPECIALIST(userId)}?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setAppointments(response.data.appointments || []);
    } catch (error) {
      console.error("Error fetching appointments:", error);
    } finally {
      setLoading(false);
    }
  }, [API_URL, activeSidebarItem]);

  useEffect(() => {
    fetchAppointments();
    
    // Set up HTTP polling for real-time updates
    const pollInterval = setInterval(() => {
      fetchAppointments();
    }, 30000); // Poll every 30 seconds
    
    return () => clearInterval(pollInterval);
  }, [activeSidebarItem, fetchAppointments]);

  const updateAppointmentStatus = async (appointmentId, newStatus) => {
    try {
      const token = localStorage.getItem("access_token");
      await axios.put(`${API_URL}${API_ENDPOINTS.APPOINTMENTS.UPDATE_STATUS(appointmentId)}`, {
        new_status: newStatus
      }, {
        headers: { Authorization: `Bearer ${token}` }
      });

      // Refresh appointments
      fetchAppointments();
      toast.success(`Appointment status updated to ${newStatus}`);
    } catch (error) {
      console.error("Error updating appointment status:", error);
      
      // Show user-friendly error message
      let errorMessage = "Failed to update appointment status";
      if (error.response?.data?.detail) {
        errorMessage = error.response.data.detail;
      } else if (error.response?.status === 400) {
        errorMessage = "Invalid status transition. Please check the appointment's current status.";
      } else if (error.response?.status === 401) {
        errorMessage = "Please log in again to continue.";
      } else if (error.response?.status === 403) {
        errorMessage = "You don't have permission to update this appointment.";
      } else if (error.response?.status === 404) {
        errorMessage = "Appointment not found.";
      }
      
      toast.error(errorMessage);
    }
  };

  const openAppointmentModal = (appointment) => {
    setSelectedAppointment(appointment);
    setShowAppointmentModal(true);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "pending_approval":
        return "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300";
      case "scheduled":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "confirmed":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "completed":
        return "bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-300";
      case "cancelled":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "pending_approval":
        return <AlertCircle className="h-4 w-4" />;
      case "scheduled":
        return <Clock className="h-4 w-4" />;
      case "confirmed":
        return <CheckCircle className="h-4 w-4" />;
      case "completed":
        return <CheckCircle className="h-4 w-4" />;
      case "cancelled":
        return <XCircle className="h-4 w-4" />;
      default:
        return <AlertCircle className="h-4 w-4" />;
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString("en-US", {
      weekday: "short",
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  // Backend now handles filtering, so we just use all appointments
  const filteredAppointments = appointments;

  const renderAppointmentCard = (appointment) => (
    <motion.div
      key={appointment.id}
      whileHover={{ scale: 1.02, y: -2 }}
      className={`p-6 rounded-xl shadow-lg border transition-all duration-200 ${
        darkMode 
          ? "bg-gray-800/80 border-gray-700 hover:border-indigo-500" 
          : "bg-white/80 border-gray-200 hover:border-indigo-300"
      }`}
    >
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center space-x-3">
          <div className={`p-2 rounded-full ${
            darkMode ? "bg-indigo-600" : "bg-indigo-100"
          }`}>
            <Calendar className={`h-5 w-5 ${
              darkMode ? "text-white" : "text-indigo-600"
            }`} />
          </div>
          <div>
            <h3 className={`text-lg font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              {appointment.patient_name || "Patient"}
            </h3>
            <p className={`text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}>
              {appointment.status === "pending_approval" 
                ? "Awaiting approval - No time scheduled yet"
                : formatDateTime(appointment.scheduled_start)
              }
            </p>
          </div>
        </div>
        
        <div className={`flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(appointment.status)}`}>
          {getStatusIcon(appointment.status)}
          <span className="capitalize">{appointment.status}</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
        <div className="flex items-center space-x-2">
          <Clock className="h-4 w-4 text-gray-400" />
          <span className={`text-sm ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            {appointment.duration || "60"} minutes
          </span>
        </div>
        
        <div className="flex items-center space-x-2">
          <span className={`text-sm ${
            darkMode ? "text-gray-300" : "text-gray-700"
          }`}>
            PKR {appointment.fee || "N/A"}
          </span>
        </div>
      </div>

      {appointment.notes && (
        <div className="mb-4">
          <p className={`text-sm ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            <strong>Notes:</strong> {appointment.notes}
          </p>
        </div>
      )}

      <div className="flex items-center justify-between">
        <div className="flex space-x-2">
          <button
            onClick={() => openAppointmentModal(appointment)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium transition-colors ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            <Eye className="h-4 w-4" />
            <span>View Details</span>
          </button>
        </div>

        <div className="flex space-x-2">
          {appointment.status === "pending_approval" && (
            <>
              <button
                onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Approve</span>
              </button>
              <button
                onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Reject</span>
              </button>
            </>
          )}
          
          {appointment.status === "scheduled" && (
            <>
              <button
                onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
              >
                <CheckCircle className="h-4 w-4" />
                <span>Confirm</span>
              </button>
              <button
                onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
              >
                <XCircle className="h-4 w-4" />
                <span>Cancel</span>
              </button>
            </>
          )}
          
          {appointment.status === "confirmed" && (
            <button
              onClick={() => updateAppointmentStatus(appointment.id, "completed")}
              className="flex items-center space-x-2 px-3 py-2 rounded-lg text-sm font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
            >
              <CheckCircle className="h-4 w-4" />
              <span>Mark Complete</span>
            </button>
          )}
        </div>
      </div>
    </motion.div>
  );

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}>
          My Appointments
        </h1>
        <p className={`text-lg ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          {activeSidebarItem === "all" ? "All Appointments" :
           activeSidebarItem === "scheduled" ? "Scheduled Appointments" :
           activeSidebarItem === "completed" ? "Completed Appointments" :
           activeSidebarItem === "cancelled" ? "Cancelled Appointments" : "All Appointments"}
        </p>
      </div>

      {/* Appointments List */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h2 className={`text-xl font-semibold ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              {loading ? "Loading..." : `${filteredAppointments.length} appointments`}
            </h2>
            {lastUpdated && (
              <p className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Last updated: {lastUpdated.toLocaleTimeString()}
              </p>
            )}
          </div>
          
          <button
            onClick={fetchAppointments}
            disabled={loading}
            className={`px-4 py-2 rounded-lg font-medium transition-colors flex items-center space-x-2 ${
              darkMode
                ? "bg-gray-700 text-gray-300 hover:bg-gray-600 disabled:opacity-50"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300 disabled:opacity-50"
            }`}
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current"></div>
                <span>Refreshing...</span>
              </>
            ) : (
              <>
                <div className="w-4 h-4"></div>
                <span>Refresh</span>
              </>
            )}
          </button>
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
          </div>
        ) : filteredAppointments.length > 0 ? (
          <div className="space-y-6">
            {filteredAppointments.map(renderAppointmentCard)}
          </div>
        ) : (
          <div className={`text-center py-12 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No appointments found</h3>
            <p>You don't have any appointments with the selected status</p>
          </div>
        )}
      </div>

      {/* Appointment Detail Modal */}
      {showAppointmentModal && selectedAppointment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50">
          <motion.div
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
            className={`max-w-2xl w-full max-h-[90vh] overflow-y-auto rounded-xl shadow-2xl ${
              darkMode ? "bg-gray-800" : "bg-white"
            }`}
          >
            <div className="p-6">
              <div className="flex items-center justify-between mb-4">
                <h2 className={`text-2xl font-bold ${
                  darkMode ? "text-white" : "text-gray-900"
                }`}>
                  Appointment Details
                </h2>
                <button
                  onClick={() => setShowAppointmentModal(false)}
                  className={`p-2 rounded-full ${
                    darkMode ? "text-gray-400 hover:text-gray-300" : "text-gray-500 hover:text-gray-700"
                  }`}
                >
                  <XCircle className="h-6 w-6" />
                </button>
              </div>
              
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Patient Name
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedAppointment.patient_name || "N/A"}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Status
                    </label>
                    <div className={`inline-flex items-center space-x-2 px-3 py-1 rounded-full text-sm font-medium ${getStatusColor(selectedAppointment.status)}`}>
                      {getStatusIcon(selectedAppointment.status)}
                      <span className="capitalize">{selectedAppointment.status}</span>
                    </div>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Date & Time
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {formatDateTime(selectedAppointment.scheduled_start)}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Duration
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedAppointment.duration || "60"} minutes
                    </p>
                  </div>
                </div>
                
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Fee
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      PKR {selectedAppointment.fee || "N/A"}
                    </p>
                  </div>
                  
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Type
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedAppointment.appointment_type || "Virtual"}
                    </p>
                  </div>
                </div>
                
                {selectedAppointment.notes && (
                  <div>
                    <label className={`block text-sm font-medium mb-1 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Notes
                    </label>
                    <p className={`text-lg ${
                      darkMode ? "text-white" : "text-gray-900"
                    }`}>
                      {selectedAppointment.notes}
                    </p>
                  </div>
                )}
                
                <div className="flex space-x-3 pt-4">
                  {selectedAppointment.status === "scheduled" && (
                    <>
                      <button
                        onClick={() => {
                          updateAppointmentStatus(selectedAppointment.id, "confirmed");
                          setShowAppointmentModal(false);
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                      >
                        <CheckCircle className="h-5 w-5" />
                        <span>Confirm Appointment</span>
                      </button>
                      <button
                        onClick={() => {
                          updateAppointmentStatus(selectedAppointment.id, "cancelled");
                          setShowAppointmentModal(false);
                        }}
                        className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                      >
                        <XCircle className="h-5 w-5" />
                        <span>Cancel Appointment</span>
                      </button>
                    </>
                  )}
                  
                  {selectedAppointment.status === "confirmed" && (
                    <button
                      onClick={() => {
                        updateAppointmentStatus(selectedAppointment.id, "completed");
                        setShowAppointmentModal(false);
                      }}
                      className="flex-1 flex items-center justify-center space-x-2 px-6 py-3 rounded-lg font-medium bg-purple-600 text-white hover:bg-purple-700 transition-colors"
                    >
                      <CheckCircle className="h-5 w-5" />
                      <span>Mark as Completed</span>
                    </button>
                  )}
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
};

export default SpecialistAppointmentsModule;
