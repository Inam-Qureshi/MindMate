import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import DashboardLayout from './layout/DashboardLayout';
import Modal from './shared/Modal';
import { AuthStorage } from '../../../utils/localStorage';
import { API_ENDPOINTS } from '../../../config/api';
import apiClient from '../../../utils/axiosConfig';
import { ROUTES } from '../../../config/routes';

// Import modules
import OverviewModule from './modules/overview/OverviewModule';
import AppointmentsModule from './modules/appointments/AppointmentsModule';
import PatientsModule from './modules/patients/PatientsModule';
import ForumModule from './modules/forum/ForumModule';
import ProfileModule from './modules/profile/ProfileModule';
import SlotsModule from './modules/slots/SlotsModule';

const SpecialistDashboardContainer = () => {
  const [activeTab, setActiveTab] = useState('overview');
  const [activeSidebarItem, setActiveSidebarItem] = useState('dashboard');
  const [darkMode, setDarkMode] = useState(false);
  const [specialistInfo, setSpecialistInfo] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const navigate = useNavigate();

  const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
  }, []);

  // Check authentication and approval status
  const checkApprovalStatusAndRedirect = useCallback(async (token) => {
    try {
      const statusResponse = await axios.get(`${API_URL}/api/specialists/approval-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      const statusData = statusResponse.data;
      console.log('Dashboard approval check:', statusData);

      if (statusData.approval_status !== 'approved') {
        let redirectPath = '/complete-profile';
        let message = 'Please complete your profile.';

        switch (statusData.next_action) {
          case 'complete_profile':
            redirectPath = '/complete-profile';
            message = 'Please complete your profile to continue.';
            break;
          case 'upload_documents':
            redirectPath = '/complete-profile?tab=documents';
            message = 'Please upload all required documents.';
            break;
          case 'submit_for_approval':
            redirectPath = '/complete-profile?tab=documents';
            message = 'Please submit your application for approval.';
            break;
          case 'pending_approval':
            redirectPath = '/pending-approval';
            message = 'Your application is under review.';
            break;
          case 'application_rejected':
            redirectPath = '/application-rejected';
            message = 'Your application has been rejected.';
            break;
          default:
            break;
        }

        console.log(`Redirecting non-approved specialist to: ${redirectPath}`);
        setError(message);
        setLoading(false);

        setTimeout(() => {
          navigate(redirectPath);
        }, 2000);

        return;
      }

      // If approved, get full specialist info
      const userResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });

      setSpecialistInfo(userResponse.data);
      setLoading(false);

    } catch (error) {
      console.error('Failed to check approval status:', error);
      setError('Failed to verify account status. Please try again.');
      setLoading(false);

      setTimeout(() => {
        navigate('/complete-profile');
      }, 2000);
    }
  }, [API_URL, navigate]);

  useEffect(() => {
    const checkSpecialistAuth = async () => {
      const token = localStorage.getItem('access_token');
      if (!token) {
        navigate('/login');
        return;
      }

      try {
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });

        if (response.data.user_type !== 'specialist') {
          navigate('/login');
          return;
        }

        await checkApprovalStatusAndRedirect(token);

      } catch (error) {
        console.error('Auth check failed:', error);
        navigate('/login');
      }
    };

    checkSpecialistAuth();
  }, [navigate, API_URL, checkApprovalStatusAndRedirect]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem('darkMode', newMode.toString());
  };

  const clearClientSession = () => {
    // Clear all authentication data using AuthStorage
    AuthStorage.clearAuth();

    // Clear any sessionStorage items
    sessionStorage.clear();

    // Clear other specialist-specific data
    localStorage.removeItem('profile_completion_percentage');
    localStorage.removeItem('mandatory_fields_completed');
    localStorage.removeItem('specialist_profile_draft');
    localStorage.removeItem('completed_sections');
  };

  const handleLogoutConfirm = () => {
    if (isLoggingOut) return; // Prevent multiple clicks

    setIsLoggingOut(true);

    clearClientSession();

    // Redirect to login page (full reload to avoid lingering protected route state)
    if (window.location.pathname !== ROUTES.LOGIN) {
      window.location.replace(ROUTES.LOGIN);
    }

    // Fire and forget server-side logout
    apiClient.post(API_ENDPOINTS.AUTH.LOGOUT).catch((error) => {
      console.warn('Logout API call failed, continuing with client-side cleanup:', error);
    });
  };

  const handleTabChange = (tabId) => {
    setActiveTab(tabId);
    // Reset sidebar item when changing tabs
    const defaultSidebarItems = {
      overview: 'dashboard',
      appointments: 'all',
      patients: 'all',
      forum: 'questions',
      slots: 'schedule',
      profile: 'view'
    };
    setActiveSidebarItem(defaultSidebarItems[tabId] || 'dashboard');
  };

  const renderActiveModule = () => {
    const commonProps = {
      darkMode,
      activeSidebarItem,
      specialistInfo
    };

    switch (activeTab) {
      case 'overview':
        return <OverviewModule {...commonProps} />;
      case 'appointments':
        return <AppointmentsModule {...commonProps} />;
      case 'patients':
        return <PatientsModule {...commonProps} />;
      case 'forum':
        return <ForumModule {...commonProps} />;
      case 'slots':
        return <SlotsModule {...commonProps} />;
      case 'profile':
        return <ProfileModule {...commonProps} />;
      default:
        return <OverviewModule {...commonProps} />;
    }
  };

  if (loading) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600 mx-auto mb-4"></div>
          <p>Loading specialist dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className={`min-h-screen flex items-center justify-center ${
        darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'
      }`}>
        <div className="text-center max-w-md mx-auto">
          <div className="h-16 w-16 text-yellow-500 mx-auto mb-4">⚠️</div>
          <h2 className="text-xl font-semibold mb-2">Account Pending Approval</h2>
          <p className="text-gray-400 mb-4">{error}</p>
          <button
            onClick={handleLogoutConfirm}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <>
      <DashboardLayout
        darkMode={darkMode}
        onToggleDarkMode={toggleDarkMode}
        activeTab={activeTab}
        onTabChange={handleTabChange}
        specialistInfo={specialistInfo}
        onLogout={() => setShowLogoutModal(true)}
      >
        {renderActiveModule()}
      </DashboardLayout>

      {/* Logout Confirmation Modal */}
      <Modal
        isOpen={showLogoutModal}
        onClose={isLoggingOut ? () => {} : () => setShowLogoutModal(false)}
        title="Confirm Logout"
        darkMode={darkMode}
      >
        <div className="text-center py-4">
          <h3 className={`text-lg font-medium mb-4 ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Are you sure you want to log out?
          </h3>
          <div className="flex justify-center space-x-4">
            <button
              onClick={() => setShowLogoutModal(false)}
              disabled={isLoggingOut}
              className={`px-4 py-2 rounded-lg transition-colors ${
                darkMode
                  ? 'bg-gray-600 hover:bg-gray-700 text-white'
                  : 'bg-gray-300 hover:bg-gray-400 text-gray-700'
              } ${isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''}`}
            >
              Cancel
            </button>
            <button
              onClick={handleLogoutConfirm}
              disabled={isLoggingOut}
              className={`px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors ${
                isLoggingOut ? 'opacity-50 cursor-not-allowed' : ''
              }`}
            >
              {isLoggingOut ? (
                <span className="flex items-center">
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2"></div>
                  Logging out...
                </span>
              ) : (
                'Logout'
              )}
            </button>
          </div>
        </div>
      </Modal>
    </>
  );
};

export default SpecialistDashboardContainer;

