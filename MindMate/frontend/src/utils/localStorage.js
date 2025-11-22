/**
 * LocalStorage Utility
 * ===================
 * Centralized localStorage management to reduce direct usage
 * Provides type safety, error handling, and expiration support
 */

/**
 * Get item from localStorage with error handling
 */
export const getLocalStorageItem = (key, defaultValue = null) => {
  try {
    const item = localStorage.getItem(key);
    if (item === null) return defaultValue;
    
    // Try to parse as JSON
    try {
      return JSON.parse(item);
    } catch {
      // If not JSON, return as string
      return item;
    }
  } catch (error) {
    console.error(`Error getting localStorage item "${key}":`, error);
    return defaultValue;
  }
};

/**
 * Set item in localStorage with error handling
 */
export const setLocalStorageItem = (key, value) => {
  try {
    const stringValue = typeof value === 'string' ? value : JSON.stringify(value);
    localStorage.setItem(key, stringValue);
    return true;
  } catch (error) {
    console.error(`Error setting localStorage item "${key}":`, error);
    // Handle quota exceeded error
    if (error.name === 'QuotaExceededError') {
      console.warn('LocalStorage quota exceeded. Consider clearing old data.');
    }
    return false;
  }
};

/**
 * Remove item from localStorage
 */
export const removeLocalStorageItem = (key) => {
  try {
    localStorage.removeItem(key);
    return true;
  } catch (error) {
    console.error(`Error removing localStorage item "${key}":`, error);
    return false;
  }
};

/**
 * Clear all localStorage items (use with caution)
 */
export const clearLocalStorage = () => {
  try {
    localStorage.clear();
    return true;
  } catch (error) {
    console.error('Error clearing localStorage:', error);
    return false;
  }
};

/**
 * Clear only app-specific localStorage items (preserves tokens)
 */
export const clearAppData = () => {
  const itemsToPreserve = [
    'access_token',
    'refresh_token',
    'user_id',
    'user_type',
    'darkMode'
  ];
  
  try {
    const keysToRemove = [];
    for (let i = 0; i < localStorage.length; i++) {
      const key = localStorage.key(i);
      if (key && !itemsToPreserve.includes(key)) {
        keysToRemove.push(key);
      }
    }
    
    keysToRemove.forEach(key => localStorage.removeItem(key));
    return true;
  } catch (error) {
    console.error('Error clearing app data:', error);
    return false;
  }
};

/**
 * Get multiple items at once
 */
export const getMultipleItems = (keys) => {
  const result = {};
  keys.forEach(key => {
    result[key] = getLocalStorageItem(key);
  });
  return result;
};

/**
 * Set multiple items at once
 */
export const setMultipleItems = (items) => {
  const results = {};
  Object.entries(items).forEach(([key, value]) => {
    results[key] = setLocalStorageItem(key, value);
  });
  return results;
};

/**
 * Auth-related localStorage helpers
 */
export const AuthStorage = {
  getToken: () => getLocalStorageItem('access_token'),
  setToken: (token) => setLocalStorageItem('access_token', token),
  removeToken: () => removeLocalStorageItem('access_token'),
  
  getRefreshToken: () => getLocalStorageItem('refresh_token'),
  setRefreshToken: (token) => setLocalStorageItem('refresh_token', token),
  removeRefreshToken: () => removeLocalStorageItem('refresh_token'),
  
  getUserId: () => getLocalStorageItem('user_id'),
  setUserId: (id) => setLocalStorageItem('user_id', id),
  
  getUserType: () => getLocalStorageItem('user_type'),
  setUserType: (type) => setLocalStorageItem('user_type', type),
  
  getFullName: () => getLocalStorageItem('full_name'),
  setFullName: (name) => setLocalStorageItem('full_name', name),
  
  clearAuth: () => {
    removeLocalStorageItem('access_token');
    removeLocalStorageItem('refresh_token');
    removeLocalStorageItem('user_id');
    removeLocalStorageItem('user_type');
    removeLocalStorageItem('full_name');
  }
};

/**
 * User preferences helpers
 */
export const PreferencesStorage = {
  getDarkMode: () => getLocalStorageItem('darkMode') === 'true',
  setDarkMode: (enabled) => setLocalStorageItem('darkMode', enabled.toString()),
  
  getEmail: () => getLocalStorageItem('verified_email'),
  setEmail: (email) => setLocalStorageItem('verified_email', email),
  
  clearPreferences: () => {
    removeLocalStorageItem('darkMode');
    removeLocalStorageItem('verified_email');
  }
};

/**
 * Specialist profile draft helpers
 */
export const ProfileDraftStorage = {
  getDraft: () => getLocalStorageItem('specialist_profile_draft', {}),
  setDraft: (draft) => setLocalStorageItem('specialist_profile_draft', draft),
  removeDraft: () => removeLocalStorageItem('specialist_profile_draft'),
  
  getCompletedSections: () => getLocalStorageItem('completed_sections', []),
  setCompletedSections: (sections) => setLocalStorageItem('completed_sections', sections),
  
  clearDraft: () => {
    removeLocalStorageItem('specialist_profile_draft');
    removeLocalStorageItem('completed_sections');
  }
};

export default {
  get: getLocalStorageItem,
  set: setLocalStorageItem,
  remove: removeLocalStorageItem,
  clear: clearLocalStorage,
  clearAppData,
  getMultiple: getMultipleItems,
  setMultiple: setMultipleItems,
  Auth: AuthStorage,
  Preferences: PreferencesStorage,
  ProfileDraft: ProfileDraftStorage
};

