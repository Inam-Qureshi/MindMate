/**
 * Dashboard Actions - Action Creators for Dashboard State
 * =====================================================
 * Action creators for dashboard state management.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

// Action types
export const DASHBOARD_ACTIONS = {
  // Data actions
  SET_DATA: 'SET_DATA',
  SET_LOADING: 'SET_LOADING',
  SET_ERROR: 'SET_ERROR',
  SET_LAST_FETCH: 'SET_LAST_FETCH',
  
  // Widget actions
  UPDATE_WIDGET: 'UPDATE_WIDGET',
  TOGGLE_WIDGET: 'TOGGLE_WIDGET',
  REORDER_WIDGETS: 'REORDER_WIDGETS',
  
  // Preferences actions
  UPDATE_PREFERENCES: 'UPDATE_PREFERENCES',
  UPDATE_LAYOUT: 'UPDATE_LAYOUT',
  UPDATE_THEME: 'UPDATE_THEME',
  
  // Real-time actions
  SET_CONNECTED: 'SET_CONNECTED',
  ADD_UPDATE: 'ADD_UPDATE',
  CLEAR_UPDATES: 'CLEAR_UPDATES',
  
  // Refresh actions
  REFRESH: 'REFRESH',
  REFRESH_WIDGET: 'REFRESH_WIDGET',
  
  // UI actions
  SET_INITIALIZED: 'SET_INITIALIZED',
  SET_REFRESHING: 'SET_REFRESHING'
};

// Action creators
export const dashboardActions = {
  // Data actions
  setData: (data) => ({
    type: DASHBOARD_ACTIONS.SET_DATA,
    payload: data
  }),
  
  setLoading: (loading) => ({
    type: DASHBOARD_ACTIONS.SET_LOADING,
    payload: loading
  }),
  
  setError: (error) => ({
    type: DASHBOARD_ACTIONS.SET_ERROR,
    payload: error
  }),
  
  setLastFetch: (timestamp) => ({
    type: DASHBOARD_ACTIONS.SET_LAST_FETCH,
    payload: timestamp
  }),
  
  // Widget actions
  updateWidget: (widgetId, data) => ({
    type: DASHBOARD_ACTIONS.UPDATE_WIDGET,
    payload: { widgetId, data }
  }),
  
  toggleWidget: (widgetId) => ({
    type: DASHBOARD_ACTIONS.TOGGLE_WIDGET,
    payload: widgetId
  }),
  
  reorderWidgets: (widgets) => ({
    type: DASHBOARD_ACTIONS.REORDER_WIDGETS,
    payload: widgets
  }),
  
  // Preferences actions
  updatePreferences: (preferences) => ({
    type: DASHBOARD_ACTIONS.UPDATE_PREFERENCES,
    payload: preferences
  }),
  
  updateLayout: (layout) => ({
    type: DASHBOARD_ACTIONS.UPDATE_LAYOUT,
    payload: layout
  }),
  
  updateTheme: (theme) => ({
    type: DASHBOARD_ACTIONS.UPDATE_THEME,
    payload: theme
  }),
  
  // Real-time actions
  setConnected: (connected) => ({
    type: DASHBOARD_ACTIONS.SET_CONNECTED,
    payload: connected
  }),
  
  addUpdate: (update) => ({
    type: DASHBOARD_ACTIONS.ADD_UPDATE,
    payload: update
  }),
  
  clearUpdates: () => ({
    type: DASHBOARD_ACTIONS.CLEAR_UPDATES
  }),
  
  // Refresh actions
  refresh: () => ({
    type: DASHBOARD_ACTIONS.REFRESH
  }),
  
  refreshWidget: (widgetId) => ({
    type: DASHBOARD_ACTIONS.REFRESH_WIDGET,
    payload: widgetId
  }),
  
  // UI actions
  setInitialized: (initialized) => ({
    type: DASHBOARD_ACTIONS.SET_INITIALIZED,
    payload: initialized
  }),
  
  setRefreshing: (refreshing) => ({
    type: DASHBOARD_ACTIONS.SET_REFRESHING,
    payload: refreshing
  })
};

export default dashboardActions;
