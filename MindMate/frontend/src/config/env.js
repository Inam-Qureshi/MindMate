export const config = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000',
  apiTimeout: parseInt(import.meta.env.VITE_API_TIMEOUT) || 30000,
  enableAnalytics: import.meta.env.VITE_ENABLE_ANALYTICS === 'true',
  enableDebug: import.meta.env.VITE_ENABLE_DEBUG === 'true',
  appName: import.meta.env.VITE_APP_NAME || 'MindMate',
  appVersion: import.meta.env.VITE_APP_VERSION || '2.0.0',
};

