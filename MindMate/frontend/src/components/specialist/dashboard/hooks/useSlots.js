import { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import apiClient from '../../../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../../../config/api';

export const useSlots = (filters = {}) => {
  const [slots, setSlots] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [summary, setSummary] = useState(null);
  const abortControllerRef = useRef(null);
  const isMountedRef = useRef(true);

  // Serialize filters properly
  const serializeFilters = useCallback((filterObj) => {
    const params = new URLSearchParams();
    Object.entries(filterObj).forEach(([key, value]) => {
      if (value !== null && value !== undefined && value !== '') {
        params.append(key, value.toString());
      }
    });
    return params.toString();
  }, []);

  const fetchSlots = useCallback(async (filterParams = null, shouldCancelPrevious = false, skipLoadingState = false) => {
    // Store reference to previous controller before creating new one
    const previousController = abortControllerRef.current;
    
    // Only cancel previous request if explicitly requested (e.g., when filters change)
    // Don't cancel when refetch is called manually or by polling
    if (shouldCancelPrevious && previousController && !previousController.signal.aborted) {
      previousController.abort();
    }

    // Create a new abort controller for this request only if we might need to cancel it
    // For refetch/polling, we don't need abort controller
    const needsAbortController = shouldCancelPrevious;
    if (needsAbortController) {
      abortControllerRef.current = new AbortController();
    }
    const currentSignal = needsAbortController ? abortControllerRef.current.signal : undefined;

    try {
      // Only set loading state for initial load or explicit fetches
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      
      // Use provided filters or fall back to current filters
      const filtersToUse = filterParams !== null ? filterParams : filters;
      const params = serializeFilters(filtersToUse);
      
      const requestConfig = currentSignal ? { signal: currentSignal } : {};
      const response = await apiClient.get(
        `${API_ENDPOINTS.SPECIALISTS.SLOTS}${params ? `?${params}` : ''}`,
        requestConfig
      );

      // Only update if this request wasn't aborted and component is still mounted
      const wasAborted = currentSignal ? currentSignal.aborted : false;
      if (!wasAborted && isMountedRef.current) {
        // Backend returns slots as an array directly, or wrapped in {slots: [...]}
        const slotsData = Array.isArray(response.data) 
          ? response.data 
          : (response.data.slots || []);
        setSlots(slotsData);
        if (!skipLoadingState) {
          setLoading(false);
        }
      }
    } catch (err) {
      // Ignore abort errors - they're expected when canceling
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.message === 'canceled' || err.message?.includes('canceled')) {
        // Silently ignore canceled requests
        return;
      }
      
      const wasAborted = currentSignal ? currentSignal.aborted : false;
      if (isMountedRef.current && !wasAborted) {
        console.error('Error fetching slots:', err);
        const errorMessage = err.response?.data?.detail || 
                            err.response?.data?.message || 
                            (err.code === 'ECONNABORTED' ? 'Request timed out. Please try again.' : err.message) ||
                            'Failed to load slots';
        setError(errorMessage);
        if (!skipLoadingState) {
          setLoading(false);
        }
      }
    }
  }, [filters, serializeFilters]);

  const fetchSummary = useCallback(async () => {
    try {
      // Backend endpoint is /specialists/slots/summary
      const response = await apiClient.get(
        API_ENDPOINTS.SPECIALISTS.SLOTS_SUMMARY || '/api/specialists/slots/summary',
        { timeout: 15000 } // Shorter timeout for summary
      );

      if (isMountedRef.current) {
        setSummary(response.data);
      }
    } catch (err) {
      // Ignore timeout/abort errors for summary
      if (err.name === 'AbortError' || err.code === 'ERR_CANCELED' || err.code === 'ECONNABORTED') {
        return;
      }
      console.error('Error fetching slot summary:', err);
      // Don't set error state for summary, just log it
    }
  }, []);

  const generateSlots = useCallback(async (startDate, endDate) => {
    try {
      const response = await apiClient.post(
        '/api/specialists/slots/generate',
        {
          start_date: startDate,
          end_date: endDate,
          use_weekly_template: true,
          custom_slots: null
        }
      );

      await fetchSlots();
      return response.data;
    } catch (err) {
      console.error('Error generating slots:', err);
      throw err;
    }
  }, [fetchSlots]);

  const blockSlot = useCallback(async (slotIds, notes = '') => {
    try {
      const slotIdArray = Array.isArray(slotIds) ? slotIds : [slotIds];
      
      // Use bulk-update endpoint for multiple slots, or individual update for single slot
      if (slotIdArray.length === 1) {
        await apiClient.put(
          `/api/specialists/slots/${slotIdArray[0]}`,
          {
            status: 'blocked',
            notes: notes
          }
        );
      } else {
        await apiClient.put(
          '/api/specialists/slots/bulk-update',
          {
            slot_ids: slotIdArray,
            status: 'blocked',
            notes: notes
          }
        );
      }

      await fetchSlots();
      return { success: true };
    } catch (err) {
      console.error('Error blocking slot:', err);
      throw err;
    }
  }, [fetchSlots]);

  const unblockSlot = useCallback(async (slotIds) => {
    try {
      const slotIdArray = Array.isArray(slotIds) ? slotIds : [slotIds];
      
      // Use bulk-update endpoint for multiple slots, or individual update for single slot
      if (slotIdArray.length === 1) {
        await apiClient.put(
          `/api/specialists/slots/${slotIdArray[0]}`,
          {
            status: 'available',
            notes: null
          }
        );
      } else {
        await apiClient.put(
          '/api/specialists/slots/bulk-update',
          {
            slot_ids: slotIdArray,
            status: 'available',
            notes: null
          }
        );
      }

      await fetchSlots();
      return { success: true };
    } catch (err) {
      console.error('Error unblocking slot:', err);
      throw err;
    }
  }, [fetchSlots]);

  // Track previous filters to detect actual changes
  const prevFiltersStrRef = useRef(null);
  const hasMountedRef = useRef(false);

  // Normalize filters to a stable string representation (memoized)
  const normalizedFiltersStr = useMemo(() => {
    if (!filters || Object.keys(filters).length === 0) {
      return '';
    }
    // Sort keys to ensure consistent string representation
    const sorted = Object.keys(filters)
      .sort()
      .reduce((acc, key) => {
        const value = filters[key];
        if (value !== null && value !== undefined && value !== '') {
          acc[key] = value;
        }
        return acc;
      }, {});
    return JSON.stringify(sorted);
  }, [filters]);

  // Fetch slots when filters change
  useEffect(() => {
    isMountedRef.current = true;
    
    // On first mount, fetch both
    if (!hasMountedRef.current) {
      hasMountedRef.current = true;
      prevFiltersStrRef.current = normalizedFiltersStr;
      
      // Fetch both in parallel, but slots fetch doesn't use abort controller on initial load
      fetchSummary();
      fetchSlots(null, false, false); // Initial fetch - don't cancel, show loading
    } else if (prevFiltersStrRef.current !== normalizedFiltersStr) {
      // Only fetch slots if filters actually changed
      prevFiltersStrRef.current = normalizedFiltersStr;
      fetchSlots(filters, true, false); // Filter change - cancel previous request, show loading
    }

    return () => {
      isMountedRef.current = false;
      // Only cancel on actual unmount - don't cancel during re-renders
      // The abort controller is only set when shouldCancelPrevious is true
      // So we only need to clean up on unmount
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [normalizedFiltersStr]); // Use normalized string as dependency

  // Create a stable refetch function that doesn't cancel previous requests
  // Skip loading state for polling/refetch to avoid UI flicker
  const refetch = useCallback(() => {
    return fetchSlots(null, false, true); // skipLoadingState = true for refetch
  }, [fetchSlots]);

  return { 
    slots, 
    loading, 
    error, 
    summary,
    refetch,
    generateSlots,
    blockSlot,
    unblockSlot
  };
};

