/**
 * Dashboard Utils - Utility Functions for Dashboard
 * ================================================
 * Common utility functions for dashboard functionality.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

// Format date for display
export const formatDate = (date, options = {}) => {
  const defaultOptions = {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit'
  };
  
  return new Date(date).toLocaleDateString('en-US', { ...defaultOptions, ...options });
};

// Format relative time
export const formatRelativeTime = (date) => {
  const now = new Date();
  const diff = now - new Date(date);
  const seconds = Math.floor(diff / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);
  
  if (days > 0) {
    return `${days} day${days > 1 ? 's' : ''} ago`;
  } else if (hours > 0) {
    return `${hours} hour${hours > 1 ? 's' : ''} ago`;
  } else if (minutes > 0) {
    return `${minutes} minute${minutes > 1 ? 's' : ''} ago`;
  } else {
    return 'Just now';
  }
};

// Format number with appropriate suffix
export const formatNumber = (num, precision = 1) => {
  if (num >= 1000000) {
    return (num / 1000000).toFixed(precision) + 'M';
  } else if (num >= 1000) {
    return (num / 1000).toFixed(precision) + 'K';
  }
  return num.toString();
};

// Format percentage
export const formatPercentage = (value, total, precision = 1) => {
  if (total === 0) return '0%';
  return ((value / total) * 100).toFixed(precision) + '%';
};

// Get color based on value
export const getValueColor = (value, thresholds = { low: 30, medium: 70 }) => {
  if (value < thresholds.low) return 'text-red-500';
  if (value < thresholds.medium) return 'text-yellow-500';
  return 'text-green-500';
};

// Get status color
export const getStatusColor = (status) => {
  const statusColors = {
    'completed': 'text-green-500',
    'pending': 'text-yellow-500',
    'cancelled': 'text-red-500',
    'in-progress': 'text-blue-500',
    'scheduled': 'text-purple-500'
  };
  
  return statusColors[status] || 'text-gray-500';
};

// Get priority color
export const getPriorityColor = (priority) => {
  const priorityColors = {
    1: 'text-red-500', // High
    2: 'text-orange-500', // Medium-High
    3: 'text-yellow-500', // Medium
    4: 'text-blue-500', // Low-Medium
    5: 'text-green-500' // Low
  };
  
  return priorityColors[priority] || 'text-gray-500';
};

// Calculate progress percentage
export const calculateProgress = (current, target) => {
  if (target === 0) return 0;
  return Math.min(100, Math.max(0, (current / target) * 100));
};

// Get progress color based on percentage
export const getProgressColor = (percentage) => {
  if (percentage < 30) return 'bg-red-500';
  if (percentage < 70) return 'bg-yellow-500';
  return 'bg-green-500';
};

// Generate random ID
export const generateId = () => {
  return Math.random().toString(36).substr(2, 9);
};

// Debounce function
export const debounce = (func, wait) => {
  let timeout;
  return function executedFunction(...args) {
    const later = () => {
      clearTimeout(timeout);
      func(...args);
    };
    clearTimeout(timeout);
    timeout = setTimeout(later, wait);
  };
};

// Throttle function
export const throttle = (func, limit) => {
  let inThrottle;
  return function executedFunction(...args) {
    if (!inThrottle) {
      func.apply(this, args);
      inThrottle = true;
      setTimeout(() => inThrottle = false, limit);
    }
  };
};

// Deep clone object
export const deepClone = (obj) => {
  if (obj === null || typeof obj !== 'object') return obj;
  if (obj instanceof Date) return new Date(obj.getTime());
  if (obj instanceof Array) return obj.map(item => deepClone(item));
  if (typeof obj === 'object') {
    const clonedObj = {};
    for (const key in obj) {
      if (obj.hasOwnProperty(key)) {
        clonedObj[key] = deepClone(obj[key]);
      }
    }
    return clonedObj;
  }
};

// Merge objects deeply
export const deepMerge = (target, source) => {
  const result = { ...target };
  
  for (const key in source) {
    if (source.hasOwnProperty(key)) {
      if (source[key] && typeof source[key] === 'object' && !Array.isArray(source[key])) {
        result[key] = deepMerge(result[key] || {}, source[key]);
      } else {
        result[key] = source[key];
      }
    }
  }
  
  return result;
};

// Validate email
export const isValidEmail = (email) => {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
};

// Validate URL
export const isValidUrl = (url) => {
  try {
    new URL(url);
    return true;
  } catch {
    return false;
  }
};

// Get initials from name
export const getInitials = (name) => {
  return name
    .split(' ')
    .map(word => word.charAt(0))
    .join('')
    .toUpperCase()
    .slice(0, 2);
};

// Capitalize first letter
export const capitalize = (str) => {
  return str.charAt(0).toUpperCase() + str.slice(1);
};

// Convert camelCase to Title Case
export const camelToTitle = (str) => {
  return str
    .replace(/([A-Z])/g, ' $1')
    .replace(/^./, str => str.toUpperCase())
    .trim();
};

// Get contrast color for background
export const getContrastColor = (hexColor) => {
  // Remove # if present
  const hex = hexColor.replace('#', '');
  
  // Convert to RGB
  const r = parseInt(hex.substr(0, 2), 16);
  const g = parseInt(hex.substr(2, 2), 16);
  const b = parseInt(hex.substr(4, 2), 16);
  
  // Calculate luminance
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
  
  return luminance > 0.5 ? '#000000' : '#FFFFFF';
};

// Generate gradient colors
export const generateGradient = (color1, color2, steps = 5) => {
  const colors = [];
  
  for (let i = 0; i < steps; i++) {
    const ratio = i / (steps - 1);
    const r = Math.round(parseInt(color1.slice(1, 3), 16) * (1 - ratio) + parseInt(color2.slice(1, 3), 16) * ratio);
    const g = Math.round(parseInt(color1.slice(3, 5), 16) * (1 - ratio) + parseInt(color2.slice(3, 5), 16) * ratio);
    const b = Math.round(parseInt(color1.slice(5, 7), 16) * (1 - ratio) + parseInt(color2.slice(5, 7), 16) * ratio);
    
    colors.push(`#${r.toString(16).padStart(2, '0')}${g.toString(16).padStart(2, '0')}${b.toString(16).padStart(2, '0')}`);
  }
  
  return colors;
};

// Check if value is empty
export const isEmpty = (value) => {
  if (value === null || value === undefined) return true;
  if (typeof value === 'string') return value.trim().length === 0;
  if (Array.isArray(value)) return value.length === 0;
  if (typeof value === 'object') return Object.keys(value).length === 0;
  return false;
};

// Safe JSON parse
export const safeJsonParse = (str, defaultValue = null) => {
  try {
    return JSON.parse(str);
  } catch {
    return defaultValue;
  }
};

// Safe JSON stringify
export const safeJsonStringify = (obj, defaultValue = '{}') => {
  try {
    return JSON.stringify(obj);
  } catch {
    return defaultValue;
  }
};

// Get file size in human readable format
export const formatFileSize = (bytes) => {
  if (bytes === 0) return '0 Bytes';
  
  const k = 1024;
  const sizes = ['Bytes', 'KB', 'MB', 'GB', 'TB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  
  return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
};

// Get timezone offset
export const getTimezoneOffset = () => {
  return new Date().getTimezoneOffset();
};

// Format timezone
export const formatTimezone = (date) => {
  return date.toLocaleString('en-US', {
    timeZoneName: 'short'
  });
};

export default {
  formatDate,
  formatRelativeTime,
  formatNumber,
  formatPercentage,
  getValueColor,
  getStatusColor,
  getPriorityColor,
  calculateProgress,
  getProgressColor,
  generateId,
  debounce,
  throttle,
  deepClone,
  deepMerge,
  isValidEmail,
  isValidUrl,
  getInitials,
  capitalize,
  camelToTitle,
  getContrastColor,
  generateGradient,
  isEmpty,
  safeJsonParse,
  safeJsonStringify,
  formatFileSize,
  getTimezoneOffset,
  formatTimezone
};
