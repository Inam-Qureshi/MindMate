import { motion } from "framer-motion";
import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import {
  XCircle,
  Mail,
  Phone,
  LogOut,
  ArrowRight,
  AlertTriangle,
  Sun,
  Moon,
  FileText,
  RefreshCw
} from "react-feather";
import { toast } from "react-hot-toast";

const SpecialistApplicationRejected = () => {
  const [darkMode, setDarkMode] = useState(false);
  const navigate = useNavigate();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  const handleLogout = () => {
    if (window.confirm("Are you sure you want to logout?")) {
      localStorage.removeItem("access_token");
      localStorage.removeItem("user_id");
      toast.success("Logged out successfully");
      navigate("/login");
    }
  };

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const handleReapply = () => {
    navigate("/complete-profile");
  };

  return (
    <div className={`min-h-screen ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className={`border-b ${darkMode ? 'border-gray-700' : 'border-gray-200'}`}>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <h1 className="text-2xl font-bold text-red-600">Application Status</h1>
            <div className="flex items-center space-x-3">
              <button
                onClick={toggleDarkMode}
                className={`p-2 rounded-full transition-colors ${
                  darkMode ? 'bg-gray-700 text-yellow-300' : 'bg-gray-200 text-gray-700'
                }`}
              >
                {darkMode ? <Sun size={20} /> : <Moon size={20} />}
              </button>
              <button
                onClick={handleLogout}
                className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                  darkMode ? 'bg-red-600 hover:bg-red-700 text-white' : 'bg-red-500 hover:bg-red-600 text-white'
                }`}
              >
                Logout
              </button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Status Card */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-8 mb-8`}
        >
          {/* Status Header */}
          <div className="text-center mb-8">
            <div className="flex justify-center mb-4">
              <div className={`p-4 rounded-full ${darkMode ? 'bg-red-900/20' : 'bg-red-50'}`}>
                <XCircle className="text-red-600" size={48} />
              </div>
            </div>
            <h2 className="text-3xl font-bold text-red-600 mb-2">Application Rejected</h2>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              Unfortunately, your specialist application has not been approved
            </p>
          </div>

          {/* Information Cards */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-8">
            <div className={`${darkMode ? 'bg-red-900/20 border-red-800' : 'bg-red-50 border-red-200'} border rounded-lg p-4`}>
              <div className="flex items-start space-x-3">
                <AlertTriangle className="text-red-600 mt-0.5" size={20} />
                <div>
                  <h3 className="font-medium text-red-800 mb-2">What This Means</h3>
                  <p className="text-sm text-red-700">
                    Your application did not meet our current requirements. This could be due to 
                    incomplete documentation, qualifications, or other factors reviewed by our admin team.
                  </p>
                </div>
              </div>
            </div>

            <div className={`${darkMode ? 'bg-yellow-900/20 border-yellow-800' : 'bg-yellow-50 border-yellow-200'} border rounded-lg p-4`}>
              <div className="flex items-start space-x-3">
                <RefreshCw className="text-yellow-600 mt-0.5" size={20} />
                <div>
                  <h3 className="font-medium text-yellow-800 mb-2">Next Steps</h3>
                  <p className="text-sm text-yellow-700">
                    You can reapply after addressing the issues mentioned in our feedback email. 
                    Please check your email for detailed feedback from our team.
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Common Reasons */}
          <div className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'} rounded-lg p-6 mb-6`}>
            <h3 className="font-semibold mb-4 flex items-center">
              <FileText className="text-indigo-600 mr-2" size={20} />
              Common Reasons for Rejection
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Incomplete or unclear documentation</li>
                <li>• Insufficient professional qualifications</li>
                <li>• Missing required certifications</li>
                <li>• Inadequate professional experience</li>
              </ul>
              <ul className={`space-y-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                <li>• Profile information inconsistencies</li>
                <li>• Document quality or authenticity concerns</li>
                <li>• Missing specialization requirements</li>
                <li>• Background verification issues</li>
              </ul>
            </div>
          </div>

          {/* Contact Information */}
          <div className={`${darkMode ? 'bg-blue-900/20 border-blue-800' : 'bg-blue-50 border-blue-200'} border rounded-lg p-4 mb-6`}>
            <div className="flex items-start space-x-3">
              <Mail className="text-blue-600 mt-0.5" size={20} />
              <div>
                <h3 className="font-medium text-blue-800 mb-2">Need More Information?</h3>
                <p className={`text-sm text-blue-700 mb-3`}>
                  If you have questions about the rejection or need clarification on how to improve your application:
                </p>
                <div className="flex flex-col sm:flex-row gap-3">
                  <a
                    href="mailto:support@mindmate.com"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Mail size={16} />
                    <span>support@mindmate.com</span>
                  </a>
                  <a
                    href="tel:+92-XXX-XXXXXXX"
                    className="flex items-center space-x-2 text-blue-600 hover:text-blue-800 text-sm"
                  >
                    <Phone size={16} />
                    <span>+92-XXX-XXXXXXX</span>
                  </a>
                </div>
              </div>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <button
              onClick={handleReapply}
              className="px-6 py-3 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 transition-colors flex items-center justify-center space-x-2"
            >
              <RefreshCw size={20} />
              <span>Update & Reapply</span>
            </button>
            
            <a
              href="mailto:support@mindmate.com"
              className={`px-6 py-3 rounded-lg font-medium transition-colors flex items-center justify-center space-x-2 ${
                darkMode 
                  ? 'bg-gray-700 text-gray-300 hover:bg-gray-600' 
                  : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
              }`}
            >
              <Mail size={20} />
              <span>Contact Support</span>
            </a>
          </div>
        </motion.div>

        {/* Tips for Reapplication */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`${darkMode ? 'bg-gray-800' : 'bg-white'} rounded-lg shadow-lg p-6`}
        >
          <h3 className="font-semibold mb-4 flex items-center">
            <ArrowRight className="text-indigo-600 mr-2" size={20} />
            Tips for Successful Reapplication
          </h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
            <div>
              <h4 className="font-medium mb-2">📋 Review Requirements</h4>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Carefully review all requirements and ensure your qualifications meet our standards.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">📄 Improve Documentation</h4>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Provide clear, high-quality scans of all required documents and certifications.
              </p>
            </div>
            <div>
              <h4 className="font-medium mb-2">✨ Enhance Profile</h4>
              <p className={darkMode ? 'text-gray-300' : 'text-gray-600'}>
                Update your professional bio and ensure all information is accurate and complete.
              </p>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default SpecialistApplicationRejected;

