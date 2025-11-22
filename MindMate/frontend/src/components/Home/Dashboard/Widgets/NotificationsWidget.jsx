import { motion } from 'framer-motion';
import { Bell, X, CheckCircle, AlertCircle, Info, Calendar, Award } from 'react-feather';
import { formatDistanceToNow } from 'date-fns';

const NotificationsWidget = ({ notifications, darkMode, onViewAll, onMarkRead }) => {
  if (!notifications || notifications.length === 0) {
    return (
      <div
        className={`rounded-2xl p-6 ${
          darkMode
            ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
            : 'bg-white shadow-lg border border-gray-100'
        }`}
      >
        <h3
          className={`text-xl font-bold mb-4 ${
            darkMode ? 'text-gray-100' : 'text-gray-900'
          }`}
        >
          Notifications
        </h3>
        <div className={`text-center py-8 ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          <Bell className={`w-12 h-12 mx-auto mb-3 ${darkMode ? 'text-gray-600' : 'text-gray-400'}`} />
          <p>No notifications</p>
        </div>
      </div>
    );
  }

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const getNotificationIcon = (type) => {
    const icons = {
      appointment: Calendar,
      reminder: Bell,
      achievement: Award,
      system: Info,
      wellness: AlertCircle,
    };
    return icons[type?.toLowerCase()] || Bell;
  };

  const getNotificationColor = (type, priority = 3) => {
    if (priority >= 4) {
      return darkMode
        ? 'bg-red-500/20 border-red-500/50'
        : 'bg-red-50 border-red-200';
    }
    const colors = {
      appointment: darkMode ? 'bg-blue-500/20 border-blue-500/50' : 'bg-blue-50 border-blue-200',
      reminder: darkMode ? 'bg-yellow-500/20 border-yellow-500/50' : 'bg-yellow-50 border-yellow-200',
      achievement: darkMode ? 'bg-green-500/20 border-green-500/50' : 'bg-green-50 border-green-200',
      system: darkMode ? 'bg-gray-500/20 border-gray-500/50' : 'bg-gray-50 border-gray-200',
      wellness: darkMode ? 'bg-purple-500/20 border-purple-500/50' : 'bg-purple-50 border-purple-200',
    };
    return colors[type?.toLowerCase()] || colors.system;
  };

  const formatTimestamp = (timestamp) => {
    try {
      const date = new Date(timestamp);
      return formatDistanceToNow(date, { addSuffix: true });
    } catch {
      return '';
    }
  };

  const handleMarkRead = (notificationId) => {
    if (onMarkRead) {
      onMarkRead(notificationId);
    }
  };

  return (
    <div
      className={`rounded-2xl p-6 ${
        darkMode
          ? 'bg-gray-800/50 backdrop-blur-sm border border-gray-700'
          : 'bg-white shadow-lg border border-gray-100'
      }`}
    >
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center gap-2">
          <h3
            className={`text-xl font-bold ${
              darkMode ? 'text-gray-100' : 'text-gray-900'
            }`}
          >
            Notifications
          </h3>
          {unreadCount > 0 && (
            <span
              className={`px-2 py-1 text-xs font-bold rounded-full ${
                darkMode ? 'bg-red-500 text-white' : 'bg-red-500 text-white'
              }`}
            >
              {unreadCount}
            </span>
          )}
        </div>
        {onViewAll && (
          <button
            onClick={onViewAll}
            className={`text-sm font-medium ${
              darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
            } transition-colors`}
          >
            View All
          </button>
        )}
      </div>
      <div className="space-y-3">
        {notifications.slice(0, 5).map((notification, index) => {
          const Icon = getNotificationIcon(notification.type);
          const isUnread = !notification.is_read;

          return (
            <motion.div
              key={notification.id || index}
              initial={{ opacity: 0, x: -20 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-4 rounded-xl border ${
                getNotificationColor(notification.type, notification.priority)
              } ${isUnread ? 'ring-2 ring-offset-2 ring-blue-500/50' : ''} transition-all`}
            >
              <div className="flex items-start gap-3">
                <div
                  className={`p-2 rounded-lg ${
                    darkMode ? 'bg-gray-700/50' : 'bg-white/50'
                  }`}
                >
                  <Icon className={`w-4 h-4 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-start justify-between gap-2">
                    <div className="flex-1">
                      <p
                        className={`font-semibold mb-1 ${
                          darkMode ? 'text-gray-100' : 'text-gray-900'
                        }`}
                      >
                        {notification.title}
                      </p>
                      <p
                        className={`text-sm mb-2 ${
                          darkMode ? 'text-gray-300' : 'text-gray-700'
                        }`}
                      >
                        {notification.message}
                      </p>
                      {notification.created_at && (
                        <p
                          className={`text-xs ${
                            darkMode ? 'text-gray-500' : 'text-gray-500'
                          }`}
                        >
                          {formatTimestamp(notification.created_at)}
                        </p>
                      )}
                    </div>
                    {isUnread && (
                      <button
                        onClick={() => handleMarkRead(notification.id)}
                        className={`p-1 rounded ${
                          darkMode ? 'hover:bg-gray-700' : 'hover:bg-gray-100'
                        } transition-colors`}
                        title="Mark as read"
                      >
                        <CheckCircle className={`w-4 h-4 ${darkMode ? 'text-gray-400' : 'text-gray-500'}`} />
                      </button>
                    )}
                  </div>
                  {notification.action_url && (
                    <a
                      href={notification.action_url}
                      className={`text-xs font-medium mt-2 inline-block ${
                        darkMode ? 'text-blue-400 hover:text-blue-300' : 'text-blue-600 hover:text-blue-700'
                      } transition-colors`}
                    >
                      View Details →
                    </a>
                  )}
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

export default NotificationsWidget;

