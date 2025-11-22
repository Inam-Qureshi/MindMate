/**
 * Form Validation Utilities
 * ========================
 * Comprehensive validation for all form inputs
 * Provides real-time validation and error messages
 */

/**
 * Validation patterns and rules
 */
export const ValidationPatterns = {
  phone: {
    pakistani: /^(\+92|0)?[0-9]{10}$/,
    international: /^\+[1-9]\d{1,14}$/
  },
  email: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  name: /^[a-zA-Z\s]{2,50}$/,
  concern: /^.{10,1000}$/
};

/**
 * Validation rules for different fields
 */
export const ValidationRules = {
  phone_number: {
    required: true,
    pattern: ValidationPatterns.phone.pakistani,
    message: 'Please enter a valid Pakistani phone number (e.g., +923001234567 or 03001234567)',
    transform: (value) => value.replace(/\s/g, '') // Remove spaces
  },
  
  patient_name: {
    required: true,
    pattern: ValidationPatterns.name,
    minLength: 2,
    maxLength: 50,
    message: 'Patient name must be 2-50 characters and contain only letters and spaces',
    transform: (value) => value.trim()
  },
  
  presenting_concern: {
    required: true,
    minLength: 10,
    maxLength: 1000,
    message: 'Please describe your concern (10-1000 characters)',
    transform: (value) => value.trim()
  },
  
  selected_date: {
    required: true,
    message: 'Please select an appointment date',
    validate: (value) => {
      if (!value) return false;
      const selectedDate = new Date(value);
      const today = new Date();
      today.setHours(0, 0, 0, 0);
      return selectedDate >= today;
    }
  },
  
  selected_time: {
    required: true,
    message: 'Please select an appointment time'
  },
  
  specialist_id: {
    required: true,
    message: 'Please select a specialist'
  },
  
  slot_id: {
    required: true,
    message: 'Please select a time slot'
  },
  
  appointment_type: {
    required: true,
    message: 'Please select appointment type',
    validate: (value) => ['online', 'in_person'].includes(value)
  },
  
  payment_method_id: {
    required: false, // Will be conditionally required for online
    message: 'Please select a payment method',
    validate: (value, allValues = {}) => {
      // Only required for online appointments
      if (allValues.appointment_type === 'online' || allValues.consultation_mode === 'online') {
        if (!value || value.trim() === '') {
          return false;
        }
        const validMethods = ['easypaisa', 'jazzcash', 'bank_transfer', 'cash'];
        return validMethods.includes(value.toLowerCase());
      }
      return true; // Not required for in-person
    }
  },
  
  payment_receipt: {
    required: false, // Will be conditionally required for online
    message: 'Please provide payment receipt/transaction ID',
    minLength: 5,
    maxLength: 500,
    validate: (value, allValues = {}) => {
      // Only required for online appointments
      if (allValues.appointment_type === 'online' || allValues.consultation_mode === 'online') {
        return value && value.trim().length >= 5;
      }
      return true; // Not required for in-person
    }
  }
};

/**
 * Validation class for form validation
 */
export class FormValidator {
  constructor(rules = ValidationRules) {
    this.rules = rules;
    this.errors = {};
  }
  
  /**
   * Validate a single field
   */
  validateField(fieldName, value, allValues = {}) {
    const rule = this.rules[fieldName];
    if (!rule) return { isValid: true, error: null };
    
    // Transform value if transform function exists
    const transformedValue = rule.transform ? rule.transform(value) : value;
    
    // Check required
    if (rule.required && (!transformedValue || transformedValue === '')) {
      return { isValid: false, error: rule.message };
    }
    
    // Skip other validations if value is empty and not required
    if (!transformedValue && !rule.required) {
      return { isValid: true, error: null };
    }
    
    // Check pattern
    if (rule.pattern && !rule.pattern.test(transformedValue)) {
      return { isValid: false, error: rule.message };
    }
    
    // Check min/max length
    if (rule.minLength && transformedValue.length < rule.minLength) {
      return { isValid: false, error: rule.message };
    }
    
    if (rule.maxLength && transformedValue.length > rule.maxLength) {
      return { isValid: false, error: rule.message };
    }
    
    // Check custom validation
    if (rule.validate && !rule.validate(transformedValue, allValues)) {
      return { isValid: false, error: rule.message };
    }
    
    return { isValid: true, error: null };
  }
  
  /**
   * Validate all fields in a form
   */
  validateForm(formData) {
    this.errors = {};
    let isValid = true;
    
    Object.keys(this.rules).forEach(fieldName => {
      const result = this.validateField(fieldName, formData[fieldName], formData);
      if (!result.isValid) {
        this.errors[fieldName] = result.error;
        isValid = false;
      }
    });
    
    return { isValid, errors: this.errors };
  }
  
  /**
   * Get error for a specific field
   */
  getFieldError(fieldName) {
    return this.errors[fieldName] || null;
  }
  
  /**
   * Clear errors for a field
   */
  clearFieldError(fieldName) {
    if (this.errors[fieldName]) {
      delete this.errors[fieldName];
    }
  }
  
  /**
   * Clear all errors
   */
  clearAllErrors() {
    this.errors = {};
  }
  
  /**
   * Check if form has any errors
   */
  hasErrors() {
    return Object.keys(this.errors).length > 0;
  }
}

/**
 * Specific validation for booking form
 */
export const bookingValidation = {
  phone_number: ValidationRules.phone_number,
  patient_name: ValidationRules.patient_name,
  presenting_concern: ValidationRules.presenting_concern,
  selected_date: ValidationRules.selected_date,
  selected_time: ValidationRules.selected_time,
  specialist_id: ValidationRules.specialist_id,
  slot_id: ValidationRules.slot_id,
  appointment_type: ValidationRules.appointment_type,
  payment_method_id: ValidationRules.payment_method_id,
  payment_receipt: ValidationRules.payment_receipt
};

/**
 * Validation for specialist search form
 */
export const searchValidation = {
  query: {
    required: false,
    maxLength: 100,
    message: 'Search query must be less than 100 characters'
  },
  city: {
    required: false,
    maxLength: 50,
    message: 'City name must be less than 50 characters'
  },
  specializations: {
    required: false,
    validate: (value) => {
      if (!value || !Array.isArray(value)) return true;
      return value.every(spec => typeof spec === 'string' && spec.length > 0);
    },
    message: 'Invalid specialization format'
  }
};

/**
 * Real-time validation hook
 */
export const useValidation = (rules = ValidationRules) => {
  const [errors, setErrors] = useState({});
  const [touched, setTouched] = useState({});
  const validator = new FormValidator(rules);
  
  const validateField = (fieldName, value, allValues = {}) => {
    const result = validator.validateField(fieldName, value, allValues);
    
    setErrors(prev => ({
      ...prev,
      [fieldName]: result.isValid ? null : result.error
    }));
    
    return result;
  };
  
  const validateForm = (formData) => {
    const result = validator.validateForm(formData);
    setErrors(result.errors);
    return result;
  };
  
  const markFieldTouched = (fieldName) => {
    setTouched(prev => ({
      ...prev,
      [fieldName]: true
    }));
  };
  
  const clearErrors = () => {
    setErrors({});
    setTouched({});
  };
  
  const getFieldError = (fieldName) => {
    return touched[fieldName] ? errors[fieldName] : null;
  };
  
  return {
    errors,
    touched,
    validateField,
    validateForm,
    markFieldTouched,
    clearErrors,
    getFieldError,
    hasErrors: Object.values(errors).some(error => error !== null)
  };
};

/**
 * Format validation error for display
 */
export const formatValidationError = (error, fieldName) => {
  if (!error) return null;
  
  const fieldLabels = {
    phone_number: 'Phone Number',
    patient_name: 'Patient Name',
    presenting_concern: 'Presenting Concern',
    selected_date: 'Appointment Date',
    selected_time: 'Appointment Time',
    specialist_id: 'Specialist',
    slot_id: 'Time Slot',
    appointment_type: 'Appointment Type'
  };
  
  const fieldLabel = fieldLabels[fieldName] || fieldName;
  return `${fieldLabel}: ${error}`;
};

/**
 * Validate phone number with country code
 */
export const validatePhoneNumber = (phone) => {
  if (!phone) return { isValid: false, error: 'Phone number is required' };
  
  const cleaned = phone.replace(/\s/g, '');
  
  // Pakistani number patterns
  if (ValidationPatterns.phone.pakistani.test(cleaned)) {
    return { isValid: true, error: null };
  }
  
  return { isValid: false, error: 'Please enter a valid Pakistani phone number' };
};

/**
 * Validate date range for appointment booking
 */
export const validateDateRange = (startDate, endDate) => {
  const start = new Date(startDate);
  const end = new Date(endDate);
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  if (start < today) {
    return { isValid: false, error: 'Start date cannot be in the past' };
  }
  
  if (end < start) {
    return { isValid: false, error: 'End date must be after start date' };
  }
  
  const maxDays = 90; // Maximum 90 days in advance
  const maxDate = new Date(today);
  maxDate.setDate(maxDate.getDate() + maxDays);
  
  if (start > maxDate) {
    return { isValid: false, error: `Appointments can only be booked up to ${maxDays} days in advance` };
  }
  
  return { isValid: true, error: null };
};

export default FormValidator;
