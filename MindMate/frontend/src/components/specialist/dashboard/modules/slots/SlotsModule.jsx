import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { Clock, RefreshCw } from 'react-feather';
import { useSlots } from '../../hooks/useSlots';
import { usePolling } from '../../hooks/usePolling';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';
import StatusBadge from '../../shared/StatusBadge';
import AutoGenerateSlots from './AutoGenerateSlots';
import SlotActionsDropdown from './SlotActionsDropdown';

const SlotsModule = ({ darkMode, activeSidebarItem = 'schedule' }) => {
  const { slots, loading, error, summary, refetch } = useSlots({});
  const [showScheduleSetup, setShowScheduleSetup] = useState(false);

  // Poll for updates every 30 seconds, but only if we have slots loaded
  // Don't poll while initial loading is happening
  usePolling(refetch, 30000, !loading && !error && slots && slots.length >= 0);

  const getContent = () => {
    switch (activeSidebarItem) {
      case 'schedule':
        return {
          title: 'Weekly Schedule',
          subtitle: 'View and manage your weekly availability schedule'
        };
      case 'generate':
        return {
          title: 'Generate Slots',
          subtitle: 'Create new time slots for appointments'
        };
      case 'manage':
        return {
          title: 'Manage Slots',
          subtitle: 'Block, unblock, and update existing time slots'
        };
      case 'summary':
        return {
          title: 'Availability Summary',
          subtitle: 'Overview of your slot availability and booking status'
        };
      default:
        return {
          title: 'Availability Management',
          subtitle: 'Manage your appointment slots and schedule'
        };
    }
  };

  const content = getContent();

  return (
    <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <div>
          <h1 className={`text-3xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {content.title}
          </h1>
          <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
            {content.subtitle}
          </p>
        </div>
        <div className="flex space-x-2">
          <button 
            className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
              darkMode ? 'bg-gray-800 hover:bg-gray-700 text-white' : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
            }`}
            onClick={refetch} 
            disabled={loading}
          >
            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
            <span>Refresh</span>
          </button>
        </div>
      </div>

      {/* Summary Cards */}
      {summary && (
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Total Slots
            </p>
            <p className="text-2xl font-bold text-emerald-600">
              {summary.total_slots || 0}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Available
            </p>
            <p className="text-2xl font-bold text-green-600">
              {summary.available_slots || 0}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Booked
            </p>
            <p className="text-2xl font-bold text-blue-600">
              {summary.booked_slots || 0}
            </p>
          </div>
          <div className={`p-4 rounded-lg ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <p className={`text-sm font-medium ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
              Blocked
            </p>
            <p className="text-2xl font-bold text-red-600">
              {summary.blocked_slots || 0}
            </p>
          </div>
        </div>
      )}

      {/* Content */}
      {loading ? (
        <LoadingState message="Loading slots..." />
      ) : error ? (
        <ErrorState error={error} onRetry={refetch} />
      ) : !slots || slots.length === 0 ? (
        <div className="space-y-6">
          <EmptyState
            icon={Clock}
            title="No slots found"
            message="You haven't created any appointment slots yet. Generate slots for the next week based on your availability schedule."
          />
          <AutoGenerateSlots
            darkMode={darkMode}
            onSuccess={() => {
              refetch();
            }}
            onScheduleNeeded={() => {
              setShowScheduleSetup(true);
              // TODO: Open schedule setup modal or redirect to schedule page
              alert('Please set up your weekly availability schedule first. You can do this in your profile settings.');
            }}
          />
        </div>
      ) : (
        <div className={`rounded-xl shadow-lg overflow-hidden ${
          darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
        }`}>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className={`${darkMode ? 'bg-gray-700' : 'bg-gray-50'}`}>
                <tr>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Date & Time
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Duration
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Status
                  </th>
                  <th className={`px-6 py-3 text-left text-xs font-medium uppercase tracking-wider ${
                    darkMode ? 'text-gray-300' : 'text-gray-500'
                  }`}>
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className={`divide-y ${darkMode ? 'divide-gray-700' : 'divide-gray-200'}`}>
                {slots.slice(0, 20).map((slot, index) => (
                  <motion.tr 
                    key={slot.id}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.02 }}
                    className={`${darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-50'} transition-colors`}
                  >
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                        <div className="font-medium">
                          {slot.slot_date 
                            ? new Date(slot.slot_date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : slot.date 
                            ? new Date(slot.date).toLocaleDateString('en-US', { 
                                weekday: 'short', 
                                year: 'numeric', 
                                month: 'short', 
                                day: 'numeric' 
                              })
                            : 'N/A'}
                        </div>
                        <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                          {slot.start_time 
                            ? (typeof slot.start_time === 'string' 
                              ? new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true 
                                })
                              : new Date(slot.start_time).toLocaleTimeString('en-US', { 
                                  hour: '2-digit', 
                                  minute: '2-digit',
                                  hour12: true 
                                })) 
                            : 'N/A'}
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-900'}`}>
                        {slot.duration_minutes || 30} mins
                        {slot.appointment_type && (
                          <div className={`text-xs ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
                            {slot.appointment_type === 'online' || slot.appointment_type === 'ONLINE' 
                              ? 'Online' 
                              : slot.appointment_type === 'in_person' || slot.appointment_type === 'IN_PERSON' || slot.appointment_type === 'in-person'
                              ? 'In-Person' 
                              : slot.appointment_type}
                          </div>
                        )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <StatusBadge status={slot.status || 'available'} />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm">
                      <SlotActionsDropdown
                        slot={slot}
                        darkMode={darkMode}
                        onSuccess={refetch}
                      />
                    </td>
                  </motion.tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Auto Generate Slots Component - Show when slots exist for easy regeneration */}
      {slots && slots.length > 0 && (
        <div className="mt-6">
          <AutoGenerateSlots
            darkMode={darkMode}
            onSuccess={() => {
              refetch();
            }}
            onScheduleNeeded={() => {
              setShowScheduleSetup(true);
              alert('Please set up your weekly availability schedule first. You can do this in your profile settings.');
            }}
          />
        </div>
      )}
    </div>
  );
};

export default SlotsModule;

