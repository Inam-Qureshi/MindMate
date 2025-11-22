/**
 * useDashboardState - Custom Hook for Dashboard State Management
 * ============================================================
 * Handles widget preferences, layout, and theme management.
 * 
 * Features:
 * - Widget preferences
 * - Layout management
 * - Theme switching
 * - Local storage persistence
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import { useState, useEffect, useCallback } from 'react';

const STORAGE_KEYS = {
  WIDGET_PREFERENCES: 'dashboard_widget_preferences',
  LAYOUT: 'dashboard_layout',
  THEME: 'dashboard_theme'
};

const DEFAULT_PREFERENCES = {
  widgets: [
    { id: 'stats', enabled: true, position: 0, size: 'medium' },
    { id: 'progress', enabled: true, position: 1, size: 'large' },
    { id: 'appointments', enabled: true, position: 2, size: 'medium' },
    { id: 'activity', enabled: true, position: 3, size: 'medium' },
    { id: 'wellness', enabled: true, position: 4, size: 'large' },
    { id: 'quick_actions', enabled: true, position: 5, size: 'medium' },
    { id: 'notifications', enabled: true, position: 6, size: 'small' }
  ],
  layout: {
    columns: 12,
    gap: '1.5rem',
    padding: '1.5rem'
  },
  theme: 'light'
};

export const useDashboardState = () => {
  const [widgetPreferences, setWidgetPreferences] = useState(DEFAULT_PREFERENCES.widgets);
  const [layout, setLayout] = useState(DEFAULT_PREFERENCES.layout);
  const [theme, setTheme] = useState(DEFAULT_PREFERENCES.theme);
  const [isLoading, setIsLoading] = useState(true);

  // Load preferences from localStorage
  const loadPreferences = useCallback(() => {
    try {
      const savedPreferences = localStorage.getItem(STORAGE_KEYS.WIDGET_PREFERENCES);
      const savedLayout = localStorage.getItem(STORAGE_KEYS.LAYOUT);
      const savedTheme = localStorage.getItem(STORAGE_KEYS.THEME);

      if (savedPreferences) {
        setWidgetPreferences(JSON.parse(savedPreferences));
      }

      if (savedLayout) {
        setLayout(JSON.parse(savedLayout));
      }

      if (savedTheme) {
        setTheme(savedTheme);
      }
    } catch (err) {
      console.error('Error loading dashboard preferences:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save preferences to localStorage
  const savePreferences = useCallback((preferences) => {
    try {
      localStorage.setItem(STORAGE_KEYS.WIDGET_PREFERENCES, JSON.stringify(preferences));
    } catch (err) {
      console.error('Error saving widget preferences:', err);
    }
  }, []);

  const saveLayout = useCallback((layout) => {
    try {
      localStorage.setItem(STORAGE_KEYS.LAYOUT, JSON.stringify(layout));
    } catch (err) {
      console.error('Error saving layout:', err);
    }
  }, []);

  const saveTheme = useCallback((theme) => {
    try {
      localStorage.setItem(STORAGE_KEYS.THEME, theme);
    } catch (err) {
      console.error('Error saving theme:', err);
    }
  }, []);

  // Update widget preferences
  const updateWidgetPreferences = useCallback((widgetId, updates) => {
    setWidgetPreferences(prev => {
      const updated = prev.map(widget => 
        widget.id === widgetId 
          ? { ...widget, ...updates }
          : widget
      );
      savePreferences(updated);
      return updated;
    });
  }, [savePreferences]);

  // Toggle widget visibility
  const toggleWidget = useCallback((widgetId) => {
    updateWidgetPreferences(widgetId, { enabled: !widgetPreferences.find(w => w.id === widgetId)?.enabled });
  }, [updateWidgetPreferences, widgetPreferences]);

  // Update widget position
  const updateWidgetPosition = useCallback((widgetId, position) => {
    updateWidgetPreferences(widgetId, { position });
  }, [updateWidgetPreferences]);

  // Update widget size
  const updateWidgetSize = useCallback((widgetId, size) => {
    updateWidgetPreferences(widgetId, { size });
  }, [updateWidgetPreferences]);

  // Reorder widgets
  const reorderWidgets = useCallback((newOrder) => {
    setWidgetPreferences(prev => {
      const reordered = newOrder.map((widgetId, index) => {
        const widget = prev.find(w => w.id === widgetId);
        return { ...widget, position: index };
      });
      savePreferences(reordered);
      return reordered;
    });
  }, [savePreferences]);

  // Update layout
  const updateLayout = useCallback((newLayout) => {
    setLayout(prev => {
      const updated = { ...prev, ...newLayout };
      saveLayout(updated);
      return updated;
    });
  }, [saveLayout]);

  // Update theme
  const updateTheme = useCallback((newTheme) => {
    setTheme(newTheme);
    saveTheme(newTheme);
  }, [saveTheme]);

  // Reset to defaults
  const resetToDefaults = useCallback(() => {
    setWidgetPreferences(DEFAULT_PREFERENCES.widgets);
    setLayout(DEFAULT_PREFERENCES.layout);
    setTheme(DEFAULT_PREFERENCES.theme);
    
    // Clear localStorage
    localStorage.removeItem(STORAGE_KEYS.WIDGET_PREFERENCES);
    localStorage.removeItem(STORAGE_KEYS.LAYOUT);
    localStorage.removeItem(STORAGE_KEYS.THEME);
  }, []);

  // Get enabled widgets
  const getEnabledWidgets = useCallback(() => {
    return widgetPreferences
      .filter(widget => widget.enabled)
      .sort((a, b) => a.position - b.position);
  }, [widgetPreferences]);

  // Get widget by ID
  const getWidget = useCallback((widgetId) => {
    return widgetPreferences.find(widget => widget.id === widgetId);
  }, [widgetPreferences]);

  // Check if widget is enabled
  const isWidgetEnabled = useCallback((widgetId) => {
    const widget = getWidget(widgetId);
    return widget ? widget.enabled : false;
  }, [getWidget]);

  // Load preferences on mount
  useEffect(() => {
    loadPreferences();
  }, [loadPreferences]);

  return {
    // State
    widgetPreferences,
    layout,
    theme,
    isLoading,
    
    // Actions
    updateWidgetPreferences,
    toggleWidget,
    updateWidgetPosition,
    updateWidgetSize,
    reorderWidgets,
    updateLayout,
    updateTheme,
    resetToDefaults,
    
    // Getters
    getEnabledWidgets,
    getWidget,
    isWidgetEnabled
  };
};

export default useDashboardState;
