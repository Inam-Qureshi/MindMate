import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import {
  CheckCircle, Clock, XCircle, AlertTriangle, RefreshCw,
  FileText, Sun, Moon, Home, ArrowLeft, Mail
} from "react-feather";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";

const SpecialistApplicationStatus = () => {
  const navigate = useNavigate();
  const [darkMode, setDarkMode] = useState(false);
  const [statusData, setStatusData] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  // Initialize dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  // Fetch application status
  const fetchStatus = async (showRefreshToast = false) => {
    try {
      const token = localStorage.getItem("access_token");
      
      if (!token) {
        navigate(ROUTES.LOGIN);
        return;
      }

      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.SPECIALISTS.APPLICATION_STATUS}`,
        {
          headers: { Authorization: `Bearer ${token}` }
        }
      );

      setStatusData(response.data);
      
      if (showRefreshToast) {
        toast.success("Status refreshed!");
      }

      // Auto-redirect if approved (only redirect once)
      const wasApproved = response.data.approval_status === "approved";
      const redirectDone = sessionStorage.getItem('approval_redirect_done') === 'true';
      
      if (wasApproved && !statusData && !redirectDone) {
        // Only auto-redirect if this is the first load (statusData is null)
        // and we haven't already redirected (prevents multiple redirects)
        toast.success("🎉 Your application has been approved! Redirecting to dashboard...", {
          duration: 3000
        });
        
        const redirectTimer = setTimeout(() => {
          sessionStorage.setItem('approval_redirect_done', 'true');
          navigate(ROUTES.SPECIALIST_DASHBOARD, { replace: true });
        }, 3000); // Give user 3 seconds to see the success message
        
        // Clear the redirect flag after 1 minute to allow future redirects if needed
        setTimeout(() => {
          sessionStorage.removeItem('approval_redirect_done');
        }, 60000);
        
        return () => clearTimeout(redirectTimer);
      } else if (wasApproved && redirectDone) {
        // If already approved and we've redirected before, just show status
        // User can manually navigate if needed
      }
    } catch (error) {
      console.error("Failed to fetch status:", error);
      toast.error("Failed to load application status");
      
      if (error.response?.status === 401) {
        navigate(ROUTES.LOGIN);
      }
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  };

  useEffect(() => {
    fetchStatus();
    
    // Poll for status updates every 15 seconds (reduced from 30 for faster updates)
    // Only poll if status is pending or under_review
    const interval = setInterval(() => {
      if (statusData?.approval_status === 'pending' || statusData?.approval_status === 'under_review') {
        fetchStatus(false); // Don't show toast on auto-refresh
      }
    }, 15000);

    return () => clearInterval(interval);
  }, [statusData?.approval_status]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    fetchStatus(true);
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case "approved":
        return <CheckCircle className="text-green-500" size={48} />;
      case "pending":
      case "under_review":
        return <Clock className="text-yellow-500" size={48} />;
      case "rejected":
        return <XCircle className="text-red-500" size={48} />;
      case "suspended":
        return <AlertTriangle className="text-orange-500" size={48} />;
      default:
        return <FileText className="text-gray-500" size={48} />;
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case "approved":
        return "from-green-500 to-emerald-500";
      case "pending":
      case "under_review":
        return "from-yellow-500 to-orange-500";
      case "rejected":
        return "from-red-500 to-pink-500";
      case "suspended":
        return "from-orange-500 to-red-500";
      default:
        return "from-gray-500 to-gray-600";
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case "approved":
        return "Approved ✓";
      case "pending":
        return "Pending Review";
      case "under_review":
        return "Under Review";
      case "rejected":
        return "Rejected";
      case "suspended":
        return "Suspended";
      default:
        return "Unknown";
    }
  };

  if (isLoading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? "bg-gradient-to-br from-gray-900 to-gray-800" : "bg-gradient-to-br from-indigo-50 to-blue-50"
      }`}>
        <motion.div
          className="flex flex-col items-center"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
        >
          <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4" />
          <p className={darkMode ? "text-gray-300" : "text-gray-600"}>Loading status...</p>
        </motion.div>
      </div>
    );
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${
      darkMode ? "bg-gradient-to-br from-gray-900 via-gray-800 to-indigo-900" : "bg-gradient-to-br from-indigo-50 via-white to-blue-50"
    }`}>
      {/* Dark Mode Toggle */}
      <motion.button
        onClick={toggleDarkMode}
        className={`fixed top-6 right-6 p-3 rounded-full shadow-lg z-50 ${
          darkMode ? "bg-gray-700 text-yellow-300" : "bg-white text-gray-700"
        }`}
        whileHover={{ scale: 1.1 }}
        whileTap={{ scale: 0.9 }}
      >
        {darkMode ? <Sun size={20} /> : <Moon size={20} />}
      </motion.button>

      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <motion.div
          className="text-center mb-8"
          initial={{ opacity: 0, y: -20 }}
          animate={{ opacity: 1, y: 0 }}
        >
          <h1 className={`text-4xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
            Application Status
          </h1>
          <p className={`text-lg ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            Track your specialist application progress
          </p>
        </motion.div>

        {/* Status Card */}
        <motion.div
          className={`rounded-2xl shadow-2xl overflow-hidden ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4 }}
        >
          {/* Status Header with Gradient */}
          <div className={`bg-gradient-to-r ${getStatusColor(statusData?.approval_status)} p-6 text-white`}>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                {getStatusIcon(statusData?.approval_status)}
                <div>
                  <h2 className="text-2xl font-bold">
                    {getStatusText(statusData?.approval_status)}
                  </h2>
                  <p className="text-white/90 mt-1">
                    {statusData?.specialist_type?.replace('_', ' ').toUpperCase()}
                  </p>
                </div>
              </div>
              <motion.button
                onClick={handleRefresh}
                disabled={isRefreshing}
                className="p-2 rounded-lg bg-white/20 hover:bg-white/30 transition-colors disabled:opacity-50"
                whileHover={{ rotate: 180 }}
                transition={{ duration: 0.3 }}
              >
                <RefreshCw size={20} className={isRefreshing ? "animate-spin" : ""} />
              </motion.button>
            </div>
          </div>

          {/* Profile Completion Progress */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <div className="flex items-center justify-between mb-2">
              <span className={`font-semibold ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                Profile Completion
              </span>
              <span className={`text-2xl font-bold ${darkMode ? "text-indigo-400" : "text-indigo-600"}`}>
                {statusData?.profile_completion_percentage || 0}%
              </span>
            </div>
            <div className="w-full bg-gray-200 dark:bg-gray-700 rounded-full h-3 overflow-hidden">
              <motion.div
                className="bg-gradient-to-r from-indigo-500 to-purple-500 h-3 rounded-full"
                initial={{ width: 0 }}
                animate={{ width: `${statusData?.profile_completion_percentage || 0}%` }}
                transition={{ duration: 0.8, ease: "easeOut" }}
              />
            </div>
            <div className="flex items-center gap-2 mt-3">
              {statusData?.mandatory_fields_completed ? (
                <>
                  <CheckCircle className="text-green-500" size={16} />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    All mandatory fields completed
                  </span>
                </>
              ) : (
                <>
                  <AlertTriangle className="text-yellow-500" size={16} />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Complete mandatory fields to submit for approval
                  </span>
                </>
              )}
            </div>
          </div>

          {/* Status Message */}
          <div className="p-6 border-b border-gray-200 dark:border-gray-700">
            <h3 className={`text-lg font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
              Status Message
            </h3>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
              {statusData?.status_message}
            </p>
          </div>

          {/* Pending Documents */}
          {statusData?.pending_documents && statusData.pending_documents.length > 0 && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                Pending Documents
              </h3>
              <div className="space-y-2">
                {statusData.pending_documents.map((doc) => (
                  <div
                    key={doc}
                    className={`flex items-center gap-2 px-3 py-2 rounded-lg ${
                      darkMode ? "bg-gray-700" : "bg-gray-100"
                    }`}
                  >
                    <FileText className="text-orange-500" size={18} />
                    <span className={darkMode ? "text-gray-300" : "text-gray-700"}>
                      {doc.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Admin Notes */}
          {statusData?.admin_notes && (
            <div className="p-6 border-b border-gray-200 dark:border-gray-700">
              <h3 className={`text-lg font-semibold mb-3 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
                Admin Notes
              </h3>
              <div className={`p-4 rounded-lg ${
                statusData.approval_status === "rejected" 
                  ? "bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800"
                  : "bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800"
              }`}>
                <p className={
                  statusData.approval_status === "rejected"
                    ? "text-red-700 dark:text-red-300"
                    : "text-blue-700 dark:text-blue-300"
                }>
                  {statusData.admin_notes}
                </p>
              </div>
            </div>
          )}

          {/* Timeline */}
          <div className="p-6">
            <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-gray-200" : "text-gray-900"}`}>
              Application Timeline
            </h3>
            <div className="space-y-3">
              <div className="flex items-center gap-3">
                <div className="w-2 h-2 rounded-full bg-green-500" />
                <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                  Account Created
                </span>
              </div>
              {statusData?.profile_completion_percentage > 0 && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-blue-500" />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Profile Started ({statusData.profile_completion_percentage}%)
                  </span>
                </div>
              )}
              {statusData?.mandatory_fields_completed && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-indigo-500" />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Submitted for Review
                  </span>
                </div>
              )}
              {statusData?.approval_status === "under_review" && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-yellow-500 animate-pulse" />
                  <span className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
                    Under Admin Review
                  </span>
                </div>
              )}
              {statusData?.approval_status === "approved" && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-green-500" />
                  <span className={`text-sm font-semibold ${darkMode ? "text-green-400" : "text-green-600"}`}>
                    Approved! Ready to practice ✓
                  </span>
                </div>
              )}
              {statusData?.approval_status === "rejected" && (
                <div className="flex items-center gap-3">
                  <div className="w-2 h-2 rounded-full bg-red-500" />
                  <span className={`text-sm font-semibold ${darkMode ? "text-red-400" : "text-red-600"}`}>
                    Application Rejected
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="p-6 bg-gray-50 dark:bg-gray-900/50 flex flex-wrap gap-3">
            {!statusData?.mandatory_fields_completed && (
              <motion.button
                onClick={() => navigate(ROUTES.SPECIALIST_PROFILE)}
                className="flex-1 min-w-[200px] px-6 py-3 rounded-lg bg-indigo-600 text-white font-semibold hover:bg-indigo-700 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <FileText size={18} />
                Complete Profile
              </motion.button>
            )}
            
            {statusData?.approval_status === "approved" && (
              <motion.button
                onClick={() => navigate(ROUTES.SPECIALIST_DASHBOARD)}
                className="flex-1 min-w-[200px] px-6 py-3 rounded-lg bg-green-600 text-white font-semibold hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
              >
                <Home size={18} />
                Go to Dashboard
              </motion.button>
            )}

            <motion.button
              onClick={() => navigate(ROUTES.LOGIN)}
              className={`px-6 py-3 rounded-lg font-semibold transition-colors flex items-center gap-2 ${
                darkMode
                  ? "bg-gray-700 text-white hover:bg-gray-600"
                  : "bg-gray-200 text-gray-700 hover:bg-gray-300"
              }`}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
            >
              <ArrowLeft size={18} />
              Logout
            </motion.button>
          </div>
        </motion.div>

        {/* Help Section */}
        <motion.div
          className={`mt-8 p-6 rounded-xl ${
            darkMode ? "bg-gray-800" : "bg-white"
          } shadow-lg`}
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
        >
          <h3 className={`text-lg font-semibold mb-3 flex items-center gap-2 ${
            darkMode ? "text-gray-200" : "text-gray-900"
          }`}>
            <Mail size={20} />
            Need Help?
          </h3>
          <p className={`mb-3 ${darkMode ? "text-gray-300" : "text-gray-600"}`}>
            If you have questions about your application status, please contact our support team.
          </p>
          <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
            <p>📧 Email: support@mindmate.com</p>
            <p>📱 Phone: +92 300 1234567</p>
            <p>⏰ Hours: Mon-Fri, 9:00 AM - 6:00 PM</p>
          </div>
        </motion.div>

        {/* Auto-refresh Notice */}
        <motion.p
          className={`text-center mt-6 text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ delay: 0.5 }}
        >
          Status updates automatically every 30 seconds
        </motion.p>
      </div>
    </div>
  );
};

export default SpecialistApplicationStatus;

