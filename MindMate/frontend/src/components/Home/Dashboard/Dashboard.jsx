import { motion } from "framer-motion";
import { useParams } from "react-router-dom";
import AssessmentPage from "../../Assessment/AssessmentPage";
import JournalModule from "./JournalModule";
import ExercisesModule from "./ExercisesModule";
import ModernForumModule from "./ModernForumModule";
import SpecialistAppointmentsModule from "./SpecialistAppointmentsModule";
import FavoritesModule from "./FavoritesModule";
import UnifiedProgressTracker from "./ProgressTracker/UnifiedProgressTracker";
import FindSpecialists from "../../Appointments/FindSpecialists";
import PatientAppointmentsHub from "../../Appointments/PatientAppointmentsHub";
import ModernDashboard from "../../Dashboard/Core/ModernDashboard";
import { useEffect } from "react";
import axios from "axios";
import { BookOpen, Heart, Users, MessageSquare, UserCheck } from "react-feather";
import { API_URL, API_ENDPOINTS } from "../../../config/api";
import { AuthStorage } from "../../../utils/localStorage";

const Dashboard = ({ darkMode, activeChatId, onSessionUpdate, activeSidebarItem }) => {
  const { activeTab } = useParams();

  // Add scrollbar styles when forum is active
  useEffect(() => {
    if (activeTab === 'forum') {
      const style = document.createElement('style');
      style.id = 'forum-scrollbar-styles';
      style.textContent = `
        /* Forum scrollbar for webkit browsers - WIDER for better visibility */
        .overflow-auto::-webkit-scrollbar {
          width: 16px;
          height: 16px;
        }
        .overflow-auto::-webkit-scrollbar-track {
          background: ${darkMode ? '#1f2937' : '#e5e7eb'};
          border-radius: 8px;
          margin: 4px;
        }
        .overflow-auto::-webkit-scrollbar-thumb {
          background: ${darkMode ? '#4b5563' : '#9ca3af'};
          border-radius: 8px;
          border: 3px solid ${darkMode ? '#1f2937' : '#e5e7eb'};
        }
        .overflow-auto::-webkit-scrollbar-thumb:hover {
          background: ${darkMode ? '#6b7280' : '#6b7280'};
        }
        .overflow-auto::-webkit-scrollbar-thumb:active {
          background: ${darkMode ? '#9ca3af' : '#4b5563'};
        }
      `;
      document.head.appendChild(style);
      
      return () => {
        const existingStyle = document.getElementById('forum-scrollbar-styles');
        if (existingStyle) {
          existingStyle.remove();
        }
      };
    }
  }, [activeTab, darkMode]);

  useEffect(() => {
    const fetchUserData = async () => {
      try {
        const token = AuthStorage.getToken();
        if (!token) return;
        
        await axios.get(`${API_URL}${API_ENDPOINTS.AUTH.ME}`, {
          headers: {
            Authorization: `Bearer ${token}` },
          },
        );
      } catch {
        // Silent error handling
      }
    };

    fetchUserData();
  }, []);

  const handleSessionUpdate = () => {
    onSessionUpdate?.();
  };

  const renderActiveModule = () => {
    switch (activeTab) {
      case "dashboard":
      case undefined:
      case null:
        // Get user from context or fetch
        const user = JSON.parse(localStorage.getItem('user') || '{}');
        return <ModernDashboard darkMode={darkMode} user={user} />;
      case "chat":
        return (
          <AssessmentPage
            darkMode={darkMode}
            sessionId={activeChatId}
            onSessionUpdate={handleSessionUpdate}
          />
        );
      case "journal":
        return <JournalModule darkMode={darkMode} activeSidebarItem={activeSidebarItem} />;
      case "exercises":
        return <ExercisesModule darkMode={darkMode} activeSidebarItem={activeSidebarItem} />;
      case "forum":
        return <ModernForumModule darkMode={darkMode} activeSidebarItem={activeSidebarItem} />;
      case "specialists":
        return <FindSpecialists darkMode={darkMode} />;
      case "appointments":
        return <PatientAppointmentsHub darkMode={darkMode} />;
      case "specialist-appointments":
        return <SpecialistAppointmentsModule darkMode={darkMode} activeSidebarItem={activeSidebarItem} />;
      case "favorites":
        return <FavoritesModule darkMode={darkMode} activeSidebarItem={activeSidebarItem} />;
      case "progress-tracker":
        return <UnifiedProgressTracker darkMode={darkMode} />;
      default:
        // Get user from context or fetch for default case
        const defaultUser = JSON.parse(localStorage.getItem('user') || '{}');
        return <ModernDashboard darkMode={darkMode} user={defaultUser} />;
    }
  };


  return (
    <div
      className={`h-full ${activeTab === 'forum' ? 'overflow-auto' : 'overflow-hidden'} ${
        darkMode 
          ? "bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900" 
          : "bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50"
      }`}
      style={{
        scrollbarWidth: 'auto',
        scrollbarColor: darkMode ? '#4b5563 #1f2937' : '#9ca3af #e5e7eb'
      }}
    >
      {/* Main Content Area */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={activeTab === 'forum' ? 'h-auto' : 'h-full'}
      >
        {renderActiveModule()}
      </motion.div>
    </div>
  );
};

export default Dashboard;
