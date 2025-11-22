import React from 'react';
import { motion } from 'framer-motion';
import { Star, BarChart2, Clock } from 'react-feather';
import { useDashboardStats } from '../../hooks/useDashboardStats';
import { usePolling } from '../../hooks/usePolling';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import StatsCards from './StatsCards';
import RecentActivity from './RecentActivity';

const OverviewModule = ({ darkMode, specialistInfo, activeSidebarItem = 'dashboard' }) => {
  const { stats, loading, error, refetch } = useDashboardStats();

  // Poll for updates every 30 seconds
  usePolling(refetch, 30000, !loading && !error);

  const getContent = () => {
    switch (activeSidebarItem) {
      case 'dashboard':
        return {
          title: `Welcome back, ${specialistInfo?.first_name || 'Specialist'}! 👋`,
          subtitle: "Here's what's happening with your practice today",
          icon: <Star className="h-10 w-10 text-white" />
        };
      case 'stats':
        return {
          title: "Practice Statistics",
          subtitle: "Detailed analytics and performance metrics",
          icon: <BarChart2 className="h-10 w-10 text-white" />
        };
      case 'recent':
        return {
          title: "Recent Activity",
          subtitle: "Latest updates and recent interactions",
          icon: <Clock className="h-10 w-10 text-white" />
        };
      default:
        return {
          title: `Welcome back, ${specialistInfo?.first_name || 'Specialist'}! 👋`,
          subtitle: "Here's what's happening with your practice today",
          icon: <Star className="h-10 w-10 text-white" />
        };
    }
  };

  if (loading) {
    return (
      <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <LoadingState message="Loading dashboard..." />
      </div>
    );
  }

  if (error) {
    return (
      <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
        <ErrorState error={error} onRetry={refetch} />
      </div>
    );
  }

  const content = getContent();

  return (
    <div className={`h-full p-6 ${darkMode ? 'bg-gray-900 text-white' : 'bg-gray-50 text-gray-900'}`}>
      {/* Welcome Banner */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5 }}
        className={`mb-8 p-8 rounded-2xl shadow-xl backdrop-blur-sm ${
          darkMode ? 'bg-gradient-to-r from-gray-800 to-gray-700 border border-gray-600' : 'bg-gradient-to-r from-white to-gray-50 border border-gray-200'
        }`}
      >
        <div className="flex items-center space-x-6">
          <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-600">
            {content.icon}
          </div>
          <div>
            <h2 className={`text-3xl font-bold mb-2 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {content.title}
            </h2>
            <p className={`text-lg ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
              {content.subtitle}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Stats Cards */}
      <StatsCards stats={stats} darkMode={darkMode} />

      {/* Recent Activity */}
      <RecentActivity activities={stats?.recent_activities} darkMode={darkMode} />
    </div>
  );
};

export default OverviewModule;

