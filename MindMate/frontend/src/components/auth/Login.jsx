import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  Mail,
  Lock,
  Facebook,
  Linkedin,
  Eye,
  EyeOff,
  Sun,
  Moon,
  AlertCircle,
} from "react-feather";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../utils/axiosConfig";
import { toast } from "react-hot-toast";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import { AuthStorage, PreferencesStorage, setLocalStorageItem, getLocalStorageItem, removeLocalStorageItem } from "../../utils/localStorage";
import AuthBackLink from "./AuthBackLink";

const Login = () => {
  const location = useLocation();

  useEffect(() => {
    if (location.state?.fromLogout) {
      // Prevent back navigation to Home
      window.history.replaceState(null, "", "/login");
    }
  }, [location]);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [secretKey, setSecretKey] = useState("");
  const [userType, setUserType] = useState("patient");
  const [showPassword, setShowPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [errors, setErrors] = useState({ email: "", password: "", secretKey: "", form: "" });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const navigate = useNavigate();

  // Auto-fill email from OTP verification (Phase 1 integration)
  useEffect(() => {
    const verifiedEmail = PreferencesStorage.getEmail();
    const verifiedUserType = getLocalStorageItem('verified_user_type');
    
    if (verifiedEmail) {
      setEmail(verifiedEmail);
      // Clear the stored email after retrieving
      removeLocalStorageItem('verified_email');
    }
    
    if (verifiedUserType) {
      setUserType(verifiedUserType);
      removeLocalStorageItem('verified_user_type');
    }
  }, []);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = PreferencesStorage.getDarkMode();
    setDarkMode(savedMode);
  }, []);

  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    PreferencesStorage.setDarkMode(newMode);
  };

  // Animation variants
  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: {
        staggerChildren: 0.1,
      },
    },
  };

  const itemVariants = {
    hidden: { y: 20, opacity: 0 },
    visible: {
      y: 0,
      opacity: 1,
    },
  };

  // Validation
  const validate = () => {
    const newErrors = { email: "", password: "", secretKey: "", form: "" };
    let isValid = true;

    if (!email) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    if (!password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (password.length < 6) {
      newErrors.password = "Password must be at least 6 characters";
      isValid = false;
    }

    // Admin validation
    if (userType === "admin" && !secretKey) {
      newErrors.secretKey = "Secret key is required for admin login";
      isValid = false;
    }

    setErrors(newErrors);
    return isValid;
  };

  // Simplified specialist redirection logic
  const handleSpecialistRedirection = (loginResponse) => {
    try {
      const {
        redirect_to,
        status_message,
        approval_status,
        profile_completion_percentage,
        mandatory_fields_completed
      } = loginResponse;
      
      console.log("Specialist redirect:", {
        redirect_to,
        profile_completion: profile_completion_percentage,
        mandatory_completed: mandatory_fields_completed,
        approval_status
      });

      // Show status message based on approval status
      if (status_message) {
        const toastOptions = { duration: 4000 };
        
        switch (approval_status) {
          case "approved":
            toast.success(status_message, toastOptions);
            break;
          case "pending":
          case "under_review":
            toast(status_message, {
              ...toastOptions,
              icon: '⏳',
              style: {
                borderRadius: '10px',
                background: '#333',
                color: '#fff',
              }
            });
            break;
          case "rejected":
            toast.error(status_message, toastOptions);
            break;
          default:
            toast(status_message, toastOptions);
        }
      }

      // Navigate using backend's redirect_to path (always use backend decision)
      if (redirect_to) {
        navigate(redirect_to, { replace: true });
      } else {
        // Fallback if redirect_to is missing
        const fallbackPath = mandatory_fields_completed
          ? ROUTES.SPECIALIST_APPLICATION
          : ROUTES.SPECIALIST_PROFILE;
        console.warn("No redirect_to in response, using fallback:", fallbackPath);
        navigate(fallbackPath, { replace: true });
      }
      
    } catch (error) {
      console.error("Failed to redirect specialist:", error);
      toast.error("Unable to verify status. Redirecting to profile completion...");
      navigate(ROUTES.SPECIALIST_PROFILE, { replace: true });
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!validate()) return;

    setIsSubmitting(true);
    setErrors({ email: "", password: "", secretKey: "", form: "" });

    try {
      const loginData = {
        email: email.trim(),
        password: password,
        user_type: userType,
        ...(userType === "admin" && { secret_key: secretKey }),
      };

      const response = await apiClient.post(
        API_ENDPOINTS.AUTH.LOGIN,
        loginData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      // Store tokens and user info using centralized utility
      console.log("Login response:", response.data); // Debug log
      AuthStorage.setToken(response.data.access_token);
      AuthStorage.setRefreshToken(response.data.refresh_token);
      AuthStorage.setUserId(response.data.user_id);

      // Handle different user types
      if (userType === "patient") {
        // Store patient info
        AuthStorage.setUserType("patient");
        AuthStorage.setFullName(response.data.full_name);

        // Check if patient has completed the initial questionnaire
        const questionnaireCompleted = localStorage.getItem('questionnaire_completed') === 'true';

        if (!questionnaireCompleted) {
          // Redirect to initial information page
          navigate(ROUTES.INITIAL_INFORMATION);
        } else {
          // Navigate to patient dashboard
          navigate(ROUTES.DASHBOARD);
        }
      } else if (userType === "specialist") {
        // Store specialist info (Phase 1: store new fields)
        AuthStorage.setUserType("specialist");
        AuthStorage.setFullName(response.data.full_name);
        setLocalStorageItem("approval_status", response.data.approval_status);
        setLocalStorageItem("profile_complete", response.data.profile_complete);
        
        // Store new Phase 1 fields
        setLocalStorageItem("profile_completion_percentage", response.data.profile_completion_percentage || 0);
        setLocalStorageItem("mandatory_fields_completed", response.data.mandatory_fields_completed || false);
        setLocalStorageItem("account_status", response.data.account_status);
        
        // Store specialist_type for profile completion
        if (response.data.specialist_type) {
          setLocalStorageItem("specialist_type", response.data.specialist_type);
        }
        
        // Use redirect_to from backend response (Phase 1 integration)
        handleSpecialistRedirection(response.data);
      } else if (userType === "admin") {
        // Store admin info using AuthStorage
        AuthStorage.setUserType("admin");
        AuthStorage.setFullName(response.data.full_name);
        setLocalStorageItem("role", response.data.role);
        
        // Navigate to admin dashboard
        navigate(ROUTES.ADMIN_DASHBOARD);
      }

      // Show success message
      toast.success(`Welcome back, ${response.data.full_name}!`);

    } catch (error) {
      console.error("Login error:", error);
      
      // Handle timeout errors specifically
      if (error.code === 'ECONNABORTED' || error.message?.includes('timeout')) {
        setErrors({ form: "Request timed out. The server is taking too long to respond. Please check if the backend server is running and try again." });
        toast.error("Request timed out. Please check if the backend server is running at http://localhost:8000", { 
          duration: 8000,
          icon: '⏱️'
        });
        return;
      }
      
      if (error.response) {
        const errorDetail = error.response.data.detail;
        const errorMessage = typeof errorDetail === 'string' ? errorDetail : (errorDetail?.message || "Login failed. Please try again.");
        const errorMessageLower = errorMessage.toLowerCase();
        
        if (errorMessageLower.includes("suspended")) {
          setErrors({ form: "Your account has been suspended. Please contact support." });
          toast.error("Your account has been suspended. Please contact support.", { duration: 6000 });
        } else if (errorMessageLower.includes("verification")) {
          setErrors({ form: "Please verify your email before logging in." });
          toast.error("Please verify your email before logging in.", { duration: 6000 });
          
          // Auto-redirect to OTP page for verification
          setTimeout(() => {
            navigate(ROUTES.OTP, { 
              state: { 
                email: email.trim(), 
                userType: userType,
                fromLogin: true
              } 
            });
          }, 2000);
        } else if (errorMessageLower.includes("approval")) {
          setErrors({ form: "Your account is pending approval. Please wait for admin approval." });
          toast.error("Your account is pending approval.", { duration: 6000 });
        } else if (errorMessageLower.includes("locked")) {
          setErrors({ form: "Your account is temporarily locked due to multiple failed attempts. Please try again later." });
          toast.error("Account locked. Please try again later.", { duration: 6000 });
        } else if (errorMessageLower.includes("invalid email") || errorMessageLower.includes("invalid password")) {
          setErrors({ form: "Invalid email or password. Please try again." });
          toast.error("Invalid email or password.", { duration: 4000 });
        } else if (errorMessageLower.includes("no patient account found") || 
                   errorMessageLower.includes("no specialist account found") ||
                   errorMessageLower.includes("account found with this email")) {
          // Account not found - might be wrong user type
          const suggestedUserType = userType === "patient" ? "specialist" : "patient";
          setErrors({ 
            form: `No ${userType} account found with this email. You might be registered as a ${suggestedUserType}. Try switching user type.` 
          });
          toast.error(
            `No ${userType} account found. Try logging in as ${suggestedUserType} or check if you need to register first.`, 
            { 
              duration: 6000,
              icon: '👤'
            }
          );
        } else {
          setErrors({ form: errorMessage });
          toast.error(errorMessage, { duration: 5000 });
        }
      } else if (error.request) {
        // Network error - server not reachable
        setErrors({ form: "Cannot connect to server. Please check if the backend server is running at http://localhost:8000" });
        toast.error("Cannot connect to server. Please ensure the backend is running.", { 
          duration: 8000,
          icon: '🔌'
        });
      } else {
        setErrors({ form: "An unexpected error occurred." });
        toast.error("An unexpected error occurred.", { duration: 5000 });
      }
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
        variants={containerVariants}
        initial="hidden"
        animate="visible"
      >
        <div className="p-8 relative">
          <AuthBackLink
            to={ROUTES.LANDING}
            label="Back to Home"
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

          {/* Toggle: Patient | Specialist | Admin */}
          <motion.div className="flex justify-center mb-4" variants={itemVariants}>
            <div className={`inline-flex rounded-lg overflow-hidden border ${darkMode ? "border-gray-600" : "border-gray-300"}`}>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium ${
                  userType === "patient"
                    ? darkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-600 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-white text-gray-700"
                }`}
                onClick={() => setUserType("patient")}
              >
                Patient
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium ${
                  userType === "specialist"
                    ? darkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-600 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-white text-gray-700"
                }`}
                onClick={() => setUserType("specialist")}
              >
                Specialist
              </button>
              <button
                type="button"
                className={`px-4 py-2 text-sm font-medium ${
                  userType === "admin"
                    ? darkMode
                      ? "bg-indigo-600 text-white"
                      : "bg-indigo-600 text-white"
                    : darkMode
                    ? "bg-gray-700 text-gray-300"
                    : "bg-white text-gray-700"
                }`}
                onClick={() => setUserType("admin")}
              >
                Admin
              </button>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div className="text-center mb-8" variants={itemVariants}>
            <motion.h1
              className={`text-3xl font-bold mb-2 ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
              initial={{ scale: 0.9 }}
              animate={{ scale: 1 }}
              transition={{ type: "spring", stiffness: 200 }}
            >
              MindMate
            </motion.h1>
            <motion.p
              className={darkMode ? "text-gray-300" : "text-gray-600"}
              variants={itemVariants}
            >
              Where your mental health journey begins
            </motion.p>
          </motion.div>

          {/* Form Error Message */}
          <AnimatePresence>
            {errors.form && (
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
                <span>{errors.form}</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Login Form */}
          <motion.form onSubmit={handleSubmit} variants={containerVariants}>
            {/* Email Field */}
            <motion.div className="mb-4" variants={itemVariants}>
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
            </motion.div>

            {/* Password Field */}
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                    errors.password
                      ? "border-red-500"
                      : darkMode
                      ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                  }`}
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowPassword(!showPassword)}
                  disabled={isSubmitting}
                >
                  {showPassword ? (
                    <EyeOff className="text-gray-400" size={18} />
                  ) : (
                    <Eye className="text-gray-400" size={18} />
                  )}
                </button>
              </div>
              <AnimatePresence>
                {errors.password && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.password}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Secret Key Field - Only for Admin */}
            {userType === "admin" && (
              <motion.div className="mb-4" variants={itemVariants}>
                <label
                  className={`block text-sm font-medium mb-2 ${
                    darkMode ? "text-gray-300" : "text-gray-700"
                  }`}
                >
                  Secret Key
                </label>
                <div className="relative">
                  <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                    <Lock className="text-gray-400" size={18} />
                  </div>
                  <input
                    type="password"
                    className={`w-full pl-10 pr-4 py-2 border rounded-lg focus:outline-none focus:ring-2 ${
                      errors.secretKey
                        ? "border-red-500"
                        : darkMode
                        ? "border-gray-600 bg-gray-800 text-white focus:ring-indigo-400"
                        : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                    }`}
                    placeholder="Enter admin secret key"
                    value={secretKey}
                    onChange={(e) => setSecretKey(e.target.value)}
                    disabled={isSubmitting}
                  />
                </div>
                <AnimatePresence>
                  {errors.secretKey && (
                    <motion.p
                      className="text-red-500 text-xs mt-1"
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                    >
                      {errors.secretKey}
                    </motion.p>
                  )}
                </AnimatePresence>
              </motion.div>
            )}

            {/* Forgot Password Link */}
            <motion.div className="mb-6 text-right" variants={itemVariants}>
              <a
                href="#"
                className={`text-sm font-medium ${
                  darkMode
                    ? "text-purple-400 hover:text-purple-300"
                    : "text-purple-600 hover:text-purple-800"
                }`}
                onClick={(e) => {
                  e.preventDefault();
                  navigate(ROUTES.FORGOT_PASSWORD);
                }}
              >
                Forgot password?
              </a>
            </motion.div>

            {/* Submit Button */}
            <motion.button
              className={`w-full font-medium py-2 px-4 rounded-lg transition duration-200 flex justify-center items-center ${
                darkMode
                  ? "bg-indigo-500 hover:bg-indigo-600"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } text-white disabled:opacity-70`}
              type="submit"
              variants={itemVariants}
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
                "Sign In"
              )}
            </motion.button>
          </motion.form>

          {/* Divider */}
          <motion.div
            className="flex items-center my-6"
            variants={itemVariants}
          >
            <div
              className={`flex-grow border-t ${
                darkMode ? "border-gray-600" : "border-gray-300"
              }`}
            ></div>
            <span
              className={`flex-shrink mx-4 ${
                darkMode ? "text-gray-400" : "text-gray-500"
              }`}
            >
              or
            </span>
            <div
              className={`flex-grow border-t ${
                darkMode ? "border-gray-600" : "border-gray-300"
              }`}
            ></div>
          </motion.div>

          {/* Social Login */}
          <motion.div
            className="flex justify-center gap-4"
            variants={itemVariants}
          >
            <motion.button
              className={`p-3 rounded-full transition duration-200 ${
                darkMode
                  ? "bg-white/10 hover:bg-white/20"
                  : "bg-gray-100 hover:bg-gray-200"
              }`}
              whileHover={{ y: -2 }}
              whileTap={{ scale: 0.95 }}
              onClick={() => {
                toast("Google OAuth is not yet implemented. Please use email/password login.", { 
                  duration: 4000,
                  icon: 'ℹ️'
                });
              }}
              disabled={isSubmitting}
            >
              {/* Google Multi-color G Icon */}
              <svg
                xmlns="http://www.w3.org/2000/svg"
                width="20"
                height="20"
                viewBox="0 0 533.5 544.3"
              >
                <path
                  fill="#4285F4"
                  d="M533.5 278.4c0-17.4-1.5-34.1-4.3-50.2H272v95.1h146.9c-6.3 34.1-25.3 62.9-54.1 82.3v68h87.3c51.2-47.1 81.4-116.4 81.4-195.2z"
                />
                <path
                  fill="#34A853"
                  d="M272 544.3c73.7 0 135.5-24.4 180.6-66.2l-87.3-68c-24.3 16.3-55.4 26.1-93.3 26.1-71.6 0-132.3-48.3-154-113.5h-90.5v71.1c45.4 89.9 137.7 150.5 244.5 150.5z"
                />
                <path
                  fill="#FBBC04"
                  d="M118 322.7c-10.5-30.9-10.5-64.1 0-95l-90.5-71.1C4.7 206.5 0 237.9 0 272s4.7 65.5 27.5 115.4L118 322.7z"
                />
                <path
                  fill="#EA4335"
                  d="M272 107.7c39.9 0 75.9 13.7 104.3 40.6l78.1-78.1C407.4 24.3 345.6 0 272 0 165.2 0 72.9 60.6 27.5 150.5l90.5 71.1C139.7 156 200.4 107.7 272 107.7z"
                />
              </svg>
            </motion.button>
          </motion.div>

          {/* Sign Up Link */}
          <motion.div
            className={`text-center mt-6 text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
            variants={itemVariants}
          >
            Don't have an account?{" "}
            <a
              href="#"
              className={`font-medium ${
                darkMode
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
              onClick={(e) => {
                e.preventDefault();
                navigate(ROUTES.SIGNUP);
              }}
            >
              Sign up
            </a>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Login;
