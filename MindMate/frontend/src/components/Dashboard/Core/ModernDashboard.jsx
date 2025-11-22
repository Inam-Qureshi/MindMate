/**
 * Modern Dashboard - Consolidated & Fully Functional
 * ==================================================
 * A modern, sleek dashboard that consolidates all functionality
 * from both SimpleDashboardContainer and DashboardOverview.
 * 
 * Features:
 * - Real-time data from backend APIs
 * - Beautiful modern UI with smooth animations
 * - Widget-based architecture
 * - Progress tracking with streaks
 * - Wellness metrics visualization
 * - Quick actions with navigation
 * - Appointment reminders
 * - Activity timeline
 * - Notifications
 * 
 * Author: MindMate Team
 * Version: 4.0.0
 */

import React, { useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useNavigate } from 'react-router-dom';
import { useDashboard } from '../../../hooks/useDashboard';
import ErrorBoundary from '../../common/ErrorBoundary/ErrorBoundary';
import { SkeletonCard } from '../../common/LoadingSkeleton';
import toast from 'react-hot-toast';

// Import widgets
import AppointmentsWidget from '../../Home/Dashboard/Widgets/AppointmentsWidget';
import QuickActionsWidget from '../../Home/Dashboard/Widgets/QuickActionsWidget';

const ModernDashboard = ({ darkMode, user }) => {
  const navigate = useNavigate();
  const {
    dashboardData,
    loading,
    error,
    refetch,
    appointments,
    quickActions,
  } = useDashboard(true, 60000); // Auto-refresh every 60 seconds

  // Listen for dashboard refresh events
  useEffect(() => {
    const handleRefresh = () => {
      refetch();
    };
    window.addEventListener('dashboard-refresh', handleRefresh);
    return () => {
      window.removeEventListener('dashboard-refresh', handleRefresh);
    };
  }, [refetch]);

  const handleRefresh = async () => {
    try {
      await refetch();
      toast.success('Dashboard refreshed successfully');
    } catch (err) {
      toast.error('Failed to refresh dashboard');
    }
  };

  const handleViewAppointments = () => {
    navigate('/appointments');
  };

  const subtleText = darkMode ? 'text-gray-400' : 'text-slate-500';

  if (loading && !dashboardData) {
    return (
      <div
        className={`min-h-screen overflow-y-auto ${
          darkMode ? 'bg-gray-950' : 'bg-slate-50'
        }`}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
            <div className="space-y-6 lg:col-span-2">
              <SkeletonCard className={darkMode ? 'bg-gray-800 border-gray-700' : ''} />
              <SkeletonCard className={darkMode ? 'bg-gray-800 border-gray-700' : ''} />
              <SkeletonCard className={darkMode ? 'bg-gray-800 border-gray-700' : ''} />
            </div>
            <div className="space-y-6">
              <SkeletonCard className={darkMode ? 'bg-gray-800 border-gray-700' : ''} />
              <SkeletonCard className={darkMode ? 'bg-gray-800 border-gray-700' : ''} />
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (error && !dashboardData) {
    return (
      <div
        className={`flex min-h-screen items-center justify-center p-6 ${
          darkMode ? 'bg-gray-950' : 'bg-slate-50'
        }`}
      >
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`max-w-md rounded-2xl p-8 ${
            darkMode
              ? 'bg-gray-800 border border-gray-700'
              : 'bg-white shadow-lg border border-gray-200'
          }`}
        >
          <div className={`text-center mb-6 ${darkMode ? 'text-red-400' : 'text-red-500'}`}>
            <svg className="w-16 h-16 mx-auto mb-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
          </div>
          <h3 className={`text-xl font-bold mb-2 text-center ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}>
            Unable to Load Dashboard
          </h3>
          <p className={`text-center mb-6 ${
            darkMode ? 'text-gray-400' : 'text-gray-600'
          }`}>
            {error || 'An error occurred while loading your dashboard data.'}
          </p>
          <button
            onClick={handleRefresh}
            className={`w-full px-4 py-3 rounded-lg font-medium transition-all ${
              darkMode
                ? 'bg-blue-600 hover:bg-blue-700 text-white'
                : 'bg-blue-600 hover:bg-blue-700 text-white'
            }`}
          >
            Try Again
          </button>
        </motion.div>
      </div>
    );
  }

  return (
    <ErrorBoundary darkMode={darkMode}>
      <div
        className={`min-h-screen overflow-y-auto ${
          darkMode ? 'bg-gray-950' : 'bg-slate-50'
        } transition-colors duration-300`}
      >
        <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:px-8">
          <div className="mb-8">
            <motion.h1
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              className={`text-3xl font-semibold ${darkMode ? 'text-gray-100' : 'text-slate-900'}`}
            >
              Welcome back, {user?.first_name || user?.full_name || 'there'} 👋
            </motion.h1>
            <motion.p
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.05 }}
              className={`mt-2 max-w-xl text-base ${subtleText}`}
            >
              Stay on top of your progress with a calm, focused overview curated just for you.
            </motion.p>
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: 0.1 }}
            >
              <QuickActionsWidget
                actions={quickActions}
                darkMode={darkMode}
                onActionComplete={refetch}
                variant="inline"
                showTitle={false}
                layout="row"
                className="mt-6"
              />
            </motion.div>
          </div>

          <div className="space-y-6">
              <AnimatePresence>
                <motion.div
                  initial={{ opacity: 0, y: 12 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ duration: 0.25, delay: 0.1 }}
                >
                  <AppointmentsWidget
                    appointments={appointments}
                    darkMode={darkMode}
                    onViewAll={handleViewAppointments}
                    variant="minimal"
                  />
                </motion.div>
              </AnimatePresence>

          </div>

          {dashboardData?.last_updated && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.3, delay: 0.2 }}
              className={`mt-10 text-center text-xs ${subtleText}`}
            >
              Last updated {new Date(dashboardData.last_updated).toLocaleString()}
            </motion.div>
          )}
        </div>
      </div>
    </ErrorBoundary>
  );
};

export default ModernDashboard;



