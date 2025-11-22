// components/FormValidation.jsx
import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { CheckCircle, XCircle, AlertCircle, Eye, EyeOff } from 'react-feather';

/**
 * Enhanced form validation components with better user feedback
 */

export const ValidationMessage = ({
  error,
  success,
  warning,
  className = ""
}) => {
  const getMessageType = () => {
    if (error) return { type: 'error', message: error, icon: XCircle, color: 'text-red-600', bg: 'bg-red-50', border: 'border-red-200' };
    if (success) return { type: 'success', message: success, icon: CheckCircle, color: 'text-green-600', bg: 'bg-green-50', border: 'border-green-200' };
    if (warning) return { type: 'warning', message: warning, icon: AlertCircle, color: 'text-yellow-600', bg: 'bg-yellow-50', border: 'border-yellow-200' };
    return null;
  };

  const config = getMessageType();
  if (!config) return null;

  const IconComponent = config.icon;

  return (
    <AnimatePresence>
      <motion.div
        className={`flex items-center p-3 rounded-lg border text-sm ${config.bg} ${config.border} ${className}`}
        initial={{ opacity: 0, y: -10, height: 0 }}
        animate={{ opacity: 1, y: 0, height: 'auto' }}
        exit={{ opacity: 0, y: -10, height: 0 }}
        transition={{ duration: 0.2 }}
      >
        <IconComponent className={`w-4 h-4 mr-2 ${config.color}`} />
        <span className={config.color}>{config.message}</span>
      </motion.div>
    </AnimatePresence>
  );
};

export const FieldWrapper = ({
  label,
  children,
  error,
  success,
  warning,
  required = false,
  helpText,
  className = ""
}) => (
  <div className={`space-y-2 ${className}`}>
    {label && (
      <label className="block text-sm font-medium text-gray-700">
        {label}
        {required && <span className="text-red-500 ml-1">*</span>}
      </label>
    )}
    {children}
    <ValidationMessage error={error} success={success} warning={warning} />
    {helpText && !error && !warning && (
      <p className="text-xs text-gray-500">{helpText}</p>
    )}
  </div>
);

export const ValidatedInput = ({
  type = "text",
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  success,
  warning,
  required = false,
  disabled = false,
  className = "",
  showPasswordToggle = false,
  children,
  ...props
}) => {
  const [showPassword, setShowPassword] = React.useState(false);
  const [isFocused, setIsFocused] = React.useState(false);

  const inputType = showPasswordToggle && showPassword ? "text" : type;

  const getBorderColor = () => {
    if (error) return "border-red-300 focus:border-red-500 focus:ring-red-500";
    if (success) return "border-green-300 focus:border-green-500 focus:ring-green-500";
    if (warning) return "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500";
    if (isFocused) return "border-blue-300 focus:border-blue-500 focus:ring-blue-500";
    return "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  };

  const getBgColor = () => {
    // Check if className already contains a background color
    if (className && (className.includes('bg-') || className.includes('dark:'))) {
      return ""; // Let the className prop handle background color
    }
    if (disabled) return "bg-gray-50";
    return "bg-white";
  };

  // Calculate padding based on whether there are children (icons) and password toggle
  const getPaddingClass = () => {
    let leftPadding = "pl-3";
    let rightPadding = "pr-3";

    if (children) {
      leftPadding = "pl-10"; // Make room for left icon
    }

    if (showPasswordToggle) {
      rightPadding = "pr-10"; // Make room for password toggle button
    }

    return `${leftPadding} ${rightPadding}`;
  };

  return (
    <div className="relative">
      {children && (
        <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
          {children}
        </div>
      )}
      <input
        type={inputType}
        value={value}
        onChange={onChange}
        onBlur={(e) => {
          setIsFocused(false);
          onBlur?.(e);
        }}
        onFocus={() => setIsFocused(true)}
        placeholder={placeholder}
        disabled={disabled}
        className={`w-full py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:cursor-not-allowed ${getPaddingClass()} ${getBorderColor()} ${className} ${getBgColor()}`}
        {...props}
      />
      {showPasswordToggle && (
        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className="absolute inset-y-0 right-0 pr-3 flex items-center text-gray-400 hover:text-gray-600"
          tabIndex={-1}
        >
          {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
        </button>
      )}
    </div>
  );
};

export const ValidatedTextarea = ({
  value,
  onChange,
  onBlur,
  placeholder,
  error,
  success,
  warning,
  required = false,
  disabled = false,
  rows = 3,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const getBorderColor = () => {
    if (error) return "border-red-300 focus:border-red-500 focus:ring-red-500";
    if (success) return "border-green-300 focus:border-green-500 focus:ring-green-500";
    if (warning) return "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500";
    if (isFocused) return "border-blue-300 focus:border-blue-500 focus:ring-blue-500";
    return "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  };

  const getBgColor = () => {
    if (disabled) return "bg-gray-50";
    return "bg-white";
  };

  return (
    <textarea
      value={value}
      onChange={onChange}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      onFocus={() => setIsFocused(true)}
      placeholder={placeholder}
      disabled={disabled}
      rows={rows}
      className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:cursor-not-allowed resize-vertical ${getBorderColor()} ${getBgColor()} ${className}`}
      {...props}
    />
  );
};

export const ValidatedSelect = ({
  value,
  onChange,
  onBlur,
  options = [],
  placeholder = "Select an option",
  error,
  success,
  warning,
  required = false,
  disabled = false,
  className = "",
  ...props
}) => {
  const [isFocused, setIsFocused] = React.useState(false);

  const getBorderColor = () => {
    if (error) return "border-red-300 focus:border-red-500 focus:ring-red-500";
    if (success) return "border-green-300 focus:border-green-500 focus:ring-green-500";
    if (warning) return "border-yellow-300 focus:border-yellow-500 focus:ring-yellow-500";
    if (isFocused) return "border-blue-300 focus:border-blue-500 focus:ring-blue-500";
    return "border-gray-300 focus:border-blue-500 focus:ring-blue-500";
  };

  const getBgColor = () => {
    if (disabled) return "bg-gray-50";
    return "bg-white";
  };

  return (
    <select
      value={value}
      onChange={onChange}
      onBlur={(e) => {
        setIsFocused(false);
        onBlur?.(e);
      }}
      onFocus={() => setIsFocused(true)}
      disabled={disabled}
      className={`w-full px-3 py-2 border rounded-lg shadow-sm transition-colors focus:outline-none focus:ring-2 focus:ring-opacity-50 disabled:cursor-not-allowed ${getBorderColor()} ${getBgColor()} ${className}`}
      {...props}
    >
      {placeholder && (
        <option value="" disabled>
          {placeholder}
        </option>
      )}
      {options.map((option) => (
        <option key={option.value} value={option.value}>
          {option.label}
        </option>
      ))}
    </select>
  );
};

export const PasswordStrengthIndicator = ({ password, className = "" }) => {
  const getStrength = (pwd) => {
    if (!pwd) return { score: 0, label: "", color: "" };

    let score = 0;
    if (pwd.length >= 8) score++;
    if (/[a-z]/.test(pwd)) score++;
    if (/[A-Z]/.test(pwd)) score++;
    if (/[0-9]/.test(pwd)) score++;
    if (/[^A-Za-z0-9]/.test(pwd)) score++;

    const strengths = [
      { score: 0, label: "", color: "" },
      { score: 1, label: "Very Weak", color: "bg-red-500" },
      { score: 2, label: "Weak", color: "bg-orange-500" },
      { score: 3, label: "Fair", color: "bg-yellow-500" },
      { score: 4, label: "Good", color: "bg-blue-500" },
      { score: 5, label: "Strong", color: "bg-green-500" }
    ];

    return strengths[score];
  };

  const strength = getStrength(password);

  if (!password || strength.score === 0) return null;

  return (
    <div className={`space-y-2 ${className}`}>
      <div className="flex space-x-1">
        {[1, 2, 3, 4, 5].map((level) => (
          <div
            key={level}
            className={`h-2 flex-1 rounded-full transition-colors ${
              level <= strength.score ? strength.color : "bg-gray-200"
            }`}
          />
        ))}
      </div>
      <p className={`text-xs ${
        strength.score >= 4 ? "text-green-600" :
        strength.score >= 3 ? "text-blue-600" :
        strength.score >= 2 ? "text-yellow-600" :
        "text-red-600"
      }`}>
        Password strength: {strength.label}
      </p>
    </div>
  );
};

export const FormProgressIndicator = ({ currentStep, totalSteps, className = "" }) => {
  const progress = (currentStep / totalSteps) * 100;

  return (
    <div className={`mb-6 ${className}`}>
      <div className="flex justify-between items-center mb-2">
        <span className="text-sm font-medium text-gray-700">
          Step {currentStep} of {totalSteps}
        </span>
        <span className="text-sm text-gray-500">
          {Math.round(progress)}% complete
        </span>
      </div>
      <div className="w-full bg-gray-200 rounded-full h-2">
        <motion.div
          className="bg-blue-500 h-2 rounded-full"
          style={{ width: `${progress}%` }}
          initial={{ width: 0 }}
          animate={{ width: `${progress}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
    </div>
  );
};

// Hook for form validation
export const useFormValidation = (initialValues, validationRules = {}) => {
  const [values, setValues] = React.useState(initialValues);
  const [errors, setErrors] = React.useState({});
  const [touched, setTouched] = React.useState({});
  const [isSubmitting, setIsSubmitting] = React.useState(false);

  const validateField = React.useCallback((name, value) => {
    const rules = validationRules[name];
    if (!rules) return "";

    if (rules.required && (!value || value.toString().trim() === "")) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} is required`;
    }

    if (rules.minLength && value && value.length < rules.minLength) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be at least ${rules.minLength} characters`;
    }

    if (rules.maxLength && value && value.length > rules.maxLength) {
      return `${name.charAt(0).toUpperCase() + name.slice(1)} must be no more than ${rules.maxLength} characters`;
    }

    if (rules.pattern && value && !rules.pattern.test(value)) {
      return rules.patternMessage || `Invalid ${name}`;
    }

    if (rules.email && value && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
      return "Please enter a valid email address";
    }

    if (rules.match && value !== values[rules.match]) {
      return "Passwords do not match";
    }

    return "";
  }, [validationRules, values]);

  const validateForm = React.useCallback(() => {
    const newErrors = {};
    let isValid = true;

    Object.keys(validationRules).forEach((fieldName) => {
      const error = validateField(fieldName, values[fieldName]);
      if (error) {
        newErrors[fieldName] = error;
        isValid = false;
      }
    });

    setErrors(newErrors);
    return isValid;
  }, [values, validationRules, validateField]);

  const handleChange = React.useCallback((e) => {
    const { name, value } = e.target;
    setValues(prev => ({ ...prev, [name]: value }));

    // Clear error when user starts typing
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: "" }));
    }
  }, [errors]);

  const handleBlur = React.useCallback((e) => {
    const { name } = e.target;
    setTouched(prev => ({ ...prev, [name]: true }));

    const error = validateField(name, values[name]);
    if (error) {
      setErrors(prev => ({ ...prev, [name]: error }));
    }
  }, [values, validateField]);

  const handleSubmit = React.useCallback(async (onSubmit) => {
    setIsSubmitting(true);

    // Mark all fields as touched
    const allTouched = {};
    Object.keys(values).forEach(key => {
      allTouched[key] = true;
    });
    setTouched(allTouched);

    if (validateForm()) {
      try {
        await onSubmit(values);
      } catch (error) {
        console.error("Form submission error:", error);
      }
    }

    setIsSubmitting(false);
  }, [values, validateForm]);

  const resetForm = React.useCallback(() => {
    setValues(initialValues);
    setErrors({});
    setTouched({});
    setIsSubmitting(false);
  }, [initialValues]);

  return {
    values,
    errors,
    touched,
    isSubmitting,
    handleChange,
    handleBlur,
    handleSubmit,
    resetForm,
    validateForm,
    setValues,
    setErrors
  };
};
