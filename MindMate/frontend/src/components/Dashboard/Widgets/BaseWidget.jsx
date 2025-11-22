/**
 * Base Widget Component - Foundation for All Dashboard Widgets
 * ==========================================================
 * Provides common functionality and styling for all dashboard widgets.
 * 
 * Features:
 * - Consistent styling and layout
 * - Loading and error states
 * - Widget actions (refresh, customize, etc.)
 * - Responsive design
 * - Accessibility support
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  RefreshCw, 
  Settings, 
  MoreVertical, 
  X,
  Maximize2,
  Minimize2
} from 'react-feather';
import './BaseWidget.css';

const BaseWidget = ({
  id,
  title,
  subtitle,
  children,
  loading = false,
  error = null,
  onRefresh,
  onCustomize,
  onRemove,
  onToggleSize,
  isExpanded = false,
  canExpand = false,
  canRemove = true,
  canCustomize = true,
  className = '',
  darkMode = false,
  size = 'medium',
  ...props
}) => {
  const [isHovered, setIsHovered] = useState(false);
  const [showActions, setShowActions] = useState(false);

  // Handle refresh
  const handleRefresh = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (err) {
        console.error(`Error refreshing widget ${id}:`, err);
      }
    }
  };

  // Handle customize
  const handleCustomize = () => {
    if (onCustomize) {
      onCustomize(id);
    }
  };

  // Handle remove
  const handleRemove = () => {
    if (onRemove) {
      onRemove(id);
    }
  };

  // Handle toggle size
  const handleToggleSize = () => {
    if (onToggleSize) {
      onToggleSize(id, !isExpanded);
    }
  };

  // Get widget size classes
  const getSizeClasses = () => {
    const sizeClasses = {
      small: 'widget-small',
      medium: 'widget-medium',
      large: 'widget-large',
      full: 'widget-full'
    };
    return sizeClasses[size] || sizeClasses.medium;
  };

  // Widget variants for animation
  const widgetVariants = {
    hidden: { opacity: 0, y: 20, scale: 0.95 },
    visible: { 
      opacity: 1, 
      y: 0, 
      scale: 1,
      transition: { duration: 0.3, ease: "easeOut" }
    },
    hover: { 
      y: -2, 
      scale: 1.02,
      transition: { duration: 0.2 }
    }
  };

  return (
    <motion.div
      className={`base-widget ${getSizeClasses()} ${className} ${darkMode ? 'dark' : ''}`}
      variants={widgetVariants}
      initial="hidden"
      animate="visible"
      whileHover="hover"
      onHoverStart={() => setIsHovered(true)}
      onHoverEnd={() => setIsHovered(false)}
      {...props}
    >
      {/* Widget Header */}
      <div className="widget-header">
        <div className="widget-title-section">
          <h3 className="widget-title">{title}</h3>
          {subtitle && (
            <p className="widget-subtitle">{subtitle}</p>
          )}
        </div>
        
        <div className="widget-actions">
          {/* Refresh Button */}
          <button
            className={`widget-action ${loading ? 'loading' : ''}`}
            onClick={handleRefresh}
            disabled={loading}
            title="Refresh"
          >
            <RefreshCw size={16} />
          </button>

          {/* Expand/Collapse Button */}
          {canExpand && (
            <button
              className="widget-action"
              onClick={handleToggleSize}
              title={isExpanded ? "Collapse" : "Expand"}
            >
              {isExpanded ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
            </button>
          )}

          {/* More Actions Button */}
          <div className="widget-more-actions">
            <button
              className="widget-action"
              onClick={() => setShowActions(!showActions)}
              title="More actions"
            >
              <MoreVertical size={16} />
            </button>
            
            {showActions && (
              <div className="widget-actions-menu">
                {canCustomize && (
                  <button
                    className="widget-menu-item"
                    onClick={handleCustomize}
                  >
                    <Settings size={14} />
                    Customize
                  </button>
                )}
                {canRemove && (
                  <button
                    className="widget-menu-item danger"
                    onClick={handleRemove}
                  >
                    <X size={14} />
                    Remove
                  </button>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {/* Widget Content */}
      <div className="widget-content">
        {loading ? (
          <div className="widget-loading">
            <div className="loading-spinner"></div>
            <p>Loading...</p>
          </div>
        ) : error ? (
          <div className="widget-error">
            <div className="error-icon">⚠️</div>
            <p className="error-message">{error.message || 'Something went wrong'}</p>
            <button 
              className="retry-button"
              onClick={handleRefresh}
            >
              Try Again
            </button>
          </div>
        ) : (
          children
        )}
      </div>

      {/* Widget Footer */}
      {isHovered && (
        <div className="widget-footer">
          <div className="widget-status">
            {loading && <span className="status-indicator loading">Loading...</span>}
            {error && <span className="status-indicator error">Error</span>}
            {!loading && !error && <span className="status-indicator success">Ready</span>}
          </div>
        </div>
      )}
    </motion.div>
  );
};

export default BaseWidget;
