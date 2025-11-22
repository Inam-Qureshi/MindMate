import React, { useState, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Filter, 
  User, 
  ChevronDown,
  ChevronUp,
  X
} from 'react-feather';
import { api } from '../../utils/axiosConfig';
import BookingWizard from './BookingWizard';
import SpecialistCard from './SpecialistCard';
import { GridSkeleton } from '../UI/SkeletonLoader';
import { ErrorState, EmptyState } from '../UI/LoadingStates';
import { useToast } from '../UI/Toast';
import { API_ENDPOINTS } from '../../config/api';
import { ROUTES } from '../../config/routes';
import { useNavigate } from 'react-router-dom';
import { AuthStorage } from '../../utils/localStorage';
import './FindSpecialists.css';
import './SpecialistCard.css';

const FindSpecialists = ({ darkMode }) => {
  const navigate = useNavigate();
  
  // State management
  const [allSpecialists, setAllSpecialists] = useState([]);
  const [specialists, setSpecialists] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    city: '',
    specializations: [],
    consultation_mode: 'both',
    sort_by: 'best_match'
  });
  const [pagination, setPagination] = useState({
    page: 1,
    size: 12,
    total: 0,
    total_pages: 0,
    has_more: false
  });
  const [showFilters, setShowFilters] = useState(false);
  const [selectedSpecialist, setSelectedSpecialist] = useState(null);
  const [showBookingWizard, setShowBookingWizard] = useState(false);

  // Toast notifications
  const toast = useToast();

  // Load specialists function - needs to be defined before useEffects
  const loadSpecialists = useCallback(async (searchTerm = searchQuery) => {
    try {
      setLoading(true);
      setError(null);

      // No auth required for public specialists search; use token if present automatically via api client

      // Build query parameters for specialists API
      const params = new URLSearchParams();
      
      // Note: The /api/specialists/search endpoint doesn't support query parameter for text search
      // We'll filter by search term client-side after fetching
      
      if (filters.city) params.append('city', filters.city);
      if (filters.specializations && filters.specializations.length > 0) {
        // Get the specialization value (handle both string and object)
        const specValue = Array.isArray(filters.specializations) 
          ? filters.specializations[0] 
          : filters.specializations;
        params.append('specialization', typeof specValue === 'string' ? specValue : specValue.value || specValue);
      }
      if (filters.consultation_mode && filters.consultation_mode !== 'both') {
        // Map consultation_mode values
        if (filters.consultation_mode === 'online') {
          params.append('consultation_mode', 'online');
        } else if (filters.consultation_mode === 'in_person') {
          params.append('consultation_mode', 'in_person');
        }
      }
      
      // Pagination - use page 1 and larger size to get more results for client-side pagination
      params.append('page', '1');
      params.append('size', '50'); // API limit is 50, fetch max to handle client-side pagination

      // Use specialists search endpoint (returns only approved specialists)
      const url = `${API_ENDPOINTS.SPECIALISTS.SEARCH}?${params}`;
      
      const response = await api.get(url);
      
      if (response.data && response.data.specialists && Array.isArray(response.data.specialists)) {
        // Map and validate each specialist - ensure specializations are properly formatted
        const validatedSpecialists = response.data.specialists.map((specialist, index) => {
          if (!specialist || typeof specialist !== 'object') {
            return null;
          }
          
          // Ensure specializations is an array and properly formatted
          let formattedSpecializations = [];
          if (specialist.specializations && Array.isArray(specialist.specializations)) {
            formattedSpecializations = specialist.specializations.map(spec => {
              // Handle both string and object formats
              if (typeof spec === 'string') {
                return spec;
              } else if (spec && typeof spec === 'object') {
                return spec.specialization || spec.value || spec.label || '';
              }
              return '';
            }).filter(Boolean);
          }
          
          // Map backend response to frontend format
          const mapped = {
            ...specialist,
            specializations: formattedSpecializations,
            // Ensure all required fields exist
            first_name: specialist.first_name || '',
            last_name: specialist.last_name || '',
            full_name: specialist.full_name || `${specialist.first_name || ''} ${specialist.last_name || ''}`.trim() || 'Unknown Specialist',
            city: specialist.city || '',
            consultation_fee: specialist.consultation_fee || 0,
            average_rating: specialist.average_rating || 0,
            total_reviews: specialist.total_reviews || 0,
            years_experience: specialist.years_experience || 0,
            profile_image_url: specialist.profile_image_url || '',
            specialist_type: specialist.specialist_type || 'Mental Health Specialist'
          };
          return mapped;
        }).filter(specialist => specialist !== null)
          // Safety filter: only show approved/active specialists if fields exist
          .filter(s => {
            if (s && s.approval_status && typeof s.approval_status === 'string') {
              return s.approval_status.toLowerCase() === 'approved';
            }
            if (s && typeof s.is_active === 'boolean') {
              return s.is_active;
            }
            return true; // backend already limits to approved
          });
        
        setAllSpecialists(validatedSpecialists);
        
        // Update pagination from backend response if available
        if (response.data.pagination) {
          setPagination(prev => ({
            ...prev,
            total: response.data.pagination.total_count || validatedSpecialists.length,
            total_pages: response.data.pagination.total_pages || Math.ceil(validatedSpecialists.length / prev.size),
            has_more: response.data.pagination.has_next || false
          }));
        }
        
        // Reset to first page when loading new data
        setPagination(prev => ({ ...prev, page: 1 }));
      } else {
        setAllSpecialists([]);
      }
    } catch (err) {
      // More specific error messages
      if (err.response?.status === 401) {
        toast.error('Please log in to search for specialists');
        // Immediate redirect to login
        navigate(ROUTES.LOGIN, { 
          state: { from: '/appointments' },
          replace: true 
        });
        return;
      } else if (err.response?.status === 403) {
        setError('You do not have permission to search for specialists');
      } else if (err.response?.status === 404) {
        setError('No specialists found matching your criteria');
      } else if (err.response?.status >= 500) {
        setError('Server error. Please try again later.');
      } else {
        setError('Failed to load specialists. Please try again.');
      }
    } finally {
      setLoading(false);
    }
  }, [filters.city, filters.specializations, filters.consultation_mode, navigate, toast]);

  // Memoized function to update displayed specialists
  const updateDisplayedSpecialists = useCallback(() => {
    if (allSpecialists.length === 0) {
      setSpecialists([]);
      setPagination(prev => ({
        ...prev,
        total: 0,
        total_pages: 0,
        has_more: false
      }));
      return;
    }

    // Filter specialists based on search query
    let filteredSpecialists = allSpecialists.filter(specialist => {
      // Validate specialist before processing
      if (!specialist || typeof specialist !== 'object') {
        return false;
      }
      return true;
    });
    
    if (searchQuery && searchQuery.trim()) {
      const query = searchQuery.toLowerCase().trim();
      filteredSpecialists = filteredSpecialists.filter(specialist => {
        const fullName = `${specialist.first_name || ''} ${specialist.last_name || ''}`.toLowerCase();
        const bio = (specialist.bio || '').toLowerCase();
        const fullNameDisplay = (specialist.full_name || '').toLowerCase();
        const city = (specialist.city || '').toLowerCase();
        const specialistType = (specialist.specialist_type || '').toLowerCase();
        const specializations = Array.isArray(specialist.specializations) 
          ? specialist.specializations
              .map(s => {
                if (typeof s === 'string') return s;
                if (s && typeof s === 'object') return s.specialization || s.value || s.label || '';
                return '';
              })
              .join(' ')
              .toLowerCase()
          : '';
        
        return fullName.includes(query) || 
               fullNameDisplay.includes(query) ||
               bio.includes(query) || 
               city.includes(query) ||
               specialistType.includes(query) ||
               specializations.includes(query);
      });
    }

    const startIndex = (pagination.page - 1) * pagination.size;
    const endIndex = startIndex + pagination.size;
    const paginatedSpecialists = filteredSpecialists.slice(startIndex, endIndex);
    const totalPages = Math.ceil(filteredSpecialists.length / pagination.size);
    
    setSpecialists(paginatedSpecialists);
    setPagination(prev => ({
      ...prev,
      total: filteredSpecialists.length,
      total_pages: totalPages,
      has_more: endIndex < filteredSpecialists.length
    }));
  }, [allSpecialists, searchQuery, pagination.page, pagination.size]);

  // Load specialists when filters change (not pagination)
  useEffect(() => {
    loadSpecialists();
  }, [filters.sort_by, filters.city, filters.specializations, filters.consultation_mode, loadSpecialists]);

  // Update displayed specialists when pagination or search changes
  useEffect(() => {
    updateDisplayedSpecialists();
  }, [updateDisplayedSpecialists]);

  // Memoized handlers for better performance
  const handlePageChange = useCallback((newPage) => {
    setPagination(prev => ({ ...prev, page: newPage }));
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }, []);

  const handlePageSizeChange = useCallback((newSize) => {
    setPagination(prev => ({
      ...prev,
      size: parseInt(newSize), 
      page: 1 // Reset to first page when changing size
    }));
  }, []);

  const handleSearch = useCallback((e) => {
    e.preventDefault();
    loadSpecialists(searchQuery);
  }, [searchQuery, loadSpecialists]);

  const handleFilterChange = useCallback((filterName, value) => {
    setFilters(prev => ({ ...prev, [filterName]: value }));
  }, []);

  const handleClearFilters = useCallback(() => {
    setFilters({
      city: '',
      specializations: [],
      consultation_mode: 'both',
      sort_by: 'best_match'
    });
    setSearchQuery('');
  }, []);

  const handleSpecialistSelect = useCallback((specialist) => {
    setSelectedSpecialist(specialist);
    setShowBookingWizard(true);
  }, []);

  const handleBookingClose = useCallback(() => {
    setShowBookingWizard(false);
    setSelectedSpecialist(null);
  }, []);

  // Pagination controls
  const renderPaginationControls = () => {
    if (pagination.total_pages <= 1) return null;

    const { page, total_pages } = pagination;
    const maxVisiblePages = 5;
    const halfVisible = Math.floor(maxVisiblePages / 2);
    
    let startPage = Math.max(1, page - halfVisible);
    let endPage = Math.min(total_pages, page + halfVisible);
    
    // Adjust if we're near the beginning or end
    if (endPage - startPage + 1 < maxVisiblePages) {
      if (startPage === 1) {
        endPage = Math.min(total_pages, startPage + maxVisiblePages - 1);
      } else {
        startPage = Math.max(1, endPage - maxVisiblePages + 1);
      }
    }

    const pageNumbers = [];
    for (let i = startPage; i <= endPage; i++) {
      pageNumbers.push(i);
    }

    return (
      <div className="pagination-container">
        <div className="pagination-info">
          <div className="pagination-stats">
            <span>
              Showing {((pagination.page - 1) * pagination.size) + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total} specialists
            </span>
            <span className="page-info">
              Page {pagination.page} of {pagination.total_pages}
            </span>
          </div>
          <div className="pagination-controls">
            <select 
              value={pagination.size} 
              onChange={(e) => handlePageSizeChange(e.target.value)}
              className="page-size-selector"
            >
              <option value={6}>6 per page</option>
              <option value={12}>12 per page</option>
              <option value={24}>24 per page</option>
              <option value={48}>48 per page</option>
            </select>
          </div>
        </div>
        
        <div className="pagination-buttons">
          <button
            onClick={() => handlePageChange(1)}
            disabled={page === 1}
            className="pagination-btn"
            title="First page"
          >
            First
          </button>
          
          <button
            onClick={() => handlePageChange(page - 1)}
            disabled={page === 1}
            className="pagination-btn"
            title="Previous page"
          >
            Previous
          </button>
          
          {startPage > 1 && (
            <>
              <button
                onClick={() => handlePageChange(1)}
                className="pagination-btn"
              >
                1
              </button>
              {startPage > 2 && <span className="pagination-ellipsis">...</span>}
            </>
          )}
          
          {pageNumbers.map(pageNum => (
            <button
              key={pageNum}
              onClick={() => handlePageChange(pageNum)}
              className={`pagination-btn ${pageNum === page ? 'active' : ''}`}
            >
              {pageNum}
            </button>
          ))}
          
          {endPage < total_pages && (
            <>
              {endPage < total_pages - 1 && <span className="pagination-ellipsis">...</span>}
              <button
                onClick={() => handlePageChange(total_pages)}
                className="pagination-btn"
              >
                {total_pages}
              </button>
            </>
          )}
          
          <button
            onClick={() => handlePageChange(page + 1)}
            disabled={page === total_pages}
            className="pagination-btn"
            title="Next page"
          >
            Next
          </button>
          
          <button
            onClick={() => handlePageChange(total_pages)}
            disabled={page === total_pages}
            className="pagination-btn"
            title="Last page"
          >
            Last
          </button>
        </div>
      </div>
    );
  };

  // Filter options - will be fetched from backend
  const [cities, setCities] = useState([]);
  const [specializations, setSpecializations] = useState([]);
  
  // Fetch filter options from backend
  useEffect(() => {
    const fetchFilterOptions = async () => {
      try {
        // Fetch dropdown options for specializations (auth handled by api client if token exists)
        const response = await api.get(
          `${API_ENDPOINTS.SPECIALISTS.DROPDOWN_OPTIONS}`
        );
        
        if (response.data?.mental_health_specialties) {
          setSpecializations(response.data.mental_health_specialties.map(s => s.value || s.label || s));
        }
        
        // For cities, we could fetch from a separate endpoint or use the ones from specialist responses
        // For now, we'll extract unique cities from specialist responses
      } catch (err) {
        console.error('Error fetching filter options:', err);
        // Use fallback values if API fails
        setSpecializations([
          'Anxiety', 'Depression', 'PTSD', 'Bipolar Disorder', 'OCD', 
          'ADHD', 'Eating Disorders', 'Substance Abuse', 'Grief Counseling', 
          'Couples Therapy', 'Family Therapy', 'Child Psychology', 'Addiction'
        ]);
        
        // Set fallback cities as well
        setCities([
          'Lahore', 'Karachi', 'Islamabad', 'Rawalpindi', 'Multan', 
          'Faisalabad', 'Peshawar', 'Quetta', 'Gujranwala', 'Sialkot'
        ]);
      }
    };
    
    fetchFilterOptions();
  }, []);
  
  // Extract unique cities from specialists
  useEffect(() => {
    if (allSpecialists.length > 0) {
      const uniqueCities = [...new Set(allSpecialists.map(s => s.city).filter(Boolean))].sort();
      if (uniqueCities.length > 0) {
        setCities(uniqueCities);
      }
    }
  }, [allSpecialists]);

  return (
    <div className={`appointment-system ${darkMode ? 'dark' : ''}`}>
      <div className="appointment-container">
      {/* Header */}
        <div className="appointment-header">
        <div className="header-content">
            <h1 className="appointment-title">
              Find Mental Health Specialists
            </h1>
            <p className="appointment-subtitle">
              Connect with qualified professionals who can help you on your mental health journey
            </p>
        </div>
      </div>

        {/* Search and Filters */}
        <div className="search-filters-section">
          <form onSubmit={handleSearch} className="search-form">
            <div className="search-input-group">
              <input
                type="text"
                placeholder="Search by name, specialty, or location..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              <button type="submit" className="search-button">
                Search
              </button>
            </div>
          </form>

          <div className="filters-section">
            <button 
              onClick={() => setShowFilters(!showFilters)}
              className="filters-toggle"
            >
              <Filter className="filter-icon" />
              Filters
              {showFilters ? <ChevronUp /> : <ChevronDown />}
            </button>
            
            <AnimatePresence>
      {showFilters && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: 'auto' }}
                  exit={{ opacity: 0, height: 0 }}
                  className="filters-panel"
                >
                  <div className="filters-grid">
                    <div className="filter-group">
                      <label className="filter-label">City</label>
                      <select
                        value={filters.city}
                        onChange={(e) => handleFilterChange('city', e.target.value)}
                        className="filter-select"
                      >
                        <option value="">All Cities</option>
                        {cities.map(city => (
                          <option key={city} value={city}>{city}</option>
                        ))}
                      </select>
          </div>
          
            <div className="filter-group">
                      <label className="filter-label">Specialization</label>
              <select 
                        value={filters.specializations[0] || ''}
                        onChange={(e) => handleFilterChange('specializations', e.target.value ? [e.target.value] : [])}
                className="filter-select"
              >
                        <option value="">All Specializations</option>
                        {specializations.map(spec => (
                          <option key={spec} value={spec}>{spec}</option>
                        ))}
              </select>
            </div>

            <div className="filter-group">
                      <label className="filter-label">Consultation Mode</label>
              <select 
                value={filters.consultation_mode}
                        onChange={(e) => handleFilterChange('consultation_mode', e.target.value)}
                className="filter-select"
              >
                        <option value="both">Both Online & In-Person</option>
                <option value="online">Online Only</option>
                <option value="in_person">In-Person Only</option>
              </select>
            </div>

            <div className="filter-group">
                      <label className="filter-label">Sort By</label>
              <select 
                value={filters.sort_by}
                        onChange={(e) => handleFilterChange('sort_by', e.target.value)}
                className="filter-select"
              >
                <option value="best_match">Best Match</option>
                <option value="rating">Highest Rated</option>
                        <option value="experience">Most Experienced</option>
                <option value="availability">Most Available</option>
              </select>
            </div>
          </div>

          <div className="filters-actions">
            <button 
                      onClick={handleClearFilters}
                      className="clear-filters-btn"
                    >
                      <X className="clear-icon" />
              Clear All Filters
            </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </div>

        {/* Results Section */}
        <div className="results-section">
      {loading && (
        <div className="loading-container">
              <GridSkeleton count={12} />
        </div>
      )}

      {error && (
            <ErrorState
              message={error}
              onRetry={() => loadSpecialists()}
              retryText="Try Again"
            />
          )}

      {!loading && !error && specialists.length === 0 && (
            <EmptyState
              icon={User}
              title="No Specialists Found"
              message="Try adjusting your search criteria or filters to find more results."
              actionText="Clear Filters"
              action={handleClearFilters}
            />
          )}

      {!loading && !error && specialists.length > 0 && (
            <div className="specialists-grid">
              <div className="results-header">
                <h3>Found {pagination.total} specialist{pagination.total !== 1 ? 's' : ''}</h3>
                {pagination.total_pages > 1 && (
                  <p className="results-subtitle">
                    Showing {((pagination.page - 1) * pagination.size) + 1} to {Math.min(pagination.page * pagination.size, pagination.total)} of {pagination.total}
                  </p>
                )}
              </div>
              <div className="specialists-cards-container">
                {specialists.map((specialist, index) => (
                  <SpecialistCard
                    key={specialist?.id || index}
                    specialist={specialist}
                    onSelect={handleSpecialistSelect}
                    onBook={() => handleSpecialistSelect(specialist)}
                    darkMode={darkMode}
                  />
                ))}
              </div>
            </div>
          )}
          </div>
          
        {/* Pagination Controls */}
        {!loading && !error && allSpecialists.length > 0 && pagination.total_pages > 1 && (
          renderPaginationControls()
        )}
            </div>
            
      {/* Booking Wizard Modal */}
        {showBookingWizard && selectedSpecialist && (
          <BookingWizard
            selectedSpecialist={selectedSpecialist}
            onClose={handleBookingClose}
            onBookingComplete={(success, data) => {
              if (success) {
                handleBookingClose();
                // Optionally refresh specialist list or show success message
              }
            }}
            darkMode={darkMode}
          />
        )}
    </div>
  );
};

export default FindSpecialists;