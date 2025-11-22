/**
 * Enhanced Loading States
 * ======================
 * Various loading state components for better UX
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Loader, RefreshCw, AlertCircle } from 'react-feather';
import './LoadingStates.css';

/**
 * Spinner component with different sizes
 */
const Spinner = ({ 
  size = 'medium', 
  color = 'primary', 
  className = '' 
}) => {
  const sizeClasses = {
    small: 'w-4 h-4',
    medium: 'w-6 h-6',
    large: 'w-8 h-8',
    xl: 'w-12 h-12'
  };

  const colorClasses = {
    primary: 'text-blue-600',
    secondary: 'text-gray-600',
    success: 'text-green-600',
    error: 'text-red-600',
    warning: 'text-yellow-600',
    white: 'text-white'
  };

  return (
    <motion.div
      className={`spinner ${sizeClasses[size]} ${colorClasses[color]} ${className}`}
      animate={{ rotate: 360 }}
      transition={{
        duration: 1,
        repeat: Infinity,
        ease: "linear"
      }}
    >
      <Loader size="100%" />
    </motion.div>
  );
};

/**
 * Button loading state
 */
const ButtonLoader = ({ 
  loading = false, 
  children, 
  loadingText = 'Loading...',
  className = ''
}) => {
  return (
    <motion.button
      className={`button-loader ${className}`}
      disabled={loading}
      whileHover={!loading ? { scale: 1.02 } : {}}
      whileTap={!loading ? { scale: 0.98 } : {}}
    >
      {loading ? (
        <div className="button-loader-content">
          <Spinner size="small" color="white" />
          <span>{loadingText}</span>
        </div>
      ) : (
        children
      )}
    </motion.button>
  );
};

/**
 * Page loading overlay
 */
const PageLoader = ({ 
  loading = false, 
  message = 'Loading...',
  children 
}) => {
  if (!loading) return children;

  return (
    <div className="page-loader-overlay">
      <motion.div
        className="page-loader-content"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        exit={{ opacity: 0, scale: 0.9 }}
        transition={{ duration: 0.3 }}
      >
        <Spinner size="xl" color="primary" />
        <p className="page-loader-message">{message}</p>
      </motion.div>
    </div>
  );
};

/**
 * Inline loading state
 */
const InlineLoader = ({ 
  loading = false, 
  children, 
  loadingText = 'Loading...',
  className = ''
}) => {
  if (!loading) return children;

  return (
    <div className={`inline-loader ${className}`}>
      <Spinner size="small" color="primary" />
      <span>{loadingText}</span>
    </div>
  );
};

/**
 * Card loading state
 */
const CardLoader = ({ 
  loading = false, 
  children, 
  className = '' 
}) => {
  if (!loading) return children;

  return (
    <div className={`card-loader ${className}`}>
      <div className="card-loader-content">
        <Spinner size="large" color="primary" />
        <p>Loading content...</p>
      </div>
    </div>
  );
};

/**
 * Table loading state
 */
const TableLoader = ({ 
  loading = false, 
  children, 
  rows = 5,
  className = '' 
}) => {
  if (!loading) return children;

  return (
    <div className={`table-loader ${className}`}>
      <div className="table-loader-header">
        <div className="table-loader-cell"></div>
        <div className="table-loader-cell"></div>
        <div className="table-loader-cell"></div>
        <div className="table-loader-cell"></div>
      </div>
      {Array.from({ length: rows }).map((_, index) => (
        <div key={index} className="table-loader-row">
          <div className="table-loader-cell"></div>
          <div className="table-loader-cell"></div>
          <div className="table-loader-cell"></div>
          <div className="table-loader-cell"></div>
        </div>
      ))}
    </div>
  );
};

/**
 * List loading state
 */
const ListLoader = ({ 
  loading = false, 
  children, 
  items = 3,
  className = '' 
}) => {
  if (!loading) return children;

  return (
    <div className={`list-loader ${className}`}>
      {Array.from({ length: items }).map((_, index) => (
        <div key={index} className="list-loader-item">
          <div className="list-loader-avatar"></div>
          <div className="list-loader-content">
            <div className="list-loader-line"></div>
            <div className="list-loader-line short"></div>
          </div>
        </div>
      ))}
    </div>
  );
};

/**
 * Error state component
 */
const ErrorState = ({ 
  error, 
  onRetry, 
  retryText = 'Try Again',
  className = '' 
}) => {
  return (
    <motion.div
      className={`error-state ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="error-state-content">
        <AlertCircle size={48} className="error-state-icon" />
        <h3 className="error-state-title">Something went wrong</h3>
        <p className="error-state-message">
          {error || 'An unexpected error occurred. Please try again.'}
        </p>
        {onRetry && (
          <motion.button
            className="error-state-retry"
            onClick={onRetry}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            <RefreshCw size={16} />
            {retryText}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Empty state component
 */
const EmptyState = ({ 
  title = 'No data found',
  message = 'There are no items to display at the moment.',
  action,
  actionText = 'Get Started',
  icon: Icon,
  className = '' 
}) => {
  return (
    <motion.div
      className={`empty-state ${className}`}
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="empty-state-content">
        {Icon && <Icon size={64} className="empty-state-icon" />}
        <h3 className="empty-state-title">{title}</h3>
        <p className="empty-state-message">{message}</p>
        {action && (
          <motion.button
            className="empty-state-action"
            onClick={action}
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            {actionText}
          </motion.button>
        )}
      </div>
    </motion.div>
  );
};

/**
 * Progress bar component
 */
const ProgressBar = ({ 
  progress = 0, 
  total = 100, 
  showPercentage = true,
  color = 'primary',
  className = '' 
}) => {
  const percentage = Math.min(Math.max((progress / total) * 100, 0), 100);

  return (
    <div className={`progress-bar ${className}`}>
      <div className="progress-bar-track">
        <motion.div
          className={`progress-bar-fill progress-bar-${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${percentage}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      {showPercentage && (
        <span className="progress-bar-text">
          {Math.round(percentage)}%
        </span>
      )}
    </div>
  );
};

/**
 * Loading dots animation
 */
const LoadingDots = ({ 
  size = 'medium', 
  color = 'primary',
  className = '' 
}) => {
  const sizeClasses = {
    small: 'loading-dots-small',
    medium: 'loading-dots-medium',
    large: 'loading-dots-large'
  };

  return (
    <div className={`loading-dots ${sizeClasses[size]} ${className}`}>
      <div className={`loading-dot loading-dot-${color}`}></div>
      <div className={`loading-dot loading-dot-${color}`}></div>
      <div className={`loading-dot loading-dot-${color}`}></div>
    </div>
  );
};

export {
  Spinner,
  ButtonLoader,
  PageLoader,
  InlineLoader,
  CardLoader,
  TableLoader,
  ListLoader,
  ErrorState,
  EmptyState,
  ProgressBar,
  LoadingDots
};

export default {
  Spinner,
  ButtonLoader,
  PageLoader,
  InlineLoader,
  CardLoader,
  TableLoader,
  ListLoader,
  ErrorState,
  EmptyState,
  ProgressBar,
  LoadingDots
};
