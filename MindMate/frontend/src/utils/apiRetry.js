/**
 * API Retry Mechanism
 * ===================
 * Intelligent retry logic for failed API calls
 * Implements exponential backoff and circuit breaker patterns
 */

import { APIErrorHandler } from './errorHandler';

/**
 * Retry configuration
 */
export const RetryConfig = {
  maxRetries: 3,
  baseDelay: 1000, // 1 second
  maxDelay: 10000, // 10 seconds
  backoffMultiplier: 2,
  jitter: true, // Add random jitter to prevent thundering herd
  retryableStatusCodes: [408, 429, 500, 502, 503, 504],
  retryableErrors: ['NETWORK_ERROR', 'ECONNABORTED', 'timeout']
};

/**
 * Circuit breaker configuration
 */
export const CircuitBreakerConfig = {
  failureThreshold: process.env.NODE_ENV === 'development' ? 10 : 5, // More lenient in development
  recoveryTimeout: process.env.NODE_ENV === 'development' ? 10000 : 30000, // 10s in dev, 30s in prod
  monitoringPeriod: 60000 // 1 minute monitoring period
};

/**
 * Circuit breaker states
 */
export const CircuitBreakerStates = {
  CLOSED: 'CLOSED',     // Normal operation
  OPEN: 'OPEN',         // Circuit is open, requests are blocked
  HALF_OPEN: 'HALF_OPEN' // Testing if service has recovered
};

/**
 * Circuit breaker class
 */
class CircuitBreaker {
  constructor(config = CircuitBreakerConfig) {
    this.config = config;
    this.state = CircuitBreakerStates.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
  }
  
  canExecute() {
    const now = Date.now();
    
    switch (this.state) {
      case CircuitBreakerStates.CLOSED:
        return true;
        
      case CircuitBreakerStates.OPEN:
        if (now >= this.nextAttemptTime) {
          this.state = CircuitBreakerStates.HALF_OPEN;
          return true;
        }
        return false;
        
      case CircuitBreakerStates.HALF_OPEN:
        return true;
        
      default:
        return false;
    }
  }
  
  onSuccess() {
    this.failureCount = 0;
    this.state = CircuitBreakerStates.CLOSED;
  }
  
  onFailure() {
    this.failureCount++;
    this.lastFailureTime = Date.now();
    
    if (this.failureCount >= this.config.failureThreshold) {
      this.state = CircuitBreakerStates.OPEN;
      this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
      console.warn(`Circuit breaker opened for service. Failures: ${this.failureCount}/${this.config.failureThreshold}`);
    } else {
      console.debug(`Circuit breaker failure count: ${this.failureCount}/${this.config.failureThreshold}`);
    }
  }
  
  onHalfOpenSuccess() {
    // Success in half-open state means service recovered
    this.state = CircuitBreakerStates.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    console.log('Circuit breaker closed - service recovered');
  }
  
  onHalfOpenFailure() {
    // Failure in half-open state means service still down
    this.state = CircuitBreakerStates.OPEN;
    this.nextAttemptTime = Date.now() + this.config.recoveryTimeout;
    console.warn('Circuit breaker remains open - service still unavailable');
  }
  
  reset() {
    this.state = CircuitBreakerStates.CLOSED;
    this.failureCount = 0;
    this.lastFailureTime = null;
    this.nextAttemptTime = null;
    console.log('Circuit breaker manually reset');
  }
  
  getState() {
    return {
      state: this.state,
      failureCount: this.failureCount,
      lastFailureTime: this.lastFailureTime,
      nextAttemptTime: this.nextAttemptTime
    };
  }
}

/**
 * Retry manager class
 */
class RetryManager {
  constructor() {
    this.circuitBreakers = new Map();
  }
  
  getCircuitBreaker(serviceName) {
    if (!this.circuitBreakers.has(serviceName)) {
      this.circuitBreakers.set(serviceName, new CircuitBreaker());
    }
    return this.circuitBreakers.get(serviceName);
  }
  
  /**
   * Calculate retry delay with exponential backoff and jitter
   */
  calculateDelay(attempt, baseDelay = RetryConfig.baseDelay) {
    let delay = baseDelay * Math.pow(RetryConfig.backoffMultiplier, attempt - 1);
    delay = Math.min(delay, RetryConfig.maxDelay);
    
    if (RetryConfig.jitter) {
      // Add random jitter (±25% of delay)
      const jitter = delay * 0.25 * (Math.random() * 2 - 1);
      delay += jitter;
    }
    
    return Math.max(0, delay);
  }
  
  /**
   * Check if error is retryable
   */
  isRetryableError(error) {
    // Check status codes
    if (error.response?.status && RetryConfig.retryableStatusCodes.includes(error.response.status)) {
      return true;
    }
    
    // Check error codes
    if (error.code && RetryConfig.retryableErrors.includes(error.code)) {
      return true;
    }
    
    // Check error messages
    if (error.message) {
      const message = error.message.toLowerCase();
      if (message.includes('timeout') || message.includes('network') || message.includes('connection')) {
        return true;
      }
    }
    
    return false;
  }
  
  /**
   * Sleep utility
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }
}

// Global retry manager instance
const retryManager = new RetryManager();

/**
 * Retry API call with exponential backoff
 */
export const retryAPI = async (
  apiCall,
  options = {
    maxRetries: RetryConfig.maxRetries,
    baseDelay: RetryConfig.baseDelay,
    serviceName: 'default',
    onRetry: null,
    onFailure: null
  }
) => {
  const { maxRetries, baseDelay, serviceName, onRetry, onFailure } = options;
  const circuitBreaker = retryManager.getCircuitBreaker(serviceName);
  
  // Check circuit breaker - provide better error message and allow manual reset
  if (!circuitBreaker.canExecute()) {
    const error = new Error(
      `Circuit breaker is open for service: ${serviceName}. ` +
      `The service has experienced too many failures. ` +
      `Please wait ${Math.ceil((circuitBreaker.nextAttemptTime - Date.now()) / 1000)} seconds before retrying, ` +
      `or refresh the page to reset.`
    );
    error.code = 'CIRCUIT_BREAKER_OPEN';
    error.serviceName = serviceName;
    error.nextAttemptTime = circuitBreaker.nextAttemptTime;
    console.warn('Circuit breaker is open:', {
      serviceName,
      state: circuitBreaker.state,
      failureCount: circuitBreaker.failureCount,
      nextAttemptTime: new Date(circuitBreaker.nextAttemptTime).toISOString()
    });
    
    // In development, automatically reset after a shorter timeout
    if (process.env.NODE_ENV === 'development') {
      console.warn('Development mode: Circuit breaker will auto-reset after 5 seconds');
      setTimeout(() => {
        circuitBreaker.reset();
        console.log('Circuit breaker auto-reset in development mode');
      }, 5000);
    }
    
    throw error;
  }
  
  let lastError;
  
  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      console.log(`Retry attempt ${attempt}/${maxRetries}`);
      
      // Ensure apiCall is a function
      if (typeof apiCall !== 'function') {
        console.error('API call is not a function:', apiCall);
        throw new Error('API call must be a function');
      }
      
      console.log('Calling API function...');
      const result = await apiCall();
      console.log('API call result:', result);
      
      // Check if result is valid
      if (result === undefined || result === null) {
        console.error('API call returned undefined or null result');
        throw new Error('API call returned undefined or null result');
      }
      
      console.log('API call successful, returning result');
      
      // Handle circuit breaker state based on current state
      if (circuitBreaker.state === CircuitBreakerStates.HALF_OPEN) {
        circuitBreaker.onHalfOpenSuccess();
      } else {
        circuitBreaker.onSuccess();
      }
      
      return result;
    } catch (error) {
      console.log(`Error in attempt ${attempt}:`, error);
      console.log('Error details:', {
        error,
        type: typeof error,
        message: error?.message,
        stack: error?.stack,
        response: error?.response,
        request: error?.request
      });
      
      // Ensure we have a valid error object
      if (!error) {
        console.error('Received undefined error in retry mechanism');
        // Create an error that mimics AxiosError structure
        const undefinedError = new Error('Undefined error occurred during API call');
        undefinedError.isAxiosError = false;
        undefinedError.response = null;
        undefinedError.request = null;
        lastError = undefinedError;
        circuitBreaker.onFailure();
        throw undefinedError;
      }
      
      // Preserve AxiosError structure if it exists
      // This ensures error handlers can access error.response, error.request, etc.
      if (error.isAxiosError || error.response || error.request) {
        // It's already an AxiosError, preserve it as-is
        lastError = error;
      } else {
        // It's a plain Error, wrap it to preserve structure
        // Attach response/request if available
        const preservedError = error;
        if (!preservedError.isAxiosError) {
          preservedError.isAxiosError = false;
        }
        lastError = preservedError;
      }
      
      // Check if error is retryable
      const isRetryable = retryManager.isRetryableError(error);
      
      // Update circuit breaker state based on error type
      // Only count server errors (5xx) and timeouts, not client errors (4xx)
      const isServerError = error.response?.status >= 500 || 
                           error.response?.status === 408 || // Request timeout
                           error.response?.status === 429;   // Too many requests
      const shouldUpdateCircuitBreaker = isServerError || isRetryable;
      
      if (shouldUpdateCircuitBreaker) {
        if (circuitBreaker.state === CircuitBreakerStates.HALF_OPEN) {
          circuitBreaker.onHalfOpenFailure();
        } else {
          circuitBreaker.onFailure();
        }
      }
      
      // If error is not retryable, throw immediately
      if (!isRetryable) {
        console.log('Error is not retryable, throwing immediately');
        throw error;
      }
      
      // If this is the last attempt, throw the error
      if (attempt === maxRetries) {
        console.log('Last attempt reached, throwing error');
        if (onFailure) onFailure(error, attempt);
        throw error;
      }
      
      // Calculate delay and wait
      const delay = retryManager.calculateDelay(attempt, baseDelay);
      console.log(`Waiting ${delay}ms before retry...`);
      
      if (onRetry) {
        onRetry(error, attempt, delay);
      }
      
      await retryManager.sleep(delay);
    }
  }
  
  // If we exit the loop without returning, all retries failed
  // This should never happen as we throw inside the loop, but handle gracefully
  if (lastError) {
    // Ensure error has proper structure before throwing
    if (!lastError.isAxiosError && !lastError.response && !lastError.request) {
      // Wrap in a structure that error handlers can process
      const wrappedError = new Error(lastError.message || 'All retry attempts failed');
      wrappedError.originalError = lastError;
      wrappedError.isAxiosError = false;
      wrappedError.response = lastError.response || null;
      wrappedError.request = lastError.request || null;
      wrappedError.code = lastError.code;
      wrappedError.config = lastError.config;
      throw wrappedError;
    }
    throw lastError;
  }
  
  // Fallback: should never reach here, but create a proper error structure
  const fallbackError = new Error('All retry attempts failed without a proper error object');
  fallbackError.isAxiosError = false;
  fallbackError.response = null;
  fallbackError.request = null;
  fallbackError.code = 'RETRY_FAILED';
  throw fallbackError;
};

/**
 * Retry specific API operations
 */
export const retryOperations = {
  /**
   * Retry specialist search
   */
  searchSpecialists: async (apiCall, options = {}) => {
    try {
      // Ensure apiCall is a function that returns a Promise
      if (typeof apiCall !== 'function') {
        throw new Error('apiCall must be a function that returns a Promise');
      }
      
      return await retryAPI(apiCall, {
        serviceName: 'specialists',
        maxRetries: options.maxRetries || RetryConfig.maxRetries,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying specialist search (attempt ${attempt}/${options.maxRetries || RetryConfig.maxRetries}) in ${delay}ms`);
          if (options.onRetry) options.onRetry(error, attempt, delay);
        },
        onFailure: (error, attempt) => {
          console.error(`Specialist search failed after ${attempt} attempts:`, error);
          if (options.onFailure) options.onFailure(error, attempt);
        },
        ...options
      });
    } catch (error) {
      // Ensure error is properly structured before rethrowing
      if (!error.isAxiosError && !error.response && !error.request) {
        // Wrap error to preserve structure
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        wrappedError.isAxiosError = false;
        wrappedError.originalError = error;
        throw wrappedError;
      }
      throw error;
    }
  },
  
  /**
   * Retry appointment booking
   */
  bookAppointment: async (apiCall, options = {}) => {
    try {
      if (typeof apiCall !== 'function') {
        throw new Error('apiCall must be a function that returns a Promise');
      }
      
      const maxRetries = options.maxRetries !== undefined ? options.maxRetries : 2;
      
      return await retryAPI(apiCall, {
        serviceName: 'appointments',
        maxRetries: maxRetries,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying appointment booking (attempt ${attempt}/${maxRetries}) in ${delay}ms`);
          if (options.onRetry) options.onRetry(error, attempt, delay);
        },
        onFailure: (error, attempt) => {
          console.error(`Appointment booking failed after ${attempt} attempts:`, error);
          if (options.onFailure) options.onFailure(error, attempt);
        },
        ...options
      });
    } catch (error) {
      if (!error.isAxiosError && !error.response && !error.request) {
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        wrappedError.isAxiosError = false;
        wrappedError.originalError = error;
        throw wrappedError;
      }
      throw error;
    }
  },
  
  /**
   * Retry slot fetching
   */
  fetchSlots: async (apiCall, options = {}) => {
    try {
      if (typeof apiCall !== 'function') {
        throw new Error('apiCall must be a function that returns a Promise');
      }
      
      return await retryAPI(apiCall, {
        serviceName: 'slots',
        maxRetries: options.maxRetries || RetryConfig.maxRetries,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying slot fetch (attempt ${attempt}/${options.maxRetries || RetryConfig.maxRetries}) in ${delay}ms`);
          if (options.onRetry) options.onRetry(error, attempt, delay);
        },
        onFailure: (error, attempt) => {
          console.error(`Slot fetch failed after ${attempt} attempts:`, error);
          if (options.onFailure) options.onFailure(error, attempt);
        },
        ...options
      });
    } catch (error) {
      if (!error.isAxiosError && !error.response && !error.request) {
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        wrappedError.isAxiosError = false;
        wrappedError.originalError = error;
        throw wrappedError;
      }
      throw error;
    }
  },
  
  /**
   * Retry appointment management operations
   */
  manageAppointment: async (apiCall, options = {}) => {
    try {
      if (typeof apiCall !== 'function') {
        throw new Error('apiCall must be a function that returns a Promise');
      }
      
      return await retryAPI(apiCall, {
        serviceName: 'appointments',
        maxRetries: options.maxRetries || RetryConfig.maxRetries,
        onRetry: (error, attempt, delay) => {
          console.log(`Retrying appointment operation (attempt ${attempt}/${options.maxRetries || RetryConfig.maxRetries}) in ${delay}ms`);
          if (options.onRetry) options.onRetry(error, attempt, delay);
        },
        onFailure: (error, attempt) => {
          console.error(`Appointment operation failed after ${attempt} attempts:`, error);
          if (options.onFailure) options.onFailure(error, attempt);
        },
        ...options
      });
    } catch (error) {
      if (!error.isAxiosError && !error.response && !error.request) {
        const wrappedError = error instanceof Error ? error : new Error(String(error));
        wrappedError.isAxiosError = false;
        wrappedError.originalError = error;
        throw wrappedError;
      }
      throw error;
    }
  }
};

/**
 * Retry with user feedback
 */
export const retryWithFeedback = async (
  apiCall,
  options = {
    operationName: 'API call',
    onProgress: null,
    onSuccess: null,
    onError: null
  }
) => {
  const { operationName, onProgress, onSuccess, onError } = options;
  
  try {
    const result = await retryAPI(apiCall, {
      onRetry: (error, attempt, delay) => {
        if (onProgress) {
          onProgress({
            type: 'retry',
            message: `${operationName} failed, retrying in ${Math.round(delay / 1000)}s... (${attempt}/${RetryConfig.maxRetries})`,
            attempt,
            delay
          });
        }
      },
      onFailure: (error, attempt) => {
        if (onError) {
          onError({
            type: 'failure',
            message: `${operationName} failed after ${attempt} attempts`,
            error,
            attempt
          });
        }
      }
    });
    
    if (onSuccess) {
      onSuccess({
        type: 'success',
        message: `${operationName} completed successfully`,
        result
      });
    }
    
    return result;
  } catch (error) {
    if (onError) {
      onError({
        type: 'error',
        message: `${operationName} failed: ${error.message}`,
        error
      });
    }
    throw error;
  }
};

/**
 * Reset circuit breaker for a service
 */
export const resetCircuitBreaker = (serviceName) => {
  const circuitBreaker = retryManager.getCircuitBreaker(serviceName);
  circuitBreaker.reset();
  console.log(`Circuit breaker reset for service: ${serviceName}`);
};

/**
 * Get circuit breaker status
 */
export const getCircuitBreakerStatus = (serviceName) => {
  const circuitBreaker = retryManager.getCircuitBreaker(serviceName);
  return {
    state: circuitBreaker.state,
    failureCount: circuitBreaker.failureCount,
    lastFailureTime: circuitBreaker.lastFailureTime,
    nextAttemptTime: circuitBreaker.nextAttemptTime
  };
};

export default retryAPI;
