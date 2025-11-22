/*
Enhanced Specialist Appointments Module
======================================
Enhanced appointments module with filtering capabilities for the specialist dashboard.
*/

import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import {
  Calendar,
  Clock,
  User,
  Mail,
  DollarSign,
  Filter,
  Search,
  ChevronDown,
  ChevronUp,
  Eye,
  Edit,
  CheckCircle,
  XCircle,
  AlertCircle,
  RefreshCw
} from "react-feather";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const EnhancedSpecialistAppointmentsModule = ({ darkMode, activeSidebarItem = "all" }) => {
  const [appointments, setAppointments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filters, setFilters] = useState({
    status: "all",
    dateFrom: "",
    dateTo: "",
    patientType: "all"
  });
  const [showFilters, setShowFilters] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [updatingStatus, setUpdatingStatus] = useState(null);

  // Status options for filtering
  const statusOptions = [
    { value: "all", label: "All Statuses", color: "gray" },
    { value: "pending_approval", label: "Pending Approval", color: "yellow" },
    { value: "scheduled", label: "Scheduled", color: "blue" },
    { value: "confirmed", label: "Confirmed", color: "green" },
    { value: "completed", label: "Completed", color: "emerald" },
    { value: "cancelled", label: "Cancelled", color: "red" },
    { value: "no_show", label: "No Show", color: "orange" }
  ];

  // Patient type options
  const patientTypeOptions = [
    { value: "all", label: "All Patients", color: "gray" },
    { value: "new", label: "New Patients", color: "blue" },
    { value: "active", label: "Active Patients", color: "green" },
    { value: "follow_up", label: "Follow-up", color: "purple" },
    { value: "discharged", label: "Discharged", color: "red" }
  ];

  // Load appointments based on current sidebar selection and filters
  useEffect(() => {
    loadAppointments();
  }, [activeSidebarItem, currentPage]);

  const loadAppointments = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        setError("Authentication required");
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
        case "pending":
          statusFilter = "pending_approval";
          break;
        default:
          statusFilter = filters.status;
      }

      const requestData = {
        status: statusFilter,
        date_from: filters.dateFrom ? new Date(filters.dateFrom) : null,
        date_to: filters.dateTo ? new Date(filters.dateTo) : null,
        patient_type: filters.patientType,
        page: currentPage,
        size: 20
      };

      // Build query parameters for GET request
      const queryParams = new URLSearchParams({
        page: requestData.page,
        size: requestData.size,
        ...(requestData.status !== "all" && { status: requestData.status }),
        ...(requestData.date_from && { from_date: requestData.date_from.toISOString().split('T')[0] }),
        ...(requestData.date_to && { to_date: requestData.date_to.toISOString().split('T')[0] })
      });

      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.APPOINTMENTS.SPECIALIST(localStorage.getItem("user_id"))}?${queryParams}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setAppointments(response.data.appointments);
      setTotalPages(Math.ceil(response.data.total_count / 20));
      setError("");
    } catch (err) {
      console.error("Error loading appointments:", err);
      setError("Failed to load appointments");
      toast.error("Failed to load appointments");
    } finally {
      setLoading(false);
    }
  };

  const updateAppointmentStatus = async (appointmentId, newStatus, notes = "") => {
    try {
      setUpdatingStatus(appointmentId);
      const token = localStorage.getItem("access_token");
      
      const response = await axios.put(
        `${API_URL}${API_ENDPOINTS.APPOINTMENTS.UPDATE_STATUS(appointmentId)}`,
        {
          appointment_id: appointmentId,
          new_status: newStatus,
          notes: notes
        },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      if (response.data.success) {
        toast.success(response.data.message);
        // Reload appointments to reflect changes
        loadAppointments();
      }
    } catch (err) {
      console.error("Error updating appointment status:", err);
      toast.error("Failed to update appointment status");
    } finally {
      setUpdatingStatus(null);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const applyFilters = () => {
    setCurrentPage(1);
    loadAppointments();
  };

  const clearFilters = () => {
    setFilters({
      status: "all",
      dateFrom: "",
      dateTo: "",
      patientType: "all"
    });
    setCurrentPage(1);
    loadAppointments();
  };

  const getStatusColor = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.color : "gray";
  };

  const getStatusLabel = (status) => {
    const statusOption = statusOptions.find(opt => opt.value === status);
    return statusOption ? statusOption.label : status;
  };

  const formatDateTime = (dateTime) => {
    if (!dateTime) return "Not scheduled";
    return new Date(dateTime).toLocaleString();
  };

  const formatCurrency = (amount) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  if (loading && appointments.length === 0) {
    return (
      <div className={`h-full p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
        <div className="flex items-center justify-center h-64">
          <div className="text-center">
            <RefreshCw className="h-12 w-12 text-blue-500 animate-spin mx-auto mb-4" />
            <p>Loading appointments...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-full p-6 ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className="mb-6">
        <h1 className={`text-3xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
          Appointments
        </h1>
        <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
          Manage your appointments and patient schedules
        </p>
      </div>

      {/* Filters Section */}
      <div className={`mb-6 p-4 rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
        <div className="flex items-center justify-between mb-4">
          <h3 className={`text-lg font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
            Filters
          </h3>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
              darkMode ? "bg-gray-700 hover:bg-gray-600" : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <Filter size={16} />
            <span>{showFilters ? "Hide" : "Show"} Filters</span>
            {showFilters ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
        </div>

        {showFilters && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className="space-y-4"
          >
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
              {/* Status Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Status
                </label>
                <select
                  value={filters.status}
                  onChange={(e) => handleFilterChange("status", e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  {statusOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>

              {/* Date From Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  From Date
                </label>
                <input
                  type="date"
                  value={filters.dateFrom}
                  onChange={(e) => handleFilterChange("dateFrom", e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              {/* Date To Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  To Date
                </label>
                <input
                  type="date"
                  value={filters.dateTo}
                  onChange={(e) => handleFilterChange("dateTo", e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                />
              </div>

              {/* Patient Type Filter */}
              <div>
                <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                  Patient Type
                </label>
                <select
                  value={filters.patientType}
                  onChange={(e) => handleFilterChange("patientType", e.target.value)}
                  className={`w-full p-2 rounded-lg border ${
                    darkMode ? "bg-gray-700 border-gray-600 text-white" : "bg-white border-gray-300 text-gray-900"
                  }`}
                >
                  {patientTypeOptions.map(option => (
                    <option key={option.value} value={option.value}>
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={applyFilters}
                className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors`}
              >
                Apply Filters
              </button>
              <button
                onClick={clearFilters}
                className={`px-4 py-2 ${
                  darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-300 hover:bg-gray-400"
                } text-gray-900 rounded-lg transition-colors`}
              >
                Clear Filters
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Appointments List */}
      <div className={`rounded-lg ${darkMode ? "bg-gray-800 border border-gray-700" : "bg-white border border-gray-200"}`}>
        {error ? (
          <div className="p-6 text-center">
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
            <p className="text-red-500">{error}</p>
            <button
              onClick={loadAppointments}
              className="mt-4 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
            >
              Retry
            </button>
          </div>
        ) : appointments.length === 0 ? (
          <div className="p-6 text-center">
            <Calendar className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
              No appointments found with the current filters
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Patient
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Date & Time
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Type
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Fee
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? "text-gray-300" : "text-gray-500"
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? "divide-gray-700" : "divide-gray-200"}`}>
                {appointments.map((appointment) => (
                  <tr key={appointment.id} className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div>
                        <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {appointment.patient_name}
                        </div>
                        <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                          {appointment.patient_email}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                        {formatDateTime(appointment.scheduled_start)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`inline-flex px-2 py-1 text-xs font-semibold rounded-full bg-${getStatusColor(appointment.status)}-100 text-${getStatusColor(appointment.status)}-800`}>
                        {getStatusLabel(appointment.status)}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-900"}`}>
                        {appointment.appointment_type}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {formatCurrency(appointment.fee)}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          onClick={() => {/* View appointment details */}}
                          className={`p-2 rounded-lg ${
                            darkMode ? "bg-gray-600 hover:bg-gray-500" : "bg-gray-100 hover:bg-gray-200"
                          }`}
                          title="View Details"
                        >
                          <Eye size={16} />
                        </button>
                        
                        {appointment.status === "pending_approval" && (
                          <>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, "scheduled")}
                              disabled={updatingStatus === appointment.id}
                              className="p-2 rounded-lg bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
                              title="Approve"
                            >
                              {updatingStatus === appointment.id ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <CheckCircle size={16} />
                              )}
                            </button>
                            <button
                              onClick={() => updateAppointmentStatus(appointment.id, "cancelled")}
                              disabled={updatingStatus === appointment.id}
                              className="p-2 rounded-lg bg-red-600 hover:bg-red-700 text-white disabled:opacity-50"
                              title="Reject"
                            >
                              {updatingStatus === appointment.id ? (
                                <RefreshCw size={16} className="animate-spin" />
                              ) : (
                                <XCircle size={16} />
                              )}
                            </button>
                          </>
                        )}
                        
                        {appointment.status === "scheduled" && (
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, "confirmed")}
                            disabled={updatingStatus === appointment.id}
                            className="p-2 rounded-lg bg-blue-600 hover:bg-blue-700 text-white disabled:opacity-50"
                            title="Confirm"
                          >
                            {updatingStatus === appointment.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        )}
                        
                        {appointment.status === "confirmed" && (
                          <button
                            onClick={() => updateAppointmentStatus(appointment.id, "completed")}
                            disabled={updatingStatus === appointment.id}
                            className="p-2 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white disabled:opacity-50"
                            title="Mark Complete"
                          >
                            {updatingStatus === appointment.id ? (
                              <RefreshCw size={16} className="animate-spin" />
                            ) : (
                              <CheckCircle size={16} />
                            )}
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="mt-6 flex justify-center">
          <div className={`flex space-x-2 ${darkMode ? "bg-gray-800" : "bg-white"} rounded-lg p-2 border ${darkMode ? "border-gray-700" : "border-gray-200"}`}>
            <button
              onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
              disabled={currentPage === 1}
              className={`px-3 py-2 rounded-lg ${
                currentPage === 1
                  ? "text-gray-400 cursor-not-allowed"
                  : darkMode
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Previous
            </button>
            
            <span className={`px-3 py-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
              Page {currentPage} of {totalPages}
            </span>
            
            <button
              onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
              disabled={currentPage === totalPages}
              className={`px-3 py-2 rounded-lg ${
                currentPage === totalPages
                  ? "text-gray-400 cursor-not-allowed"
                  : darkMode
                  ? "text-gray-300 hover:bg-gray-700"
                  : "text-gray-700 hover:bg-gray-100"
              }`}
            >
              Next
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default EnhancedSpecialistAppointmentsModule;
