import { motion } from "framer-motion";
import { useState, useEffect, useRef } from "react";
import { Routes, Route, useLocation } from "react-router-dom";
import Header from "./Navigation/Header";
import Footer from "../layout/Footer";
import Dashboard from "./Dashboard/Dashboard";
import ModernDashboard from "../Dashboard/Core/ModernDashboard";
import UserProfile from "./Dashboard/UserProfile";
import Settings from "./Dashboard/Settings";
import AssessmentPage from "../Assessment/AssessmentPage";
import MoodAssessmentPage from "../Modals/MoodAssessmentPage";
import JournalEntryPage from "../Modals/JournalEntryPage";
import StartExercisePage from "../Modals/StartExercisePage";
import axios from "axios";
import { SkipLink, ScreenReaderText, LiveRegion } from "../common/Accessibility";
import { initializeTokenRefresh, cleanupTokenRefresh } from "../../utils/tokenRefresh";
import ProtectedRoute from "../common/ProtectedRoute";
import { API_URL } from "../../config/api";
import { AuthStorage } from "../../utils/localStorage";

const MainLayout = () => {
  const [darkMode, setDarkMode] = useState(false);
  const [activeChatId, setActiveChatId] = useState(null);
  const [refreshSessions, setRefreshSessions] = useState(false);
  const [activeSidebarItem, setActiveSidebarItem] = useState("dashboard");
  const [currentUser, setCurrentUser] = useState(null);
  const [userType, setUserType] = useState(null);
  const location = useLocation();
  const activeTab = location.pathname.split("/").pop();

  // Track if we've already fetched user to prevent repeated calls
  const userFetchedRef = useRef(false);

  // Initialize token auto-refresh on mount and verify user type
  useEffect(() => {
    initializeTokenRefresh();
    
    // Only fetch user once on mount, not on every render
    if (userFetchedRef.current) {
      return;
    }

    // Fetch current user info and verify user type
    const fetchCurrentUser = async () => {
      try {
        const token = AuthStorage.getToken();
        if (!token) {
          setUserType(null);
          return;
        }

        userFetchedRef.current = true; // Mark as fetched before API call

        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        
        const user = response.data;
        setCurrentUser(user);
        
        // Extract user type from response (check multiple possible fields)
        const extractedUserType = user.user_type || user.userType || user.role || AuthStorage.getUserType();
        setUserType(extractedUserType);
        
        // Early validation: If user is not a patient, ProtectedRoute will handle redirect
        // But we set the state for potential future optimizations
        if (extractedUserType && extractedUserType !== 'patient') {
          console.warn(`MainLayout: User type '${extractedUserType}' detected, ProtectedRoute will redirect`);
        }
      } catch (error) {
        console.error("Error fetching user info:", error);
        setUserType(null);
        userFetchedRef.current = false; // Reset on error to allow retry
        
        // If 401/403, clear tokens (ProtectedRoute will handle redirect)
        if (error.response?.status === 401 || error.response?.status === 403) {
          AuthStorage.clearAuth();
        }
      }
    };
    
    fetchCurrentUser();
    
    return () => {
      cleanupTokenRefresh();
    };
  }, []);

  const handleSessionUpdate = () => {
    setRefreshSessions((prev) => !prev);
  };

  return (
    <div
      className={`min-h-screen flex flex-col ${
        darkMode ? "bg-gray-900" : "bg-gray-50"
      }`}
    >
      {/* Skip Links for Accessibility */}
      <SkipLink href="#main-content">Skip to main content</SkipLink>
      <SkipLink href="#navigation">Skip to navigation</SkipLink>

      {/* Screen Reader Announcements */}
      <LiveRegion>
        <ScreenReaderText>
          MindMate application loaded. Current page: {activeTab}
        </ScreenReaderText>
      </LiveRegion>

      {/* Header */}
      <Header 
        darkMode={darkMode} 
        setDarkMode={setDarkMode} 
        currentUser={currentUser}
      />

      {/* Main Content */}
      <motion.main
        id="main-content"
        className="flex-1 pt-16"
        role="main"
        aria-label={`${activeTab} content`}
      >
        <Routes>
          {/* Consolidated dashboard routes - both index and /dashboard point to same component */}
          <Route
            index
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <ModernDashboard darkMode={darkMode} user={currentUser} />
              </ProtectedRoute>
            }
          />
          
          <Route
            path="dashboard"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <ModernDashboard darkMode={darkMode} user={currentUser} />
              </ProtectedRoute>
            }
          />

          <Route
            path="profile"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <UserProfile darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="settings"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <Settings darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="assessment"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <AssessmentPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          {/* Modal Pages - Show modals when accessing these routes */}
          <Route
            path="progress-tracker/mood"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <MoodAssessmentPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="journal/new"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <JournalEntryPage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path="exercises/start"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <StartExercisePage darkMode={darkMode} />
              </ProtectedRoute>
            }
          />
          <Route
            path=":activeTab"
            element={
              <ProtectedRoute darkMode={darkMode} allowedUserTypes={['patient']}>
                <Dashboard
                  darkMode={darkMode}
                  activeChatId={activeChatId}
                  onSessionUpdate={handleSessionUpdate}
                  activeSidebarItem={activeSidebarItem}
                />
              </ProtectedRoute>
            }
          />
        </Routes>
      </motion.main>

      {/* Footer */}
      <Footer darkMode={darkMode} />
    </div>
  );
};

export default MainLayout;
