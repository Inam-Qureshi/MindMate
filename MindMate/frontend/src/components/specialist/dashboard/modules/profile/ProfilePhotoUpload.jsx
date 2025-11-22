import React, { useState, useRef, useEffect } from 'react';
import { Upload, X, Image as ImageIcon } from 'react-feather';
import specialistProfileService from '../../../../../services/api/specialistProfile';
import { API_URL } from '../../../../../config/api';

const ProfilePhotoUpload = ({ darkMode, currentPhotoUrl, onPhotoUploaded }) => {
  // Convert URL to absolute if needed
  const getAbsoluteUrl = (url) => {
    if (!url) return '';
    
    // Normalize backslashes to forward slashes (Windows path issue)
    let normalizedUrl = url.replace(/\\/g, '/');
    
    if (normalizedUrl.startsWith('http://') || normalizedUrl.startsWith('https://') || normalizedUrl.startsWith('data:')) {
      return normalizedUrl;
    }
    // If relative URL, prepend API_URL
    const cleanUrl = normalizedUrl.startsWith('/') ? normalizedUrl.substring(1) : normalizedUrl;
    return `${API_URL}/${cleanUrl}`;
  };

  const [preview, setPreview] = useState(getAbsoluteUrl(currentPhotoUrl) || '');
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  // Update preview when currentPhotoUrl changes
  useEffect(() => {
    if (currentPhotoUrl) {
      setPreview(getAbsoluteUrl(currentPhotoUrl));
    } else {
      setPreview('');
    }
  }, [currentPhotoUrl]);

  const handleFileSelect = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      setError('Please select an image file');
      return;
    }

    // Validate file size (5MB max)
    if (file.size > 5 * 1024 * 1024) {
      setError('File size must be less than 5MB');
      return;
    }

    // Show preview
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreview(reader.result);
    };
    reader.readAsDataURL(file);

    // Upload file
    setUploading(true);
    setError('');

    try {
      const response = await specialistProfileService.uploadDocument(file, 'profile_photo');
      
      if (response.file_url) {
        const absoluteUrl = getAbsoluteUrl(response.file_url);
        setPreview(absoluteUrl);
        onPhotoUploaded(response.file_url); // Pass original URL to parent
        setError('');
      }
    } catch (err) {
      console.error('Error uploading photo:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to upload photo');
      setPreview(currentPhotoUrl || '');
    } finally {
      setUploading(false);
    }
  };

  const handleRemove = () => {
    setPreview('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    onPhotoUploaded('');
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center space-x-6">
        {/* Preview */}
        <div className="relative">
          {preview ? (
            <div className="relative">
              <img
                src={preview}
                alt="Profile preview"
                className="w-32 h-32 rounded-full object-cover border-4 border-emerald-500"
                onError={(e) => {
                  console.error('Image load error:', preview);
                  e.target.style.display = 'none';
                }}
              />
              <button
                type="button"
                onClick={handleRemove}
                className={`absolute -top-2 -right-2 p-1.5 rounded-full ${
                  darkMode ? 'bg-red-600 hover:bg-red-700' : 'bg-red-500 hover:bg-red-600'
                } text-white transition-colors`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          ) : (
            <div className={`w-32 h-32 rounded-full border-4 border-dashed flex items-center justify-center ${
              darkMode ? 'border-gray-600 bg-gray-800' : 'border-gray-300 bg-gray-100'
            }`}>
              <ImageIcon className={`h-8 w-8 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`} />
            </div>
          )}
        </div>

        {/* Upload Button */}
        <div className="flex-1">
          <input
            ref={fileInputRef}
            type="file"
            accept="image/*"
            onChange={handleFileSelect}
            className="hidden"
            id="profile-photo-upload"
            disabled={uploading}
          />
          <label
            htmlFor="profile-photo-upload"
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg font-medium transition-colors cursor-pointer ${
              uploading
                ? darkMode
                  ? 'bg-gray-700 text-gray-400 cursor-not-allowed'
                  : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                : darkMode
                ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                : 'bg-emerald-600 hover:bg-emerald-700 text-white'
            }`}
          >
            {uploading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                <span>Uploading...</span>
              </>
            ) : (
              <>
                <Upload className="h-4 w-4" />
                <span>{preview ? 'Change Photo' : 'Upload Photo'}</span>
              </>
            )}
          </label>
          <p className={`text-xs mt-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            JPEG, PNG, max 5MB
          </p>
        </div>
      </div>

      {error && (
        <div className={`p-3 rounded-lg ${
          darkMode ? 'bg-red-900/20 border border-red-800' : 'bg-red-50 border border-red-200'
        }`}>
          <p className={`text-sm ${darkMode ? 'text-red-400' : 'text-red-600'}`}>
            {error}
          </p>
        </div>
      )}
    </div>
  );
};

export default ProfilePhotoUpload;

