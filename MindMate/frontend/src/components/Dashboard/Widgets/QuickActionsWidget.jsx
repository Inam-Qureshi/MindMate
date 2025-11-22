/**
 * Quick Actions Widget - Quick Action Buttons
 * ===========================================
 * Displays quick action buttons for common tasks.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Activity, BookOpen, Heart, Calendar, Users, TrendingUp } from 'react-feather';
import BaseWidget from './BaseWidget';
import './QuickActionsWidget.css';

const QuickActionsWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const actions = data?.quick_actions || [
    {
      id: 'start_exercise',
      title: 'Start Exercise',
      description: 'Begin a new exercise session',
      icon: Activity,
      route: '/exercises',
      color: 'blue'
    },
    {
      id: 'journal_entry',
      title: 'Journal Entry',
      description: 'Write in your journal',
      icon: BookOpen,
      route: '/journal',
      color: 'green'
    },
    {
      id: 'mood_check',
      title: 'Mood Check',
      description: 'Log your current mood',
      icon: Heart,
      route: '/mood',
      color: 'purple'
    },
    {
      id: 'book_appointment',
      title: 'Book Appointment',
      description: 'Schedule with a specialist',
      icon: Calendar,
      route: '/appointments',
      color: 'orange'
    },
    {
      id: 'community',
      title: 'Community',
      description: 'Connect with others',
      icon: Users,
      route: '/forum',
      color: 'teal'
    },
    {
      id: 'progress_tracker',
      title: 'Progress Tracker',
      description: 'View your progress',
      icon: TrendingUp,
      route: '/progress-tracker',
      color: 'indigo'
    }
  ];
  
  const getColorClasses = (color) => {
    const colorClasses = {
      blue: 'action-blue',
      green: 'action-green',
      purple: 'action-purple',
      orange: 'action-orange',
      teal: 'action-teal',
      indigo: 'action-indigo'
    };
    return colorClasses[color] || 'action-blue';
  };
  
  return (
    <BaseWidget
      title="Quick Actions"
      subtitle="Common tasks and features"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="medium"
      {...props}
    >
      <div className="quick-actions-widget">
        <div className="actions-grid">
          {actions.map((action, index) => {
            const IconComponent = action.icon;
            return (
              <motion.button
                key={action.id}
                className={`action-button ${getColorClasses(action.color)}`}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => {
                  // Handle navigation
                  console.log(`Navigate to ${action.route}`);
                }}
              >
                <div className="action-icon">
                  <IconComponent size={20} />
                </div>
                <div className="action-content">
                  <h4>{action.title}</h4>
                  <p>{action.description}</p>
                </div>
              </motion.button>
            );
          })}
        </div>
      </div>
    </BaseWidget>
  );
};

export default QuickActionsWidget;
