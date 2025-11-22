import { useState, useEffect, useCallback, useRef } from 'react';
import apiClient from '../../../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../../../config/api';

export const usePatients = (filterStatus = 'all', searchQuery = '') => {
  const [patients, setPatients] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({ page: 1, size: 20, total: 0 });
  const isMountedRef = useRef(true);
  const pageSize = 20; // Fixed page size

  const fetchPatients = useCallback(async (page = 1, skipLoadingState = false) => {
    try {
      if (!skipLoadingState) {
        setLoading(true);
      }
      setError(null);
      
      // Calculate offset from page
      const offset = (page - 1) * pageSize;
      
      // Map filterStatus to backend expected format
      // Backend expects: 'all', 'new', 'active', 'follow_up', 'discharged', etc.
      const statusFilter = filterStatus === 'all' ? null : filterStatus;
      
      // Backend expects: status, search, limit, offset
      const requestBody = {
        status: statusFilter,
        search: searchQuery || null,
        limit: pageSize,
        offset: offset
      };

      const response = await apiClient.post(
        API_ENDPOINTS.SPECIALISTS.PATIENTS_FILTER || '/api/specialists/patients/filter',
        requestBody
      );

      // Backend returns: patients, total_count, page, size, has_more
      const patientsData = response.data.patients || [];
      const totalCount = response.data.total_count || 0;
      const currentPage = response.data.page || page;
      
      if (isMountedRef.current) {
        setPatients(patientsData);
        setPagination({
          page: currentPage,
          size: pageSize,
          total: totalCount,
          has_more: response.data.has_more || false
        });
        if (!skipLoadingState) {
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('Error fetching patients:', err);
      if (isMountedRef.current) {
        setError(
          err.response?.data?.detail || 
          err.response?.data?.message || 
          err.message || 
          'Failed to load patients'
        );
        if (!skipLoadingState) {
          setLoading(false);
        }
      }
    }
  }, [filterStatus, searchQuery, pageSize]);

  useEffect(() => {
    isMountedRef.current = true;
    fetchPatients(1, false);
    
    return () => {
      isMountedRef.current = false;
    };
  }, [filterStatus, searchQuery]); // Only refetch when filter or search changes

  // Create a stable refetch function
  const refetch = useCallback((page = 1) => {
    return fetchPatients(page, false);
  }, [fetchPatients]);

  return { 
    patients, 
    loading, 
    error, 
    pagination,
    refetch
  };
};

