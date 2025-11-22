/**
 * Toast Notification System
 * ========================
 * Toast notifications for success, error, warning, and info messages
 */

import React, { createContext, useContext, useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  CheckCircle, 
  XCircle, 
  AlertTriangle, 
  Info, 
  X 
} from 'react-feather';
import './Toast.css';

// Toast context
const ToastContext = createContext();

// Toast types
export const TOAST_TYPES = {
  SUCCESS: 'success',
  ERROR: 'error',
  WARNING: 'warning',
  INFO: 'info'
};

// Default toast configuration
const DEFAULT_CONFIG = {
  duration: 5000,
  position: 'top-right',
  maxToasts: 5,
  pauseOnHover: true
};

// Toast component
const Toast = ({ toast, onRemove }) => {
  const [isPaused, setIsPaused] = useState(false);

  useEffect(() => {
    if (!toast.persistent && !isPaused) {
      const timer = setTimeout(() => {
        onRemove(toast.id);
      }, toast.duration || DEFAULT_CONFIG.duration);

      return () => clearTimeout(timer);
    }
  }, [toast, isPaused, onRemove]);

  const handleMouseEnter = () => {
    if (DEFAULT_CONFIG.pauseOnHover) {
      setIsPaused(true);
    }
  };

  const handleMouseLeave = () => {
    if (DEFAULT_CONFIG.pauseOnHover) {
      setIsPaused(false);
    }
  };

  const getIcon = () => {
    switch (toast.type) {
      case TOAST_TYPES.SUCCESS:
        return <CheckCircle size={20} />;
      case TOAST_TYPES.ERROR:
        return <XCircle size={20} />;
      case TOAST_TYPES.WARNING:
        return <AlertTriangle size={20} />;
      case TOAST_TYPES.INFO:
        return <Info size={20} />;
      default:
        return <Info size={20} />;
    }
  };

  const getTitle = () => {
    if (toast.title) return toast.title;
    
    switch (toast.type) {
      case TOAST_TYPES.SUCCESS:
        return 'Success';
      case TOAST_TYPES.ERROR:
        return 'Error';
      case TOAST_TYPES.WARNING:
        return 'Warning';
      case TOAST_TYPES.INFO:
        return 'Information';
      default:
        return 'Notification';
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: -50, scale: 0.95 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -50, scale: 0.95 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className={`toast toast-${toast.type}`}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={handleMouseLeave}
    >
      <div className="toast-content">
        <div className="toast-icon">
          {getIcon()}
        </div>
        <div className="toast-body">
          <div className="toast-title">
            {getTitle()}
          </div>
          {toast.message && (
            <div className="toast-message">
              {toast.message}
            </div>
          )}
        </div>
        <button
          className="toast-close"
          onClick={() => onRemove(toast.id)}
          aria-label="Close notification"
        >
          <X size={16} />
        </button>
      </div>
      
      {!toast.persistent && (
        <div className="toast-progress">
          <motion.div
            className="toast-progress-bar"
            initial={{ width: '100%' }}
            animate={{ width: isPaused ? '100%' : '0%' }}
            transition={{ 
              duration: (toast.duration || DEFAULT_CONFIG.duration) / 1000,
              ease: "linear"
            }}
          />
        </div>
      )}
    </motion.div>
  );
};

// Toast container component
const ToastContainer = ({ toasts, onRemove }) => {
  return (
    <div className="toast-container">
      <AnimatePresence>
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            toast={toast}
            onRemove={onRemove}
          />
        ))}
      </AnimatePresence>
    </div>
  );
};

// Toast provider component
export const ToastProvider = ({ children, config = {} }) => {
  const [toasts, setToasts] = useState([]);
  const mergedConfig = { ...DEFAULT_CONFIG, ...config };

  const addToast = useCallback((toast) => {
    const id = Date.now().toString();
    const newToast = {
      id,
      type: TOAST_TYPES.INFO,
      duration: mergedConfig.duration,
      persistent: false,
      ...toast
    };

    setToasts(prev => {
      const updated = [...prev, newToast];
      // Limit number of toasts
      if (updated.length > mergedConfig.maxToasts) {
        return updated.slice(-mergedConfig.maxToasts);
      }
      return updated;
    });

    return id;
  }, [mergedConfig]);

  const removeToast = useCallback((id) => {
    setToasts(prev => prev.filter(toast => toast.id !== id));
  }, []);

  const clearAllToasts = useCallback(() => {
    setToasts([]);
  }, []);

  // Convenience methods
  const success = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.SUCCESS,
      message,
      ...options
    });
  }, [addToast]);

  const error = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.ERROR,
      message,
      ...options
    });
  }, [addToast]);

  const warning = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.WARNING,
      message,
      ...options
    });
  }, [addToast]);

  const info = useCallback((message, options = {}) => {
    return addToast({
      type: TOAST_TYPES.INFO,
      message,
      ...options
    });
  }, [addToast]);

  const value = {
    toasts,
    addToast,
    removeToast,
    clearAllToasts,
    success,
    error,
    warning,
    info
  };

  return (
    <ToastContext.Provider value={value}>
      {children}
      <ToastContainer toasts={toasts} onRemove={removeToast} />
    </ToastContext.Provider>
  );
};

// Hook to use toast
export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};

// Higher-order component for easy integration
export const withToast = (Component) => {
  return (props) => {
    const toast = useToast();
    return <Component {...props} toast={toast} />;
  };
};

export default ToastProvider;
