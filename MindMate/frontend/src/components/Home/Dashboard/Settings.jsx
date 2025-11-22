import { motion } from "framer-motion";
// src/components/Home/Dashboard/Settings.jsx

import { useState } from "react";
// CORRECTED: 'Palette' has been removed from this import line
import { User, Bell, Shield, Trash2, Key } from "react-feather";

// A reusable toggle switch component for our settings
const ToggleSwitch = ({ enabled, setEnabled, darkMode }) => (
  <div
    onClick={() => setEnabled(!enabled)}
    className={`w-14 h-8 flex items-center rounded-full p-1 cursor-pointer transition-colors duration-300 ${
      enabled ? "bg-blue-500" : darkMode ? "bg-gray-600" : "bg-gray-200"
    }`}
  >
    <motion.div
      layout
      transition={{ type: "spring", stiffness: 700, damping: 30 }}
      className={`w-6 h-6 rounded-full shadow-md ${
        darkMode ? "bg-gray-300" : "bg-white"
      }`}
    />
  </div>
);

const Settings = ({ darkMode }) => {
  const [notifications, setNotifications] = useState({
    reminders: true,
    forum: true,
    updates: false,
  });

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1, delayChildren: 0.2 },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: { y: 0, opacity: 1, transition: { type: "spring" } },
  };

  const handleNotificationChange = (key) => {
    setNotifications((prev) => ({ ...prev, [key]: !prev[key] }));
  };

  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={containerVariants}
      className={`h-full overflow-y-auto p-4 sm:p-6 md:p-8 ${
        darkMode ? "bg-gray-900 text-gray-200" : "bg-gray-50"
      }`}
    >
      <div className="max-w-3xl mx-auto">
        <motion.h1
          variants={itemVariants}
          className={`text-3xl font-bold mb-8 ${
            darkMode ? "text-white" : "text-gray-900"
          }`}
        >
          Settings
        </motion.h1>

        {/* Account Section */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl shadow-md mb-8 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-6">
            <User className="text-blue-500" /> Account
          </h2>
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <span className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Email Address
              </span>
              <span
                className={`font-medium ${
                  darkMode ? "text-white" : "text-gray-800"
                }`}
              >
                alex.doe@example.com
              </span>
            </div>
            <button
              className={`w-full text-left p-3 rounded-lg flex items-center gap-3 ${
                darkMode ? "hover:bg-gray-700" : "hover:bg-gray-100"
              }`}
            >
              <Key size={18} /> Change Password
            </button>
          </div>
        </motion.div>

        {/* Notifications Section */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl shadow-md mb-8 ${
            darkMode ? "bg-gray-800" : "bg-white"
          }`}
        >
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-6">
            <Bell className="text-green-500" /> Notifications
          </h2>
          <div className="space-y-5">
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Daily Reminders</p>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Get nudges to check in or journal.
                </p>
              </div>
              <ToggleSwitch
                enabled={notifications.reminders}
                setEnabled={() => handleNotificationChange("reminders")}
                darkMode={darkMode}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Forum Activity</p>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Notify me about replies and answers.
                </p>
              </div>
              <ToggleSwitch
                enabled={notifications.forum}
                setEnabled={() => handleNotificationChange("forum")}
                darkMode={darkMode}
              />
            </div>
            <div className="flex justify-between items-center">
              <div>
                <p className="font-medium">Platform Updates</p>
                <p
                  className={`text-sm ${
                    darkMode ? "text-gray-400" : "text-gray-500"
                  }`}
                >
                  Receive news about new features.
                </p>
              </div>
              <ToggleSwitch
                enabled={notifications.updates}
                setEnabled={() => handleNotificationChange("updates")}
                darkMode={darkMode}
              />
            </div>
          </div>
        </motion.div>

        {/* Danger Zone */}
        <motion.div
          variants={itemVariants}
          className={`p-6 rounded-xl border-2 ${
            darkMode
              ? "bg-gray-800 border-red-500/50"
              : "bg-white border-red-300"
          }`}
        >
          <h2 className="text-xl font-semibold flex items-center gap-3 mb-4 text-red-500">
            <Trash2 /> Danger Zone
          </h2>
          <p
            className={`text-sm mb-4 ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
          >
            Permanently delete your account and all associated data. This action
            is irreversible.
          </p>
          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            className="font-semibold text-white bg-red-600 hover:bg-red-700 px-4 py-2 rounded-lg"
          >
            Delete My Account
          </motion.button>
        </motion.div>
      </div>
    </motion.div>
  );
};

export default Settings;
