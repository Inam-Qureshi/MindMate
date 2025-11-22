// hooks/usePerformance.js
import { useMemo, useCallback, useRef, useEffect } from 'react';

/**
 * Hook for memoizing expensive computations
 * @param {Function} computeFunction - Function to compute the value
 * @param {Array} dependencies - Dependencies for the computation
 * @returns {any} Memoized computed value
 */
export const useMemoizedComputation = (computeFunction, dependencies) => {
  return useMemo(() => {
    const startTime = performance.now();
    const result = computeFunction();
    const endTime = performance.now();

    // Log slow computations (over 16ms = 1 frame at 60fps)
    if (endTime - startTime > 16) {
      console.warn(`Slow computation detected: ${(endTime - startTime).toFixed(2)}ms`, {
        dependencies,
        result: typeof result === 'object' ? '[Object]' : result
      });
    }

    return result;
  }, dependencies);
};

/**
 * Hook for debounced callbacks to prevent excessive re-renders
 * @param {Function} callback - Function to debounce
 * @param {number} delay - Delay in milliseconds
 * @param {Array} dependencies - Dependencies for the callback
 * @returns {Function} Debounced callback function
 */
export const useDebouncedCallback = (callback, delay = 300, dependencies = []) => {
  const timeoutRef = useRef(null);
  const callbackRef = useRef(callback);

  // Update callback ref when dependencies change
  useEffect(() => {
    callbackRef.current = callback;
  }, dependencies);

  const debouncedCallback = useCallback((...args) => {
    if (timeoutRef.current) {
      clearTimeout(timeoutRef.current);
    }

    timeoutRef.current = setTimeout(() => {
      callbackRef.current(...args);
    }, delay);
  }, [delay]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }
    };
  }, []);

  return debouncedCallback;
};

/**
 * Hook for throttled callbacks
 * @param {Function} callback - Function to throttle
 * @param {number} delay - Delay in milliseconds
 * @returns {Function} Throttled callback function
 */
export const useThrottledCallback = (callback, delay = 300) => {
  const lastCallRef = useRef(0);
  const timeoutRef = useRef(null);

  return useCallback((...args) => {
    const now = Date.now();
    const timeSinceLastCall = now - lastCallRef.current;

    if (timeSinceLastCall >= delay) {
      lastCallRef.current = now;
      callback(...args);
    } else {
      // Schedule the call for when the delay period ends
      if (timeoutRef.current) {
        clearTimeout(timeoutRef.current);
      }

      timeoutRef.current = setTimeout(() => {
        lastCallRef.current = Date.now();
        callback(...args);
      }, delay - timeSinceLastCall);
    }
  }, [callback, delay]);
};

/**
 * Hook for lazy loading with intersection observer
 * @param {Object} options - IntersectionObserver options
 * @returns {Object} { ref, isIntersecting, hasIntersected }
 */
export const useLazyLoad = (options = {}) => {
  const [isIntersecting, setIsIntersecting] = useState(false);
  const [hasIntersected, setHasIntersected] = useState(false);
  const ref = useRef(null);

  const defaultOptions = {
    threshold: 0.1,
    rootMargin: '50px',
    ...options
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
        if (entry.isIntersecting && !hasIntersected) {
          setHasIntersected(true);
        }
      },
      defaultOptions
    );

    observer.observe(element);

    return () => {
      observer.unobserve(element);
    };
  }, [hasIntersected, defaultOptions.threshold, defaultOptions.rootMargin]);

  return { ref, isIntersecting, hasIntersected };
};

/**
 * Hook for measuring component render performance
 * @param {string} componentName - Name of the component for logging
 * @returns {Object} { renderCount, avgRenderTime, lastRenderTime }
 */
export const useRenderPerformance = (componentName = 'Component') => {
  const renderCountRef = useRef(0);
  const renderTimesRef = useRef([]);
  const lastRenderStartRef = useRef(performance.now());

  renderCountRef.current += 1;
  const currentRenderStart = performance.now();

  // Calculate time since last render start
  const timeSinceLastRender = currentRenderStart - lastRenderStartRef.current;
  lastRenderStartRef.current = currentRenderStart;

  // Track render times (keep last 10)
  renderTimesRef.current.push(timeSinceLastRender);
  if (renderTimesRef.current.length > 10) {
    renderTimesRef.current.shift();
  }

  const avgRenderTime = renderTimesRef.current.reduce((a, b) => a + b, 0) / renderTimesRef.current.length;

  // Log performance warnings
  useEffect(() => {
    if (renderCountRef.current > 1 && timeSinceLastRender > 16) {
      console.warn(`${componentName} slow render: ${timeSinceLastRender.toFixed(2)}ms (avg: ${avgRenderTime.toFixed(2)}ms)`);
    }
  });

  return {
    renderCount: renderCountRef.current,
    avgRenderTime,
    lastRenderTime: timeSinceLastRender
  };
};

/**
 * Hook for stable callbacks that don't change on every render
 * @param {Function} callback - The callback function
 * @param {Array} dependencies - Dependencies for the callback
 * @returns {Function} Stable callback function
 */
export const useStableCallback = (callback, dependencies = []) => {
  const callbackRef = useRef(callback);

  useEffect(() => {
    callbackRef.current = callback;
  }, dependencies);

  return useCallback((...args) => {
    return callbackRef.current(...args);
  }, []);
};

/**
 * Hook for component lifecycle performance monitoring
 * @param {string} componentName - Name for logging
 * @returns {Object} Performance metrics
 */
export const useLifecyclePerformance = (componentName = 'Component') => {
  const mountTimeRef = useRef(performance.now());
  const renderCountRef = useRef(0);
  const lastRenderTimeRef = useRef(performance.now());

  renderCountRef.current += 1;

  const currentTime = performance.now();
  const timeSinceLastRender = currentTime - lastRenderTimeRef.current;
  lastRenderTimeRef.current = currentTime;

  // Log slow renders
  if (timeSinceLastRender > 16) {
    console.warn(`${componentName} render took ${timeSinceLastRender.toFixed(2)}ms`);
  }

  useEffect(() => {
    const mountDuration = performance.now() - mountTimeRef.current;
    console.log(`${componentName} mounted in ${mountDuration.toFixed(2)}ms`);

    return () => {
      const unmountTime = performance.now();
      const totalLifetime = unmountTime - mountTimeRef.current;
      console.log(`${componentName} unmounted after ${totalLifetime.toFixed(2)}ms lifetime`);
    };
  }, [componentName]);

  return {
    renderCount: renderCountRef.current,
    timeSinceLastRender,
    mountTime: mountTimeRef.current
  };
};
