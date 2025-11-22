/**
 * Notifications Widget - Notifications Display
 * ===========================================
 * Displays user notifications and alerts.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Bell, Calendar, Award, AlertCircle } from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatRelativeTime } from '../Utils/dashboardUtils';
import './NotificationsWidget.css';

const NotificationsWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const notifications = data?.notifications || [];
  
  const getNotificationIcon = (type) => {
    const icons = {
      appointment: Calendar,
      achievement: Award,
      reminder: Bell,
      system: AlertCircle
    };
    return icons[type] || Bell;
  };
  
  return (
    <BaseWidget
      title="Notifications"
      subtitle="Recent alerts and updates"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="small"
      {...props}
    >
      <div className="notifications-widget">
        {notifications.length > 0 ? (
          <div className="notifications-list">
            {notifications.slice(0, 3).map((notification, index) => {
              const IconComponent = getNotificationIcon(notification.type);
              return (
                <motion.div
                  key={notification.id}
                  className={`notification-item ${!notification.is_read ? 'unread' : ''}`}
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="notification-icon">
                    <IconComponent size={16} />
                  </div>
                  <div className="notification-content">
                    <h4>{notification.title}</h4>
                    <p>{notification.message}</p>
                    <span className="notification-time">
                      {formatRelativeTime(notification.created_at)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="no-notifications">
            <Bell size={48} />
            <h3>No notifications</h3>
            <p>You're all caught up!</p>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};

export default NotificationsWidget;
