/**
 * Image Utility Functions
 * Handles image URL validation and fallback logic
 */

/**
 * Checks if an image URL is valid and not a placeholder service
 * @param {string} url - The image URL to validate
 * @returns {boolean} - True if URL is valid, false otherwise
 */
export const isValidImageUrl = (url) => {
  if (!url || typeof url !== 'string' || url.trim() === '') {
    return false;
  }

  // Check for placeholder services that might fail
  const placeholderServices = [
    'via.placeholder.com',
    'placeholder.com',
    'placehold.it',
    'placekitten.com',
    'dummyimage.com'
  ];

  const lowerUrl = url.toLowerCase();
  return !placeholderServices.some(service => lowerUrl.includes(service));
};

/**
 * Gets initials from a name
 * @param {string} name - The full name
 * @returns {string} - Initials (e.g., "John Doe" -> "JD")
 */
export const getInitials = (name) => {
  if (!name || typeof name !== 'string') return '?';
  const parts = name.trim().split(' ');
  if (parts.length >= 2) {
    return parts[0].charAt(0).toUpperCase() + parts[1].charAt(0).toUpperCase();
  }
  return name.substring(0, 2).toUpperCase();
};

/**
 * Gets a safe image URL, filtering out invalid/placeholder URLs
 * @param {string} url - The image URL
 * @returns {string|null} - Valid URL or null
 */
export const getSafeImageUrl = (url) => {
  if (isValidImageUrl(url)) {
    return url;
  }
  return null;
};







