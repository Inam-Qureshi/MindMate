import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  Mail,
  Lock,
  Eye,
  EyeOff,
  Sun,
  Moon,
  Check,
  AlertCircle,
  Calendar,
} from "react-feather";
import { useNavigate } from "react-router-dom";
import apiClient from "../../utils/axiosConfig";
import { toast } from "react-hot-toast";
import {
  ValidatedInput,
  ValidatedSelect,
  ValidationMessage,
  PasswordStrengthIndicator,
  FormProgressIndicator,
  useFormValidation
} from "../common/FormValidation";
import { API_URL, API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import AuthBackLink from "./AuthBackLink";

const Signup = () => {
  // User type toggle (patient | specialist)
  const [userType, setUserType] = useState("patient");

  // Form validation hook
  const validationRules = {
    firstName: {
      required: true,
      pattern: /^[a-zA-Z\s-']+$/,
      patternMessage: "Only letters, spaces, hyphens, and apostrophes allowed"
    },
    lastName: {
      required: true,
      pattern: /^[a-zA-Z\s-']+$/,
      patternMessage: "Only letters, spaces, hyphens, and apostrophes allowed"
    },
    gender: {
      required: userType === "patient"
    },
    specialistType: {
      required: userType === "specialist",
      custom: (value) => {
        if (userType === "specialist" && !value) return "Specialist type is required";
        return "";
      }
    },
    email: {
      required: true,
      email: true
    },
    password: {
      required: true,
      minLength: 8
    },
    confirmPassword: {
      required: true,
      match: "password"
    },
    acceptsTermsAndConditions: {
      required: true,
      custom: (value) => value ? "" : "You must accept the terms and conditions"
    }
  };

  const {
    values: formData,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit: submitForm,
    resetForm,
    setValues,
    setErrors
  } = useFormValidation({
    firstName: "",
    lastName: "",
    gender: "",
    specialistType: "",
    email: "",
    password: "",
    confirmPassword: "",
    acceptsTermsAndConditions: false,
  }, validationRules);

  // UI state
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [darkMode, setDarkMode] = useState(false);
  const [specialistTypes, setSpecialistTypes] = useState([]);
  const [loadingSpecialistTypes, setLoadingSpecialistTypes] = useState(false);
  const [success, setSuccess] = useState(false);
  const [formErrors, setFormErrors] = useState({});
  const navigate = useNavigate();

  // Initialize dark mode
  useEffect(() => {
    const savedMode = localStorage.getItem("darkMode") === "true";
    setDarkMode(savedMode);
    document.body.className = savedMode ? "dark" : "light";
  }, []);

  // Fetch specialist types when user selects specialist
  useEffect(() => {
    if (userType === "specialist") {
      const fetchSpecialistTypes = async () => {
        setLoadingSpecialistTypes(true);
        try {
          const response = await apiClient.get(`${API_ENDPOINTS.SPECIALISTS.DROPDOWN_OPTIONS}`);
          console.log("Dropdown options response:", response.data);
          
          // Handle different possible response structures
          let types = [];
          if (response.data) {
            if (Array.isArray(response.data.specialist_types)) {
              types = response.data.specialist_types;
            } else if (Array.isArray(response.data)) {
              types = response.data;
            } else if (response.data.data && Array.isArray(response.data.data.specialist_types)) {
              types = response.data.data.specialist_types;
            }
          }
          
          console.log("Processed specialist types:", types);
          
          if (types.length === 0) {
            console.warn("No specialist types found in response");
            toast.error("No specialist types available");
          } else {
            setSpecialistTypes(types);
            console.log("Specialist types set successfully:", types);
          }
        } catch (error) {
          console.error("Failed to fetch specialist types:", error);
          console.error("Error details:", {
            message: error.message,
            response: error.response?.data,
            status: error.response?.status,
            url: error.config?.url
          });
          toast.error(`Failed to load specialist types: ${error.response?.data?.detail || error.message}`);
          setSpecialistTypes([]); // Clear on error
        } finally {
          setLoadingSpecialistTypes(false);
        }
      };
      fetchSpecialistTypes();
    } else {
      // Clear specialist types when switching away from specialist
      setSpecialistTypes([]);
      setLoadingSpecialistTypes(false);
    }
  }, [userType]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    const newMode = !darkMode;
    setDarkMode(newMode);
    localStorage.setItem("darkMode", newMode.toString());
    document.body.className = newMode ? "dark" : "light";
  };

  // Handle user type change and clear relevant fields
  const handleUserTypeChange = (newUserType) => {
    console.log("DEBUG: Switching user type from", userType, "to", newUserType);
    console.log("DEBUG: Current formData before switch:", formData);
    
    setUserType(newUserType);
    
    // Clear specialist-specific fields when switching to specialist
    if (newUserType === "specialist") {
      const newFormData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        acceptsTermsAndConditions: formData.acceptsTermsAndConditions,
        // Clear patient-specific fields
        gender: "",
        specialistType: ""
      };
      console.log("DEBUG: New formData for specialist:", newFormData);
      
      setValues(newFormData);
      setFormErrors(prev => ({
        ...prev,
        gender: "",
        specialistType: ""
      }));
    } else if (newUserType === "patient") {
      // Clear specialist-specific fields when switching to patient
      const newFormData = {
        firstName: formData.firstName,
        lastName: formData.lastName,
        email: formData.email,
        password: formData.password,
        confirmPassword: formData.confirmPassword,
        acceptsTermsAndConditions: formData.acceptsTermsAndConditions,
        // Keep patient fields as they are
        gender: formData.gender,
        specialistType: ""
      };
      console.log("DEBUG: New formData for patient:", newFormData);
      
      setValues(newFormData);
    }
    
    // Clear any existing form errors
    setFormErrors(prev => ({
      ...prev,
      form: ""
    }));
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
      transition: { type: "spring", stiffness: 100 },
    },
  };

  const successVariants = {
    hidden: { scale: 0.8, opacity: 0 },
    visible: { scale: 1, opacity: 1 },
  };

  // Validation functions
  const validateName = (name) => /^[a-zA-Z\s-']+$/.test(name);
  const validateEmail = (email) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
  const validatePassword = (password) => password.length >= 8;

  const validateForm = () => {
    const newErrors = {
      firstName: "",
      lastName: "",
      gender: "",
      specialistType: "",
      email: "",
      password: "",
      confirmPassword: "",
      form: "",
    };
    let isValid = true;

    // First name validation
    if (!formData.firstName.trim()) {
      newErrors.firstName = "First name is required";
      isValid = false;
    } else if (!validateName(formData.firstName)) {
      newErrors.firstName = "Only letters and hyphens allowed";
      isValid = false;
    }

    // Last name validation
    if (!formData.lastName.trim()) {
      newErrors.lastName = "Last name is required";
      isValid = false;
    } else if (!validateName(formData.lastName)) {
      newErrors.lastName = "Only letters and hyphens allowed";
      isValid = false;
    }

    // Gender validation - ONLY for patients
    if (userType === "patient") {
      if (!formData.gender) {
        newErrors.gender = "Gender is required";
        isValid = false;
      }
    }

    // Specialist type validation - ONLY for specialists
    if (userType === "specialist") {
      if (!formData.specialistType) {
        newErrors.specialistType = "Specialist type is required";
        isValid = false;
      }
    }

    // Email validation
    if (!formData.email.trim()) {
      newErrors.email = "Email is required";
      isValid = false;
    } else if (!validateEmail(formData.email)) {
      newErrors.email = "Please enter a valid email";
      isValid = false;
    }

    // Password validation
    if (!formData.password) {
      newErrors.password = "Password is required";
      isValid = false;
    } else if (!validatePassword(formData.password)) {
      newErrors.password = "Password must be at least 8 characters";
      isValid = false;
    }

    // Confirm password validation
    if (!formData.confirmPassword) {
      newErrors.confirmPassword = "Please confirm your password";
      isValid = false;
    } else if (formData.password !== formData.confirmPassword) {
      newErrors.confirmPassword = "Passwords don't match";
      isValid = false;
    }

    // Terms and conditions validation
    if (!formData.acceptsTermsAndConditions) {
      newErrors.acceptsTermsAndConditions = "You must accept the terms and conditions";
      isValid = false;
    }

    // Specialist-specific validation - REMOVED

    setFormErrors(newErrors);
    return isValid;
  };

  // Handle checkbox changes separately
  const handleCheckboxChange = (e) => {
    const { name, checked } = e.target;
    handleChange({ target: { name, value: checked } });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    await submitForm(async (formValues) => {
    setSuccess(false);

    try {
      let backendFormData;
      let endpoint;

      if (userType === "patient") {
        backendFormData = {
          first_name: formValues.firstName.trim(),
          last_name: formValues.lastName.trim(),
          gender: formValues.gender,
          email: formValues.email.trim(),
          password: formValues.password,
          accepts_terms_and_conditions: formValues.acceptsTermsAndConditions,
        };
        endpoint = `${API_URL}${API_ENDPOINTS.VERIFICATION.REGISTER_PATIENT}`;
      } else if (userType === "specialist") {
        backendFormData = {
          first_name: formValues.firstName.trim(),
          last_name: formValues.lastName.trim(),
          email: formValues.email.trim(),
          password: formValues.password,
          specialist_type: formValues.specialistType,
          accepts_terms_and_conditions: formValues.acceptsTermsAndConditions,
        };
        endpoint = `${API_URL}${API_ENDPOINTS.SPECIALISTS.REGISTRATION_REGISTER}`;
        
        console.log("DEBUG: Specialist backendFormData:", backendFormData);
        console.log("DEBUG: Form values used:", formValues);
      }

      // Debug: Log what we're sending
      console.log("DEBUG: Sending registration data:", backendFormData);
      console.log("DEBUG: Endpoint:", endpoint);
      console.log("DEBUG: User type:", userType);
      console.log("DEBUG: Original formData:", formData);
      
      // Make the registration request
      const response = await apiClient.post(endpoint, backendFormData, {
        headers: {
          "Content-Type": "application/json",
        },
        timeout: 30000,
      });
      
      console.log("DEBUG: Registration response:", response.data);

      // Store comprehensive registration data in localStorage for recovery
      const userEmail = formValues.email.trim();
      localStorage.setItem('pending_verification_email', userEmail);
      localStorage.setItem('pending_verification_user_type', userType);
      
      // Store patient-specific data for recovery (if OTP page is refreshed)
      if (userType === "patient") {
        localStorage.setItem('pending_patient_first_name', formValues.firstName.trim());
        localStorage.setItem('pending_patient_last_name', formValues.lastName.trim());
        localStorage.setItem('pending_patient_gender', formValues.gender);
      }
      
      // Store specialist type if specialist registration
      if (userType === "specialist" && formValues.specialistType) {
        localStorage.setItem('pending_specialist_type', formValues.specialistType);
      }

      // On successful signup, navigate to the OTP verification page
      setFormErrors((prev) => ({ ...prev, form: "" })); // Clear any previous form errors
      setSuccess(true);
      toast.success("Account created! Please check your email for an OTP.");

      setTimeout(() => {
        navigate(ROUTES.OTP, { 
          state: { 
            email: userEmail, 
            userType: userType 
          },
          replace: true 
        });
      }, 1500);
    } catch (error) {
      console.error("Signup error:", error);
      setSuccess(false); // Ensure success state is false on error

      if (error.response) {
        const statusCode = error.response.status;
        const responseData = error.response.data;
        const detail = responseData.detail || responseData;
        
        // Handle ValidationService object errors with arrays
        if (typeof detail === 'object' && detail.errors && Array.isArray(detail.errors)) {
          const errorMessages = detail.errors;
          const fieldErrors = {};
          
          // Map validation errors to field names
          errorMessages.forEach(errMsg => {
            if (errMsg.includes('email')) {
              fieldErrors.email = errMsg;
            } else if (errMsg.includes('password')) {
              fieldErrors.password = errMsg;
            } else if (errMsg.includes('specialist type')) {
              fieldErrors.specialistType = errMsg;
            } else if (errMsg.includes('first_name') || errMsg.includes('first name')) {
              fieldErrors.firstName = errMsg;
            } else if (errMsg.includes('last_name') || errMsg.includes('last name')) {
              fieldErrors.lastName = errMsg;
            } else if (errMsg.includes('gender')) {
              fieldErrors.gender = errMsg;
            } else if (errMsg.includes('terms')) {
              fieldErrors.acceptsTermsAndConditions = errMsg;
            } else {
              fieldErrors.form = errMsg;
            }
          });
          
          setFormErrors((prev) => ({ ...prev, ...fieldErrors }));
          toast.error(detail.message || "Please fix the validation errors above.", { duration: 5000 });
        }
        // Handle conflict errors (email already exists or pending verification)
        else if (statusCode === 409) {
          // Backend can return detail as object or string
          const errorMessage = typeof detail === 'string' 
            ? detail 
            : (detail?.message || responseData.message || "Email already registered");
          
          // Check if we should redirect to OTP page for pending verification
          // Backend returns: {'message': '...', 'redirect_to_otp': True, ...}
          const shouldRedirectToOTP = (
            (typeof detail === 'object' && detail?.redirect_to_otp === true) ||
            (typeof responseData === 'object' && responseData?.redirect_to_otp === true) ||
            errorMessage.toLowerCase().includes("pending verification") ||
            errorMessage.toLowerCase().includes("check your email for the otp")
          );
          
          setFormErrors((prev) => ({ ...prev, email: errorMessage }));
          
          if (shouldRedirectToOTP) {
            // Store email and user type for OTP page
            const userEmail = formValues.email.trim();
            localStorage.setItem('pending_verification_email', userEmail);
            localStorage.setItem('pending_verification_user_type', userType);
            
            // Store specialist_id if available from response
            if (userType === "specialist" && detail?.specialist_id) {
              localStorage.setItem('pending_specialist_id', detail.specialist_id);
            }
            
            toast("Registration pending verification. Redirecting to OTP page...", { 
              duration: 3000,
              icon: '📧'
            });
            // Redirect to OTP page for pending verification
            setTimeout(() => {
              navigate(ROUTES.OTP, { 
                state: { 
                  email: userEmail, 
                  userType: userType,
                  from409Redirect: true // Flag to trigger auto-resend
                },
                replace: true
              });
            }, 1500);
          } else {
            toast.error(errorMessage, { duration: 5000 });
            if (errorMessage.toLowerCase().includes("login") || errorMessage.toLowerCase().includes("verified account")) {
              // Verified account - suggest login
              setTimeout(() => {
                if (window.confirm("Would you like to go to the login page now?")) {
                  navigate(ROUTES.LOGIN);
                }
              }, 1000);
            }
          }
        }
        // Handle pending verification
        else if (detail && String(detail).toLowerCase().includes("pending verification")) {
          setFormErrors((prev) => ({ ...prev, email: detail }));
          toast.error(detail, { duration: 6000 });
          
          setTimeout(() => {
            if (window.confirm("Would you like to go to the OTP verification page now?")) {
              navigate(ROUTES.OTP, { state: { email: formData.email.trim(), userType: userType } });
            }
          }, 1000);
        }
        // Handle other backend errors
        else {
          const errorMessage = typeof detail === 'string' 
            ? detail 
            : (detail?.message || "Registration failed. Please try again.");
          
          setFormErrors((prev) => ({
            ...prev,
            form: errorMessage,
          }));
          toast.error(errorMessage);
        }
      } else if (error.request) {
        // Network errors
        setFormErrors((prev) => ({
          ...prev,
          form: "Network error. Please check your connection.",
        }));
        toast.error("Network error. Please check your connection.", { duration: 5000 });
      } else {
        // Other errors
        setFormErrors((prev) => ({
          ...prev,
          form: "An unexpected error occurred.",
        }));
        toast.error("An unexpected error occurred.", { duration: 5000 });
      }
    }
    });
  };

  return (
    <motion.div
      className={`min-h-screen flex items-center justify-center transition-colors duration-300 p-4 ${
        darkMode
          ? "bg-gray-900 text-gray-100"
          : "bg-gradient-to-br from-indigo-50 to-blue-100 text-gray-900"
      }`}
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <motion.div
        className={`w-full max-w-md rounded-xl shadow-lg overflow-hidden transition-colors duration-300 ${
          darkMode ? "bg-gray-800" : "bg-white"
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
            className={`absolute top-4 right-4 p-2 rounded-full transition-colors duration-200 ${
              darkMode
                ? "bg-gray-700 text-yellow-300"
                : "bg-gray-100 text-gray-700"
            }`}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            aria-label="Toggle dark mode"
          >
            {darkMode ? <Sun size={18} /> : <Moon size={18} />}
          </motion.button>

          {/* Toggle: Patient | Specialist */}
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
                onClick={() => handleUserTypeChange("patient")}
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
                onClick={() => handleUserTypeChange("specialist")}
              >
                Specialist
              </button>
            </div>
          </motion.div>

          {/* Header */}
          <motion.div className="text-center mb-8" variants={itemVariants}>
            <motion.h1
              className={`text-3xl font-bold mb-2 ${
                darkMode ? "text-indigo-400" : "text-indigo-600"
              }`}
            >
              MindMate
            </motion.h1>
            <motion.p className={darkMode ? "text-gray-400" : "text-gray-600"}>
              Begin your wellness journey
            </motion.p>
          </motion.div>

          {/* Form Messages */}
          <AnimatePresence mode="wait">
            {formErrors.form && (
              <motion.div
                key="form-error" // <-- ADD UNIQUE KEY
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  darkMode
                    ? "bg-red-900/30 text-red-300"
                    : "bg-red-100 text-red-700"
                }`}
                variants={successVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <AlertCircle size={18} className="flex-shrink-0" />
                <span>{formErrors.form}</span>
              </motion.div>
            )}

            {success && (
              <motion.div
                key="form-success" // <-- ADD UNIQUE KEY
                className={`mb-4 p-3 rounded-lg flex items-center gap-2 ${
                  darkMode
                    ? "bg-green-900/30 text-green-300"
                    : "bg-green-100 text-green-700"
                }`}
                variants={successVariants}
                initial="hidden"
                animate="visible"
                exit="hidden"
              >
                <Check size={18} className="flex-shrink-0" />
                <span>Account created successfully! Redirecting...</span>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Signup Form */}
          <motion.form onSubmit={handleSubmit} variants={containerVariants}>
            {/* First Name Field */}
            <motion.div className="mb-4" variants={itemVariants}>
              <ValidatedInput
                type="text"
                name="firstName"
                value={formData.firstName}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.firstName ? errors.firstName : ""}
                placeholder="John"
                required
                disabled={isSubmitting}
                className={darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"}
              >
                <User className="text-gray-400" size={18} />
              </ValidatedInput>
              <AnimatePresence>
                {errors.firstName && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.firstName}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Last Name Field */}
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Last Name
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={18} />
                </div>
                <input
                  type="text"
                  name="lastName"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.lastName
                      ? "border-red-500 focus:ring-red-300"
                      : darkMode
                      ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
              </div>
              <AnimatePresence>
                {errors.lastName && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.lastName}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>

            {/* Specialist Type - ONLY for specialists */}
            {userType === "specialist" && (
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Specialist Type <span className="text-red-500">*</span>
                {loadingSpecialistTypes && (
                  <span className={`ml-2 text-xs ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                    (Loading...)
                  </span>
                )}
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={18} />
                </div>
                <select
                  name="specialistType"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.specialistType
                      ? "border-red-500 focus:ring-red-300"
                      : darkMode
                      ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  } ${loadingSpecialistTypes ? "opacity-50 cursor-not-allowed" : ""}`}
                  value={formData.specialistType}
                  onChange={handleChange}
                  disabled={isSubmitting || loadingSpecialistTypes}
                >
                  <option value="">
                    {loadingSpecialistTypes 
                      ? "Loading specialist types..." 
                      : specialistTypes.length === 0 
                        ? "No specialist types available" 
                        : "Select Specialist Type"}
                  </option>
                  {specialistTypes.map((type) => (
                    <option key={type.value || type} value={type.value || type}>
                      {type.label || type.value || type}
                    </option>
                  ))}
                </select>
              </div>
              {specialistTypes.length > 0 && formData.specialistType && (
                <p className={`text-xs mt-1 ${darkMode ? "text-gray-400" : "text-gray-500"}`}>
                  {specialistTypes.find(t => (t.value || t) === formData.specialistType)?.description || ""}
                </p>
              )}
              {!loadingSpecialistTypes && specialistTypes.length === 0 && userType === "specialist" && (
                <p className={`text-xs mt-1 ${darkMode ? "text-yellow-400" : "text-yellow-600"}`}>
                  Unable to load specialist types. Please refresh the page or try again later.
                </p>
              )}
              <AnimatePresence>
                {errors.specialistType && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.specialistType}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            )}

            {/* Gender Field - ONLY for patients */}
            {userType === "patient" && (
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Gender
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <User className="text-gray-400" size={18} />
                </div>
                <select
                  name="gender"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.gender
                      ? "border-red-500 focus:ring-red-300"
                      : darkMode
                      ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  value={formData.gender}
                  onChange={handleChange}
                  disabled={isSubmitting}
                >
                  <option value="">Select Gender</option>
                  <option value="male">Male</option>
                  <option value="female">Female</option>
                  <option value="prefer_not_to_say">Prefer not to say</option>
                  <option value="other">Other</option>
                </select>
              </div>
              <AnimatePresence>
                {errors.gender && (
                  <motion.p
                    className="text-red-500 text-xs mt-1"
                    initial={{ opacity: 0, height: 0 }}
                    animate={{ opacity: 1, height: "auto" }}
                    exit={{ opacity: 0, height: 0 }}
                  >
                    {errors.gender}
                  </motion.p>
                )}
              </AnimatePresence>
            </motion.div>
            )}

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
                  name="email"
                  className={`w-full pl-10 pr-3 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.email
                      ? "border-red-500 focus:ring-red-300"
                      : darkMode
                      ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  placeholder="your@email.com"
                  value={formData.email}
                  onChange={handleChange}
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
              <ValidatedInput
                type={showPassword ? "text" : "password"}
                name="password"
                value={formData.password}
                onChange={handleChange}
                onBlur={handleBlur}
                error={touched.password ? errors.password : ""}
                placeholder="••••••••"
                required
                disabled={isSubmitting}
                showPasswordToggle
                className={darkMode ? "bg-gray-700 text-white" : "bg-white text-gray-900"}
              >
                <Lock className="text-gray-400" size={18} />
              </ValidatedInput>
              <PasswordStrengthIndicator password={formData.password} className="mt-2" />
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

            {/* Confirm Password Field */}
            <motion.div className="mb-4" variants={itemVariants}>
              <label
                className={`block text-sm font-medium mb-2 ${
                  darkMode ? "text-gray-300" : "text-gray-700"
                }`}
              >
                Confirm Password
              </label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="text-gray-400" size={18} />
                </div>
                <input
                  type={showConfirmPassword ? "text" : "password"}
                  name="confirmPassword"
                  className={`w-full pl-10 pr-10 py-2 border rounded-lg focus:outline-none focus:ring-2 transition-colors duration-200 ${
                    errors.confirmPassword
                      ? "border-red-500 focus:ring-red-300"
                      : darkMode
                      ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-500 focus:border-indigo-500"
                      : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500 focus:border-indigo-500"
                  }`}
                  placeholder="••••••••"
                  value={formData.confirmPassword}
                  onChange={handleChange}
                  disabled={isSubmitting}
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-3 flex items-center"
                  onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  disabled={isSubmitting}
                >
                  {showConfirmPassword ? (
                    <EyeOff
                      className="text-gray-400 hover:text-gray-500"
                      size={18}
                    />
                  ) : (
                    <Eye
                      className="text-gray-400 hover:text-gray-500"
                      size={18}
                    />
                  )}
                </button>
              </div>
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
            </motion.div>

            {/* Terms and Conditions Checkbox */}
            <motion.div className="mb-6" variants={itemVariants}>
              <div className="flex items-start">
                <div className="flex items-center h-5">
                  <input
                    id="acceptsTermsAndConditions"
                    name="acceptsTermsAndConditions"
                    type="checkbox"
                    checked={formData.acceptsTermsAndConditions}
                    onChange={(e) => setValues(prev => ({
                      ...prev,
                      acceptsTermsAndConditions: e.target.checked
                    }))}
                    className={`h-4 w-4 rounded border-2 focus:ring-2 transition-colors duration-200 ${
                      errors.acceptsTermsAndConditions
                        ? "border-red-500 focus:ring-red-300"
                        : darkMode
                        ? "border-gray-600 bg-gray-700 text-indigo-600 focus:ring-indigo-500 focus:border-indigo-500"
                        : "border-gray-300 bg-white text-indigo-600 focus:ring-indigo-500 focus:border-indigo-500"
                    }`}
                    disabled={isSubmitting}
                  />
                </div>
                <div className="ml-3 text-sm">
                  <label
                    htmlFor="acceptsTermsAndConditions"
                    className={`font-medium ${
                      darkMode ? "text-gray-300" : "text-gray-700"
                    }`}
                  >
                    I accept the{" "}
                    <button
                      type="button"
                      className={`underline hover:no-underline ${
                        darkMode
                          ? "text-indigo-400 hover:text-indigo-300"
                          : "text-indigo-600 hover:text-indigo-800"
                      }`}
                      onClick={() =>
                        navigate(
                          userType === "patient"
                            ? ROUTES.PATIENT_TERMS
                            : ROUTES.SPECIALIST_TERMS
                        )
                      }
                      disabled={isSubmitting}
                    >
                      Terms and Conditions
                    </button>
                  </label>
                  <AnimatePresence>
                    {errors.acceptsTermsAndConditions && (
                      <motion.p
                        className="text-red-500 text-xs mt-1"
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                      >
                        {errors.acceptsTermsAndConditions}
                      </motion.p>
                    )}
                  </AnimatePresence>
                </div>
              </div>
            </motion.div>

            {/* Specialist-specific fields - REMOVED */}
            {/* All specialist fields have been removed from the form */}

            {/* Submit Button */}
            <motion.button
              className={`w-full font-medium py-2 px-4 rounded-lg transition duration-200 flex justify-center items-center ${
                darkMode
                  ? "bg-indigo-600 hover:bg-indigo-700"
                  : "bg-indigo-600 hover:bg-indigo-700"
              } text-white disabled:opacity-70`}
              type="submit"
              variants={itemVariants}
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              disabled={isSubmitting || success}
            >
              {isSubmitting ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                  className="h-5 w-5 border-2 border-white border-t-transparent rounded-full"
                />
              ) : (
                "Create Account"
              )}
            </motion.button>
          </motion.form>

          {/* Login Link */}
          <motion.div
            className={`text-center mt-6 text-sm ${
              darkMode ? "text-gray-400" : "text-gray-600"
            }`}
            variants={itemVariants}
          >
            Already have an account?{" "}
            <button
              type="button"
              className={`font-medium ${
                darkMode
                  ? "text-indigo-400 hover:text-indigo-300"
                  : "text-indigo-600 hover:text-indigo-800"
              }`}
              onClick={() => navigate(ROUTES.LOGIN)}
              disabled={isSubmitting}
            >
              Sign in
            </button>
          </motion.div>
        </div>
      </motion.div>
    </motion.div>
  );
};

export default Signup;
