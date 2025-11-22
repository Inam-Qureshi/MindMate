/**
 * Dashboard Reducer - State Management for Dashboard
 * ===============================================
 * Redux-style reducer for managing dashboard state.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

// Initial state
export const initialState = {
  // Data state
  data: null,
  loading: false,
  error: null,
  lastFetch: null,
  
  // Widget state
  widgets: [],
  widgetOrder: [],
  
  // Preferences
  preferences: {},
  layout: {},
  theme: 'light',
  
  // Real-time state
  isConnected: false,
  updates: [],
  lastMessage: null,
  
  // UI state
  isInitialized: false,
  isRefreshing: false
};

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

// Reducer function
export const dashboardReducer = (state = initialState, action) => {
  switch (action.type) {
    case DASHBOARD_ACTIONS.SET_DATA:
      return {
        ...state,
        data: action.payload,
        error: null,
        isInitialized: true
      };
      
    case DASHBOARD_ACTIONS.SET_LOADING:
      return {
        ...state,
        loading: action.payload
      };
      
    case DASHBOARD_ACTIONS.SET_ERROR:
      return {
        ...state,
        error: action.payload,
        loading: false
      };
      
    case DASHBOARD_ACTIONS.SET_LAST_FETCH:
      return {
        ...state,
        lastFetch: action.payload
      };
      
    case DASHBOARD_ACTIONS.UPDATE_WIDGET:
      return {
        ...state,
        data: {
          ...state.data,
          [action.payload.widgetId]: {
            ...state.data[action.payload.widgetId],
            ...action.payload.data,
            lastUpdated: new Date().toISOString()
          }
        }
      };
      
    case DASHBOARD_ACTIONS.TOGGLE_WIDGET:
      return {
        ...state,
        widgets: state.widgets.map(widget =>
          widget.id === action.payload
            ? { ...widget, enabled: !widget.enabled }
            : widget
        )
      };
      
    case DASHBOARD_ACTIONS.REORDER_WIDGETS:
      return {
        ...state,
        widgets: action.payload,
        widgetOrder: action.payload.map(w => w.id)
      };
      
    case DASHBOARD_ACTIONS.UPDATE_PREFERENCES:
      return {
        ...state,
        preferences: { ...state.preferences, ...action.payload }
      };
      
    case DASHBOARD_ACTIONS.UPDATE_LAYOUT:
      return {
        ...state,
        layout: { ...state.layout, ...action.payload }
      };
      
    case DASHBOARD_ACTIONS.UPDATE_THEME:
      return {
        ...state,
        theme: action.payload
      };
      
    case DASHBOARD_ACTIONS.SET_CONNECTED:
      return {
        ...state,
        isConnected: action.payload
      };
      
    case DASHBOARD_ACTIONS.ADD_UPDATE:
      return {
        ...state,
        updates: [...state.updates, action.payload]
      };
      
    case DASHBOARD_ACTIONS.CLEAR_UPDATES:
      return {
        ...state,
        updates: []
      };
      
    case DASHBOARD_ACTIONS.REFRESH:
      return {
        ...state,
        isRefreshing: true,
        error: null
      };
      
    case DASHBOARD_ACTIONS.REFRESH_WIDGET:
      return {
        ...state,
        widgets: state.widgets.map(widget =>
          widget.id === action.payload
            ? { ...widget, refreshing: true }
            : widget
        )
      };
      
    case DASHBOARD_ACTIONS.SET_INITIALIZED:
      return {
        ...state,
        isInitialized: action.payload
      };
      
    case DASHBOARD_ACTIONS.SET_REFRESHING:
      return {
        ...state,
        isRefreshing: action.payload
      };
      
    default:
      return state;
  }
};

export default dashboardReducer;
