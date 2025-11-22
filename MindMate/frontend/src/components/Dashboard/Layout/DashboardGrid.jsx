/**
 * Dashboard Grid - Main Grid Component for Widgets
 * ===============================================
 * Orchestrates all dashboard widgets in a responsive grid layout.
 * 
 * Features:
 * - Responsive grid layout
 * - Widget management
 * - Drag and drop support
 * - Widget customization
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React, { useState, useMemo } from 'react';
import { motion } from 'framer-motion';
import StatsWidget from '../Widgets/StatsWidget';
import ProgressWidget from '../Widgets/ProgressWidget';
import AppointmentsWidget from '../Widgets/AppointmentsWidget';
import ActivityWidget from '../Widgets/ActivityWidget';
import WellnessWidget from '../Widgets/WellnessWidget';
import QuickActionsWidget from '../Widgets/QuickActionsWidget';
import NotificationsWidget from '../Widgets/NotificationsWidget';
import { useDashboard } from '../Core/DashboardProvider';
import './DashboardGrid.css';

const DashboardGrid = ({ 
  darkMode, 
  data, 
  loading, 
  error, 
  onWidgetAction 
}) => {
  const { 
    widgetPreferences, 
    getEnabledWidgets, 
    isWidgetEnabled 
  } = useDashboard();
  
  const [draggedWidget, setDraggedWidget] = useState(null);

  // Get enabled widgets
  const enabledWidgets = useMemo(() => {
    return getEnabledWidgets();
  }, [getEnabledWidgets]);

  // Widget components mapping
  const widgetComponents = {
    stats: StatsWidget,
    progress: ProgressWidget,
    appointments: AppointmentsWidget,
    activity: ActivityWidget,
    wellness: WellnessWidget,
    quick_actions: QuickActionsWidget,
    notifications: NotificationsWidget
  };

  // Handle widget refresh
  const handleWidgetRefresh = async (widgetId) => {
    try {
      if (onWidgetAction) {
        await onWidgetAction(widgetId, 'refresh');
      }
    } catch (error) {
      console.error(`Error refreshing widget ${widgetId}:`, error);
    }
  };

  // Handle widget customize
  const handleWidgetCustomize = (widgetId) => {
    if (onWidgetAction) {
      onWidgetAction(widgetId, 'customize');
    }
  };

  // Handle widget remove
  const handleWidgetRemove = (widgetId) => {
    if (onWidgetAction) {
      onWidgetAction(widgetId, 'remove');
    }
  };

  // Handle widget toggle size
  const handleWidgetToggleSize = (widgetId, isExpanded) => {
    if (onWidgetAction) {
      onWidgetAction(widgetId, 'toggleSize', { isExpanded });
    }
  };

  // Render individual widget
  const renderWidget = (widget) => {
    const WidgetComponent = widgetComponents[widget.id];
    
    if (!WidgetComponent) {
      console.warn(`Unknown widget type: ${widget.id}`);
      return null;
    }

    // Get widget data
    const widgetData = data?.[widget.id] || data;
    const widgetLoading = loading;
    const widgetError = error;

    return (
      <motion.div
        key={widget.id}
        className={`widget-container ${widget.size || 'medium'}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: widget.position * 0.1 }}
        layout
      >
        <WidgetComponent
          id={widget.id}
          data={widgetData}
          loading={widgetLoading}
          error={widgetError}
          onRefresh={() => handleWidgetRefresh(widget.id)}
          onCustomize={() => handleWidgetCustomize(widget.id)}
          onRemove={() => handleWidgetRemove(widget.id)}
          onToggleSize={(isExpanded) => handleWidgetToggleSize(widget.id, isExpanded)}
          darkMode={darkMode}
          size={widget.size}
          isExpanded={widget.isExpanded}
          canExpand={widget.canExpand}
          canRemove={widget.canRemove}
          canCustomize={widget.canCustomize}
        />
      </motion.div>
    );
  };

  // Render empty state
  const renderEmptyState = () => (
    <motion.div
      className="dashboard-empty-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.5 }}
    >
      <div className="empty-state-content">
        <div className="empty-state-icon">📊</div>
        <h3>No widgets configured</h3>
        <p>Add some widgets to get started with your dashboard</p>
        <button className="add-widget-button">
          Add Widgets
        </button>
      </div>
    </motion.div>
  );

  // Render loading state
  const renderLoadingState = () => (
    <motion.div
      className="dashboard-loading-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="loading-skeleton">
        <div className="skeleton-item large"></div>
        <div className="skeleton-item medium"></div>
        <div className="skeleton-item medium"></div>
        <div className="skeleton-item small"></div>
        <div className="skeleton-item small"></div>
        <div className="skeleton-item large"></div>
      </div>
    </motion.div>
  );

  // Render error state
  const renderErrorState = () => (
    <motion.div
      className="dashboard-error-state"
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ duration: 0.3 }}
    >
      <div className="error-state-content">
        <div className="error-state-icon">⚠️</div>
        <h3>Unable to load dashboard</h3>
        <p>{error?.message || 'An unexpected error occurred'}</p>
        <button 
          className="retry-button"
          onClick={() => window.location.reload()}
        >
          Try Again
        </button>
      </div>
    </motion.div>
  );

  // Main render logic
  if (loading && !data) {
    return renderLoadingState();
  }

  if (error && !data) {
    return renderErrorState();
  }

  if (!enabledWidgets || enabledWidgets.length === 0) {
    return renderEmptyState();
  }

  return (
    <div className={`dashboard-grid ${darkMode ? 'dark' : ''}`}>
      {enabledWidgets.map(renderWidget)}
    </div>
  );
};

export default DashboardGrid;
