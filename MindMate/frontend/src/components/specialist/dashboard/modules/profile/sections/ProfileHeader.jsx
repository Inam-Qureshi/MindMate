import React, { useState, useEffect, useMemo } from 'react';
import { User, Mail, Phone, MapPin, Star } from 'react-feather';
import { API_URL } from '../../../../../../config/api';
import apiClient from '../../../../../../utils/axiosConfig';

const ProfileHeader = ({ darkMode, profileData, applicationStatus, onEdit }) => {
  const fullName = `${profileData?.first_name || ''} ${profileData?.last_name || ''}`.trim();
  const initials = `${profileData?.first_name?.charAt(0) || ''}${profileData?.last_name?.charAt(0) || ''}`.toUpperCase();
  const [imageError, setImageError] = useState(false);
  const [imageLoading, setImageLoading] = useState(true);
  const [imageBlobUrl, setImageBlobUrl] = useState(null);
  
  // Check if profile has an image URL
  const hasImageUrl = useMemo(() => {
    return !!(profileData?.profile_image_url || 
              profileData?.profile_photo_url ||
              profileData?.profile_picture_url ||
              profileData?.photo_url ||
              profileData?.image_url);
  }, [profileData?.profile_image_url, profileData?.profile_photo_url]);
  
  // Fetch image as blob with authentication
  useEffect(() => {
    if (!hasImageUrl) {
      setImageError(true);
      setImageLoading(false);
      setImageBlobUrl(null);
      return;
    }

    let isMounted = true;
    setImageLoading(true);
    setImageError(false);

    const fetchImage = async () => {
      try {
        // Try API endpoint first (more reliable)
        const imageEndpoint = `${API_URL}/api/specialists/profile-image`;
        
        const response = await apiClient.get(imageEndpoint, {
          responseType: 'blob', // Important: fetch as blob
          headers: {
            'Accept': 'image/*'
          }
        });

        if (isMounted && response.data) {
          // Create object URL from blob
          const blob = new Blob([response.data], { type: response.data.type || 'image/jpeg' });
          const url = URL.createObjectURL(blob);
          setImageBlobUrl(url);
          setImageLoading(false);
          setImageError(false);
        }
      } catch (error) {
        console.warn('Failed to load profile image from API endpoint, trying static file:', error);
        
        // Fallback: Try static file serving with proper URL construction
        try {
          const staticUrl = profileData?.profile_image_url || profileData?.profile_photo_url;
          if (staticUrl) {
            // Normalize URL
            let normalizedUrl = staticUrl.replace(/\\/g, '/');
            
            // Remove redundant uploads/ prefix
            if (normalizedUrl.includes('/media/uploads/')) {
              normalizedUrl = normalizedUrl.replace('/media/uploads/', '/media/');
            } else if (normalizedUrl.includes('uploads/') && !normalizedUrl.startsWith('http')) {
              normalizedUrl = normalizedUrl.replace('uploads/', 'media/');
            }
            
            // Ensure it starts with /media/
            if (!normalizedUrl.startsWith('http') && !normalizedUrl.startsWith('/media/')) {
              if (normalizedUrl.startsWith('/')) {
                normalizedUrl = '/media' + normalizedUrl;
              } else {
                normalizedUrl = '/media/' + normalizedUrl;
              }
            }
            
            // Construct full URL
            const fullUrl = normalizedUrl.startsWith('http') 
              ? normalizedUrl 
              : `${API_URL}${normalizedUrl}`;
            
            // Test if the image loads
            const img = new Image();
            img.onload = () => {
              if (isMounted) {
                setImageBlobUrl(fullUrl);
                setImageLoading(false);
                setImageError(false);
              }
            };
            img.onerror = () => {
              if (isMounted) {
                console.warn('Static image also failed to load:', fullUrl);
                setImageError(true);
                setImageLoading(false);
                setImageBlobUrl(null);
              }
            };
            img.src = fullUrl;
          } else {
            if (isMounted) {
              setImageError(true);
              setImageLoading(false);
              setImageBlobUrl(null);
            }
          }
        } catch (fallbackError) {
          console.error('Fallback image loading failed:', fallbackError);
          if (isMounted) {
            setImageError(true);
            setImageLoading(false);
            setImageBlobUrl(null);
          }
        }
      }
    };

    fetchImage();

    // Cleanup: revoke object URL when component unmounts
    return () => {
      isMounted = false;
    };
  }, [hasImageUrl, profileData?.profile_image_url, profileData?.profile_photo_url]);

  // Cleanup blob URL when component unmounts or image changes
  useEffect(() => {
    return () => {
      if (imageBlobUrl && imageBlobUrl.startsWith('blob:')) {
        URL.revokeObjectURL(imageBlobUrl);
      }
    };
  }, [imageBlobUrl]);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = (e) => {
    console.warn('Profile image failed to load after blob creation');
    setImageLoading(false);
    setImageError(true);
    if (e.target) {
      e.target.style.display = 'none';
    }
  };

  return (
    <div className={`rounded-xl shadow-lg p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <div className="flex items-start space-x-6">
        {/* Profile Photo - Top Left */}
        <div className="flex-shrink-0 relative">
          {imageBlobUrl && !imageError ? (
            <div className="relative">
              {imageLoading && (
                <div className="absolute inset-0 w-32 h-32 rounded-full bg-gray-200 dark:bg-gray-700 animate-pulse flex items-center justify-center z-10">
                  <User className="h-8 w-8 text-gray-400" />
                </div>
              )}
              <img
                src={imageBlobUrl}
                alt={fullName || 'Profile'}
                className={`w-32 h-32 rounded-full object-cover border-4 border-emerald-500 shadow-lg transition-opacity duration-300 ${
                  imageLoading ? 'opacity-0' : 'opacity-100'
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                style={{ display: imageError ? 'none' : 'block' }}
              />
            </div>
          ) : (
            <div className="w-32 h-32 rounded-full bg-gradient-to-r from-emerald-500 to-teal-600 flex items-center justify-center text-white text-4xl font-bold border-4 border-emerald-500 shadow-lg">
              {initials || <User className="h-16 w-16" />}
            </div>
          )}
        </div>

        {/* Profile Info */}
        <div className="flex-1 min-w-0">
          <div className="mb-4">
            <h1 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {fullName || 'Specialist'}
            </h1>
            {profileData?.specialist_type && (
              <p className={`text-lg mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {typeof profileData.specialist_type === 'string' 
                  ? profileData.specialist_type.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())
                  : profileData.specialist_type
                }
              </p>
            )}
            {profileData?.bio && (
              <p className={`text-sm mb-4 line-clamp-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                {profileData.bio}
              </p>
            )}
          </div>

          {/* Contact Info */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            {profileData?.email && (
              <div className="flex items-center space-x-2">
                <Mail className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm truncate ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {profileData.email}
                </span>
              </div>
            )}
            {profileData?.phone && (
              <div className="flex items-center space-x-2">
                <Phone className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {profileData.phone}
                </span>
              </div>
            )}
            {profileData?.city && (
              <div className="flex items-center space-x-2">
                <MapPin className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {profileData.city}
                  {profileData?.clinic_address && ` • ${profileData.clinic_address}`}
                </span>
              </div>
            )}
            {(profileData?.average_rating || profileData?.total_reviews) && (
              <div className="flex items-center space-x-2">
                <Star className={`h-4 w-4 flex-shrink-0 ${darkMode ? 'text-yellow-400' : 'text-yellow-500'}`} />
                <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                  {profileData.average_rating?.toFixed(1) || 'N/A'} 
                  {profileData.total_reviews && ` (${profileData.total_reviews} reviews)`}
                </span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ProfileHeader;
