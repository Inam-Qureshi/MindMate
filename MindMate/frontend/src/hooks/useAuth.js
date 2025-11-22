import { useState, useEffect } from 'react';
import axios from 'axios';
import { API_URL } from '../config/api';
import { refreshAuthToken } from '../utils/tokenRefresh';
import { AuthStorage } from '../utils/localStorage';
import { ROUTES } from '../config/routes';

/**
 * Custom hook for handling authentication with automatic token refresh
 * @param {string} endpoint - The API endpoint to call
 * @param {object} options - Additional options for the request
 * @returns {object} - { data, loading, error, refetch }
 */
export const useAuthenticatedRequest = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const makeRequest = async (token) => {
    try {
      const response = await axios.get(`${API_URL}${endpoint}`, {
        headers: { Authorization: `Bearer ${token}` },
        ...options
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const success = await refreshAuthToken();
      if (success) {
        const newToken = AuthStorage.getToken();
        if (newToken) {
          return newToken;
        }
      }
      throw new Error("Token refresh failed");
    } catch (error) {
      // refreshAuthToken already handles cleanup and redirect
      // Just throw to let caller handle the error
      throw error;
    }
  };

  const fetchData = async () => {
    setLoading(true);
    setError(null);

    try {
      const token = AuthStorage.getToken();
      if (!token) {
        throw new Error("No access token available");
      }

      const result = await makeRequest(token);
      setData(result);
    } catch (error) {
      console.error("Request failed:", error);

      // If token expired, try to refresh it
      if (error.response?.status === 401) {
        try {
          console.log("Token expired, attempting refresh...");
          const newToken = await refreshToken();
          const result = await makeRequest(newToken);
          setData(result);
          return;
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          setError("Authentication failed. Please login again.");
          return;
        }
      }

      setError(error.message || "Request failed");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [endpoint]);

  const refetch = () => {
    fetchData();
  };

  return { data, loading, error, refetch };
};

/**
 * Custom hook for making authenticated POST/PUT/DELETE requests with automatic token refresh
 * @param {string} method - HTTP method (POST, PUT, DELETE)
 * @param {string} endpoint - The API endpoint to call
 * @returns {object} - { execute, loading, error }
 */
export const useAuthenticatedMutation = (method, endpoint) => {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const makeRequest = async (token, data) => {
    try {
      const response = await axios({
        method,
        url: `${API_URL}${endpoint}`,
        headers: { Authorization: `Bearer ${token}` },
        data
      });
      return response.data;
    } catch (error) {
      throw error;
    }
  };

  const refreshToken = async () => {
    try {
      const success = await refreshAuthToken();
      if (success) {
        const newToken = AuthStorage.getToken();
        if (newToken) {
          return newToken;
        }
      }
      throw new Error("Token refresh failed");
    } catch (error) {
      // refreshAuthToken already handles cleanup and redirect
      // Just throw to let caller handle the error
      throw error;
    }
  };

  const execute = async (data) => {
    setLoading(true);
    setError(null);

    try {
      const token = AuthStorage.getToken();
      if (!token) {
        throw new Error("No access token available");
      }

      const result = await makeRequest(token, data);
      return result;
    } catch (error) {
      console.error("Request failed:", error);

      // If token expired, try to refresh it
      if (error.response?.status === 401) {
        try {
          console.log("Token expired, attempting refresh...");
          const newToken = await refreshToken();
          const result = await makeRequest(newToken, data);
          return result;
        } catch (refreshError) {
          console.error("Token refresh failed:", refreshError);
          setError("Authentication failed. Please login again.");
          throw refreshError;
        }
      }

      setError(error.message || "Request failed");
      throw error;
    } finally {
      setLoading(false);
    }
  };

  return { execute, loading, error };
};
