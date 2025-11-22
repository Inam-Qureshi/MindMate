import { motion } from "framer-motion";
import { useState } from "react";
import {
  Sun,
  Moon,
  MessageSquare,
  BookOpen,
  Activity,
  Users,
  UserCheck,
  Calendar,
  TrendingUp,
} from "react-feather";
import { useLocation, useNavigate } from "react-router-dom";
import ProfileDropdown from "../Navigation/ProfileDropdown";

const tabs = [
  { id: "chat", icon: <MessageSquare size={20} />, label: "Assessment" },
  { id: "journal", icon: <BookOpen size={20} />, label: "Journal" },
  { id: "exercises", icon: <Activity size={20} />, label: "Exercises" },
  { id: "progress-tracker", icon: <TrendingUp size={20} />, label: "Progress Tracker" },
  { id: "forum", icon: <Users size={20} />, label: "Forum" },
  { id: "specialists", icon: <UserCheck size={20} />, label: "Find Specialist" },
  { id: "appointments", icon: <Calendar size={20} />, label: "My Appointments" },
];

const TopNav = ({ darkMode, setDarkMode }) => {
  const location = useLocation();
  const navigate = useNavigate();
  const activeTab = location.pathname.split("/").pop();
  const [hoveredTab, setHoveredTab] = useState(null);

  const handleTabClick = (tabId) => {
    // Map tabs to correct routes
    if (tabId === "chat") {
      navigate('/assessment');
    } else if (tabId === "appointments") {
      navigate('/appointments');
    } else {
      navigate(`/dashboard/${tabId}`);
    }
  };

  return (
    <header
      className={`sticky top-0 z-50 ${
        darkMode ? "bg-gray-800" : "bg-white"
      } shadow-md py-4 px-6 flex justify-between items-center`}
    >
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center space-x-2"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-blue-500 to-purple-600 flex items-center justify-center text-white font-bold">
          M
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-blue-500 to-purple-600 bg-clip-text text-transparent">
          MindMate
        </h1>
      </motion.div>

      <div className="flex items-center space-x-6">
        {tabs.map((tab) => (
          <div
            key={tab.id}
            className="relative"
            onMouseEnter={() => setHoveredTab(tab.id)}
            onMouseLeave={() => setHoveredTab(null)}
          >
            <button
              onClick={() => handleTabClick(tab.id)}
              className={`p-2 rounded-full transition-colors ${
                activeTab === tab.id
                  ? darkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-900"
                  : darkMode
                  ? "text-gray-400 hover:text-white"
                  : "text-gray-500 hover:text-gray-900"
              }`}
            >
              {tab.icon}
            </button>

            {hoveredTab === tab.id && (
              <motion.div
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.2 }}
                className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 rounded text-xs font-medium ${
                  darkMode
                    ? "bg-gray-700 text-white"
                    : "bg-gray-200 text-gray-900"
                }`}
              >
                {tab.label}
              </motion.div>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center space-x-4">
        <button
          onClick={() => setDarkMode(!darkMode)}
          className={`p-2 rounded-full ${
            darkMode
              ? "bg-gray-700 text-yellow-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>
        <ProfileDropdown darkMode={darkMode} />
      </div>
    </header>
  );
};

export default TopNav;
