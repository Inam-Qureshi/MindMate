import React, { useState, useEffect } from "react";
import axios from "axios";
import { motion } from "framer-motion";
import { toast } from "react-hot-toast";
import {
  Calendar,
  Clock,
  Plus,
  X,
  CheckCircle,
  XCircle,
  RefreshCw,
  AlertCircle,
  ChevronDown,
  ChevronUp
} from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";

const SlotManagementModule = ({ darkMode, activeSidebarItem = "overview" }) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showGenerateForm, setShowGenerateForm] = useState(false);
  const [availabilitySummary, setAvailabilitySummary] = useState(null);

  const [generateForm, setGenerateForm] = useState({
    start_date: new Date().toISOString().split('T')[0],
    end_date: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    slot_duration_minutes: 60
  });

  useEffect(() => {
    loadSlots();
    loadAvailabilitySummary();
  }, [activeSidebarItem]);

  const loadSlots = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.SLOTS(100)}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setSlots(response.data.slots || []);
    } catch (error) {
      console.error("Error loading slots:", error);
      toast.error("Failed to load time slots");
    } finally {
      setLoading(false);
    }
  };

  const loadAvailabilitySummary = async () => {
    try {
      const token = localStorage.getItem("access_token");
      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.SLOTS_AVAILABILITY_SUMMARY}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );
      setAvailabilitySummary(response.data);
    } catch (error) {
      console.error("Error loading availability summary:", error);
    }
  };

  const generateSlots = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem("access_token");

      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.SLOTS_GENERATE}`,
        generateForm,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(response.data.message);
      setShowGenerateForm(false);
      loadSlots();
      loadAvailabilitySummary();
    } catch (error) {
      console.error("Error generating slots:", error);
      toast.error("Failed to generate time slots");
    } finally {
      setLoading(false);
    }
  };

  const updateSlotStatus = async (slotId, action) => {
    try {
      const token = localStorage.getItem("access_token");
      const endpoint = action === 'block' ? 'block' : 'unblock';

      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.SLOTS_MANAGE(endpoint)}`,
        { slot_id: slotId },
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      toast.success(response.data.message);
      loadSlots();
      loadAvailabilitySummary();
    } catch (error) {
      console.error(`Error ${action}ing slot:`, error);
      toast.error(`Failed to ${action} slot`);
    }
  };

  const getSlotStatusColor = (status) => {
    switch (status) {
      case "available":
        return "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300";
      case "booked":
        return "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300";
      case "blocked":
        return "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300";
      default:
        return "bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300";
    }
  };

  const formatDateTime = (dateTime) => {
    return new Date(dateTime).toLocaleString("en-US", {
      month: "short",
      day: "numeric",
      hour: "2-digit",
      minute: "2-digit"
    });
  };

  const groupSlotsByDate = (slots) => {
    const grouped = {};
    slots.forEach(slot => {
      const date = slot.date;
      if (!grouped[date]) {
        grouped[date] = [];
      }
      grouped[date].push(slot);
    });
    return grouped;
  };

  const groupedSlots = groupSlotsByDate(slots);

  return (
    <div className="h-full overflow-y-auto p-6">
      {/* Header */}
      <div className="mb-8">
        <h1 className={`text-3xl font-bold mb-2 ${
          darkMode ? "text-white" : "text-gray-900"
        }`}>
          Slot Management
        </h1>
        <p className={`text-lg ${
          darkMode ? "text-gray-400" : "text-gray-600"
        }`}>
          Manage your availability and time slots
        </p>
      </div>

      {/* Availability Summary */}
      {availabilitySummary && (
        <div className={`mb-6 p-6 rounded-xl shadow-lg ${
          darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
        }`}>
          <h2 className={`text-xl font-semibold mb-4 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}>
            Availability Overview
          </h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center">
              <div className={`text-2xl font-bold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {availabilitySummary.total_slots}
              </div>
              <div className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Total Slots
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold text-green-600`}>
                {availabilitySummary.available_slots}
              </div>
              <div className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Available
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold text-blue-600`}>
                {availabilitySummary.booked_slots}
              </div>
              <div className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Booked
              </div>
            </div>
            <div className="text-center">
              <div className={`text-2xl font-bold text-red-600`}>
                {availabilitySummary.blocked_slots}
              </div>
              <div className={`text-sm ${
                darkMode ? "text-gray-400" : "text-gray-600"
              }`}>
                Blocked
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Generate Slots Button */}
      <div className="mb-6">
        <div className="flex items-center justify-between">
          <button
            onClick={() => setShowGenerateForm(!showGenerateForm)}
            className="flex items-center space-x-2 px-4 py-2 rounded-lg font-medium bg-indigo-600 text-white hover:bg-indigo-700 transition-colors"
          >
            <Plus className="h-4 w-4" />
            <span>Generate Time Slots</span>
            {showGenerateForm ? <ChevronUp className="h-4 w-4" /> : <ChevronDown className="h-4 w-4" />}
          </button>

          <button
            onClick={() => {
              loadSlots();
              loadAvailabilitySummary();
            }}
            className={`p-2 rounded-lg transition-colors ${
              darkMode
                ? "text-gray-400 hover:text-gray-300 hover:bg-gray-700"
                : "text-gray-600 hover:text-gray-800 hover:bg-gray-200"
            }`}
          >
            <RefreshCw className="h-5 w-5" />
          </button>
        </div>

        {/* Generate Form */}
        {showGenerateForm && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: "auto" }}
            exit={{ opacity: 0, height: 0 }}
            className={`mt-4 p-6 rounded-xl shadow-lg ${
              darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
            }`}
          >
            <h3 className={`text-lg font-semibold mb-4 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}>
              Generate Time Slots
            </h3>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-4">
              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Start Date
                </label>
                <input
                  type="date"
                  value={generateForm.start_date}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, start_date: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  End Date
                </label>
                <input
                  type="date"
                  value={generateForm.end_date}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, end_date: e.target.value }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                />
              </div>

              <div>
                <label className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}>
                  Duration (minutes)
                </label>
                <select
                  value={generateForm.slot_duration_minutes}
                  onChange={(e) => setGenerateForm(prev => ({ ...prev, slot_duration_minutes: parseInt(e.target.value) }))}
                  className={`w-full px-3 py-2 rounded-lg border ${
                    darkMode
                      ? "bg-gray-700 border-gray-600 text-white"
                      : "bg-white border-gray-300 text-gray-900"
                  } focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                >
                  <option value={30}>30 minutes</option>
                  <option value={45}>45 minutes</option>
                  <option value={60}>60 minutes</option>
                  <option value={90}>90 minutes</option>
                  <option value={120}>120 minutes</option>
                </select>
              </div>
            </div>

            <div className="flex space-x-3">
              <button
                onClick={generateSlots}
                disabled={loading}
                className="flex items-center space-x-2 px-6 py-2 rounded-lg font-medium bg-green-600 text-white hover:bg-green-700 transition-colors disabled:opacity-50"
              >
                {loading ? (
                  <RefreshCw className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle className="h-4 w-4" />
                )}
                <span>Generate Slots</span>
              </button>

              <button
                onClick={() => setShowGenerateForm(false)}
                className={`px-6 py-2 rounded-lg font-medium transition-colors ${
                  darkMode
                    ? "bg-gray-700 text-gray-300 hover:bg-gray-600"
                    : "bg-gray-200 text-gray-700 hover:bg-gray-300"
                }`}
              >
                Cancel
              </button>
            </div>
          </motion.div>
        )}
      </div>

      {/* Slots List */}
      <div className="space-y-6">
        {loading ? (
          <div className="flex items-center justify-center py-12">
            <RefreshCw className="h-8 w-8 animate-spin text-indigo-600" />
          </div>
        ) : Object.keys(groupedSlots).length > 0 ? (
          Object.entries(groupedSlots)
            .sort(([a], [b]) => new Date(a) - new Date(b))
            .map(([date, dateSlots]) => (
            <div key={date} className={`p-6 rounded-xl shadow-lg ${
              darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
            }`}>
              <h3 className={`text-lg font-semibold mb-4 ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                {new Date(date).toLocaleDateString("en-US", {
                  weekday: "long",
                  year: "numeric",
                  month: "long",
                  day: "numeric"
                })}
              </h3>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                {dateSlots
                  .sort((a, b) => new Date(a.start_time) - new Date(b.start_time))
                  .map((slot) => (
                  <motion.div
                    key={slot.id}
                    whileHover={{ scale: 1.02 }}
                    className={`p-4 rounded-lg border ${
                      darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-50 border-gray-200"
                    }`}
                  >
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center space-x-2">
                        <Clock className="h-4 w-4 text-gray-400" />
                        <span className={`font-medium ${
                          darkMode ? "text-white" : "text-gray-900"
                        }`}>
                          {formatDateTime(slot.start_time)}
                        </span>
                      </div>

                      <div className={`px-2 py-1 rounded-full text-xs font-medium ${getSlotStatusColor(slot.status)}`}>
                        {slot.status}
                      </div>
                    </div>

                    <div className={`text-sm mb-3 ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}>
                      Duration: {slot.duration_minutes} minutes
                    </div>

                    <div className="flex space-x-2">
                      {slot.status === "available" && (
                        <button
                          onClick={() => updateSlotStatus(slot.id, "block")}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm font-medium bg-red-600 text-white hover:bg-red-700 transition-colors"
                        >
                          <XCircle className="h-3 w-3" />
                          <span>Block</span>
                        </button>
                      )}

                      {slot.status === "blocked" && (
                        <button
                          onClick={() => updateSlotStatus(slot.id, "unblock")}
                          className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm font-medium bg-green-600 text-white hover:bg-green-700 transition-colors"
                        >
                          <CheckCircle className="h-3 w-3" />
                          <span>Unblock</span>
                        </button>
                      )}

                      {slot.status === "booked" && (
                        <div className="flex-1 flex items-center justify-center space-x-1 px-3 py-2 rounded text-sm font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                          <Calendar className="h-3 w-3" />
                          <span>Booked</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          ))
        ) : (
          <div className={`text-center py-12 ${
            darkMode ? "text-gray-400" : "text-gray-600"
          }`}>
            <Calendar className="h-16 w-16 mx-auto mb-4 text-gray-400" />
            <h3 className="text-lg font-medium mb-2">No time slots available</h3>
            <p>Generate time slots to start accepting appointments</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default SlotManagementModule;
