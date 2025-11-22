/**
 * Progress Widget - Progress Tracking Display
 * =========================================
 * Displays progress tracking data with charts and metrics.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { TrendingUp, Target, Calendar, Award } from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatNumber, formatPercentage } from '../Utils/dashboardUtils';
import './ProgressWidget.css';

const ProgressWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const progressData = data?.progress_data || {};
  
  return (
    <BaseWidget
      title="Progress Overview"
      subtitle="Your mental health journey"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="large"
      {...props}
    >
      <div className="progress-widget">
        <div className="progress-stats">
          <div className="stat-card">
            <div className="stat-icon">
              <Calendar size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{progressData.current_streak || 0}</div>
              <div className="stat-label">Current Streak</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <Target size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{progressData.total_sessions || 0}</div>
              <div className="stat-label">Total Sessions</div>
            </div>
          </div>
          
          <div className="stat-card">
            <div className="stat-icon">
              <TrendingUp size={24} />
            </div>
            <div className="stat-content">
              <div className="stat-value">{formatPercentage(progressData.completion_rate || 0, 100)}</div>
              <div className="stat-label">Completion Rate</div>
            </div>
          </div>
        </div>
        
        <div className="progress-chart">
          <h4>Weekly Progress</h4>
          <div className="chart-placeholder">
            <p>Progress chart will be displayed here</p>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

export default ProgressWidget;
