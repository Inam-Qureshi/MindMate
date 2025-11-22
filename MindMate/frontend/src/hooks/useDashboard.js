import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_URL, API_ENDPOINTS } from '../config/api';
import { useApiPolling } from './useApiPolling';
import { AuthStorage } from '../utils/localStorage';

/**
 * Custom hook for fetching dashboard overview data
 */
export const useDashboard = (autoRefresh = true, refreshInterval = 60000) => {
  const [dashboardData, setDashboardData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchDashboardData = useCallback(async () => {
    try {
      setError(null);
      const token = AuthStorage.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const response = await axios.get(
        `${API_URL}${API_ENDPOINTS.DASHBOARD.OVERVIEW}`,
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setDashboardData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch dashboard data';
      setError(errorMessage);
      console.error('Dashboard fetch error:', err);
      
      // Don't throw error to prevent unhandled promise rejection
      // Return empty data structure instead
      setDashboardData({
        progress_data: {},
        appointments: [],
        recent_activity: [],
        wellness_metrics: {},
        quick_actions: [],
        notifications: []
      });
      
      return null;
    } finally {
      setLoading(false);
    }
  }, []);

  const { data: polledData, refetch } = useApiPolling(
    fetchDashboardData,
    autoRefresh ? refreshInterval : 0,
    [],
    autoRefresh
  );

  useEffect(() => {
    if (polledData) {
      setDashboardData(polledData);
    }
  }, [polledData]);

  // Initial fetch
  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  const refetchDashboard = useCallback(() => {
    setLoading(true);
    return fetchDashboardData().finally(() => setLoading(false));
  }, [fetchDashboardData]);

  return {
    dashboardData,
    loading,
    error,
    refetch: refetchDashboard,
    progressData: dashboardData?.progress_data,
    appointments: dashboardData?.appointments || [],
    recentActivity: dashboardData?.recent_activity || [],
    wellnessMetrics: dashboardData?.wellness_metrics,
    quickActions: dashboardData?.quick_actions || [],
    notifications: dashboardData?.notifications || [],
  };
};

/**
 * Hook for fetching individual dashboard endpoints
 */
export const useDashboardEndpoint = (endpoint, options = {}) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const fetchData = useCallback(async () => {
    try {
      setError(null);
      const token = AuthStorage.getToken();
      
      if (!token) {
        throw new Error('No authentication token found');
      }

      const url = typeof endpoint === 'function' 
        ? `${API_URL}${endpoint()}` 
        : `${API_URL}${endpoint}`;

      const response = await axios.get(url, {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        params: options.params,
      });

      setData(response.data);
      return response.data;
    } catch (err) {
      const errorMessage = err.response?.data?.detail || err.message || 'Failed to fetch data';
      setError(errorMessage);
      console.error('Dashboard endpoint fetch error:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  }, [endpoint, options.params]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  return { data, loading, error, refetch: fetchData };
};

