import { useState, useEffect, useCallback } from "react";
import { motion } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { useAdminAPI } from "../../hooks/useAdminAPI";
import {
  Users, Trash2, LogOut, User, Mail, Calendar, Phone, MapPin,
  AlertCircle, CheckCircle, XCircle, Clock, Award, Sun, Moon,
  FileText, Globe, Settings, Shield, MessageSquare, Eye, Download,
  Star, Activity, BarChart, BookOpen, Heart, UserCheck, Home, TrendingUp,
  ChevronLeft, ArrowRight
} from "react-feather";
import { Modal } from "../common/Modal";
import { API_URL } from "../../config/api";
import { ROUTES } from "../../config/routes";
import { initializeTokenRefresh, cleanupTokenRefresh } from "../../utils/tokenRefresh";
import { APIErrorHandler } from "../../utils/errorHandler";
import { toast } from "react-hot-toast";
import { AuthStorage } from "../../utils/localStorage";
import ConfirmationDialog, { useConfirmationDialog, DeleteConfirmationDialog } from "../common/ConfirmationDialog";

const AdminDashboard = () => {
  const [patients, setPatients] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [darkMode, setDarkMode] = useState(false);
  const [activeTab, setActiveTab] = useState("overview");
  const [activeSidebarItem, setActiveSidebarItem] = useState("dashboard");
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [showSpecialistDetailsModal, setShowSpecialistDetailsModal] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [sidebarWidth, setSidebarWidth] = useState(240); // Start expanded
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const navigate = useNavigate();

  // Confirmation dialogs for different actions
  const deletePatientDialog = useConfirmationDialog();
  const activatePatientDialog = useConfirmationDialog();
  const deactivatePatientDialog = useConfirmationDialog();
  const approveSpecialistDialog = useConfirmationDialog();
  const rejectSpecialistDialog = useConfirmationDialog();
  const suspendSpecialistDialog = useConfirmationDialog();
  const unsuspendSpecialistDialog = useConfirmationDialog();
  const [reportActionDialog, setReportActionDialog] = useState({ isOpen: false, action: null, reportId: null });
  const [pendingAction, setPendingAction] = useState(null);
  const [selectedPatientForDelete, setSelectedPatientForDelete] = useState(null);

  // Use the admin API hook
  const adminAPI = useAdminAPI();

  // Toggle sidebar collapse
  const toggleSidebar = () => {
    setSidebarCollapsed(!sidebarCollapsed);
    setSidebarWidth(!sidebarCollapsed ? 72 : 240); // Use !sidebarCollapsed (new value)
  };

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  // Initialize token auto-refresh on mount
  useEffect(() => {
    initializeTokenRefresh();
    
    return () => {
      cleanupTokenRefresh();
    };
  }, []);

  // ProtectedRoute already handles authentication and authorization
  // Only fetch data on mount - user type is validated by ProtectedRoute
  useEffect(() => {
    // Fetch initial data in parallel with coordinated loading state
    const loadInitialData = async () => {
      setLoading(true);
      try {
        // Fetch all data in parallel
        await Promise.all([
          fetchPatients(),
          fetchSpecialists(),
          fetchReports()
        ]);
      } catch (error) {
        // Individual fetch functions handle their own errors
        console.error("Error loading initial data:", error);
      } finally {
        setLoading(false);
      }
    };
    
    loadInitialData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const fetchPatients = useCallback(async () => {
    try {
      const response = await adminAPI.getPatients();
      console.log("Fetched patients data:", response);
      setPatients(response);
      setError(""); // Clear any previous errors
    } catch (error) {
      const errorInfo = APIErrorHandler.handleAdminError(error, 'patient');
      setError(errorInfo.message);
      toast.error(errorInfo.message);
      throw error; // Re-throw for Promise.all handling
    }
  }, [adminAPI]);

  const fetchSpecialists = useCallback(async () => {
    try {
      const response = await adminAPI.getSpecialists();
      setSpecialists(response);
      setError(""); // Clear any previous errors
    } catch (error) {
      const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
      setError(errorInfo.message);
      toast.error(errorInfo.message);
      throw error; // Re-throw for Promise.all handling
    }
  }, [adminAPI]);

  const fetchReports = useCallback(async () => {
    try {
      const response = await adminAPI.getReports();
      setReports(response);
      setError(""); // Clear any previous errors
    } catch (error) {
      const errorInfo = APIErrorHandler.handleAdminError(error, 'report');
      setError(errorInfo.message);
      toast.error(errorInfo.message);
      throw error; // Re-throw for Promise.all handling
    }
  }, [adminAPI]);

  // Sidebar content based on active tab
  const getSidebarContent = () => {
    switch (activeTab) {
      case "overview":
        return [
          { id: "dashboard", icon: <BarChart size={18} />, label: "Dashboard", active: activeSidebarItem === "dashboard" },
          { id: "recent-activity", icon: <Activity size={18} />, label: "Recent Activity", active: activeSidebarItem === "recent-activity" },
          { id: "system-stats", icon: <TrendingUp size={18} />, label: "System Stats", active: activeSidebarItem === "system-stats" },
        ];
      case "patients":
        return [
          { id: "all-patients", icon: <Users size={18} />, label: "All Patients", active: activeSidebarItem === "all-patients" },
          { id: "active-patients", icon: <CheckCircle size={18} />, label: "Active Patients", active: activeSidebarItem === "active-patients" },
          { id: "inactive-patients", icon: <XCircle size={18} />, label: "Inactive Patients", active: activeSidebarItem === "inactive-patients" },
        ];
      case "specialists":
        return [
          { id: "pending-approvals", icon: <Clock size={18} />, label: "Pending Approvals", active: activeSidebarItem === "pending-approvals" },
          { id: "approved-specialists", icon: <CheckCircle size={18} />, label: "Approved Specialists", active: activeSidebarItem === "approved-specialists" },
          { id: "suspended-specialists", icon: <AlertCircle size={18} />, label: "Suspended Specialists", active: activeSidebarItem === "suspended-specialists" },
          { id: "rejected-specialists", icon: <XCircle size={18} />, label: "Rejected Specialists", active: activeSidebarItem === "rejected-specialists" },
        ];
      case "reports":
        return [
          { id: "pending-reports", icon: <Clock size={18} />, label: "Pending Reports", active: activeSidebarItem === "pending-reports" },
          { id: "resolved-reports", icon: <CheckCircle size={18} />, label: "Resolved Reports", active: activeSidebarItem === "resolved-reports" },
          { id: "removed-content", icon: <Trash2 size={18} />, label: "Removed Content", active: activeSidebarItem === "removed-content" },
        ];
      default:
        return [];
    }
  };

  // Handler functions
  const handleDeletePatient = async (patientId) => {
    const patient = patients.find(p => p.id === patientId);
    if (patient) {
      setSelectedPatientForDelete(patient);
      deletePatientDialog.openDialog(async () => {
        try {
          await adminAPI.deletePatient(patientId);
          setPatients(patients.filter(p => p.id !== patientId));
          toast.success("Patient deleted successfully");
        } catch (error) {
          const errorInfo = APIErrorHandler.handleAdminError(error, 'patient');
          toast.error(errorInfo.message);
        } finally {
          setSelectedPatientForDelete(null);
        }
      });
    }
  };

  const handleActivatePatient = async (patientId) => {
    activatePatientDialog.openDialog(async () => {
      try {
        await adminAPI.activatePatient(patientId);

        setPatients(patients.map(patient => 
          patient.id === patientId 
            ? { ...patient, is_active: true }
            : patient
        ));
        
        toast.success("Patient activated successfully");
        fetchPatients();
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'patient');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleDeactivatePatient = async (patientId) => {
    deactivatePatientDialog.openDialog(async () => {
      try {
        await adminAPI.deactivatePatient(patientId);

        setPatients(patients.map(patient => 
          patient.id === patientId 
            ? { ...patient, is_active: false }
            : patient
        ));
        
        toast.success("Patient deactivated successfully");
        fetchPatients();
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'patient');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleApproveSpecialist = async (specialistId) => {
    approveSpecialistDialog.openDialog(async () => {
      try {
        await adminAPI.approveSpecialist(specialistId, {
          reason: "Application approved by admin",
          admin_notes: "Specialist meets all requirements and has been approved."
        });

        setSpecialists(specialists.map(specialist => 
          specialist.id === specialistId 
            ? { ...specialist, approval_status: "approved" }
            : specialist
        ));
        
        toast.success("Specialist approved successfully");
        fetchSpecialists();
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleRejectSpecialist = async (specialistId) => {
    rejectSpecialistDialog.openDialog(async () => {
      try {
        await adminAPI.rejectSpecialist(specialistId, {
          reason: "Application rejected by admin",
          admin_notes: "Specialist application does not meet requirements."
        });

        setSpecialists(specialists.filter(specialist => specialist.id !== specialistId));
        toast.success("Specialist application rejected");
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleSuspendSpecialist = async (specialistId) => {
    suspendSpecialistDialog.openDialog(async () => {
      try {
        await adminAPI.suspendSpecialist(specialistId);

        setSpecialists(specialists.map(specialist => 
          specialist.id === specialistId 
            ? { ...specialist, approval_status: "suspended" }
            : specialist
        ));
        
        toast.success("Specialist suspended successfully");
        fetchSpecialists();
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleUnsuspendSpecialist = async (specialistId) => {
    unsuspendSpecialistDialog.openDialog(async () => {
      try {
        await adminAPI.unsuspendSpecialist(specialistId);

        setSpecialists(specialists.map(specialist => 
          specialist.id === specialistId 
            ? { ...specialist, approval_status: "approved" }
            : specialist
        ));
        
        toast.success("Specialist unsuspended successfully");
        fetchSpecialists();
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
        toast.error(errorInfo.message);
      }
    });
  };

  const handleViewSpecialistDetails = async (specialistId) => {
    // Navigate to the comprehensive application review page
    navigate(ROUTES.ADMIN_SPECIALIST_APPLICATION(specialistId));
  };

  const handleViewDocument = async (documentUrl) => {
    try {
      const { blob } = await adminAPI.downloadDocument(documentUrl);
      const objectUrl = window.URL.createObjectURL(blob);
      const newWindow = window.open(objectUrl, '_blank', 'noopener,noreferrer');
      if (!newWindow) {
        throw new Error('Popup blocked. Please allow popups for this site to preview documents.');
      }
      newWindow.onload = () => {
        setTimeout(() => window.URL.revokeObjectURL(objectUrl), 60_000);
      };
      setError("");
    } catch (error) {
      console.error("Error viewing document:", error);
      const errorInfo = APIErrorHandler.handleAdminError(error, 'document');
      setError(errorInfo.message || "Failed to open document");
      toast.error(errorInfo.message || "Failed to open document");
    }
  };

  const handleDownloadDocument = async (documentUrl, documentName = 'document') => {
    try {
      const { blob, fileName } = await adminAPI.downloadDocument(documentUrl, { asDownload: true });
      const downloadName = documentName.includes('.') ? documentName : `${documentName}.${fileName.split('.').pop() || 'pdf'}`;
      const link = document.createElement('a');
      link.href = window.URL.createObjectURL(blob);
      link.setAttribute('download', downloadName);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      setTimeout(() => window.URL.revokeObjectURL(link.href), 60_000);
      setError("");
    } catch (error) {
      console.error("Error downloading document:", error);
      const errorInfo = APIErrorHandler.handleAdminError(error, 'document');
      setError(errorInfo.message || "Failed to download document");
      toast.error(errorInfo.message || "Failed to download document");
    }
  };

  const handleReportAction = async (reportId, action) => {
    const actionText = action === "keep" ? "resolve" : "remove";
    setReportActionDialog({ isOpen: true, action, reportId });
    setPendingAction(async () => {
      try {
        await adminAPI.handleReport(reportId, action);
        fetchReports();
        setError("");
        toast.success(`Report ${actionText}d successfully`);
      } catch (error) {
        const errorInfo = APIErrorHandler.handleAdminError(error, 'report');
        toast.error(errorInfo.message);
      }
    });
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 mx-auto mb-4"></div>
          <p>Loading admin dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`h-screen flex flex-col ${darkMode ? "bg-gray-900" : "bg-gray-50"}`}>
      {/* Top Navigation Bar */}
      <header className={`sticky top-0 z-50 ${
        darkMode ? "bg-gray-800" : "bg-white"
      } shadow-md py-4 px-6 flex justify-between items-center`}>
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          className="flex items-center space-x-2"
        >
          <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
            M
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
            MindMate Admin
          </h1>
        </motion.div>

        <div className="flex items-center space-x-4">
          {/* Navigation Tabs */}
          <div className="flex items-center space-x-2">
            <button
              onClick={() => {
                setActiveTab("overview");
                setActiveSidebarItem("dashboard");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "overview"
                  ? darkMode
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-700"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Home size={18} />
              <span className="text-sm font-medium">Overview</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("patients");
                setActiveSidebarItem("all-patients");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "patients"
                  ? darkMode
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-700"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <Users size={18} />
              <span className="text-sm font-medium">Patients</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("specialists");
                setActiveSidebarItem("pending-approvals");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "specialists"
                  ? darkMode
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-700"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <UserCheck size={18} />
              <span className="text-sm font-medium">Specialists</span>
            </button>

            <button
              onClick={() => {
                setActiveTab("reports");
                setActiveSidebarItem("pending-reports");
              }}
              className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
                activeTab === "reports"
                  ? darkMode
                    ? "bg-indigo-600 text-white"
                    : "bg-indigo-100 text-indigo-700"
                  : darkMode
                  ? "text-gray-400 hover:text-white hover:bg-gray-700"
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              <AlertCircle size={18} />
              <span className="text-sm font-medium">Reports</span>
            </button>
          </div>
        </div>

        <div className="flex items-center space-x-4">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className={`p-2 rounded-full ${
              darkMode
                ? "bg-gray-700 text-yellow-300 hover:bg-gray-600"
                : "bg-gray-200 text-gray-700 hover:bg-gray-300"
            }`}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </button>
          
          {/* Profile Dropdown */}
          <div className="relative">
            <button
              onClick={() => setShowProfileDropdown(!showProfileDropdown)}
              className="flex items-center justify-center w-10 h-10 rounded-full focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
              aria-label="Profile menu"
            >
              <div
                className={`w-8 h-8 rounded-full ${
                  darkMode ? "bg-gray-600" : "bg-gray-200"
                } flex items-center justify-center border ${
                  darkMode ? "border-gray-500" : "border-gray-300"
                }`}
              >
                <User
                  size={18}
                  className={darkMode ? "text-gray-200" : "text-gray-700"}
                  strokeWidth={2}
                />
              </div>
            </button>

            {showProfileDropdown && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95, y: -10 }}
                animate={{ opacity: 1, scale: 1, y: 0 }}
                exit={{ opacity: 0, scale: 0.95, y: -10 }}
                transition={{ duration: 0.15 }}
                className={`absolute right-0 mt-2 w-48 origin-top-right rounded-md shadow-lg z-50 ${
                  darkMode
                    ? "bg-gray-800 border border-gray-700"
                    : "bg-white ring-1 ring-black ring-opacity-5"
                }`}
              >
                <div className="py-1">
                  <button
                    onClick={() => setShowProfileDropdown(false)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                      darkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <User size={16} className="mr-2" />
                    Profile
                  </button>
                  <button
                    onClick={() => setShowProfileDropdown(false)}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                      darkMode
                        ? "text-gray-300 hover:bg-gray-700"
                        : "text-gray-700 hover:bg-gray-100"
                    }`}
                  >
                    <Settings size={16} className="mr-2" />
                    Settings
                  </button>
                  <div
                    className={`border-t my-1 ${
                      darkMode ? "border-gray-700" : "border-gray-200"
                    }`}
                  ></div>
                  <button
                    onClick={() => {
                      setShowProfileDropdown(false);
                      setShowLogoutModal(true);
                    }}
                    className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                      darkMode
                        ? "text-red-400 hover:bg-gray-700"
                        : "text-red-600 hover:bg-gray-100"
                    }`}
                  >
                    <LogOut size={16} className="mr-2" />
                    Log Out
                  </button>
                </div>
              </motion.div>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Sidebar */}
        <aside
          className={`${
            darkMode ? "bg-gray-800" : "bg-white"
          } border-r ${
            darkMode ? "border-gray-700" : "border-gray-200"
          } transition-all duration-300`}
          style={{ width: `${sidebarWidth}px` }}
        >
          {/* Sidebar Header with Toggle Button */}
          <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700">
            <div className={`transition-opacity duration-300 ${
              sidebarWidth > 72 ? "opacity-100" : "opacity-0"
            }`}>
              <h2 className={`text-lg font-semibold ${
                darkMode ? "text-white" : "text-gray-900"
              }`}>
                Admin Panel
              </h2>
            </div>
            <button
              onClick={toggleSidebar}
              className={`p-2 rounded-lg transition-colors ${
                darkMode 
                  ? "text-gray-400 hover:text-white hover:bg-gray-700" 
                  : "text-gray-500 hover:text-gray-900 hover:bg-gray-100"
              }`}
            >
              {sidebarCollapsed ? (
                <ArrowRight size={20} />
              ) : (
                <ChevronLeft size={20} />
              )}
            </button>
          </div>
          
          <div className="p-4">
            <nav className="space-y-2">
              {getSidebarContent().map((item) => (
                <button
                  key={item.id}
                  onClick={() => {
                    setActiveSidebarItem(item.id);
                    // Logic to navigate to specific tab content
                  }}
                                     className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg transition-colors ${
                     item.active
                       ? darkMode
                         ? "bg-indigo-600 text-white"
                         : "bg-indigo-100 text-indigo-700"
                       : darkMode
                       ? "text-gray-300 hover:bg-gray-700 hover:text-white"
                       : "text-gray-600 hover:bg-gray-100 hover:text-gray-900"
                   }`}
                 >
                   <div className={`flex-shrink-0 ${
                     item.active
                       ? darkMode
                         ? "text-white"
                         : "text-indigo-700"
                       : darkMode
                       ? "text-gray-300"
                       : "text-gray-600"
                   }`}>
                     {item.icon}
                   </div>
                   <span className={`transition-opacity duration-300 ${
                     sidebarWidth > 72 ? "opacity-100" : "opacity-0"
                   }`}>
                     {item.label}
                   </span>
                 </button>
              ))}
            </nav>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 overflow-y-auto p-6">
          {/* Error Message */}
          {error && (
            <motion.div
              className={`mb-6 p-4 rounded-lg flex items-center space-x-2 ${
                darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700"
              }`}
              initial={{ opacity: 0, y: -20 }}
              animate={{ opacity: 1, y: 0 }}
            >
              <AlertCircle className="h-5 w-5" />
              <span>{error}</span>
            </motion.div>
          )}

          {/* Content based on activeTab and activeSidebarItem */}
          {activeTab === "overview" && (
            <OverviewContent 
              darkMode={darkMode} 
              patients={patients} 
              specialists={specialists} 
              reports={reports}
              activeSidebarItem={activeSidebarItem}
            />
          )}

          {activeTab === "patients" && (
            <PatientsContent 
              darkMode={darkMode} 
              patients={patients} 
              activeSidebarItem={activeSidebarItem}
              onDeletePatient={handleDeletePatient}
              onActivatePatient={handleActivatePatient}
              onDeactivatePatient={handleDeactivatePatient}
            />
          )}

          {activeTab === "specialists" && (
            <SpecialistsContent 
              darkMode={darkMode} 
              specialists={specialists} 
              activeSidebarItem={activeSidebarItem}
              onApproveSpecialist={handleApproveSpecialist}
              onRejectSpecialist={handleRejectSpecialist}
              onSuspendSpecialist={handleSuspendSpecialist}
              onUnsuspendSpecialist={handleUnsuspendSpecialist}
              onViewSpecialistDetails={handleViewSpecialistDetails}
            />
          )}

          {activeTab === "reports" && (
            <ReportsContent 
              darkMode={darkMode} 
              reports={reports} 
              activeSidebarItem={activeSidebarItem}
              onReportAction={handleReportAction}
            />
          )}
        </main>
      </div>

      {/* Logout Confirmation Modal */}
      <Modal isOpen={showLogoutModal} onClose={() => setShowLogoutModal(false)}>
        <div
          className={`p-6 rounded-lg ${
            darkMode ? "bg-gray-800" : "bg-white"
          } text-center`}
        >
          <h3
            className={`text-lg font-medium mb-4 ${
              darkMode ? "text-white" : "text-gray-900"
            }`}
          >
            Are you sure you want to log out?
          </h3>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowLogoutModal(false)}
              className={`px-4 py-2 rounded-md ${
                darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-800"
              }`}
            >
              Cancel
            </button>
            <button
              onClick={() => {
                AuthStorage.clearAuth();
                navigate(ROUTES.LOGIN);
              }}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </button>
          </div>
        </div>
      </Modal>

      {/* Confirmation Dialogs */}
      {/* Delete Patient Confirmation */}
      <DeleteConfirmationDialog
        isOpen={deletePatientDialog.isOpen}
        itemName={selectedPatientForDelete?.full_name || selectedPatientForDelete ? `${selectedPatientForDelete?.first_name} ${selectedPatientForDelete?.last_name}` : "patient"}
        itemType="Patient"
        onConfirm={deletePatientDialog.confirmAction}
        onCancel={() => {
          deletePatientDialog.closeDialog();
          setSelectedPatientForDelete(null);
        }}
      />

      {/* Activate Patient Confirmation */}
      <ConfirmationDialog
        isOpen={activatePatientDialog.isOpen}
        title="Activate Patient"
        message="Are you sure you want to activate this patient?"
        confirmText="Activate"
        confirmButtonColor="green"
        type="info"
        onConfirm={activatePatientDialog.confirmAction}
        onCancel={activatePatientDialog.closeDialog}
      />

      {/* Deactivate Patient Confirmation */}
      <ConfirmationDialog
        isOpen={deactivatePatientDialog.isOpen}
        title="Deactivate Patient"
        message="Are you sure you want to deactivate this patient?"
        confirmText="Deactivate"
        confirmButtonColor="orange"
        type="warning"
        onConfirm={deactivatePatientDialog.confirmAction}
        onCancel={deactivatePatientDialog.closeDialog}
      />

      {/* Approve Specialist Confirmation */}
      <ConfirmationDialog
        isOpen={approveSpecialistDialog.isOpen}
        title="Approve Specialist"
        message="Are you sure you want to approve this specialist application?"
        confirmText="Approve"
        confirmButtonColor="green"
        type="info"
        onConfirm={approveSpecialistDialog.confirmAction}
        onCancel={approveSpecialistDialog.closeDialog}
      />

      {/* Reject Specialist Confirmation */}
      <ConfirmationDialog
        isOpen={rejectSpecialistDialog.isOpen}
        title="Reject Specialist"
        message="Are you sure you want to reject this specialist? This will mark their application as rejected."
        confirmText="Reject"
        confirmButtonColor="red"
        type="danger"
        onConfirm={rejectSpecialistDialog.confirmAction}
        onCancel={rejectSpecialistDialog.closeDialog}
      />

      {/* Suspend Specialist Confirmation */}
      <ConfirmationDialog
        isOpen={suspendSpecialistDialog.isOpen}
        title="Suspend Specialist"
        message="Are you sure you want to suspend this specialist?"
        confirmText="Suspend"
        confirmButtonColor="orange"
        type="warning"
        onConfirm={suspendSpecialistDialog.confirmAction}
        onCancel={suspendSpecialistDialog.closeDialog}
      />

      {/* Unsuspend Specialist Confirmation */}
      <ConfirmationDialog
        isOpen={unsuspendSpecialistDialog.isOpen}
        title="Unsuspend Specialist"
        message="Are you sure you want to unsuspend this specialist?"
        confirmText="Unsuspend"
        confirmButtonColor="green"
        type="info"
        onConfirm={unsuspendSpecialistDialog.confirmAction}
        onCancel={unsuspendSpecialistDialog.closeDialog}
      />

      {/* Report Action Confirmation */}
      <ConfirmationDialog
        isOpen={reportActionDialog.isOpen}
        title={`${reportActionDialog.action === "keep" ? "Resolve" : "Remove"} Report`}
        message={`Are you sure you want to ${reportActionDialog.action === "keep" ? "resolve" : "remove"} this report?`}
        confirmText={reportActionDialog.action === "keep" ? "Resolve" : "Remove"}
        confirmButtonColor={reportActionDialog.action === "keep" ? "green" : "red"}
        type={reportActionDialog.action === "keep" ? "info" : "warning"}
        onConfirm={() => {
          if (pendingAction) {
            pendingAction();
            setPendingAction(null);
          }
          setReportActionDialog({ isOpen: false, action: null, reportId: null });
        }}
        onCancel={() => {
          setReportActionDialog({ isOpen: false, action: null, reportId: null });
          setPendingAction(null);
        }}
      />

      {/* Specialist Details Modal - Redesigned */}
      <Modal isOpen={showSpecialistDetailsModal} onClose={() => setShowSpecialistDetailsModal(false)}>
        <div
          className={`rounded-xl max-w-5xl w-full max-h-[85vh] overflow-hidden flex flex-col shadow-2xl mx-4 ${
            darkMode ? "bg-gray-900" : "bg-white"
          }`}
          role="dialog"
          aria-labelledby="specialist-modal-title"
          aria-describedby="specialist-modal-description"
        >
          {selectedSpecialist && (
            <>
              {/* IMPROVED HEADER WITH BETTER SPACING */}
              <div className={`px-6 py-6 border-b ${darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"}`}>
                <div className="flex items-start justify-between gap-6">
                  {/* Left Section - Profile & Info */}
                  <div className="flex items-start gap-6 flex-1 min-w-0">
                    {/* Profile Photo */}
                    <div className="flex-shrink-0">
                      {selectedSpecialist.profile_photo_url ? (
                        <img 
                          src={selectedSpecialist.profile_photo_url} 
                          alt={`${selectedSpecialist.first_name} ${selectedSpecialist.last_name}`}
                          className="w-20 h-20 rounded-full object-cover border-2 border-gray-300 dark:border-gray-600 shadow-sm"
                          onError={(e) => {
                            e.target.style.display = 'none';
                            e.target.nextElementSibling.style.display = 'flex';
                          }}
                        />
                      ) : null}
                      <div 
                        className={`w-20 h-20 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center border-2 border-gray-300 dark:border-gray-600 shadow-sm ${selectedSpecialist.profile_photo_url ? 'hidden' : 'flex'}`}
                      >
                        <User size={32} className={darkMode ? "text-gray-400" : "text-gray-500"} />
                      </div>
                    </div>
                    
                    {/* Name & Basic Info */}
                    <div className="flex-1 min-w-0">
                      <h2 id="specialist-modal-title" className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                        Dr. {selectedSpecialist.first_name} {selectedSpecialist.last_name}
                      </h2>
                      <p className={`text-base mb-1 ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                        {selectedSpecialist.specialist_type?.replace('_', ' ').toUpperCase() || "SPECIALIST"}
                      </p>
                      <p className={`text-sm ${darkMode ? "text-gray-500" : "text-gray-500"}`}>
                        ID: {selectedSpecialist.id}
                      </p>
                    </div>
                  </div>
                  
                  {/* Right Section - Status & Close */}
                  <div className="flex flex-col items-end gap-4 flex-shrink-0">
                    {/* Status Badges - Vertical Layout */}
                    <div className="flex flex-col gap-2">
                      <StatusBadge status={selectedSpecialist.approval_status} darkMode={darkMode} />
                      {selectedSpecialist.email_verification_status === "verified" && (
                        <StatusBadge status="verified" darkMode={darkMode} />
                      )}
                      {selectedSpecialist.is_active && (
                        <StatusBadge status="active" darkMode={darkMode} />
                      )}
                    </div>
                    
                    {/* Close Button */}
                    <button
                      onClick={() => setShowSpecialistDetailsModal(false)}
                      className={`p-2 rounded-lg transition-colors ${
                        darkMode 
                          ? "hover:bg-gray-700 text-gray-400 hover:text-white" 
                          : "hover:bg-gray-200 text-gray-500 hover:text-gray-700"
                      }`}
                      aria-label="Close specialist details"
                    >
                      <XCircle size={20} />
                    </button>
                  </div>
                </div>
              </div>

              {/* SCROLLABLE CONTENT */}
              <div className="flex-1 overflow-y-auto px-6 py-6 space-y-4">
                <div id="specialist-modal-description" className="sr-only">
                  Specialist profile details including personal information, credentials, practice details, and verification status.
                </div>
                
                {/* PERSONAL INFORMATION */}
                <CollapsibleSection 
                  title="Personal Information" 
                  icon={<User size={20} />} 
                  darkMode={darkMode}
                  defaultOpen={true}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                    <InfoField 
                      label="First Name" 
                      value={selectedSpecialist.first_name} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Last Name" 
                      value={selectedSpecialist.last_name} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Email" 
                      value={selectedSpecialist.email} 
                      icon={<Mail size={16} />} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Phone" 
                      value={selectedSpecialist.phone} 
                      icon={<Phone size={16} />} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Gender" 
                      value={selectedSpecialist.gender} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Date of Birth" 
                      value={selectedSpecialist.date_of_birth ? new Date(selectedSpecialist.date_of_birth).toLocaleDateString() : null} 
                      icon={<Calendar size={16} />}
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="CNIC Number" 
                      value={selectedSpecialist.cnic_number} 
                      darkMode={darkMode} 
                    />
                  </div>
                </CollapsibleSection>

                {/* PROFESSIONAL CREDENTIALS */}
                <CollapsibleSection 
                  title="Professional Credentials" 
                  icon={<Award size={20} />} 
                  darkMode={darkMode}
                  defaultOpen={true}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField 
                        label="Qualification" 
                        value={selectedSpecialist.qualification} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="Institution" 
                        value={selectedSpecialist.institution} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="Years of Experience" 
                        value={selectedSpecialist.years_experience ? `${selectedSpecialist.years_experience} years` : null} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="License Number" 
                        value={selectedSpecialist.license_number} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="License Authority" 
                        value={selectedSpecialist.license_authority} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="License Expiry" 
                        value={selectedSpecialist.license_expiry_date ? new Date(selectedSpecialist.license_expiry_date).toLocaleDateString() : null} 
                        darkMode={darkMode} 
                      />
                    </div>
                    
                    {/* Certifications */}
                    {selectedSpecialist.certifications && selectedSpecialist.certifications.length > 0 && (
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Certifications
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSpecialist.certifications.map((cert, idx) => (
                            <span key={idx} className={`px-3 py-1 rounded-full text-sm border ${
                              darkMode ? "bg-blue-900/30 text-blue-300 border-blue-700" : "bg-blue-100 text-blue-800 border-blue-300"
                            }`}>
                              {cert}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                    
                    {/* Languages */}
                    {selectedSpecialist.languages_spoken && selectedSpecialist.languages_spoken.length > 0 && (
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Languages Spoken
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSpecialist.languages_spoken.map((lang, idx) => (
                            <span key={idx} className={`px-3 py-1 rounded-full text-sm border ${
                              darkMode ? "bg-purple-900/30 text-purple-300 border-purple-700" : "bg-purple-100 text-purple-800 border-purple-300"
                            }`}>
                              {lang}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* PRACTICE DETAILS */}
                <CollapsibleSection 
                  title="Practice Details" 
                  icon={<MapPin size={20} />} 
                  darkMode={darkMode}
                  defaultOpen={false}
                >
                  <div className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField 
                        label="Current Affiliation" 
                        value={selectedSpecialist.current_affiliation} 
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="Clinic Address" 
                        value={selectedSpecialist.clinic_address} 
                        icon={<MapPin size={16} />}
                        darkMode={darkMode} 
                      />
                      <InfoField 
                        label="Consultation Fee" 
                        value={selectedSpecialist.consultation_fee ? 
                          `${selectedSpecialist.currency || 'PKR'} ${selectedSpecialist.consultation_fee}` : null} 
                        darkMode={darkMode} 
                      />
                      <div>
                        <InfoField 
                          label="Accepting New Patients" 
                          value={selectedSpecialist.accepting_new_patients ? "Yes" : "No"} 
                          darkMode={darkMode}
                          status={true}
                        />
                      </div>
                    </div>
                    
                    {selectedSpecialist.consultation_modes && selectedSpecialist.consultation_modes.length > 0 && (
                      <div>
                        <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                          Consultation Modes
                        </h4>
                        <div className="flex flex-wrap gap-2">
                          {selectedSpecialist.consultation_modes.map((mode, idx) => (
                            <span key={idx} className={`px-3 py-1 rounded-full text-sm border ${
                              darkMode ? "bg-green-900/30 text-green-300 border-green-700" : "bg-green-100 text-green-800 border-green-300"
                            }`}>
                              {mode.replace('_', ' ').toUpperCase()}
                            </span>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </CollapsibleSection>

                {/* AVAILABILITY SCHEDULE */}
                {selectedSpecialist.availability_schedule && 
                 Object.keys(selectedSpecialist.availability_schedule).length > 0 && (
                  <CollapsibleSection 
                    title="Weekly Availability" 
                    icon={<Clock size={20} />} 
                    darkMode={darkMode}
                    defaultOpen={false}
                  >
                    <div className="space-y-2">
                      {['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'].map((day) => {
                        const daySchedule = selectedSpecialist.availability_schedule[day];
                        const dayNames = {
                          Mon: 'Monday', Tue: 'Tuesday', Wed: 'Wednesday',
                          Thu: 'Thursday', Fri: 'Friday', Sat: 'Saturday', Sun: 'Sunday'
                        };
                        
                        return (
                          <div key={day} className={`flex items-center justify-between p-3 rounded-lg border ${
                            daySchedule && daySchedule.length > 0
                              ? darkMode ? "bg-green-900/20 border-green-700" : "bg-green-50 border-green-200"
                              : darkMode ? "bg-gray-700 border-gray-600" : "bg-gray-100 border-gray-300"
                          }`}>
                            <span className={`font-medium w-24 ${darkMode ? "text-white" : "text-gray-900"}`}>
                              {dayNames[day]}
                            </span>
                            <span className={`flex-1 text-center ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {daySchedule && daySchedule.length > 0
                                ? daySchedule.join(', ')
                                : 'Not Available'}
                            </span>
                            <span className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                              {daySchedule && daySchedule.length > 0 ? '✓' : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </CollapsibleSection>
                )}

                {/* SPECIALIZATIONS & EXPERTISE */}
                {((selectedSpecialist.specialties_in_mental_health && selectedSpecialist.specialties_in_mental_health.length > 0) ||
                  (selectedSpecialist.therapy_methods && selectedSpecialist.therapy_methods.length > 0)) && (
                  <CollapsibleSection 
                    title="Specializations & Expertise" 
                    icon={<Heart size={20} />} 
                    darkMode={darkMode}
                    defaultOpen={false}
                  >
                    <div className="space-y-4">
                      {selectedSpecialist.specialties_in_mental_health && 
                       selectedSpecialist.specialties_in_mental_health.length > 0 && (
                        <div>
                          <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Mental Health Specialties
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedSpecialist.specialties_in_mental_health.map((spec, idx) => (
                              <span key={idx} className={`px-3 py-1 rounded-full text-sm border ${
                                darkMode ? "bg-purple-900/30 text-purple-300 border-purple-700" : "bg-purple-100 text-purple-800 border-purple-300"
                              }`}>
                                {spec.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                      
                      {selectedSpecialist.therapy_methods && 
                       selectedSpecialist.therapy_methods.length > 0 && (
                        <div>
                          <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Therapy Methods
                          </h4>
                          <div className="flex flex-wrap gap-2">
                            {selectedSpecialist.therapy_methods.map((method, idx) => (
                              <span key={idx} className={`px-3 py-1 rounded-full text-sm border ${
                                darkMode ? "bg-pink-900/30 text-pink-300 border-pink-700" : "bg-pink-100 text-pink-800 border-pink-300"
                              }`}>
                                {method.replace(/_/g, ' ').toUpperCase()}
                              </span>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* PROFESSIONAL SUMMARY / BIO */}
                {selectedSpecialist.experience_summary && (
                  <CollapsibleSection 
                    title="Professional Summary" 
                    icon={<FileText size={20} />} 
                    darkMode={darkMode}
                    defaultOpen={false}
                  >
                    <div className={`p-4 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                      <p className={`text-sm leading-relaxed whitespace-pre-wrap ${
                        darkMode ? "text-gray-300" : "text-gray-700"
                      }`}>
                        {selectedSpecialist.experience_summary}
                      </p>
                    </div>
                  </CollapsibleSection>
                )}

                {/* DOCUMENTS & VERIFICATION */}
                {((selectedSpecialist.license_document_url) || 
                  (selectedSpecialist.cnic_document_url) ||
                  (selectedSpecialist.registration_documents && 
                   Object.keys(selectedSpecialist.registration_documents).length > 0)) && (
                  <CollapsibleSection 
                    title="Documents & Verification" 
                    icon={<FileText size={20} />} 
                    darkMode={darkMode}
                    defaultOpen={false}
                  >
                    <div className="space-y-3">
                      {selectedSpecialist.license_document_url && (
                        <div className={`p-4 rounded-lg border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                                License Document
                              </p>
                              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                Professional License Verification
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDocument(selectedSpecialist.license_document_url)}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                                  darkMode 
                                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                    : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                                }`}
                              >
                                <Eye size={14} />
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(selectedSpecialist.license_document_url, 'license_document')}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                                  darkMode 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "bg-green-100 hover:bg-green-200 text-green-800"
                                }`}
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                      
                      {selectedSpecialist.cnic_document_url && (
                        <div className={`p-4 rounded-lg border ${
                          darkMode ? "bg-gray-700 border-gray-600" : "bg-white border-gray-200"
                        }`}>
                          <div className="flex justify-between items-center">
                            <div>
                              <p className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
                                CNIC Document
                              </p>
                              <p className={`text-xs ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                                National Identity Card
                              </p>
                            </div>
                            <div className="flex gap-2">
                              <button
                                onClick={() => handleViewDocument(selectedSpecialist.cnic_document_url)}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                                  darkMode 
                                    ? "bg-blue-600 hover:bg-blue-700 text-white" 
                                    : "bg-blue-100 hover:bg-blue-200 text-blue-800"
                                }`}
                              >
                                <Eye size={14} />
                                View
                              </button>
                              <button
                                onClick={() => handleDownloadDocument(selectedSpecialist.cnic_document_url, 'cnic_document')}
                                className={`px-3 py-1 text-sm rounded-lg flex items-center gap-1 transition-colors ${
                                  darkMode 
                                    ? "bg-green-600 hover:bg-green-700 text-white" 
                                    : "bg-green-100 hover:bg-green-200 text-green-800"
                                }`}
                              >
                                <Download size={14} />
                                Download
                              </button>
                            </div>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

                {/* PROFILE STATUS & METRICS */}
                <CollapsibleSection 
                  title="Profile Status & Metrics" 
                  icon={<Activity size={20} />} 
                  darkMode={darkMode}
                  defaultOpen={true}
                >
                  <div className="space-y-4">
                    <div>
                      <p className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                        Profile Completion
                      </p>
                      <div className="flex items-center gap-3">
                        <div className="flex-1 bg-gray-200 dark:bg-gray-600 rounded-full h-3">
                          <div 
                            className="bg-blue-600 h-3 rounded-full transition-all"
                            style={{ width: `${selectedSpecialist.profile_completion_percentage || 0}%` }}
                          ></div>
                        </div>
                        <span className={`text-lg font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                          {selectedSpecialist.profile_completion_percentage || 0}%
                        </span>
                      </div>
                    </div>
                    
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <InfoField 
                        label="Mandatory Fields" 
                        value={selectedSpecialist.mandatory_fields_completed ? "All Completed" : "Incomplete"} 
                        darkMode={darkMode}
                        status={true}
                      />
                      <InfoField 
                        label="Profile Verified" 
                        value={selectedSpecialist.profile_verified ? "Verified" : "Pending"} 
                        darkMode={darkMode}
                        status={true}
                      />
                      <InfoField 
                        label="Email Status" 
                        value={selectedSpecialist.email_verification_status?.toUpperCase()} 
                        darkMode={darkMode}
                        status={true}
                      />
                    </div>
                  </div>
                </CollapsibleSection>

                {/* ACTIVITY TIMELINE */}
                <CollapsibleSection 
                  title="Activity Timeline" 
                  icon={<Clock size={20} />} 
                  darkMode={darkMode}
                  defaultOpen={false}
                >
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <InfoField 
                      label="Account Created" 
                      value={new Date(selectedSpecialist.created_at).toLocaleString()} 
                      icon={<Calendar size={16} />}
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Last Updated" 
                      value={selectedSpecialist.updated_at ? 
                        new Date(selectedSpecialist.updated_at).toLocaleString() : null} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Last Login" 
                      value={selectedSpecialist.last_login ? 
                        new Date(selectedSpecialist.last_login).toLocaleString() : null} 
                      darkMode={darkMode} 
                    />
                    <InfoField 
                      label="Profile Completed" 
                      value={selectedSpecialist.profile_completed_at ? 
                        new Date(selectedSpecialist.profile_completed_at).toLocaleString() : null} 
                      darkMode={darkMode} 
                    />
                  </div>
                </CollapsibleSection>

                {/* ADMIN NOTES & VERIFICATION */}
                {(selectedSpecialist.verification_notes || selectedSpecialist.notes) && (
                  <CollapsibleSection 
                    title="Admin Notes & Verification" 
                    icon={<MessageSquare size={20} />} 
                    darkMode={darkMode}
                    defaultOpen={false}
                  >
                    <div className="space-y-4">
                      {selectedSpecialist.verification_notes && (
                        <div>
                          <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Verification Notes
                          </h4>
                          <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {selectedSpecialist.verification_notes}
                            </p>
                          </div>
                        </div>
                      )}
                      {selectedSpecialist.notes && (
                        <div>
                          <h4 className={`text-sm font-semibold mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                            Internal Notes
                          </h4>
                          <div className={`p-3 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
                            <p className={`text-sm ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                              {selectedSpecialist.notes}
                            </p>
                          </div>
                        </div>
                      )}
                    </div>
                  </CollapsibleSection>
                )}

              </div>

              {/* IMPROVED ACTION BUTTONS FOOTER */}
              <div className={`px-6 py-6 border-t ${
                darkMode ? "bg-gray-800 border-gray-700" : "bg-gray-50 border-gray-200"
              }`}>
                <div className="flex flex-wrap gap-3 justify-between items-center">
                  <div className="flex flex-wrap gap-3">
                    {selectedSpecialist.approval_status !== "approved" && (
                      <button
                        onClick={async () => {
                          try {
                            await adminAPI.approveSpecialist(selectedSpecialist.id);
                            setShowSpecialistDetailsModal(false);
                            fetchSpecialists();
                          } catch (error) {
                            console.error("Error approving specialist:", error);
                            setError("Failed to approve specialist");
                          }
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        aria-label="Approve specialist"
                      >
                        <CheckCircle size={16} />
                        Approve
                      </button>
                    )}
                    {selectedSpecialist.approval_status !== "rejected" && (
                      <button
                        onClick={() => {
                          rejectSpecialistDialog.openDialog(async () => {
                            try {
                              await adminAPI.rejectSpecialist(selectedSpecialist.id);
                              setShowSpecialistDetailsModal(false);
                              fetchSpecialists();
                              toast.success("Specialist rejected successfully");
                            } catch (error) {
                              const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
                              toast.error(errorInfo.message);
                            }
                          });
                        }}
                        className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        aria-label="Reject specialist"
                      >
                        <XCircle size={16} />
                        Reject
                      </button>
                    )}
                    {selectedSpecialist.approval_status !== "suspended" && (
                      <button
                        onClick={() => {
                          suspendSpecialistDialog.openDialog(async () => {
                            try {
                              await adminAPI.suspendSpecialist(selectedSpecialist.id);
                              setShowSpecialistDetailsModal(false);
                              fetchSpecialists();
                              toast.success("Specialist suspended successfully");
                            } catch (error) {
                              const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
                              toast.error(errorInfo.message);
                            }
                          });
                        }}
                        className="px-4 py-2 bg-orange-600 hover:bg-orange-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        aria-label="Suspend specialist"
                      >
                        <AlertCircle size={16} />
                        Suspend
                      </button>
                    )}
                    {selectedSpecialist.approval_status === "suspended" && (
                      <button
                        onClick={() => {
                          unsuspendSpecialistDialog.openDialog(async () => {
                            try {
                              await adminAPI.unsuspendSpecialist(selectedSpecialist.id);
                              setShowSpecialistDetailsModal(false);
                              fetchSpecialists();
                              toast.success("Specialist unsuspended successfully");
                            } catch (error) {
                              const errorInfo = APIErrorHandler.handleAdminError(error, 'specialist');
                              toast.error(errorInfo.message);
                            }
                          });
                        }}
                        className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium transition-colors flex items-center gap-2"
                        aria-label="Unsuspend specialist"
                      >
                        <CheckCircle size={16} />
                        Unsuspend
                      </button>
                    )}
                  </div>
                  
                  <button
                    onClick={() => setShowSpecialistDetailsModal(false)}
                    className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                      darkMode
                        ? "bg-gray-600 hover:bg-gray-500 text-white"
                        : "bg-gray-300 hover:bg-gray-400 text-gray-800"
                    }`}
                    aria-label="Close modal"
                  >
                    Close
                  </button>
                </div>
              </div>
            </>
          )}
        </div>
      </Modal>

    </div>
  );
};

// Content Components
const OverviewContent = ({ darkMode, patients, specialists, reports, activeSidebarItem }) => {
  const renderContent = () => {
    switch (activeSidebarItem) {
      case "dashboard":
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Dashboard Overview
            </h2>
            
            {/* Stats Grid */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
              <motion.div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
                }`}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center">
                  <Users className={`h-8 w-8 ${darkMode ? "text-indigo-400" : "text-indigo-600"}`} />
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Total Patients
                    </p>
                    <p className="text-2xl font-bold">{patients.length}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
                }`}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-gradient-to-r from-green-500 to-emerald-600" : "bg-gradient-to-r from-green-400 to-emerald-500"}`}>
                    <User className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Total Specialists
                    </p>
                    <p className="text-2xl font-bold">{specialists.length}</p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
                }`}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-gradient-to-r from-yellow-500 to-orange-600" : "bg-gradient-to-r from-yellow-400 to-orange-500"}`}>
                    <Clock className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Pending Approvals
                    </p>
                    <p className="text-2xl font-bold">
                      {specialists.filter(s => s.approval_status === "pending").length}
                    </p>
                  </div>
                </div>
              </motion.div>
              
              <motion.div
                className={`p-6 rounded-xl shadow-lg backdrop-blur-sm ${
                  darkMode ? "bg-gray-800/80 border border-gray-700" : "bg-white/80 border border-gray-200"
                }`}
                whileHover={{ scale: 1.02, y: -5 }}
                transition={{ type: "spring", stiffness: 300 }}
              >
                <div className="flex items-center">
                  <div className={`p-2 rounded-lg ${darkMode ? "bg-gradient-to-r from-red-500 to-pink-600" : "bg-gradient-to-r from-red-400 to-pink-500"}`}>
                    <AlertCircle className="h-6 w-6 text-white" />
                  </div>
                  <div className="ml-4">
                    <p className={`text-sm font-medium ${darkMode ? "text-gray-400" : "text-gray-600"}`}>
                      Pending Reports
                    </p>
                    <p className="text-2xl font-bold">
                      {reports.filter(r => r.status === "pending").length}
                    </p>
                  </div>
                </div>
              </motion.div>
            </div>
          </div>
        );
      
      case "recent-activity":
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Recent Activity
            </h2>
            <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}>
              <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                Recent activity will be displayed here
              </p>
            </div>
          </div>
        );
      
      case "system-stats":
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              System Statistics
            </h2>
            <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}>
              <p className={`text-center ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                System statistics will be displayed here
              </p>
            </div>
          </div>
        );
      
      default:
        return null;
    }
  };

  return renderContent();
};

const PatientsContent = ({ darkMode, patients, activeSidebarItem, onDeletePatient, onActivatePatient, onDeactivatePatient }) => {
  const renderContent = () => {
    switch (activeSidebarItem) {
      case "all-patients":
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              All Patients ({patients.length})
            </h2>
            <PatientsTable darkMode={darkMode} patients={patients} onDeletePatient={onDeletePatient} onActivatePatient={onActivatePatient} onDeactivatePatient={onDeactivatePatient} />
          </div>
        );
      
      case "active-patients": {
        const activePatients = patients.filter(p => p.is_active);
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Active Patients ({activePatients.length})
            </h2>
            <PatientsTable darkMode={darkMode} patients={activePatients} onDeletePatient={onDeletePatient} onActivatePatient={onActivatePatient} onDeactivatePatient={onDeactivatePatient} />
          </div>
        );
      }
      
      case "inactive-patients": {
        const inactivePatients = patients.filter(p => !p.is_active);
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Inactive Patients ({inactivePatients.length})
            </h2>
            <PatientsTable darkMode={darkMode} patients={inactivePatients} onDeletePatient={onDeletePatient} onActivatePatient={onActivatePatient} onDeactivatePatient={onDeactivatePatient} />
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return renderContent();
};

// Table Components
const PatientsTable = ({ darkMode, patients, onDeletePatient, onActivatePatient, onDeactivatePatient }) => {
  if (patients.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}>
        <Users className={`h-12 w-12 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
        <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          No patients found.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
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
                Contact Info
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            {patients.map((patient) => (
              <motion.tr
                key={patient.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        darkMode ? "bg-indigo-600" : "bg-indigo-100"
                      }`}>
                        <User className={`h-6 w-6 ${darkMode ? "text-white" : "text-indigo-600"}`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {patient.full_name}
                      </div>
                      <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        ID: {patient.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className={darkMode ? "text-gray-300" : "text-gray-900"}>
                        {patient.email}
                      </span>
                    </div>
                    {patient.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>
                          {patient.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {patient.is_active ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className={`text-sm ${patient.is_active ? "text-green-600" : "text-red-600"}`}>
                      {patient.is_active ? "Active" : "Inactive"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    {!patient.is_active && (
                      <button
                        onClick={() => onActivatePatient(patient.id)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Activate</span>
                      </button>
                    )}
                    {patient.is_active && (
                      <button
                        onClick={() => onDeactivatePatient(patient.id)}
                        className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-orange-600 hover:bg-orange-700 text-white"
                            : "bg-orange-500 hover:bg-orange-600 text-white"
                        }`}
                      >
                        <XCircle className="h-4 w-4" />
                        <span>Deactivate</span>
                      </button>
                    )}
                    <button
                      onClick={() => onDeletePatient(patient.id)}
                      className={`flex items-center space-x-1 px-3 py-2 rounded-lg ${
                        darkMode
                          ? "bg-red-600 hover:bg-red-700 text-white"
                          : "bg-red-500 hover:bg-red-600 text-white"
                      }`}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span>Delete</span>
                    </button>
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const SpecialistsContent = ({ 
  darkMode, 
  specialists, 
  activeSidebarItem, 
  onApproveSpecialist, 
  onRejectSpecialist, 
  onSuspendSpecialist, 
  onUnsuspendSpecialist, 
  onViewSpecialistDetails 
}) => {
  const renderContent = () => {
    switch (activeSidebarItem) {
      case "pending-approvals": {
        const pendingSpecialists = specialists.filter(s => s.approval_status === "pending");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Pending Approvals ({pendingSpecialists.length})
            </h2>
            <SpecialistsTable
              darkMode={darkMode}
              specialists={pendingSpecialists}
              onApproveSpecialist={onApproveSpecialist}
              onRejectSpecialist={onRejectSpecialist}
              onViewSpecialistDetails={onViewSpecialistDetails}
            />
          </div>
        );
      }
      
      case "approved-specialists": {
        const approvedSpecialists = specialists.filter(s => s.approval_status === "approved");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Approved Specialists ({approvedSpecialists.length})
            </h2>
            <SpecialistsTable
              darkMode={darkMode}
              specialists={approvedSpecialists}
              onSuspendSpecialist={onSuspendSpecialist}
              onViewSpecialistDetails={onViewSpecialistDetails}
            />
          </div>
        );
      }
      
      case "suspended-specialists": {
        const suspendedSpecialists = specialists.filter(s => s.approval_status === "suspended");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Suspended Specialists ({suspendedSpecialists.length})
            </h2>
            <SpecialistsTable
              darkMode={darkMode}
              specialists={suspendedSpecialists}
              onUnsuspendSpecialist={onUnsuspendSpecialist}
              onViewSpecialistDetails={onViewSpecialistDetails}
            />
          </div>
        );
      }
      
      case "rejected-specialists": {
        const rejectedSpecialists = specialists.filter(s => s.approval_status === "rejected");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Rejected Specialists ({rejectedSpecialists.length})
            </h2>
            <SpecialistsTable
              darkMode={darkMode}
              specialists={rejectedSpecialists}
              onViewSpecialistDetails={onViewSpecialistDetails}
            />
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return renderContent();
};

const SpecialistsTable = ({ 
  darkMode, 
  specialists, 
  onApproveSpecialist, 
  onRejectSpecialist, 
  onSuspendSpecialist, 
  onUnsuspendSpecialist, 
  onViewSpecialistDetails 
}) => {
  if (specialists.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}>
        <User className={`h-12 w-12 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
        <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          No specialists found.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Specialist
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Contact Info
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            {specialists.map((specialist) => (
              <motion.tr
                key={specialist.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
              >
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="flex-shrink-0 h-10 w-10">
                      <div className={`h-10 w-10 rounded-full flex items-center justify-center ${
                        darkMode ? "bg-indigo-600" : "bg-indigo-100"
                      }`}>
                        <User className={`h-6 w-6 ${darkMode ? "text-white" : "text-indigo-600"}`} />
                      </div>
                    </div>
                    <div className="ml-4">
                      <div className={`text-sm font-medium ${darkMode ? "text-white" : "text-gray-900"}`}>
                        {specialist.full_name}
                      </div>
                      <div className={`text-sm ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                        ID: {specialist.id}
                      </div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="space-y-1">
                    <div className="flex items-center text-sm">
                      <Mail className="h-4 w-4 mr-2 text-gray-400" />
                      <span className={darkMode ? "text-gray-300" : "text-gray-900"}>
                        {specialist.email}
                      </span>
                    </div>
                    {specialist.phone && (
                      <div className="flex items-center text-sm">
                        <Phone className="h-4 w-4 mr-2 text-gray-400" />
                        <span className={darkMode ? "text-gray-300" : "text-gray-900"}>
                          {specialist.phone}
                        </span>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {specialist.approval_status === "approved" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : specialist.approval_status === "rejected" ? (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    ) : specialist.approval_status === "suspended" ? (
                      <AlertCircle className="h-5 w-5 text-orange-500 mr-2" />
                    ) : (
                      <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                    )}
                    <span className={`text-sm ${
                      specialist.approval_status === "approved" 
                        ? "text-green-600" 
                        : specialist.approval_status === "rejected"
                        ? "text-red-600"
                        : specialist.approval_status === "suspended"
                        ? "text-orange-600"
                        : "text-yellow-600"
                    }`}>
                      {specialist.approval_status?.toUpperCase() || "PENDING"}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button
                      onClick={() => onViewSpecialistDetails(specialist.id)}
                      className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                        darkMode
                          ? "bg-indigo-600 hover:bg-indigo-700 text-white"
                          : "bg-indigo-500 hover:bg-indigo-600 text-white"
                      }`}
                    >
                      <Eye className="h-4 w-4" />
                      <span>Review Application</span>
                    </button>
                    
                    {specialist.approval_status === "pending" && (
                      <>
                        <button
                          onClick={() => onApproveSpecialist(specialist.id)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                            darkMode
                              ? "bg-green-600 hover:bg-green-700 text-white"
                              : "bg-green-500 hover:bg-green-600 text-white"
                          }`}
                        >
                          <CheckCircle className="h-4 w-4" />
                          <span>Approve</span>
                        </button>
                        <button
                          onClick={() => onRejectSpecialist(specialist.id)}
                          className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                            darkMode
                              ? "bg-red-600 hover:bg-red-700 text-white"
                              : "bg-red-500 hover:bg-red-600 text-white"
                          }`}
                        >
                          <XCircle className="h-4 w-4" />
                          <span>Reject</span>
                        </button>
                      </>
                    )}
                    
                    {specialist.approval_status === "approved" && (
                      <button
                        onClick={() => onSuspendSpecialist(specialist.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-yellow-600 hover:bg-yellow-700 text-white"
                            : "bg-yellow-500 hover:bg-yellow-600 text-white"
                        }`}
                      >
                        <AlertCircle className="h-4 w-4" />
                        <span>Suspend</span>
                      </button>
                    )}
                    
                    {specialist.approval_status === "suspended" && (
                      <button
                        onClick={() => onUnsuspendSpecialist(specialist.id)}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Unsuspend</span>
                      </button>
                    )}
                    
                    {specialist.approval_status === "rejected" && (
                      <span className={`text-sm font-medium ${
                        darkMode ? "text-gray-300" : "text-gray-500"
                      }`}>
                        Rejected specialists cannot be deleted via the admin panel.
                      </span>
                    )}
                  </div>
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

const ReportsContent = ({ darkMode, reports, activeSidebarItem, onReportAction }) => {
  const renderContent = () => {
    switch (activeSidebarItem) {
      case "pending-reports": {
        const pendingReports = reports.filter(r => r.status === "pending");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Pending Reports ({pendingReports.length})
            </h2>
            <ReportsTable darkMode={darkMode} reports={pendingReports} onReportAction={onReportAction} />
          </div>
        );
      }
      
      case "resolved-reports": {
        const resolvedReports = reports.filter(r => r.status === "resolved");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Resolved Reports ({resolvedReports.length})
            </h2>
            <ReportsTable darkMode={darkMode} reports={resolvedReports} onReportAction={onReportAction} />
          </div>
        );
      }
      
      case "removed-content": {
        const removedReports = reports.filter(r => r.status === "removed");
        return (
          <div className="space-y-6">
            <h2 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
              Removed Content ({removedReports.length})
            </h2>
            <ReportsTable darkMode={darkMode} reports={removedReports} onReportAction={onReportAction} />
          </div>
        );
      }
      
      default:
        return null;
    }
  };

  return renderContent();
};

const ReportsTable = ({ darkMode, reports, onReportAction }) => {
  if (reports.length === 0) {
    return (
      <div className={`p-8 text-center rounded-lg ${darkMode ? "bg-gray-800" : "bg-white"} shadow-lg`}>
        <AlertCircle className={`h-12 w-12 mx-auto mb-4 ${darkMode ? "text-gray-600" : "text-gray-400"}`} />
        <p className={`${darkMode ? "text-gray-400" : "text-gray-500"}`}>
          No reports found.
        </p>
      </div>
    );
  }

  return (
    <div className={`rounded-lg shadow overflow-hidden ${darkMode ? "bg-gray-800" : "bg-white"}`}>
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
          <thead className={`${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
            <tr>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Report Details
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Reported Content
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Status
              </th>
              <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                darkMode ? "text-gray-300" : "text-gray-500"
              }`}>
                Actions
              </th>
            </tr>
          </thead>
          <tbody className={`divide-y divide-gray-200 dark:divide-gray-700 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}>
            {reports.map((report) => (
              <motion.tr
                key={report.id}
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className={`${darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"}`}
              >
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="flex items-center space-x-2">
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.post_type === "question" 
                          ? "bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300"
                          : "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                      }`}>
                        {report.post_type}
                      </span>
                      <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                        report.status === "pending" 
                          ? "bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300"
                          : report.status === "resolved"
                          ? "bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300"
                          : "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300"
                      }`}>
                        {report.status}
                      </span>
                    </div>
                    <div className="text-sm">
                      <p className="font-medium">Reporter: {report.reporter_name}</p>
                      <p className="text-gray-500 dark:text-gray-400">Type: {report.reporter_type}</p>
                      <p className="text-gray-500 dark:text-gray-400">
                        {new Date(report.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    {report.reason && (
                      <div className="text-sm">
                        <p className="font-medium">Reason:</p>
                        <p className="text-gray-600 dark:text-gray-300">{report.reason}</p>
                      </div>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4">
                  <div className="space-y-2">
                    <div className="text-sm">
                      <p className="font-medium">Author: {report.post_author_name}</p>
                      <p className="text-gray-600 dark:text-gray-300">
                        {report.post_content}
                      </p>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    {report.status === "pending" ? (
                      <Clock className="h-5 w-5 text-yellow-500 mr-2" />
                    ) : report.status === "resolved" ? (
                      <CheckCircle className="h-5 w-5 text-green-500 mr-2" />
                    ) : (
                      <XCircle className="h-5 w-5 text-red-500 mr-2" />
                    )}
                    <span className={`text-sm font-medium ${
                      report.status === "pending" 
                        ? "text-yellow-600" 
                        : report.status === "resolved"
                        ? "text-green-600"
                        : "text-red-600"
                    }`}>
                      {report.status.toUpperCase()}
                    </span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  {report.status === "pending" && (
                    <div className="flex space-x-2">
                      <button
                        onClick={() => onReportAction(report.id, "keep")}
                        className={`flex items-center space-x-2 px-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-green-600 hover:bg-green-700 text-white"
                            : "bg-green-500 hover:bg-green-600 text-white"
                        }`}
                      >
                        <CheckCircle className="h-4 w-4" />
                        <span>Keep</span>
                      </button>
                      <button
                        onClick={() => onReportAction(report.id, "remove")}
                        className={`flex items-center space-x-3 py-2 rounded-lg ${
                          darkMode
                            ? "bg-red-600 hover:bg-red-700 text-white"
                            : "bg-red-500 hover:bg-red-600 text-white"
                        }`}
                      >
                        <Trash2 className="h-4 w-4" />
                        <span>Remove</span>
                      </button>
                    </div>
                  )}
                  {report.status !== "pending" && (
                    <span className={`px-3 py-2 rounded-lg ${
                      report.status === "resolved"
                        ? darkMode ? "bg-green-900/30 text-green-300" : "bg-green-100 text-green-800"
                        : darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-800"
                    }`}>
                      {report.status === "resolved" ? "Resolved" : "Removed"}
                    </span>
                  )}
                </td>
              </motion.tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
};

// Helper component for displaying info fields
// Improved InfoField component with better accessibility and design
const InfoField = ({ label, value, icon, darkMode, status, className = "" }) => {
  const hasValue = value && value !== "Not provided" && value !== "Not set" && value !== "Not available";
  
  return (
    <div className={`space-y-1 ${className}`}>
      <label className={`text-sm font-medium flex items-center gap-2 ${
        darkMode ? "text-gray-300" : "text-gray-700"
      }`}>
        {icon && <span className="flex-shrink-0" aria-hidden="true">{icon}</span>}
        <span>{label}</span>
      </label>
      <div className={`text-base ${
        hasValue 
          ? darkMode ? "text-white" : "text-gray-900"
          : darkMode ? "text-gray-500" : "text-gray-500"
      } ${status ? `font-semibold` : ''}`}>
        {hasValue ? value : (
          <span className="italic" aria-label={`${label} not provided`}>
            Not provided
          </span>
        )}
      </div>
    </div>
  );
};

// Status Badge component for consistent status display
const StatusBadge = ({ status, type = "default", darkMode }) => {
  const statusConfig = {
    approved: { 
      bg: darkMode ? "bg-green-900/30" : "bg-green-100", 
      text: darkMode ? "text-green-300" : "text-green-800",
      border: darkMode ? "border-green-700" : "border-green-300",
      icon: "✓"
    },
    pending: { 
      bg: darkMode ? "bg-yellow-900/30" : "bg-yellow-100", 
      text: darkMode ? "text-yellow-300" : "text-yellow-800",
      border: darkMode ? "border-yellow-700" : "border-yellow-300",
      icon: "⏳"
    },
    rejected: { 
      bg: darkMode ? "bg-red-900/30" : "bg-red-100", 
      text: darkMode ? "text-red-300" : "text-red-800",
      border: darkMode ? "border-red-700" : "border-red-300",
      icon: "✗"
    },
    suspended: { 
      bg: darkMode ? "bg-orange-900/30" : "bg-orange-100", 
      text: darkMode ? "text-orange-300" : "text-orange-800",
      border: darkMode ? "border-orange-700" : "border-orange-300",
      icon: "⏸️"
    },
    verified: { 
      bg: darkMode ? "bg-blue-900/30" : "bg-blue-100", 
      text: darkMode ? "text-blue-300" : "text-blue-800",
      border: darkMode ? "border-blue-700" : "border-blue-300",
      icon: "✓"
    },
    active: { 
      bg: darkMode ? "bg-green-900/30" : "bg-green-100", 
      text: darkMode ? "text-green-300" : "text-green-800",
      border: darkMode ? "border-green-700" : "border-green-300",
      icon: "✓"
    }
  };

  const config = statusConfig[status] || statusConfig.pending;
  
  return (
    <span className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-sm font-medium border ${config.bg} ${config.text} ${config.border}`}>
      <span aria-hidden="true">{config.icon}</span>
      <span>{status.toUpperCase()}</span>
    </span>
  );
};

// Collapsible Section Component
const CollapsibleSection = ({ title, icon, children, darkMode, defaultOpen = true, className = "" }) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  
  return (
    <div className={`border rounded-lg ${darkMode ? "border-gray-600 bg-gray-800/50" : "border-gray-200 bg-white"} ${className}`}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className={`w-full px-4 py-3 flex items-center justify-between text-left hover:bg-opacity-50 transition-colors ${
          darkMode ? "hover:bg-gray-700" : "hover:bg-gray-50"
        }`}
        aria-expanded={isOpen}
      >
        <div className="flex items-center gap-2">
          {icon && <span className="text-blue-500" aria-hidden="true">{icon}</span>}
          <h3 className={`font-semibold ${darkMode ? "text-white" : "text-gray-900"}`}>
            {title}
          </h3>
        </div>
        <ArrowRight 
          size={16} 
          className={`transition-transform ${isOpen ? "rotate-90" : ""} ${darkMode ? "text-gray-400" : "text-gray-500"}`}
          aria-hidden="true"
        />
      </button>
      {isOpen && (
        <div className="px-4 pb-4">
          {children}
        </div>
      )}
    </div>
  );
};

export default AdminDashboard;
