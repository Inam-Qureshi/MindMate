import React from 'react';
import { ArrowLeft } from 'react-feather';
import DocumentsManagement from './DocumentsManagement';

const ProfileDocumentsPage = ({ darkMode, onNavigateToView }) => {
  return (
    <div className={`min-h-full ${darkMode ? 'bg-gray-900' : 'bg-gray-50'}`}>
      {/* Page Header */}
      <div className={`sticky top-0 z-10 border-b ${darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'}`}>
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              {onNavigateToView && (
                <button
                  onClick={onNavigateToView}
                  className={`p-2 rounded-lg transition-colors ${
                    darkMode
                      ? 'hover:bg-gray-700 text-gray-300'
                      : 'hover:bg-gray-100 text-gray-600'
                  }`}
                >
                  <ArrowLeft className="h-5 w-5" />
                </button>
              )}
              <div>
                <h1 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                  Documents Management
                </h1>
                <p className={`text-sm mt-1 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                  Manage your licenses, certifications, and verification documents
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <DocumentsManagement darkMode={darkMode} />
      </div>
    </div>
  );
};

export default ProfileDocumentsPage;

