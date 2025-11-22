import axios from 'axios';
import { API_URL } from '../config/api';
import { AuthStorage } from './localStorage';
import { ROUTES } from '../config/routes';

let refreshTokenTimeout;
let lastActivityTime = Date.now();
const IDLE_TIMEOUT = 5 * 60 * 1000; // 5 minutes in milliseconds
const TOKEN_REFRESH_INTERVAL = 4 * 60 * 60 * 1000; // 4 hours (token expires in 8 hours)

/**
 * Updates the last activity time
 */
export const updateActivity = () => {
  lastActivityTime = Date.now();
};

/**
 * Checks if the user is idle
 */
const isIdle = () => {
  return (Date.now() - lastActivityTime) > IDLE_TIMEOUT;
};

/**
 * Refreshes the auth token
 */
export const refreshAuthToken = async () => {
  try {
    // Don't refresh if user is idle
    if (isIdle()) {
      console.log('User is idle, skipping token refresh');
      return false;
    }

    const refreshToken = AuthStorage.getRefreshToken();
    if (!refreshToken) {
      console.log('No refresh token found');
      return false;
    }

    console.log('Refreshing authentication token...');
    const response = await axios.post(
      `${API_URL}/api/auth/refresh-token`,
      { refresh_token: refreshToken }
    );

    if (response.data.success && response.data.access_token) {
      AuthStorage.setToken(response.data.access_token);
      if (response.data.refresh_token) {
        AuthStorage.setRefreshToken(response.data.refresh_token);
      }
      console.log('Token refreshed successfully');
      return true;
    }
    return false;
  } catch (error) {
    console.error('Token refresh failed:', error);
    
    // Handle different error types
    if (error.response) {
      // Server responded with error
      const status = error.response.status;
      if (status === 401 || status === 403) {
        // Token is invalid or expired - clear and redirect
        AuthStorage.clearAuth();
        
        // Only redirect if not already on login page
        if (window.location.pathname !== ROUTES.LOGIN) {
          window.location.href = ROUTES.LOGIN;
        }
      }
    } else if (error.request) {
      // Network error - log but don't clear tokens (might be temporary)
      console.error('Network error during token refresh:', error.message);
    } else {
      // Other error
      console.error('Token refresh error:', error.message);
    }
    
    return false;
  }
};

/**
 * Starts the automatic token refresh cycle
 */
export const startTokenRefresh = () => {
  // Clear any existing timeout
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
  }

  // Set up the next refresh
  refreshTokenTimeout = setTimeout(async () => {
    await refreshAuthToken();
    startTokenRefresh(); // Schedule next refresh
  }, TOKEN_REFRESH_INTERVAL);

  console.log('Token auto-refresh started');
};

/**
 * Stops the automatic token refresh
 */
export const stopTokenRefresh = () => {
  if (refreshTokenTimeout) {
    clearTimeout(refreshTokenTimeout);
    refreshTokenTimeout = null;
  }
  console.log('Token auto-refresh stopped');
};

/**
 * Sets up activity listeners to track user activity
 */
export const setupActivityListeners = () => {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.addEventListener(event, updateActivity, true);
  });

  console.log('Activity listeners set up');
};

/**
 * Removes activity listeners
 */
export const removeActivityListeners = () => {
  const events = ['mousedown', 'keydown', 'scroll', 'touchstart', 'click'];
  
  events.forEach(event => {
    document.removeEventListener(event, updateActivity, true);
  });

  console.log('Activity listeners removed');
};

/**
 * Initialize token refresh system
 */
export const initializeTokenRefresh = () => {
  setupActivityListeners();
  startTokenRefresh();
  updateActivity(); // Mark initial activity
};

/**
 * Cleanup token refresh system
 */
export const cleanupTokenRefresh = () => {
  stopTokenRefresh();
  removeActivityListeners();
};

