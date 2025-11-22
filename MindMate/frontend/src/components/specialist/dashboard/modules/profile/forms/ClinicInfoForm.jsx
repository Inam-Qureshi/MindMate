import React, { useState, useEffect } from 'react';
import { Save, Plus, X } from 'react-feather';

const ClinicInfoForm = ({ darkMode, data, onSave, onDirty, saving }) => {
  const [formData, setFormData] = useState({
    clinic_name: '',
    clinic_address: '',
    website_url: '',
    social_media_links: {},
  });
  const [newSocialPlatform, setNewSocialPlatform] = useState('');
  const [newSocialUrl, setNewSocialUrl] = useState('');

  useEffect(() => {
    if (data) {
      setFormData({
        clinic_name: data.clinic_name || '',
        clinic_address: data.clinic_address || '',
        website_url: data.website_url || '',
        social_media_links: data.social_media_links || {},
      });
    }
  }, [data]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    onDirty();
  };

  const handleAddSocialMedia = () => {
    if (newSocialPlatform && newSocialUrl) {
      setFormData(prev => ({
        ...prev,
        social_media_links: {
          ...prev.social_media_links,
          [newSocialPlatform.toLowerCase()]: newSocialUrl,
        },
      }));
      setNewSocialPlatform('');
      setNewSocialUrl('');
      onDirty();
    }
  };

  const handleRemoveSocialMedia = (platform) => {
    setFormData(prev => {
      const newLinks = { ...prev.social_media_links };
      delete newLinks[platform];
      return { ...prev, social_media_links: newLinks };
    });
    onDirty();
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    onSave(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Clinic Name
          </label>
          <input
            type="text"
            name="clinic_name"
            value={formData.clinic_name}
            onChange={handleChange}
            placeholder="Your clinic name"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div>
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Website URL
          </label>
          <input
            type="url"
            name="website_url"
            value={formData.website_url}
            onChange={handleChange}
            placeholder="https://yourwebsite.com"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Clinic Address
          </label>
          <textarea
            name="clinic_address"
            value={formData.clinic_address}
            onChange={handleChange}
            rows={3}
            placeholder="Full clinic address"
            className={`w-full px-4 py-2 rounded-lg border ${
              darkMode
                ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
            } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
          />
        </div>

        <div className="md:col-span-2">
          <label className={`block text-sm font-medium mb-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
            Social Media Links
          </label>
          
          {/* Existing social media links */}
          {Object.keys(formData.social_media_links).length > 0 && (
            <div className="space-y-2 mb-4">
              {Object.entries(formData.social_media_links).map(([platform, url]) => (
                <div key={platform} className="flex items-center space-x-2 p-2 rounded-lg bg-gray-100 dark:bg-gray-700">
                  <span className={`flex-1 text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                    <strong>{platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}:</strong> {url}
                  </span>
                  <button
                    type="button"
                    onClick={() => handleRemoveSocialMedia(platform)}
                    className={`p-1 rounded hover:bg-gray-200 dark:hover:bg-gray-600 ${
                      darkMode ? 'text-red-400' : 'text-red-600'
                    }`}
                  >
                    <X className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          )}

          {/* Add new social media */}
          <div className="flex space-x-2">
            <input
              type="text"
              value={newSocialPlatform}
              onChange={(e) => setNewSocialPlatform(e.target.value)}
              placeholder="Platform (e.g., facebook, twitter)"
              className={`flex-1 px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            <input
              type="url"
              value={newSocialUrl}
              onChange={(e) => setNewSocialUrl(e.target.value)}
              placeholder="URL"
              className={`flex-1 px-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
            <button
              type="button"
              onClick={handleAddSocialMedia}
              className={`px-4 py-2 rounded-lg font-medium transition-colors ${
                darkMode
                  ? 'bg-emerald-600 hover:bg-emerald-700 text-white'
                  : 'bg-emerald-600 hover:bg-emerald-700 text-white'
              }`}
            >
              <Plus className="h-4 w-4" />
            </button>
          </div>
        </div>
      </div>

      <div className="flex justify-end pt-4 border-t border-gray-200 dark:border-gray-700">
        <button
          type="submit"
          disabled={saving}
          className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
            saving
              ? 'bg-emerald-400 cursor-not-allowed'
              : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
          }`}
        >
          {saving ? (
            <>
              <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
              <span>Saving...</span>
            </>
          ) : (
            <>
              <Save className="h-5 w-5" />
              <span>Save Changes</span>
            </>
          )}
        </button>
      </div>
    </form>
  );
};

export default ClinicInfoForm;

