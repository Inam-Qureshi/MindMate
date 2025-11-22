import React from 'react';
import { BarChart2, CheckCircle, Star, Calendar, ArrowUp } from 'react-feather';

const ProfileStatsSection = ({ darkMode, data }) => {
  const hasData = data.profile_completion_percentage !== undefined || 
                  data.total_appointments !== undefined ||
                  data.profile_verified !== undefined ||
                  data.featured !== undefined ||
                  data.total_reviews !== undefined;

  if (!hasData) return null;

  return (
    <div className={`rounded-xl p-6 ${
      darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
    }`}>
      <h2 className={`text-xl font-bold mb-4 flex items-center space-x-2 ${
        darkMode ? 'text-white' : 'text-gray-900'
      }`}>
        <BarChart2 className="h-5 w-5" />
        <span>Profile Statistics</span>
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {data.profile_completion_percentage !== undefined && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <ArrowUp className={`h-4 w-4 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Profile Completion
              </p>
            </div>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.profile_completion_percentage}%
            </p>
            <div className={`mt-2 h-2 rounded-full overflow-hidden ${
              darkMode ? 'bg-gray-700' : 'bg-gray-200'
            }`}>
              <div
                className="h-full bg-emerald-500 transition-all duration-500"
                style={{ width: `${data.profile_completion_percentage}%` }}
              />
            </div>
          </div>
        )}

        {data.total_appointments !== undefined && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Calendar className={`h-4 w-4 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Appointments
              </p>
            </div>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.total_appointments || 0}
            </p>
          </div>
        )}

        {data.total_reviews !== undefined && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <Star className={`h-4 w-4 ${darkMode ? 'text-yellow-400' : 'text-yellow-600'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Total Reviews
              </p>
            </div>
            <p className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {data.total_reviews || 0}
            </p>
          </div>
        )}

        {data.profile_verified !== undefined && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-900' : 'bg-gray-50'
          }`}>
            <div className="flex items-center space-x-2 mb-2">
              <CheckCircle className={`h-4 w-4 ${
                data.profile_verified 
                  ? (darkMode ? 'text-green-400' : 'text-green-600')
                  : (darkMode ? 'text-gray-400' : 'text-gray-400')
              }`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                Verification Status
              </p>
            </div>
            <p className={`text-lg font-semibold ${
              data.profile_verified
                ? (darkMode ? 'text-green-400' : 'text-green-600')
                : (darkMode ? 'text-gray-400' : 'text-gray-500')
            }`}>
              {data.profile_verified ? 'Verified' : 'Not Verified'}
            </p>
          </div>
        )}

        {data.featured !== undefined && data.featured && (
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gradient-to-br from-yellow-900 to-yellow-800' : 'bg-gradient-to-br from-yellow-50 to-yellow-100'
          } border ${darkMode ? 'border-yellow-700' : 'border-yellow-200'}`}>
            <div className="flex items-center space-x-2 mb-2">
              <Star className={`h-4 w-4 ${darkMode ? 'text-yellow-300' : 'text-yellow-600'}`} />
              <p className={`text-sm font-medium ${darkMode ? 'text-yellow-200' : 'text-yellow-800'}`}>
                Featured Profile
              </p>
            </div>
            <p className={`text-lg font-semibold ${darkMode ? 'text-yellow-300' : 'text-yellow-700'}`}>
              Featured
            </p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileStatsSection;

