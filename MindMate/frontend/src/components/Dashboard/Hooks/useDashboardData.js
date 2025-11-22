/**
 * useDashboardData - Custom Hook for Dashboard Data Management
 * ===========================================================
 * Handles data fetching, caching, and state management for dashboard.
 * 
 * Features:
 * - Optimized data fetching
 * - Error handling
 * - Loading states
 * - Cache management
 * - Real-time updates
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../../../config/api';

export const useDashboardData = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastFetch, setLastFetch] = useState(null);
  const [cache, setCache] = useState(new Map());
  
  const abortControllerRef = useRef(null);
  const retryCountRef = useRef(0);
  const maxRetries = 3;

  // Get auth token
  const getAuthHeaders = useCallback(() => {
    const token = localStorage.getItem('access_token');
    return {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    };
  }, []);

  // Fetch dashboard data
  const fetchDashboardData = useCallback(async (forceRefresh = false) => {
    try {
      // Cancel previous request
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }

      // Create new abort controller
      abortControllerRef.current = new AbortController();

      // Check cache first (unless force refresh)
      const cacheKey = 'dashboard_overview';
      const cachedData = cache.get(cacheKey);
      const cacheExpiry = 5 * 60 * 1000; // 5 minutes

      if (!forceRefresh && cachedData && Date.now() - cachedData.timestamp < cacheExpiry) {
        setData(cachedData.data);
        setLoading(false);
        setError(null);
        return cachedData.data;
      }

      setLoading(true);
      setError(null);

      const response = await axios.get(`${API_URL}${API_ENDPOINTS.DASHBOARD.OVERVIEW_TEST}`, {
        signal: abortControllerRef.current.signal,
        timeout: 10000 // 10 second timeout
      });

      const dashboardData = response.data;
      
      // Update cache
      setCache(prev => new Map(prev).set(cacheKey, {
        data: dashboardData,
        timestamp: Date.now()
      }));

      setData(dashboardData);
      setLastFetch(new Date());
      retryCountRef.current = 0;
      
      return dashboardData;

    } catch (err) {
      if (err.name === 'AbortError') {
        return; // Request was cancelled
      }

      console.error('Error fetching dashboard data:', err);
      
      // Handle different error types
      if (err.response?.status === 401) {
        // Token expired, redirect to login
        localStorage.removeItem('access_token');
        localStorage.removeItem('refresh_token');
        window.location.href = '/login';
        return;
      }

      if (err.response?.status >= 500) {
        // Server error, retry with exponential backoff
        if (retryCountRef.current < maxRetries) {
          retryCountRef.current++;
          const delay = Math.pow(2, retryCountRef.current) * 1000; // Exponential backoff
          
          setTimeout(() => {
            fetchDashboardData(forceRefresh);
          }, delay);
          
          return;
        }
      }

      setError({
        message: err.response?.data?.detail || 'Failed to load dashboard data',
        status: err.response?.status,
        retryable: err.response?.status >= 500
      });
      
    } finally {
      setLoading(false);
    }
  }, [getAuthHeaders, cache]);

  // Refresh data
  const refresh = useCallback(async () => {
    return await fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Update specific widget data
  const updateWidget = useCallback(async (widgetId, newData) => {
    try {
      setData(prevData => ({
        ...prevData,
        [widgetId]: {
          ...prevData[widgetId],
          ...newData,
          lastUpdated: new Date().toISOString()
        }
      }));

      // Optionally sync with server
      // await syncWidgetData(widgetId, newData);
      
    } catch (err) {
      console.error(`Error updating widget ${widgetId}:`, err);
      throw err;
    }
  }, []);

  // Fetch specific widget data
  const fetchWidgetData = useCallback(async (widgetType) => {
    try {
      const response = await axios.get(`${API_URL}${API_ENDPOINTS.DASHBOARD.WIDGET(widgetType)}`, {
        headers: getAuthHeaders()
      });
      
      return response.data;
    } catch (err) {
      console.error(`Error fetching ${widgetType} data:`, err);
      throw err;
    }
  }, [getAuthHeaders]);

  // Clear cache
  const clearCache = useCallback(() => {
    setCache(new Map());
  }, []);

  // Retry on error
  const retry = useCallback(() => {
    setError(null);
    retryCountRef.current = 0;
    fetchDashboardData(true);
  }, [fetchDashboardData]);

  // Initial data fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (abortControllerRef.current) {
        abortControllerRef.current.abort();
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    lastFetch,
    refresh,
    updateWidget,
    fetchWidgetData,
    clearCache,
    retry,
    isConnected: !error || data !== null
  };
};

export default useDashboardData;
