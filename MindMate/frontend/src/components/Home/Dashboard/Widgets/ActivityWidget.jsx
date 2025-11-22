import { motion } from 'framer-motion';
import {
  Activity,
  BookOpen,
  Calendar,
  Heart,
  Clipboard,
  Award,
  Clock,
} from 'react-feather';
import { formatDistanceToNow } from 'date-fns';

const ActivityWidget = ({ activities, darkMode, onViewAll, variant = 'default' }) => {
  const wrapperClasses =
    variant === 'minimal'
      ? `rounded-2xl border p-6 ${
          darkMode ? 'border-gray-800/70 bg-gray-900/70 text-gray-100' : 'border-slate-200 bg-white text-slate-900'
        }`
      : `rounded-2xl p-6 ${
          darkMode
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
            : 'bg-white shadow-lg border border-gray-100'
        }`;

  if (!activities || activities.length === 0) {
    return (
      <div className={wrapperClasses}>
        <h3
          className={`text-xl font-bold mb-4 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          Recent Activity
        </h3>
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Activity className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No recent activity</p>
        </div>
      </div>
    );
  }

  const getActivityIcon = (type) => {
    const icons = {
      exercise: Activity,
      journal: BookOpen,
      appointment: Calendar,
      mood: Heart,
      assessment: Clipboard,
      achievement: Award,
    };
    return icons[type?.toLowerCase()] || Clock;
  };

  const getActivityColor = (type) => {
    const colors = {
      exercise: darkMode ? 'text-blue-400 bg-blue-500/10' : 'text-blue-600 bg-blue-50',
      journal: darkMode ? 'text-purple-400 bg-purple-500/10' : 'text-purple-600 bg-purple-50',
      appointment: darkMode ? 'text-green-400 bg-green-500/10' : 'text-green-600 bg-green-50',
      mood: darkMode ? 'text-yellow-400 bg-yellow-500/10' : 'text-yellow-600 bg-yellow-50',
      assessment: darkMode ? 'text-indigo-400 bg-indigo-500/10' : 'text-indigo-600 bg-indigo-50',
      achievement: darkMode ? 'text-orange-400 bg-orange-500/10' : 'text-orange-600 bg-orange-50',
    };
    return colors[type?.toLowerCase()] || (darkMode ? 'text-gray-400 bg-gray-500/10' : 'text-gray-600 bg-gray-50');
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  return (
    <div className={wrapperClasses}>
      <div className="flex items-center justify-between mb-6">
        <h3
          className={`text-xl font-bold ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          Recent Activity
        </h3>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className={`text-sm font-medium transition-colors ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            }`}
          >
            View All
          </button>
        )}
      </div>
      <div className="space-y-3">
        {activities.slice(0, 5).map((activity, index) => {
          const Icon = getActivityIcon(activity.type);
          const colorClass = getActivityColor(activity.type);

          return (
            <motion.div
              key={activity.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`flex items-start gap-3 rounded-lg p-3 transition-colors ${
                variant === 'minimal'
                  ? darkMode
                    ? 'border border-gray-800/40 bg-gray-900/60 hover:border-gray-700'
                    : 'border border-slate-200 bg-slate-50 hover:border-slate-300'
                  : darkMode
                  ? 'bg-gray-700/30 hover:bg-gray-700/50'
                  : 'bg-gray-50 hover:bg-gray-100'
              }`}
            >
              <div className={`p-2 rounded-lg ${colorClass}`}>
                <Icon className="w-4 h-4" />
              </div>
              <div className="flex-1 min-w-0">
                <p
                  className={`font-medium mb-1 ${
                    darkMode ? 'text-gray-200' : 'text-gray-900'
                  }`}
                >
                  {activity.title || activity.description || 'Activity'}
                </p>
                {activity.description && activity.description !== activity.title && (
                  <p
                    className={`text-sm mb-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}
                  >
                    {activity.description}
                  </p>
                )}
                {activity.timestamp && (
                  <p
                    className={`text-xs ${
                      darkMode ? 'text-gray-500' : 'text-gray-500'
                    }`}
                  >
                    {formatTimestamp(activity.timestamp)}
                  </p>
                )}
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default ActivityWidget;

