import { useState, useEffect } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  User,
  MapPin,
  Heart,
  Briefcase,
  Thermometer,
  AlertCircle,
  CheckCircle,
  ArrowRight,
  ArrowLeft,
} from "react-feather";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "../../utils/axiosConfig";
import { toast } from "react-hot-toast";
import { API_ENDPOINTS } from "../../config/api";
import { ROUTES } from "../../config/routes";
import { markQuestionnaireCompleted } from "../../hooks/useQuestionnaireCheck";

const InitialInformation = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Form state
  const [formData, setFormData] = useState({
    // Basic Information
    age: "",

    // Location Information
    city: "",
    country: "",

    // Personal Information
    marital_status: "",
    occupation: "",
    education: "",
    employment_status: "",

    // Mental Health Treatment Data
    past_psychiatric_diagnosis: "",
    past_psychiatric_treatment: "",
    hospitalizations: "",
    ect_history: "",

    // Medical and Substance History
    current_medications: "",
    medication_allergies: "",
    otc_supplements: "",
    medication_adherence: "",
    medical_history_summary: "",
    chronic_illnesses: "",
    neurological_problems: "",
    head_injury: "",
    seizure_history: "",
    pregnancy_status: "",

    // Substance Use
    alcohol_use: "",
    drug_use: "",
    prescription_drug_abuse: "",
    last_use_date: "",
    substance_treatment: "",
    tobacco_use: "",

    // Family Mental Health History
    family_mental_health_history: "",
    family_mental_health_stigma: "",

    // Cultural and Spiritual Context
    cultural_background: "",
    cultural_beliefs: "",
    spiritual_supports: "",

    // Lifestyle Factors
    lifestyle_smoking: "",
    lifestyle_alcohol: "",
    lifestyle_activity: "",
  });

  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);
  const [darkMode, setDarkMode] = useState(false);
  const [redirectPath, setRedirectPath] = useState(ROUTES.DASHBOARD);
  const [missingRequiredFields, setMissingRequiredFields] = useState([]);

  // Initialize dark mode from localStorage
  useEffect(() => {
    const savedMode = localStorage.getItem('darkMode') === 'true';
    setDarkMode(savedMode);
  }, []);

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    const redirect = params.get('redirect');
    if (redirect) {
      setRedirectPath(redirect);
    }

    try {
      const cachedPrefill = sessionStorage.getItem('initial_info_prefill');
      if (cachedPrefill) {
        const parsed = JSON.parse(cachedPrefill);
        setFormData(prev => {
          const updated = { ...prev };
          Object.entries(parsed || {}).forEach(([key, value]) => {
            if (
              Object.prototype.hasOwnProperty.call(prev, key) &&
              value !== undefined &&
              value !== null
            ) {
              updated[key] = value;
            }
          });
          return updated;
        });
        sessionStorage.removeItem('initial_info_prefill');
      }

      const cachedMissing = sessionStorage.getItem('initial_info_missing_fields');
      if (cachedMissing) {
        const missing = JSON.parse(cachedMissing);
        setMissingRequiredFields(Array.isArray(missing) ? missing : []);
        sessionStorage.removeItem('initial_info_missing_fields');
      }
    } catch (err) {
      console.warn('Failed to load cached initial info data', err);
    }
  }, [location.search]);

  // Form validation
  const validateStep = (step) => {
    const newErrors = {};

    switch (step) {
      case 1: // Basic Information
        if (!formData.age.trim()) newErrors.age = "Age is required";
        if (!formData.city.trim()) newErrors.city = "City is required";
        if (!formData.country.trim()) newErrors.country = "Country is required";
        break;

      case 2: // Personal Information
        if (!formData.marital_status) newErrors.marital_status = "Marital status is required";
        if (!formData.occupation.trim()) newErrors.occupation = "Occupation is required";
        if (!formData.education.trim()) newErrors.education = "Education is required";
        if (!formData.employment_status) newErrors.employment_status = "Employment status is required";
        break;

      default:
        break;
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }));

    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ""
      }));
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => prev + 1);
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => prev - 1);
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setIsSubmitting(true);
    setErrors({});

    try {
      const response = await apiClient.post(
        API_ENDPOINTS.ASSESSMENT.SAVE_INITIAL_INFO,
        formData,
        {
          headers: {
            "Content-Type": "application/json",
          },
        }
      );

      const missing = response.data?.missing_fields || [];
      if (missing.length > 0) {
        setMissingRequiredFields(missing);
        toast.error("We still need a bit more information. Please complete the highlighted fields.");
        return;
      }

      // Mark questionnaire as completed for compatibility
      markQuestionnaireCompleted();
      setMissingRequiredFields([]);

      toast.success("Initial information saved successfully! Redirecting to your assessment.");
      navigate(redirectPath || ROUTES.DASHBOARD);

    } catch (error) {
      console.error("Questionnaire submission error:", error);

      if (error.response) {
        const errorDetail = error.response.data.detail;
        const errorMessage = typeof errorDetail === 'string'
          ? errorDetail
          : (errorDetail?.message || "Failed to submit questionnaire. Please try again.");

        toast.error(errorMessage);
        setErrors({ form: errorMessage });
      } else {
        toast.error("Network error. Please check your connection and try again.");
        setErrors({ form: "Network error. Please check your connection and try again." });
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const steps = [
    { id: 1, title: "Basic Information", icon: User },
    { id: 2, title: "Personal Details", icon: Briefcase },
    { id: 3, title: "Medical History", icon: Thermometer },
    { id: 4, title: "Review & Submit", icon: CheckCircle },
  ];

  const renderStepContent = () => {
    switch (currentStep) {
      case 1:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Basic Information
              </h2>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Please provide your basic personal information
              </p>
            </div>

            {/* Age */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Age *
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.age
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="Enter your age"
                value={formData.age}
                onChange={(e) => handleInputChange("age", e.target.value)}
              />
              {errors.age && (
                <p className="text-red-500 text-sm mt-1">{errors.age}</p>
              )}
            </div>

            {/* City */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                City *
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.city
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="Enter your city"
                value={formData.city}
                onChange={(e) => handleInputChange("city", e.target.value)}
              />
              {errors.city && (
                <p className="text-red-500 text-sm mt-1">{errors.city}</p>
              )}
            </div>

            {/* Country */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Country *
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.country
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="Enter your country"
                value={formData.country}
                onChange={(e) => handleInputChange("country", e.target.value)}
              />
              {errors.country && (
                <p className="text-red-500 text-sm mt-1">{errors.country}</p>
              )}
            </div>
          </motion.div>
        );

      case 2:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Personal Details
              </h2>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Tell us about your background and current situation
              </p>
            </div>

            {/* Marital Status */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Marital Status *
              </label>
              <select
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.marital_status
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                value={formData.marital_status}
                onChange={(e) => handleInputChange("marital_status", e.target.value)}
              >
                <option value="">Select marital status</option>
                <option value="Single">Single</option>
                <option value="Married">Married</option>
                <option value="Divorced">Divorced</option>
                <option value="Widowed">Widowed</option>
                <option value="Separated">Separated</option>
                <option value="Prefer not to say">Prefer not to say</option>
              </select>
              {errors.marital_status && (
                <p className="text-red-500 text-sm mt-1">{errors.marital_status}</p>
              )}
            </div>

            {/* Occupation */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Occupation *
              </label>
              <input
                type="text"
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.occupation
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="Enter your occupation or job title"
                value={formData.occupation}
                onChange={(e) => handleInputChange("occupation", e.target.value)}
              />
              {errors.occupation && (
                <p className="text-red-500 text-sm mt-1">{errors.occupation}</p>
              )}
            </div>

            {/* Education */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Education *
              </label>
              <select
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.education
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                value={formData.education}
                onChange={(e) => handleInputChange("education", e.target.value)}
              >
                <option value="">Select education level</option>
                <option value="No formal education">No formal education</option>
                <option value="Primary school">Primary school</option>
                <option value="Secondary school">Secondary school</option>
                <option value="High school diploma">High school diploma</option>
                <option value="Associate degree">Associate degree</option>
                <option value="Bachelor's degree">Bachelor's degree</option>
                <option value="Master's degree">Master's degree</option>
                <option value="Doctorate">Doctorate</option>
                <option value="Professional degree">Professional degree</option>
                <option value="Other">Other</option>
              </select>
              {errors.education && (
                <p className="text-red-500 text-sm mt-1">{errors.education}</p>
              )}
            </div>

            {/* Employment Status */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Employment Status *
              </label>
              <select
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  errors.employment_status
                    ? "border-red-500 focus:ring-red-500"
                    : darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                value={formData.employment_status}
                onChange={(e) => handleInputChange("employment_status", e.target.value)}
              >
                <option value="">Select employment status</option>
                <option value="Employed full-time">Employed full-time</option>
                <option value="Employed part-time">Employed part-time</option>
                <option value="Self-employed">Self-employed</option>
                <option value="Unemployed">Unemployed</option>
                <option value="Student">Student</option>
                <option value="Retired">Retired</option>
                <option value="Homemaker">Homemaker</option>
                <option value="Unable to work">Unable to work</option>
                <option value="Other">Other</option>
              </select>
              {errors.employment_status && (
                <p className="text-red-500 text-sm mt-1">{errors.employment_status}</p>
              )}
            </div>
          </motion.div>
        );

      case 3:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Medical History
              </h2>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Please provide information about your medical and mental health history
              </p>
            </div>

            {/* Past Psychiatric Diagnosis */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Past Psychiatric Diagnosis
              </label>
              <textarea
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="List any previous psychiatric diagnoses if applicable..."
                value={formData.past_psychiatric_diagnosis}
                onChange={(e) => handleInputChange("past_psychiatric_diagnosis", e.target.value)}
              />
            </div>

            {/* Current Medications */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Current Medications
              </label>
              <textarea
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="List any medications you're currently taking..."
                value={formData.current_medications}
                onChange={(e) => handleInputChange("current_medications", e.target.value)}
              />
            </div>

            {/* Medical History Summary */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Medical History Summary
              </label>
              <textarea
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 min-h-[100px] ${
                  darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                placeholder="Please summarize your medical history, including any chronic conditions, surgeries, or significant health events..."
                value={formData.medical_history_summary}
                onChange={(e) => handleInputChange("medical_history_summary", e.target.value)}
              />
            </div>

            {/* Substance Use */}
            <div>
              <label className={`block text-sm font-medium mb-2 ${darkMode ? "text-gray-300" : "text-gray-700"}`}>
                Substance Use
              </label>
              <select
                className={`w-full px-4 py-3 border rounded-lg focus:outline-none focus:ring-2 ${
                  darkMode
                    ? "border-gray-600 bg-gray-700 text-white focus:ring-indigo-400"
                    : "border-gray-300 bg-white text-gray-900 focus:ring-indigo-500"
                }`}
                value={formData.alcohol_use}
                onChange={(e) => handleInputChange("alcohol_use", e.target.value)}
              >
                <option value="">Select alcohol use frequency</option>
                <option value="Never">Never</option>
                <option value="Rarely">Rarely</option>
                <option value="Monthly">Monthly</option>
                <option value="Weekly">Weekly</option>
                <option value="Daily">Daily</option>
              </select>
            </div>
          </motion.div>
        );

      case 4:
        return (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: -20 }}
            className="space-y-6"
          >
            <div className="text-center mb-6">
              <h2 className={`text-2xl font-bold mb-2 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Review & Submit
              </h2>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Please review your information before submitting
              </p>
            </div>

            {/* Summary */}
            <div className={`p-6 rounded-lg ${darkMode ? "bg-gray-700" : "bg-gray-50"}`}>
              <h3 className={`text-lg font-semibold mb-4 ${darkMode ? "text-white" : "text-gray-900"}`}>
                Information Summary
              </h3>

              <div className="space-y-3 text-sm">
                <div>
                  <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Age:</span>
                  <span className={`ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{formData.age}</span>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Location:</span>
                  <span className={`ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{formData.city}, {formData.country}</span>
                </div>
                <div>
                  <span className={`font-medium ${darkMode ? "text-gray-300" : "text-gray-600"}`}>Occupation:</span>
                  <span className={`ml-2 ${darkMode ? "text-white" : "text-gray-900"}`}>{formData.occupation}</span>
                </div>
              </div>
            </div>

            {/* Privacy Notice */}
            <div className={`p-4 rounded-lg ${darkMode ? "bg-blue-900/20 border-blue-700" : "bg-blue-50 border-blue-200"} border`}>
              <div className="flex items-start">
                <AlertCircle className={`w-5 h-5 mt-0.5 mr-3 ${darkMode ? "text-blue-400" : "text-blue-600"}`} />
                <div>
                  <h4 className={`font-medium ${darkMode ? "text-blue-400" : "text-blue-800"}`}>
                    Privacy & Confidentiality
                  </h4>
                  <p className={`text-sm mt-1 ${darkMode ? "text-blue-300" : "text-blue-700"}`}>
                    Your information is protected under HIPAA and will only be shared with your healthcare providers.
                    You can update this information at any time from your profile settings.
                  </p>
                </div>
              </div>
            </div>

            {errors.form && (
              <div className={`p-4 rounded-lg ${darkMode ? "bg-red-900/30 text-red-300" : "bg-red-100 text-red-700"}`}>
                <div className="flex items-center">
                  <AlertCircle className="w-5 h-5 mr-2" />
                  {errors.form}
                </div>
              </div>
            )}
          </motion.div>
        );

      default:
        return null;
    }
  };

  return (
    <div className={`min-h-screen ${darkMode ? "bg-gray-900 text-white" : "bg-gray-50 text-gray-900"}`}>
      {/* Header */}
      <div className={`py-6 px-4 ${darkMode ? "bg-gray-800" : "bg-white"} shadow-sm`}>
        <div className="max-w-4xl mx-auto">
          <div className="flex items-center justify-between">
            <div>
              <h1 className={`text-2xl font-bold ${darkMode ? "text-white" : "text-gray-900"}`}>
                MindMate Health Questionnaire
              </h1>
              <p className={darkMode ? "text-gray-300" : "text-gray-600"}>
                Complete your profile to get personalized mental health support
              </p>
              {missingRequiredFields.length > 0 && (
                <div className={`mt-3 text-sm rounded-lg px-4 py-3 ${darkMode ? "bg-yellow-900/30 text-yellow-200" : "bg-yellow-100 text-yellow-800"}`}>
                  We need a bit more information before starting your assessment:
                  <span className="font-medium"> {missingRequiredFields.join(", ")}.</span>
                </div>
              )}
            </div>
            <button
              onClick={() => navigate(redirectPath || ROUTES.DASHBOARD)}
              className={`px-4 py-2 rounded-lg ${darkMode ? "bg-gray-700 hover:bg-gray-600 text-gray-300" : "bg-gray-200 hover:bg-gray-300 text-gray-700"} transition-colors`}
            >
              Skip for now
            </button>
          </div>

          {/* Progress Steps */}
          <div className="mt-8">
            <div className="flex items-center justify-between">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isCompleted = currentStep > step.id;
                const isCurrent = currentStep === step.id;

                return (
                  <div key={step.id} className="flex items-center">
                    <div className="flex flex-col items-center">
                      <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
                        isCompleted
                          ? "bg-green-500 text-white"
                          : isCurrent
                          ? "bg-indigo-500 text-white"
                          : darkMode
                          ? "bg-gray-700 text-gray-400"
                          : "bg-gray-200 text-gray-600"
                      }`}>
                        <Icon size={18} />
                      </div>
                      <span className={`text-xs mt-2 text-center ${
                        isCurrent
                          ? darkMode ? "text-indigo-400" : "text-indigo-600"
                          : darkMode ? "text-gray-400" : "text-gray-600"
                      }`}>
                        {step.title}
                      </span>
                    </div>
                    {index < steps.length - 1 && (
                      <div className={`w-16 h-0.5 mx-4 ${
                        isCompleted ? "bg-green-500" : darkMode ? "bg-gray-700" : "bg-gray-300"
                      }`} />
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className="py-8 px-4">
        <div className="max-w-2xl mx-auto">
          <AnimatePresence mode="wait">
            {renderStepContent()}
          </AnimatePresence>

          {/* Navigation Buttons */}
          <div className="flex justify-between mt-8">
            <button
              onClick={handlePrevious}
              disabled={currentStep === 1}
              className={`px-6 py-3 rounded-lg font-medium flex items-center gap-2 transition-colors ${
                currentStep === 1
                  ? "opacity-50 cursor-not-allowed"
                  : darkMode
                  ? "bg-gray-700 hover:bg-gray-600 text-white"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }`}
            >
              <ArrowLeft size={18} />
              Previous
            </button>

            {currentStep < steps.length ? (
              <button
                onClick={handleNext}
                className="px-6 py-3 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors"
              >
                Next
                <ArrowRight size={18} />
              </button>
            ) : (
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="px-6 py-3 bg-green-600 hover:bg-green-700 text-white rounded-lg font-medium flex items-center gap-2 transition-colors disabled:opacity-70"
              >
                {isSubmitting ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 1, repeat: Infinity, ease: "linear" }}
                      className="w-4 h-4 border-2 border-white border-t-transparent rounded-full"
                    />
                    Submitting...
                  </>
                ) : (
                  <>
                    <CheckCircle size={18} />
                    Complete Setup
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default InitialInformation;
