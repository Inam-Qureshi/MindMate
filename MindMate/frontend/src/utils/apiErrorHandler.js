/**
 * API Error Handler Utility
 * =========================
 * DEPRECATED: This file is deprecated. Use APIErrorHandler from './errorHandler.js' instead.
 * 
 * This file is kept for backward compatibility but should not be used in new code.
 * Migration: Replace imports with:
 *   import { APIErrorHandler } from './errorHandler';
 * 
 * @deprecated Use APIErrorHandler from './errorHandler.js'
 */

import { APIErrorHandler } from './errorHandler';
import { AuthStorage } from './localStorage';
import { ROUTES } from '../config/routes';

// Map APIErrorHandler error types to legacy format
const mapErrorType = (errorInfo) => {
  const typeMap = {
    'auth_error': 'auth',
    'permission_error': 'permission',
    'not_found': 'not_found',
    'validation_error': 'validation',
    'server_error': 'server',
    'network_error': 'network',
    'unknown_error': 'unknown'
  };
  return typeMap[errorInfo.type] || 'unknown';
};

export const handleApiError = (error) => {
  // Use APIErrorHandler internally
  const errorInfo = APIErrorHandler.getErrorMessage(error);
  
  // Return in legacy format for backward compatibility
  return {
    type: mapErrorType(errorInfo),
    message: errorInfo.message,
    action: errorInfo.action === 'login' ? 'redirect_to_login' : 'show_error'
  };
};

export const handleApiErrorWithAction = (error, context = '') => {
  const errorInfo = handleApiError(error);
  
  // Log error for debugging
  console.error(`API Error in ${context}:`, {
    error: error.message,
    status: error.response?.status,
    data: error.response?.data,
    context: context,
    timestamp: new Date().toISOString()
  });
  
  // Handle different error types using centralized utilities
  switch (errorInfo.type) {
    case 'auth':
      // Clear tokens using AuthStorage and redirect to login
      AuthStorage.clearAuth();
      if (window.location.pathname !== ROUTES.LOGIN) {
        window.location.href = ROUTES.LOGIN;
      }
      break;
    case 'permission':
      // Show permission error
      console.warn('Permission denied:', errorInfo.message);
      break;
    case 'network':
      // Show network error
      console.warn('Network error:', errorInfo.message);
      break;
    default:
      // Show generic error
      console.error('API Error:', errorInfo.message);
      break;
  }
  
  return errorInfo;
};

export const createApiCall = (baseURL) => {
  return async (url, options = {}) => {
    try {
      const token = AuthStorage.getToken();
      const response = await fetch(`${baseURL}${url}`, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });
      
      if (!response.ok) {
        const error = new Error(`HTTP ${response.status}: ${response.statusText}`);
        error.response = response;
        throw error;
      }
      
      return await response.json();
    } catch (error) {
      throw error;
    }
  };
};

export const withErrorHandling = (apiCall, context = '') => {
  return async (...args) => {
    try {
      return await apiCall(...args);
    } catch (error) {
      const errorInfo = handleApiErrorWithAction(error, context);
      throw new Error(errorInfo.message);
    }
  };
};
