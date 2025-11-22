import React from 'react';
import { motion } from 'framer-motion';

const RecentActivity = ({ activities = [], darkMode }) => {
  // Use real activities from backend, show empty state if none
  const displayActivities = activities || [];

  const colorMap = {
    emerald: 'bg-emerald-500',
    blue: 'bg-blue-500',
    purple: 'bg-purple-500',
    yellow: 'bg-yellow-500'
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className={`p-6 rounded-xl shadow-lg ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}
    >
      <h3 className={`text-xl font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Recent Activity
      </h3>
      {displayActivities.length === 0 ? (
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`}>
          <p>No recent activity</p>
        </div>
      ) : (
        <div className="space-y-4">
          {displayActivities.map((activity, index) => (
          <motion.div
            key={activity.id}
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: index * 0.1 }}
            className="flex items-start space-x-3"
          >
            <div className={`w-2 h-2 ${colorMap[activity.color] || colorMap.emerald} rounded-full mt-2`}></div>
            <div className="flex-1">
              <p className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-600'}`}>
                {activity.message}
              </p>
              <p className={`text-xs mt-1 ${darkMode ? 'text-gray-500' : 'text-gray-400'}`}>
                {activity.time}
              </p>
            </div>
          </motion.div>
          ))}
        </div>
      )}
    </motion.div>
  );
};

export default RecentActivity;

