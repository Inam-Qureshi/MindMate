/**
 * Activity Widget - Recent Activity Feed
 * =====================================
 * Displays recent user activities and actions.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Heart, Calendar } from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatRelativeTime } from '../Utils/dashboardUtils';
import './ActivityWidget.css';

const ActivityWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const activities = data?.recent_activity || [];
  
  const getActivityIcon = (type) => {
    const icons = {
      exercise: Activity,
      journal: BookOpen,
      mood: Heart,
      appointment: Calendar
    };
    return icons[type] || Activity;
  };
  
  return (
    <BaseWidget
      title="Recent Activity"
      subtitle="Your latest actions"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="medium"
      {...props}
    >
      <div className="activity-widget">
        {activities.length > 0 ? (
          <div className="activity-list">
            {activities.map((activity, index) => {
              const IconComponent = getActivityIcon(activity.type);
              return (
                <motion.div
                  key={activity.id}
                  className="activity-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                >
                  <div className="activity-icon">
                    <IconComponent size={16} />
                  </div>
                  <div className="activity-content">
                    <h4>{activity.title}</h4>
                    <p>{activity.description}</p>
                    <span className="activity-time">
                      {formatRelativeTime(activity.timestamp)}
                    </span>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          <div className="no-activity">
            <Activity size={48} />
            <h3>No recent activity</h3>
            <p>Start using the platform to see your activity here</p>
          </div>
        )}
      </div>
    </BaseWidget>
  );
};

export default ActivityWidget;
