// src/components/Home/Navigation/ProfileDropdown.jsx

import { useState, useRef, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { User, LogOut, Settings } from "react-feather";
import { AnimatePresence, motion } from "framer-motion";
import { Modal } from "../../common/Modal";
import { toast } from "react-hot-toast";

const ProfileDropdown = ({ darkMode }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [showLogoutModal, setShowLogoutModal] = useState(false);
  const dropdownRef = useRef(null);
  const navigate = useNavigate();

  const handleLogoutConfirm = () => {
    localStorage.removeItem("access_token");
    localStorage.removeItem("user_id");
    toast.success("Logged out successfully", {
      position: "bottom-center",
      duration: 3000,
    });
    navigate("/", { replace: true });
  };

  const handleNavigate = (path) => {
    setIsOpen(false);
    navigate(path);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
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
              onClick={handleLogoutConfirm}
              className="px-4 py-2 rounded-md bg-red-600 hover:bg-red-700 text-white"
            >
              Log Out
            </button>
          </div>
        </div>
      </Modal>

      <AnimatePresence>
        {isOpen && (
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
                onClick={() => handleNavigate("/dashboard/profile")}
                className={`w-full text-left px-4 py-2 text-sm flex items-center ${
                  darkMode
                    ? "text-gray-300 hover:bg-gray-700"
                    : "text-gray-700 hover:bg-gray-100"
                }`}
              >
                <User size={16} className="mr-2" />
                Profile
              </button>
              {/* UPDATED: Added onClick to navigate */}
              <button
                onClick={() => handleNavigate("/dashboard/settings")}
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
                  setIsOpen(false);
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
      </AnimatePresence>
    </div>
  );
};

export default ProfileDropdown;
