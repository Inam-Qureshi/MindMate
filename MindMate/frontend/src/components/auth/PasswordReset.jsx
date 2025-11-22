import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Lock, Eye, EyeOff, Sun, Moon, CheckCircle, AlertCircle } from "react-feather";
import { useNavigate, useLocation } from "react-router-dom";
import axios from "axios";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import AuthBackLink from "./AuthBackLink";

const PasswordResetForm = () => {
  const [newPassword, setNewPassword] = useState("");
  const [confirmPassword, setConfirmPassword] = useState("");
  const [showNewPassword, setShowNewPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errors, setErrors] = useState({});
  const [passwordStrength, setPasswordStrength] = useState({
    score: 0,
    feedback: []
  });

  const navigate = useNavigate();
  const location = useLocation();

  // Get reset token from location state
  const resetToken = location.state?.resetToken;
  const email = location.state?.email;
  const userType = location.state?.userType;

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
  }, []);

  // Check if we have required data
  useEffect(() => {
    if (!resetToken || !email || !userType) {
      toast.error("Invalid reset session. Please request a new password reset.");
      navigate(ROUTES.FORGOT_PASSWORD);
    }
  }, [resetToken, email, userType, navigate]);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
  };

  const validatePassword = (password) => {
    const feedback = [];
    let score = 0;

    if (password.length >= 8) score += 1;
    else feedback.push("At least 8 characters");

    if (/[a-z]/.test(password)) score += 1;
    else feedback.push("One lowercase letter");

    if (/[A-Z]/.test(password)) score += 1;
    else feedback.push("One uppercase letter");

    if (/\d/.test(password)) score += 1;
    else feedback.push("One number");

    if (/[!@#$%^&*(),.?":{}|<>]/.test(password)) score += 1;
    else feedback.push("One special character");

    return { score, feedback };
  };

  const handlePasswordChange = (password) => {
    setNewPassword(password);
    setPasswordStrength(validatePassword(password));
    
    // Clear password match error when password changes
    if (errors.confirmPassword && password === confirmPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "" }));
    }
  };

  const handleConfirmPasswordChange = (password) => {
    setConfirmPassword(password);
    
    // Clear password match error when confirm password changes
    if (errors.confirmPassword && password === newPassword) {
      setErrors(prev => ({ ...prev, confirmPassword: "" }));
    }
  };

  const validate = () => {
    const newErrors = {};

    if (!newPassword) {
      newErrors.newPassword = "New password is required";
    } else if (newPassword.length < 8) {
      newErrors.newPassword = "Password must be at least 8 characters long";
    } else if (passwordStrength.score < 5) {
      newErrors.newPassword = "Password must meet all requirements (lowercase, uppercase, number, special character)";
    }

    if (!confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
    } else if (newPassword !== confirmPassword) {
      newErrors.confirmPassword = "Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await axios.post(`${API_URL}${API_ENDPOINTS.AUTH.RESET_PASSWORD}`, {
        reset_token: resetToken,
        new_password: newPassword,
        confirm_password: confirmPassword
      });

      if (response.data.success) {
        toast.success("Password reset successfully!");
        
        // Show success message briefly before redirecting
        setTimeout(() => {
          navigate(ROUTES.LOGIN, { 
            state: { 
              message: "Password reset successfully! Please log in with your new password.",
              email: email 
            }
          });
        }, 2000);
      }
    } catch (error) {
      const errorMessage = error.response?.data?.detail || "Failed to reset password. Please try again.";
      toast.error(errorMessage);
      
      // Handle specific error cases
      if (error.response?.status === 410) {
        // Token expired
        setTimeout(() => {
          navigate(ROUTES.FORGOT_PASSWORD);
        }, 2000);
      } else if (error.response?.status === 400) {
        // Validation error - show in form
        if (errorMessage.includes("Password must")) {
          setErrors({ newPassword: errorMessage });
        } else if (errorMessage.includes("do not match")) {
          setErrors({ confirmPassword: errorMessage });
        }
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const getPasswordStrengthColor = () => {
    if (passwordStrength.score >= 5) return "text-green-500";
    if (passwordStrength.score >= 4) return "text-yellow-500";
    if (passwordStrength.score >= 3) return "text-orange-500";
    return "text-red-500";
  };

  const getPasswordStrengthText = () => {
    if (passwordStrength.score >= 5) return "Strong";
    if (passwordStrength.score >= 4) return "Good";
    if (passwordStrength.score >= 3) return "Fair";
    if (passwordStrength.score >= 2) return "Weak";
    return "Very Weak";
  };

  if (!resetToken || !email || !userType) {
    return null; // Will redirect in useEffect
  }

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
          <AuthBackLink
            to={ROUTES.LOGIN}
            label="Back to Login"
            darkMode={darkMode}
          />
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
              Set New Password
            </motion.h1>
            <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
              Enter your new password below
            </p>
          </div>

          <motion.form onSubmit={handleSubmit}>
            {/* New Password Field */}
            <div className="mb-6">
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showNewPassword ? "text" : "password"}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.newPassword
                      ? "border-red-500"
                      : darkMode
                      ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                  }`}
                  placeholder="Enter new password"
                  value={newPassword}
                  onChange={(e) => handlePasswordChange(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowNewPassword(!showNewPassword)}
                  disabled={isSubmitting}
                >
                  {showNewPassword ? (
                    <EyeOff className="text-gray-400" size={18} />
                  ) : (
                    <Eye className="text-gray-400" size={18} />
                  )}
                </button>
              </div>
              
              {/* Password Strength Indicator */}
              {newPassword && (
                <div className="mt-2">
                  <div className="flex items-center gap-2 mb-1">
                    <span className={`text-sm font-medium ${getPasswordStrengthColor()}`}>
                      {getPasswordStrengthText()}
                    </span>
                    <div className="flex gap-1">
                      {[1, 2, 3, 4, 5, 6].map((level) => (
                        <div
                          key={level}
                          className={`w-2 h-2 rounded-full ${
                            level <= passwordStrength.score
                              ? getPasswordStrengthColor().replace('text-', 'bg-')
                              : darkMode ? "bg-gray-600" : "bg-gray-200"
                          }`}
                        />
                      ))}
                    </div>
                  </div>
                  <div className="text-xs text-gray-500">
                    {passwordStrength.feedback.join(", ")}
                  </div>
                </div>
              )}
              
              <AnimatePresence>
                {errors.newPassword && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.newPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Confirm Password Field */}
            <div className="mb-6">
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Confirm New Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.confirmPassword
                      ? "border-red-500"
                      : darkMode
                      ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                  }`}
                  placeholder="Confirm new password"
                  value={confirmPassword}
                  onChange={(e) => handleConfirmPasswordChange(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff className="text-gray-400" size={18} />
                  ) : (
                    <Eye className="text-gray-400" size={18} />
                  )}
                </button>
              </div>
              
              {/* Password Match Indicator */}
              {confirmPassword && (
                <div className="mt-2 flex items-center gap-2">
                  {newPassword === confirmPassword ? (
                    <CheckCircle className="text-green-500" size={16} />
                  ) : (
                    <AlertCircle className="text-red-500" size={16} />
                  )}
                  <span className={`text-xs ${
                    newPassword === confirmPassword ? "text-green-600" : "text-red-600"
                  }`}>
                    {newPassword === confirmPassword ? "Passwords match" : "Passwords do not match"}
                  </span>
                </div>
              )}
              
              <AnimatePresence>
                {errors.confirmPassword && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.confirmPassword}
                  </motion.p>
                )}
              </AnimatePresence>
            </div>

            {/* Submit Button */}
            <motion.button
              className={`w-full font-medium py-3 px-4 rounded-lg transition duration-200 flex justify-center items-center ${
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
                "Reset Password"
              )}
            </motion.button>
          </motion.form>

          {/* Back to Login Link */}
          <div className="text-center mt-6">
            <button
              onClick={() => navigate(ROUTES.LOGIN)}
              className={`text-sm font-medium ${
                darkMode
                  ? "text-blue-400 hover:text-blue-300"
                  : "text-blue-600 hover:text-blue-800"
              }`}
            >
              Back to Login
            </button>
          </div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default PasswordResetForm;
