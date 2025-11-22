import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Mail, Sun, Moon, AlertCircle } from "react-feather";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import AuthBackLink from "./AuthBackLink";

const ForgotPassword = () => {
  const [email, setEmail] = useState("");
  const [userType, setUserType] = useState("patient");
  const [darkMode, setDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isSubmitted, setIsSubmitted] = useState(false);
  const [errors, setErrors] = useState({ email: "", userType: "" });
  const [formError, setFormError] = useState("");
  const navigate = useNavigate();

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const validate = () => {
    const newErrors = { email: "", userType: "" };
    let isValid = true;

    if (!email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    if (!userType) {
      newErrors.userType = "User type is required";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setFormError("");
    setErrors({ email: "", userType: "" });

    try {
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.AUTH.REQUEST_PASSWORD_RESET}`, {
        email: email.trim(),
        user_type: userType
      });

      if (response.data.success) {
        setIsSubmitted(true);
        toast.success("Password reset instructions sent to your email!");
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to send password reset. Please try again.";
      setFormError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <motion.div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
        darkMode
          ? "bg-gradient-to-br from-gray-800 to-gray-900 text-gray-100"
          : "bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-900"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className={`w-full max-w-md rounded-xl shadow-lg overflow-hidden ${
          darkMode ? "bg-gray-700" : "bg-white"
        }`}
        initial={{ scale: 0.9 }}
        animate={{ scale: 1 }}
        transition={{ type: "spring", stiffness: 300 }}
      >
        <div className="p-8 relative">
          {/* Dark Mode Toggle */}
          <motion.button
            onClick={toggleDarkMode}
            className={`absolute top-4 right-4 p-2 rounded-full ${
              darkMode
                ? "bg-gray-600 text-yellow-300"
                : "bg-gray-100 text-gray-700"
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          <AuthBackLink
            to={ROUTES.LOGIN}
            label="Back to Login"
            darkMode={darkMode}
          />

          {/* Header */}
          <div className="text-center mb-8">
            <motion.h1
              className={`text-3xl font-bold mb-2 ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              Reset Password
            </motion.h1>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
              {isSubmitted
                ? "Check your email for reset instructions"
                : "Enter your email to receive a password reset OTP"}
            </p>
          </div>

          {/* Form Error Message */}
          <AnimatePresence>
            {formError && (
              <motion.div
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  darkMode
                    ? "bg-red-900/30 text-red-300"
                    : "bg-red-100 text-red-700"
                }`}
                initial={{ opacity: 0, y: -20 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -20 }}
              >
                <AlertCircle size={18} />
                <span>{formError}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {!isSubmitted ? (
            <motion.form onSubmit={handleSubmit}>
              {/* User Type Field */}
              <div className="mb-6">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  User Type
                </label>
                <select
                  className={`w-full py-2 px-3 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.userType
                      ? "border-red-500"
                      : darkMode
                      ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                  }`}
                  value={userType}
                  onChange={(e) => setUserType(e.target.value)}
                  disabled={isSubmitting}
                >
                  <option value="patient">Patient</option>
                  <option value="specialist">Specialist</option>
                  <option value="admin">Admin</option>
                </select>
                <AnimatePresence>
                  {errors.userType && (
                    <motion.p
                      className="text-red-500 text-xs mt-1"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {errors.userType}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Email Field */}
              <div className="mb-6">
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Email
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Mail className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="email"
                    className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.email
                        ? "border-red-500"
                        : darkMode
                        ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                        : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                    }`}
                    placeholder="your@email.com"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <AnimatePresence>
                  {errors.email && (
                    <motion.p
                      className="text-red-500 text-xs mt-1"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {errors.email}
                    </motion.p>
                  )}
                </AnimatePresence>
              </div>

              {/* Submit Button */}
              <motion.button
                className={`w-full font-medium py-2 px-4 rounded-lg transition duration-200 flex justify-center items-center ${
                  darkMode
                    ? "bg-indigo-500 hover:bg-indigo-600"
                    : "bg-indigo-600 hover:bg-indigo-700"
                } text-white disabled:opacity-70`}
                type="submit"
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.98 }}
                disabled={isSubmitting}
              >
                {isSubmitting ? (
                  <motion.span
                    animate={{ rotate: 360 }}
                    transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                    className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                  />
                ) : (
                  "Send Reset OTP"
                )}
              </motion.button>
            </motion.form>
          ) : (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.5 }}
              className={`p-4 rounded-lg text-center ${
                darkMode ? "bg-gray-600" : "bg-blue-50"
              }`}
            >
              <p className={darkMode ? "text-gray-200" : "text-blue-800"}>
                We've sent an OTP to {email} with instructions to reset your
                password.
              </p>
              <div className="mt-4">
                <button
                  onClick={() => navigate(ROUTES.OTP, { 
                    state: { 
                      email, 
                      userType, 
                      isPasswordReset: true 
                    } 
                  })}
                  className={`px-4 py-2 rounded-lg font-medium ${
                    darkMode
                      ? "bg-indigo-500 hover:bg-indigo-600 text-white"
                      : "bg-indigo-600 hover:bg-indigo-700 text-white"
                  }`}
                >
                  Enter OTP
                </button>
              </div>
            </motion.div>
          )}
        </div>
      </motion.div>
    </motion.div>
  );
};

export default ForgotPassword;
