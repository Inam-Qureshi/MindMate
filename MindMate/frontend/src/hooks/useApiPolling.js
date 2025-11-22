// hooks/useApiPolling.js
import { useState, useEffect, useCallback, useRef } from 'react';
import axios from 'axios';

/**
 * Custom hook for consistent API polling with loading states and error handling
 * @param {Function} fetchFunction - The async function to call for data fetching
 * @param {number} intervalMs - Polling interval in milliseconds (default: 30000)
 * @param {Array} dependencies - Dependencies for the fetch function
 * @param {boolean} enabled - Whether polling is enabled (default: true)
 * @returns {Object} { data, loading, error, refetch, lastUpdated }
 */
export const useApiPolling = (fetchFunction, intervalMs = 30000, dependencies = [], enabled = true) => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [lastUpdated, setLastUpdated] = useState(null);
  const intervalRef = useRef(null);
  const mountedRef = useRef(true);

  const executeFetch = useCallback(async (isInitial = false) => {
    if (!enabled) return;

    try {
      if (isInitial) setLoading(true);
      setError(null);

      const result = await fetchFunction();
      if (mountedRef.current) {
        setData(result);
        setLastUpdated(new Date());
      }
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch data');
        console.error('API Polling Error:', err);
      }
    } finally {
      if (mountedRef.current && isInitial) {
        setLoading(false);
      }
    }
  }, [fetchFunction, enabled]);

  const refetch = useCallback(() => {
    executeFetch(true);
  }, [executeFetch]);

  // Initial fetch
  useEffect(() => {
    mountedRef.current = true;
    executeFetch(true);

    return () => {
      mountedRef.current = false;
    };
  }, dependencies);

  // Set up polling interval
  useEffect(() => {
    if (!enabled || intervalMs <= 0) return;

    intervalRef.current = setInterval(() => {
      executeFetch(false);
    }, intervalMs);

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [executeFetch, intervalMs, enabled]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      mountedRef.current = false;
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, []);

  return {
    data,
    loading,
    error,
    refetch,
    lastUpdated
  };
};

/**
 * Hook for consistent loading states across components
 * @param {boolean} initialLoading - Initial loading state
 * @returns {Object} { loading, setLoading, withLoading }
 */
export const useLoadingState = (initialLoading = false) => {
  const [loading, setLoading] = useState(initialLoading);

  const withLoading = useCallback(async (asyncFunction) => {
    try {
      setLoading(true);
      const result = await asyncFunction();
      return result;
    } finally {
      setLoading(false);
    }
  }, []);

  return {
    loading,
    setLoading,
    withLoading
  };
};

/**
 * Hook for optimistic updates with rollback on error
 * @param {any} initialData - Initial data value
 * @param {Function} updateFunction - Function to call for server update
 * @returns {Object} { data, setData, optimisticUpdate, loading, error }
 */
export const useOptimisticUpdate = (initialData, updateFunction) => {
  const [data, setData] = useState(initialData);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const optimisticUpdate = useCallback(async (newData, rollbackData = data) => {
    const previousData = data;
    setData(newData);
    setLoading(true);
    setError(null);

    try {
      await updateFunction(newData);
    } catch (err) {
      setData(rollbackData || previousData);
      setError(err.message || 'Update failed');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [data, updateFunction]);

  return {
    data,
    setData,
    optimisticUpdate,
    loading,
    error
  };
};
