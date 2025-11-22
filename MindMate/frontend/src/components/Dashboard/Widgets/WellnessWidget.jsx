/**
 * Wellness Widget - Wellness Metrics Display
 * =========================================
 * Displays wellness metrics and mood trends.
 * 
 * Author: MindMate Team
 * Version: 2.0.0
 */

import React from 'react';
import { motion } from 'framer-motion';
import { Heart, TrendingUp, Activity, Zap } from 'react-feather';
import BaseWidget from './BaseWidget';
import { formatNumber } from '../Utils/dashboardUtils';
import './WellnessWidget.css';

const WellnessWidget = ({ 
  data, 
  loading, 
  error, 
  onRefresh, 
  darkMode,
  ...props 
}) => {
  const wellness = data?.wellness_metrics || {};
  
  return (
    <BaseWidget
      title="Wellness Overview"
      subtitle="Your mental health metrics"
      loading={loading}
      error={error}
      onRefresh={onRefresh}
      darkMode={darkMode}
      size="large"
      {...props}
    >
      <div className="wellness-widget">
        <div className="wellness-metrics">
          <div className="metric-card">
            <div className="metric-icon">
              <Heart size={20} />
            </div>
            <div className="metric-content">
              <div className="metric-value">{wellness.current_mood || 5}/10</div>
              <div className="metric-label">Current Mood</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">
              <Activity size={20} />
            </div>
            <div className="metric-content">
              <div className="metric-value">{wellness.stress_level || 5}/10</div>
              <div className="metric-label">Stress Level</div>
            </div>
          </div>
          
          <div className="metric-card">
            <div className="metric-icon">
              <Zap size={20} />
            </div>
            <div className="metric-content">
              <div className="metric-value">{wellness.energy_level || 5}/10</div>
              <div className="metric-label">Energy Level</div>
            </div>
          </div>
        </div>
        
        <div className="wellness-score">
          <h4>Overall Wellness Score</h4>
          <div className="score-circle">
            <div className="score-value">{Math.round(wellness.wellness_score || 50)}%</div>
          </div>
        </div>
      </div>
    </BaseWidget>
  );
};

export default WellnessWidget;
