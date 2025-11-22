import axios from 'axios';
import { refreshAuthToken } from './tokenRefresh';
import { API_URL, API_CONFIG } from '../config/api';
import { AuthStorage } from './localStorage';
import { ROUTES } from '../config/routes';

// Create axios instance
const apiClient = axios.create({
  baseURL: API_URL,
  timeout: API_CONFIG.timeout || 30000, // Use config timeout (default 30s, was 10s)
  headers: {
    'Content-Type': 'application/json',
  },
});

// Flag to prevent multiple refresh attempts
let isRefreshing = false;
let failedQueue = [];

// Process failed requests queue
const processQueue = (error, token = null) => {
  failedQueue.forEach(prom => {
    if (error) {
      prom.reject(error);
    } else {
      prom.resolve(token);
    }
  });
  
  failedQueue = [];
};

// Request interceptor to add auth token
apiClient.interceptors.request.use(
  (config) => {
    const token = AuthStorage.getToken();
    console.log('Request interceptor - Token check:', {
      hasToken: !!token,
      tokenLength: token?.length || 0,
      url: config.url
    });
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
      console.log('Added Authorization header to request');
    } else {
      console.warn('No access token found for request:', config.url);
    }
    return config;
  },
  (error) => {
    console.error('Request interceptor error:', error);
    return Promise.reject(error);
  }
);

// Response interceptor to handle token refresh
apiClient.interceptors.response.use(
  (response) => {
    console.log('Response interceptor - Success:', {
      status: response.status,
      url: response.config?.url
    });
    return response;
  },
  async (error) => {
    console.log('Response interceptor - Error:', {
      status: error.response?.status,
      url: error.config?.url,
      message: error.message
    });
    
    const originalRequest = error.config;

    // Check if error is 401 and we haven't already tried to refresh
    if (error.response?.status === 401 && !originalRequest._retry) {
      console.log('401 error detected, attempting token refresh...');
      if (isRefreshing) {
        // If already refreshing, queue this request
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        }).then(token => {
          originalRequest.headers.Authorization = `Bearer ${token}`;
          return apiClient(originalRequest);
        }).catch(err => {
          return Promise.reject(err);
        });
      }

      originalRequest._retry = true;
      isRefreshing = true;

      try {
        const refreshToken = AuthStorage.getRefreshToken();
        if (!refreshToken) {
          console.error('No refresh token available for refresh');
          throw new Error('No refresh token available');
        }

        console.log('🔄 Token expired, attempting refresh...');
        
        // Try to refresh the token
        const success = await refreshAuthToken();
        console.log('Token refresh result:', success);
        
        if (success) {
          const newToken = AuthStorage.getToken();
          console.log('New token obtained, length:', newToken?.length);
          processQueue(null, newToken);
          
          // Retry the original request with new token
          originalRequest.headers.Authorization = `Bearer ${newToken}`;
          console.log('Retrying original request with new token');
          return apiClient(originalRequest);
        } else {
          console.error('Token refresh failed - success was false');
          throw new Error('Token refresh failed');
        }
      } catch (refreshError) {
        console.error('❌ Token refresh failed:', refreshError);
        console.error('Refresh error details:', {
          error: refreshError,
          message: refreshError?.message,
          response: refreshError?.response,
          status: refreshError?.response?.status
        });
        processQueue(refreshError, null);
        
        // Clear tokens using AuthStorage and redirect to login
        AuthStorage.clearAuth();
        
        // Only redirect if we're not already on login page
        if (window.location.pathname !== ROUTES.LOGIN) {
          console.log('Redirecting to login page');
          window.location.href = ROUTES.LOGIN;
        }
        
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    // For other errors, just reject
    return Promise.reject(error);
  }
);

// Utility functions for common API operations
export const api = {
  // GET request
  get: (url, config = {}) => apiClient.get(url, config),
  
  // POST request
  post: (url, data = {}, config = {}) => apiClient.post(url, data, config),
  
  // PUT request
  put: (url, data = {}, config = {}) => apiClient.put(url, data, config),
  
  // DELETE request
  delete: (url, config = {}) => apiClient.delete(url, config),
  
  // PATCH request
  patch: (url, data = {}, config = {}) => apiClient.patch(url, data, config),
};

// Export the configured axios instance
export default apiClient;

// Export individual methods for convenience
export const { get, post, put, delete: del, patch } = api;
