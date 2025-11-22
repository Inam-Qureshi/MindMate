import React from 'react';
import { Home, MapPin, Globe, Link } from 'react-feather';

const ClinicInfoSection = ({ darkMode, data }) => {
  const hasData = data.clinic_name || data.clinic_address || data.website_url || 
                  (data.social_media_links && Object.keys(data.social_media_links).length > 0);

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <Home className="h-5 w-5" />
        <span>Clinic & Online Presence</span>
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {data.clinic_name && (
          <div className="flex items-start space-x-2">
            <Home className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Clinic Name
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.clinic_name}
              </p>
            </div>
          </div>
        )}

        {data.clinic_address && (
          <div className="flex items-start space-x-2">
            <MapPin className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Clinic Address
              </p>
              <p className={`${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {data.clinic_address}
              </p>
            </div>
          </div>
        )}

        {data.website_url && (
          <div className="flex items-start space-x-2">
            <Globe className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Website
              </p>
              <a
                href={data.website_url}
                target="_blank"
                rel="noopener noreferrer"
                className={`text-emerald-600 hover:text-emerald-700 underline ${darkMode ? 'text-emerald-400 hover:text-emerald-300' : ''}`}
              >
                {data.website_url}
              </a>
            </div>
          </div>
        )}

        {data.social_media_links && typeof data.social_media_links === 'object' && Object.keys(data.social_media_links).length > 0 && (
          <div className="flex items-start space-x-2 md:col-span-2">
            <Link className={`h-4 w-4 mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
            <div className="flex-1">
              <p className={`text-sm font-medium mb-2 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Social Media Links
              </p>
              <div className="flex flex-wrap gap-3">
                {Object.entries(data.social_media_links).map(([platform, url]) => (
                  <a
                    key={platform}
                    href={url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className={`px-3 py-1.5 rounded-lg text-sm font-medium transition-colors ${
                      darkMode
                        ? 'bg-gray-700 text-gray-300 hover:bg-gray-600'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {platform.replace('_', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                  </a>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ClinicInfoSection;

