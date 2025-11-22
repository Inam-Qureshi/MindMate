/**
 * API Error Handler Utility
 * =========================
 * Comprehensive error handling for all API operations
 * Provides specific error messages and recovery suggestions
 */

import { AuthStorage } from './localStorage';
import { ROUTES } from '../config/routes';

export class APIErrorHandler {
  /**
   * Handle booking-related errors
   */
  static handleBookingError(error) {
    console.error('Booking Error:', error);
    
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || '';
      
      if (detail.includes('slot') || detail.includes('time')) {
        return {
          message: 'This time slot is no longer available. Please select another time.',
          type: 'slot_unavailable',
          action: 'refresh_slots',
          severity: 'warning'
        };
      }
      
      if (detail.includes('payment') || detail.includes('method')) {
        return {
          message: 'Payment validation failed. Please check your payment details.',
          type: 'payment_error',
          action: 'retry_payment',
          severity: 'error'
        };
      }
      
      if (detail.includes('specialist') || detail.includes('doctor')) {
        return {
          message: 'Specialist not available. Please select another specialist.',
          type: 'specialist_unavailable',
          action: 'select_other',
          severity: 'warning'
        };
      }
      
      if (detail.includes('validation') || detail.includes('required')) {
        return {
          message: 'Please fill in all required fields correctly.',
          type: 'validation_error',
          action: 'fix_form',
          severity: 'error'
        };
      }
      
      return {
        message: detail || 'Invalid booking request. Please check your information.',
        type: 'validation_error',
        action: 'fix_form',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 401) {
      return {
        message: 'Please log in to book an appointment.',
        type: 'auth_error',
        action: 'login',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 403) {
      return {
        message: 'You don\'t have permission to book appointments.',
        type: 'permission_error',
        action: 'contact_support',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 409) {
      return {
        message: 'This appointment slot has been booked by another user.',
        type: 'conflict_error',
        action: 'select_other',
        severity: 'warning'
      };
    }
    
    if (error.response?.status === 422) {
      return {
        message: 'Please provide valid information for all fields.',
        type: 'validation_error',
        action: 'fix_form',
        severity: 'error'
      };
    }
    
    if (error.response?.status >= 500) {
      return {
        message: 'Server error. Please try again in a few minutes.',
        type: 'server_error',
        action: 'retry_later',
        severity: 'error'
      };
    }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection and try again.',
        type: 'network_error',
        action: 'check_connection',
        severity: 'error'
      };
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        type: 'timeout_error',
        action: 'retry',
        severity: 'warning'
      };
    }
    
    // Default error
    return {
      message: 'Failed to book appointment. Please try again.',
      type: 'unknown_error',
      action: 'retry',
      severity: 'error'
    };
  }
  
  /**
   * Handle specialist search errors
   */
  static handleSpecialistSearchError(error) {
    console.error('Specialist Search Error:', error);
    
    // Handle undefined or null error
    if (!error) {
      return {
        message: 'An unexpected error occurred while searching specialists.',
        type: 'unknown_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    // Handle non-Axios errors (e.g., from retryAPI)
    if (!error.response && !error.request) {
      // Check for circuit breaker errors
      if (error.code === 'CIRCUIT_BREAKER_OPEN' || error.message?.includes('Circuit breaker')) {
        return {
          message: error.message || 'Service temporarily unavailable. Please try again later.',
          type: 'circuit_breaker',
          action: 'wait_retry',
          severity: 'warning'
        };
      }
      
      // Check for retry failures
      if (error.code === 'RETRY_FAILED' || error.message?.includes('retry attempts failed')) {
        return {
          message: 'Service unavailable. Please check your connection and try again.',
          type: 'retry_failed',
          action: 'refresh',
          severity: 'error'
        };
      }
      
      // Generic network error
      return {
        message: error.message || 'Failed to load specialists. Please check your connection.',
        type: 'network_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 401) {
      return {
        message: 'Please log in to search for specialists.',
        type: 'auth_error',
        action: 'login',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 403) {
      return {
        message: 'You don\'t have permission to search specialists.',
        type: 'permission_error',
        action: 'contact_support',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 404) {
      return {
        message: 'No specialists found. Try adjusting your search criteria.',
        type: 'not_found',
        action: 'adjust_search',
        severity: 'info'
      };
    }
    
    if (error.response?.status >= 500) {
      return {
        message: 'Server error. Please try again later.',
        type: 'server_error',
        action: 'retry_later',
        severity: 'error'
      };
    }
    
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection.',
        type: 'network_error',
        action: 'check_connection',
        severity: 'error'
      };
    }
    
    return {
      message: 'Failed to load specialists. Please try again.',
      type: 'unknown_error',
      action: 'retry',
      severity: 'error'
    };
  }
  
  /**
   * Handle slot availability errors
   */
  static handleSlotError(error) {
    console.error('Slot Error:', error);
    
    // Handle non-Axios errors (e.g., from retryAPI)
    if (!error.response && !error.request) {
      // Check for circuit breaker errors
      if (error.code === 'CIRCUIT_BREAKER_OPEN' || error.message?.includes('Circuit breaker')) {
        return {
          message: error.message || 'Service temporarily unavailable. Please try again later.',
          type: 'circuit_breaker',
          action: 'wait_retry',
          severity: 'warning'
        };
      }
      
      // Check for retry failures
      if (error.code === 'RETRY_FAILED' || error.message?.includes('retry attempts failed')) {
        return {
          message: 'Failed to fetch slots. Please check your connection and try again.',
          type: 'retry_failed',
          action: 'refresh',
          severity: 'error'
        };
      }
      
      // Generic network error
      return {
        message: error.message || 'Failed to fetch available slots. Please check your connection.',
        type: 'network_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 404) {
      return {
        message: 'No available slots found for this specialist.',
        type: 'no_slots',
        action: 'select_other',
        severity: 'info'
      };
    }
    
    if (error.response?.status === 400) {
      return {
        message: error.response?.data?.detail || 'Invalid date range. Please select a valid date.',
        type: 'invalid_date',
        action: 'select_date',
        severity: 'warning'
      };
    }
    
    return this.handleSpecialistSearchError(error);
  }
  
  /**
   * Handle appointment management errors
   */
  static handleAppointmentError(error) {
    console.error('Appointment Error:', error);
    
    if (error.response?.status === 404) {
      return {
        message: 'Appointment not found.',
        type: 'not_found',
        action: 'refresh_list',
        severity: 'warning'
      };
    }
    
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || '';
      
      if (detail.includes('cancelled') || detail.includes('completed')) {
        return {
          message: 'This appointment cannot be modified.',
          type: 'invalid_operation',
          action: 'view_details',
          severity: 'warning'
        };
      }
      
      return {
        message: detail || 'Invalid operation. Please try again.',
        type: 'validation_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    return this.handleBookingError(error);
  }
  
  /**
   * Get user-friendly error message
   */
  static getErrorMessage(error, context = 'general') {
    // Handle undefined or null error
    if (!error) {
      return {
        message: 'An unexpected error occurred. Please try again.',
        type: 'unknown_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    let errorInfo;
    
    try {
      switch (context) {
        case 'booking':
          errorInfo = this.handleBookingError(error);
          break;
        case 'search':
          errorInfo = this.handleSpecialistSearchError(error);
          break;
        case 'slots':
          errorInfo = this.handleSlotError(error);
          break;
        case 'appointment':
          errorInfo = this.handleAppointmentError(error);
          break;
        case 'admin':
        case 'patient':
        case 'specialist':
        case 'report':
        case 'application':
          errorInfo = this.handleAdminError(error, context);
          break;
        case 'forum':
          errorInfo = this.handleForumError(error);
          break;
        default:
          errorInfo = this.handleBookingError(error);
      }
    } catch (err) {
      console.error('Error in getErrorMessage:', err);
      errorInfo = {
        message: 'An unexpected error occurred. Please try again.',
        type: 'unknown_error',
        action: 'retry',
        severity: 'error'
      };
    }
    
    return errorInfo;
  }
  
  /**
   * Check if error is retryable
   */
  static isRetryable(error) {
    const errorInfo = this.getErrorMessage(error);
    
    const retryableTypes = [
      'network_error',
      'timeout_error',
      'server_error'
    ];
    
    return retryableTypes.includes(errorInfo.type);
  }
  
  /**
   * Handle admin operation errors
   */
  static handleAdminError(error, operation = 'general') {
    console.error('Admin Error:', error);
    
    if (error.response?.status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        type: 'auth_error',
        action: 'login',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 403) {
      return {
        message: 'You don\'t have permission to perform this action.',
        type: 'permission_error',
        action: 'contact_support',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 404) {
      const resourceMap = {
        patient: 'Patient not found.',
        specialist: 'Specialist not found.',
        report: 'Report not found.',
        application: 'Application not found.'
      };
      
      return {
        message: resourceMap[operation] || 'Resource not found.',
        type: 'not_found',
        action: 'refresh_list',
        severity: 'warning'
      };
    }
    
    if (error.response?.status === 400) {
      const detail = error.response.data?.detail || '';
      
      if (detail.includes('already') || detail.includes('duplicate')) {
        return {
          message: detail || 'This operation has already been performed.',
          type: 'duplicate_action',
          action: 'refresh_list',
          severity: 'info'
        };
      }
      
      return {
        message: detail || `Invalid ${operation} operation. Please check your input.`,
        type: 'validation_error',
        action: 'fix_input',
        severity: 'error'
      };
    }
    
    if (error.response?.status >= 500) {
      return {
        message: 'Server error. Please try again in a few minutes.',
        type: 'server_error',
        action: 'retry_later',
        severity: 'error'
      };
    }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection and try again.',
        type: 'network_error',
        action: 'check_connection',
        severity: 'error'
      };
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        type: 'timeout_error',
        action: 'retry',
        severity: 'warning'
      };
    }
    
    // Default error
    const operationMessages = {
      patient: 'Failed to perform patient operation.',
      specialist: 'Failed to perform specialist operation.',
      report: 'Failed to perform report operation.',
      application: 'Failed to load application.',
      general: 'An error occurred. Please try again.'
    };
    
    return {
      message: operationMessages[operation] || operationMessages.general,
      type: 'unknown_error',
      action: 'retry',
      severity: 'error'
    };
  }
  
  /**
   * Handle forum-related errors
   */
  static handleForumError(error) {
    console.error('Forum Error:', error);
    
    if (error.response?.status === 401) {
      return {
        message: 'Your session has expired. Please log in again.',
        type: 'auth_error',
        action: 'login',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 403) {
      return {
        message: 'You don\'t have permission to perform this action.',
        type: 'permission_error',
        action: 'contact_support',
        severity: 'error'
      };
    }
    
    if (error.response?.status === 404) {
      return {
        message: 'The requested forum resource was not found.',
        type: 'not_found',
        action: 'refresh_list',
        severity: 'warning'
      };
    }
    
    if (error.response?.status === 400 || error.response?.status === 422) {
      const detail = error.response.data?.detail || error.response.data?.message || '';
      return {
        message: detail || 'Invalid forum operation. Please check your input.',
        type: 'validation_error',
        action: 'fix_input',
        severity: 'error'
      };
    }
    
    if (error.response?.status >= 500) {
      return {
        message: 'Server error. Please try again in a few minutes.',
        type: 'server_error',
        action: 'retry_later',
        severity: 'error'
      };
    }
    
    // Network errors
    if (error.code === 'NETWORK_ERROR' || error.message === 'Network Error') {
      return {
        message: 'Network error. Please check your connection and try again.',
        type: 'network_error',
        action: 'check_connection',
        severity: 'error'
      };
    }
    
    if (error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
      return {
        message: 'Request timed out. Please try again.',
        type: 'timeout_error',
        action: 'retry',
        severity: 'warning'
      };
    }
    
    // Default error
    return {
      message: 'Failed to perform forum operation. Please try again.',
      type: 'unknown_error',
      action: 'retry',
      severity: 'error'
    };
  }
  
  /**
   * Get retry delay based on error type
   */
  static getRetryDelay(error, attempt = 1) {
    const baseDelay = 1000; // 1 second
    const maxDelay = 10000; // 10 seconds
    const delay = Math.min(baseDelay * Math.pow(2, attempt - 1), maxDelay);
    
    return delay;
  }
}

/**
 * Error Recovery Actions
 */
export const ErrorActions = {
  refresh_slots: () => {
    console.log('Refreshing available slots...');
    // This will be handled by the component
  },
  
  retry_payment: () => {
    console.log('Retrying payment...');
    // This will be handled by the component
  },
  
  select_other: () => {
    console.log('Selecting other option...');
    // This will be handled by the component
  },
  
  fix_form: () => {
    console.log('Fixing form validation...');
    // This will be handled by the component
  },
  
  login: () => {
    console.log('Redirecting to login...');
    // Use AuthStorage to clear tokens
    AuthStorage.clearAuth();
    window.location.href = ROUTES.LOGIN;
  },
  
  contact_support: () => {
    console.log('Contacting support...');
    // This could open a support modal or redirect to support page
  },
  
  retry_later: () => {
    console.log('Retrying later...');
    // This will be handled by the component
  },
  
  check_connection: () => {
    console.log('Checking connection...');
    // This could show a connection status indicator
  },
  
  retry: () => {
    console.log('Retrying operation...');
    // This will be handled by the component
  },
  
  adjust_search: () => {
    console.log('Adjusting search criteria...');
    // This will be handled by the component
  },
  
  select_date: () => {
    console.log('Selecting valid date...');
    // This will be handled by the component
  },
  
  refresh_list: () => {
    console.log('Refreshing appointment list...');
    // This will be handled by the component
  },
  
  view_details: () => {
    console.log('Viewing appointment details...');
    // This will be handled by the component
  }
};

export default APIErrorHandler;
