import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import {
  BarChart,
  Calendar,
  Users,
  MessageSquare,
  User,
  Settings,
  LogOut,
  Sun,
  Moon
} from 'react-feather';

const DashboardHeader = ({ 
  activeTab, 
  onTabChange, 
  darkMode, 
  onToggleDarkMode, 
  specialistInfo,
  onLogout 
}) => {
  const [showProfileDropdown, setShowProfileDropdown] = useState(false);
  const [hoveredTab, setHoveredTab] = useState(null);
  const dropdownRef = useRef(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowProfileDropdown(false);
      }
    };

    if (showProfileDropdown) {
      document.addEventListener('mousedown', handleClickOutside);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, [showProfileDropdown]);

  const tabs = [
    { id: "overview", icon: BarChart, label: "Overview" },
    { id: "appointments", icon: Calendar, label: "Appointments" },
    { id: "patients", icon: Users, label: "Patients" },
    { id: "forum", icon: MessageSquare, label: "Forum" },
    { id: "profile", icon: User, label: "Profile" },
  ];

  return (
    <header
      className={`sticky top-0 z-50 ${
        darkMode ? "bg-gray-800" : "bg-white"
      } shadow-md py-4 px-6 flex justify-between items-center`}
    >
      {/* Logo */}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        className="flex items-center space-x-2"
      >
        <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white font-bold">
          M
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-emerald-500 to-teal-600 bg-clip-text text-transparent">
          MindMate
        </h1>
      </motion.div>

      {/* Navigation Tabs */}
      <div className="flex items-center space-x-6">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          return (
            <div
              key={tab.id}
              className="relative"
              onMouseEnter={() => setHoveredTab(tab.id)}
              onMouseLeave={() => setHoveredTab(null)}
            >
              <button
                onClick={() => onTabChange(tab.id)}
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
                <Icon size={20} />
              </button>

              {hoveredTab === tab.id && (
                <motion.div
                  initial={{ opacity: 0, y: -10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.2 }}
                  className={`absolute top-full left-1/2 transform -translate-x-1/2 mt-1 px-2 py-1 rounded text-xs font-medium whitespace-nowrap ${
                    darkMode
                      ? "bg-gray-700 text-white"
                      : "bg-gray-200 text-gray-900"
                  }`}
                >
                  {tab.label}
                </motion.div>
              )}
            </div>
          );
        })}
      </div>

      {/* Right Section */}
      <div className="flex items-center space-x-4">
        {/* Dark Mode Toggle */}
        <button
          onClick={onToggleDarkMode}
          className={`p-2 rounded-full ${
            darkMode
              ? "bg-gray-700 text-yellow-300"
              : "bg-gray-200 text-gray-700"
          }`}
        >
          {darkMode ? <Sun size={18} /> : <Moon size={18} />}
        </button>

        {/* Profile Dropdown */}
        <div className="relative" ref={dropdownRef}>
          <button
            onClick={() => setShowProfileDropdown(!showProfileDropdown)}
            className={`flex items-center space-x-2 p-2 rounded-full transition-colors ${
              darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
            } ${showProfileDropdown ? (darkMode ? "bg-gray-700" : "bg-gray-100") : ""}`}
          >
            <div className="w-8 h-8 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white font-medium">
              {specialistInfo?.first_name?.charAt(0) || "S"}
            </div>
          </button>

          {showProfileDropdown && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className={`absolute right-0 mt-2 w-48 rounded-md shadow-lg py-1 z-50 ${
                darkMode ? "bg-gray-700" : "bg-white"
              } ring-1 ring-black ring-opacity-5`}
            >
              <button
                onClick={() => {
                  onTabChange("profile");
                  setShowProfileDropdown(false);
                }}
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                  darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User className="mr-3 h-4 w-4" />
                Profile
              </button>
              <button
                onClick={() => {
                  // Settings functionality can be added later
                  setShowProfileDropdown(false);
                }}
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                  darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <Settings className="mr-3 h-4 w-4" />
                Settings
              </button>
              <hr className={`my-1 ${darkMode ? "border-gray-600" : "border-gray-200"}`} />
              <button
                onClick={() => {
                  onLogout();
                  setShowProfileDropdown(false);
                }}
                className={`flex items-center px-4 py-2 text-sm w-full text-left ${
                  darkMode ? "text-gray-300 hover:bg-gray-600" : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <LogOut className="mr-3 h-4 w-4" />
                Logout
              </button>
            </motion.div>
          )}
        </div>
      </div>
    </header>
  );
};

export default DashboardHeader;

