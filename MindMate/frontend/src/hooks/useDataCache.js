// hooks/useDataCache.js
import { useState, useEffect, useCallback, useRef } from 'react';

/**
 * Simple in-memory cache with TTL (Time To Live)
 */
class MemoryCache {
  constructor() {
    this.cache = new Map();
  }

  set(key, value, ttlMs = 5 * 60 * 1000) { // Default 5 minutes TTL
    const expiresAt = Date.now() + ttlMs;
    this.cache.set(key, { value, expiresAt });
  }

  get(key) {
    const item = this.cache.get(key);
    if (!item) return null;

    if (Date.now() > item.expiresAt) {
      this.cache.delete(key);
      return null;
    }

    return item.value;
  }

  delete(key) {
    return this.cache.delete(key);
  }

  clear() {
    this.cache.clear();
  }

  size() {
    // Clean expired items
    for (const [key, item] of this.cache.entries()) {
      if (Date.now() > item.expiresAt) {
        this.cache.delete(key);
      }
    }
    return this.cache.size;
  }
}

// Global cache instance
const globalCache = new MemoryCache();

/**
 * Hook for data caching with automatic invalidation
 * @param {string} cacheKey - Unique key for the cached data
 * @param {Function} fetchFunction - Function to fetch fresh data
 * @param {number} ttlMs - Time to live in milliseconds (default: 5 minutes)
 * @param {Array} dependencies - Dependencies that should invalidate cache
 * @returns {Object} { data, loading, error, refetch, invalidateCache }
 */
export const useDataCache = (cacheKey, fetchFunction, ttlMs = 5 * 60 * 1000, dependencies = []) => {
  const [data, setData] = useState(() => globalCache.get(cacheKey));
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const mountedRef = useRef(true);

  const fetchData = useCallback(async (skipCache = false) => {
    if (!mountedRef.current) return;

    try {
      setLoading(true);
      setError(null);

      let result;

      if (!skipCache) {
        result = globalCache.get(cacheKey);
        if (result) {
          setData(result);
          setLoading(false);
          return result;
        }
      }

      result = await fetchFunction();
      globalCache.set(cacheKey, result, ttlMs);

      if (mountedRef.current) {
        setData(result);
      }

      return result;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to fetch data');
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [cacheKey, fetchFunction, ttlMs]);

  const refetch = useCallback(() => {
    return fetchData(true);
  }, [fetchData]);

  const invalidateCache = useCallback(() => {
    globalCache.delete(cacheKey);
  }, [cacheKey]);

  // Initial fetch or refetch when dependencies change
  useEffect(() => {
    mountedRef.current = true;
    fetchData();

    return () => {
      mountedRef.current = false;
    };
  }, dependencies);

  return {
    data,
    loading,
    error,
    refetch,
    invalidateCache
  };
};

/**
 * Hook for debounced search/filter operations
 * @param {Function} searchFunction - The search function to debounce
 * @param {number} delayMs - Debounce delay in milliseconds (default: 300ms)
 * @returns {Object} { search, loading, results, error }
 */
export const useDebouncedSearch = (searchFunction, delayMs = 300) => {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const timeoutRef = useRef(null);
  const mountedRef = useRef(true);

  const search = useCallback((searchQuery) => {
    setQuery(searchQuery);

    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setResults(null);
      setLoading(false);
      setError(null);
      return;
    }

    setLoading(true);
    setError(null);

    timeoutRef.current = setTimeout(async () => {
      try {
        const searchResults = await searchFunction(searchQuery);
        if (mountedRef.current) {
          setResults(searchResults);
        }
      } catch (err) {
        if (mountedRef.current) {
          setError(err.message || 'Search failed');
        }
      } finally {
        if (mountedRef.current) {
          setLoading(false);
        }
      }
    }, delayMs);
  }, [searchFunction, delayMs]);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return {
    query,
    search,
    results,
    loading,
    error
  };
};

/**
 * Hook for pagination with caching
 * @param {Function} fetchPageFunction - Function to fetch a specific page
 * @param {number} pageSize - Number of items per page
 * @param {string} cachePrefix - Prefix for cache keys
 * @returns {Object} { data, loading, error, loadPage, currentPage, hasNextPage, hasPrevPage }
 */
export const usePaginationCache = (fetchPageFunction, pageSize = 20, cachePrefix = 'page') => {
  const [currentPage, setCurrentPage] = useState(1);
  const [data, setData] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [totalPages, setTotalPages] = useState(0);
  const mountedRef = useRef(true);

  const loadPage = useCallback(async (page = 1, forceRefresh = false) => {
    if (!mountedRef.current) return;

    const cacheKey = `${cachePrefix}_${page}_${pageSize}`;

    try {
      setLoading(true);
      setError(null);

      let pageData;

      if (!forceRefresh) {
        pageData = globalCache.get(cacheKey);
        if (pageData) {
          if (mountedRef.current) {
            setData(pageData.items);
            setTotalPages(pageData.totalPages);
            setCurrentPage(page);
          }
          setLoading(false);
          return pageData.items;
        }
      }

      pageData = await fetchPageFunction(page, pageSize);
      globalCache.set(cacheKey, pageData, 10 * 60 * 1000); // 10 minutes TTL

      if (mountedRef.current) {
        setData(pageData.items);
        setTotalPages(pageData.totalPages);
        setCurrentPage(page);
      }

      return pageData.items;
    } catch (err) {
      if (mountedRef.current) {
        setError(err.message || 'Failed to load page');
      }
      throw err;
    } finally {
      if (mountedRef.current) {
        setLoading(false);
      }
    }
  }, [fetchPageFunction, pageSize, cachePrefix]);

  const nextPage = useCallback(() => {
    if (currentPage < totalPages) {
      loadPage(currentPage + 1);
    }
  }, [currentPage, totalPages, loadPage]);

  const prevPage = useCallback(() => {
    if (currentPage > 1) {
      loadPage(currentPage - 1);
    }
  }, [currentPage, loadPage]);

  useEffect(() => {
    mountedRef.current = true;
    loadPage(1);

    return () => {
      mountedRef.current = false;
    };
  }, []);

  return {
    data,
    loading,
    error,
    loadPage,
    currentPage,
    totalPages,
    hasNextPage: currentPage < totalPages,
    hasPrevPage: currentPage > 1,
    nextPage,
    prevPage
  };
};
