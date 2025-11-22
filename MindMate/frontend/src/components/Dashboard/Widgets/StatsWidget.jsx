/**
 * Stats Widget - User Statistics Display
 * =====================================
 * Displays key user statistics and achievements.
 * 
 * Features:
 * - User stats overview
 * - Progress indicators
 * - Achievement badges
 * - Interactive elements
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { 
  TrendingUp, 
  Calendar, 
  Target, 
  Award,
  Activity,
  Heart
} from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatNumber, formatPercentage, getValueColor } from '../Utils/dashboardUtils';
import './StatsWidget.css';

const StatsWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  // Extract stats data
  const stats = data?.user_stats || {};
  
  // Define stat items
  const statItems = [
    {
      id: 'total_sessions',
      label: 'Total Sessions',
      value: stats.total_sessions || 0,
      icon: Activity,
      color: 'blue',
      trend: '+12%'
    },
    {
      id: 'current_streak',
      label: 'Current Streak',
      value: stats.current_streak || 0,
      icon: Calendar,
      color: 'green',
      trend: '+3 days'
    },
    {
      id: 'wellness_score',
      label: 'Wellness Score',
      value: stats.wellness_score || 0,
      icon: Heart,
      color: 'purple',
      trend: '+5%',
      isPercentage: true
    },
    {
      id: 'achievements',
      label: 'Achievements',
      value: stats.achievements_unlocked || 0,
      icon: Award,
      color: 'orange',
      trend: '+2 new'
    }
  ];

  // Get color classes
  const getColorClasses = (color) => {
    const colorClasses = {
      blue: 'stat-blue',
      green: 'stat-green',
      purple: 'stat-purple',
      orange: 'stat-orange'
    };
    return colorClasses[color] || 'stat-blue';
  };

  // Render stat item
  const renderStatItem = (item) => {
    const IconComponent = item.icon;
    
    return (
      <motion.div
        key={item.id}
        className={`stat-item ${getColorClasses(item.color)}`}
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.3, delay: 0.1 }}
      >
        <div className="stat-icon">
          <IconComponent size={20} />
        </div>
        
        <div className="stat-content">
          <div className="stat-value">
            {item.isPercentage ? `${item.value}%` : formatNumber(item.value)}
          </div>
          <div className="stat-label">{item.label}</div>
          {item.trend && (
            <div className="stat-trend">
              <TrendingUp size={12} />
              <span>{item.trend}</span>
            </div>
          )}
        </div>
      </motion.div>
    );
  };

  return (
    <BaseWidget
    title="Your Progress"
    subtitle="Key statistics and achievements"
    loading={loading}
    error={error}
    onRefresh={onRefresh}
    darkMode={darkMode}
    size="large"
    {...props}
  >
    <div className="stats-widget">
      <div className="stats-grid">
        {statItems.map(renderStatItem)}
      </div>
      
      {/* Progress Summary */}
      {stats.total_sessions > 0 && (
        <motion.div
          className="progress-summary"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          transition={{ duration: 0.5, delay: 0.3 }}
        >
          <div className="summary-header">
            <h4>This Week's Progress</h4>
            <span className="summary-value">
              {stats.sessions_this_week || 0} sessions
            </span>
          </div>
          
          <div className="progress-bar">
            <div 
              className="progress-fill"
              style={{ 
                width: `${Math.min(100, ((stats.sessions_this_week || 0) / 7) * 100)}%` 
              }}
            />
          </div>
          
          <div className="progress-text">
            <span>Goal: 7 sessions per week</span>
            <span>
              {formatPercentage(stats.sessions_this_week || 0, 7)} complete
            </span>
          </div>
        </motion.div>
      )}
      
      {/* Quick Actions */}
      <div className="quick-stats-actions">
        <motion.button
          className="action-button primary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Activity size={16} />
          Start Session
        </motion.button>
        
        <motion.button
          className="action-button secondary"
          whileHover={{ scale: 1.05 }}
          whileTap={{ scale: 0.95 }}
        >
          <Target size={16} />
          Set Goals
        </motion.button>
      </div>
    </div>
  </BaseWidget>
  );
};

export default StatsWidget;
