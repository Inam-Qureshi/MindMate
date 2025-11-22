import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Search, RefreshCw } from 'react-feather';
import { usePatients } from '../../hooks/usePatients';
import { usePolling } from '../../hooks/usePolling';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';
import StatusBadge from '../../shared/StatusBadge';
import PatientsList from './PatientsList';

const PatientsModule = ({ darkMode, activeSidebarItem = 'all' }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const filterStatus = activeSidebarItem === 'all' ? 'all' : activeSidebarItem;
  
  const { patients, loading, error, pagination, refetch } = usePatients(filterStatus, searchQuery);

  // Poll for updates every 30 seconds, but only if we have patients loaded
  usePolling(() => refetch(pagination.page), 30000, !loading && !error && patients && patients.length >= 0);

  const getTitle = () => {
    switch (activeSidebarItem) {
      case 'new':
        return 'New Patients';
      case 'active':
        return 'Active Patients';
      case 'follow_up':
        return 'Follow-up Patients';
      case 'discharged':
        return 'Discharged Patients';
      default:
        return 'All Patients';
    }
  };

  return (
    <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {getTitle()}
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            Manage your patient list and view patient information
          </p>
        </div>
        <button 
          className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
            darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
          }`}
          onClick={() => refetch(1)} 
          disabled={loading}
        >
          <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Search */}
      <div className="mb-6">
        <div className="relative">
          <Search size={20} className={`absolute left-3 top-1/2 transform -translate-y-1/2 ${
            darkMode ? 'text-gray-400' : 'text-gray-500'
          }`} />
          <input
            type="text"
            placeholder="Search patients by name or email..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className={`w-full pl-10 pr-4 py-2 rounded-lg ${
              darkMode 
                ? 'bg-gray-800 border-gray-700 text-white placeholder-gray-400' 
                : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500 border'
            }`}
          />
        </div>
      </div>

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading patients..." />
      ) : error ? (
        <ErrorState error={error} onRetry={() => refetch(1)} />
      ) : !patients || patients.length === 0 ? (
        <EmptyState
          icon={Users}
          title="No patients found"
          message={searchQuery ? "No patients match your search criteria." : "You don't have any patients in this category yet."}
        />
      ) : (
        <PatientsList 
          patients={patients} 
          darkMode={darkMode}
          pagination={pagination}
          onPageChange={refetch}
        />
      )}
    </div>
  );
};

export default PatientsModule;

