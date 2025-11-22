import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  BarChart3, 
  TrendingUp, 
  Users, 
  MessageCircle, 
  ThumbsUp, 
  Heart, 
  Eye, 
  Clock, 
  Calendar, 
  Target, 
  Award, 
  Star, 
  Shield, 
  Zap,
  Download,
  Filter,
  RefreshCw
} from 'react-feather';

const CommunityAnalytics = ({ 
  stats, 
  contributors, 
  activity, 
  darkMode 
}) => {
  const [timeRange, setTimeRange] = useState('7d');
  const [activeMetric, setActiveMetric] = useState('engagement');

  const timeRanges = [
    { value: '1d', label: 'Last 24 Hours' },
    { value: '7d', label: 'Last 7 Days' },
    { value: '30d', label: 'Last 30 Days' },
    { value: '90d', label: 'Last 90 Days' },
    { value: '1y', label: 'Last Year' }
  ];

  const metrics = [
    { value: 'engagement', label: 'Engagement', icon: <Heart size={16} /> },
    { value: 'growth', label: 'Growth', icon: <TrendingUp size={16} /> },
    { value: 'activity', label: 'Activity', icon: <Activity size={16} /> },
    { value: 'quality', label: 'Quality', icon: <Star size={16} /> }
  ];

  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || 0}%`;
  };

  const getMetricColor = (metric) => {
    switch (metric) {
      case 'engagement':
        return 'text-green-600 bg-green-100';
      case 'growth':
        return 'text-blue-600 bg-blue-100';
      case 'activity':
        return 'text-purple-600 bg-purple-100';
      case 'quality':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getMetricColorDark = (metric) => {
    switch (metric) {
      case 'engagement':
        return 'text-green-400 bg-green-900';
      case 'growth':
        return 'text-blue-400 bg-blue-900';
      case 'activity':
        return 'text-purple-400 bg-purple-900';
      case 'quality':
        return 'text-orange-400 bg-orange-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const getTrendIcon = (trend) => {
    if (trend > 0) return <TrendingUp size={16} className="text-green-500" />;
    if (trend < 0) return <TrendingDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const getTrendColor = (trend) => {
    if (trend > 0) return 'text-green-600';
    if (trend < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getTrendColorDark = (trend) => {
    if (trend > 0) return 'text-green-400';
    if (trend < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const analyticsData = {
    engagement: {
      title: 'Engagement Metrics',
      description: 'Community interaction and participation levels',
      metrics: [
        { label: 'Daily Active Users', value: stats.daily_active_users || 0, trend: stats.daily_active_trend || 0 },
        { label: 'Weekly Active Users', value: stats.weekly_active_users || 0, trend: stats.weekly_active_trend || 0 },
        { label: 'Monthly Active Users', value: stats.monthly_active_users || 0, trend: stats.monthly_active_trend || 0 },
        { label: 'Engagement Rate', value: formatPercentage(stats.engagement_rate || 0), trend: stats.engagement_rate_trend || 0 }
      ]
    },
    growth: {
      title: 'Growth Metrics',
      description: 'Community expansion and member acquisition',
      metrics: [
        { label: 'New Members', value: stats.new_members || 0, trend: stats.new_members_trend || 0 },
        { label: 'Member Retention', value: formatPercentage(stats.member_retention || 0), trend: stats.member_retention_trend || 0 },
        { label: 'Growth Rate', value: formatPercentage(stats.growth_rate || 0), trend: stats.growth_rate_trend || 0 },
        { label: 'Churn Rate', value: formatPercentage(stats.churn_rate || 0), trend: stats.churn_rate_trend || 0 }
      ]
    },
    activity: {
      title: 'Activity Metrics',
      description: 'Content creation and community participation',
      metrics: [
        { label: 'Questions Asked', value: stats.questions_asked || 0, trend: stats.questions_asked_trend || 0 },
        { label: 'Answers Given', value: stats.answers_given || 0, trend: stats.answers_given_trend || 0 },
        { label: 'Content Quality', value: formatPercentage(stats.content_quality || 0), trend: stats.content_quality_trend || 0 },
        { label: 'Response Time', value: `${stats.avg_response_time || 0}h`, trend: stats.avg_response_time_trend || 0 }
      ]
    },
    quality: {
      title: 'Quality Metrics',
      description: 'Content quality and community health',
      metrics: [
        { label: 'Content Quality Score', value: formatPercentage(stats.content_quality_score || 0), trend: stats.content_quality_score_trend || 0 },
        { label: 'User Satisfaction', value: formatPercentage(stats.user_satisfaction || 0), trend: stats.user_satisfaction_trend || 0 },
        { label: 'Moderation Effectiveness', value: formatPercentage(stats.moderation_effectiveness || 0), trend: stats.moderation_effectiveness_trend || 0 },
        { label: 'Community Health', value: formatPercentage(stats.community_health || 0), trend: stats.community_health_trend || 0 }
      ]
    }
  };

  const currentData = analyticsData[activeMetric] || analyticsData.engagement;

  return (
    <div className={`community-analytics ${darkMode ? 'dark' : ''}`}>
      <div className="analytics-container">
        {/* Analytics Header */}
        <div className="analytics-header">
          <div className="header-content">
            <BarChart3 size={24} />
            <h2>Community Analytics</h2>
            <p>Insights and metrics for community performance</p>
          </div>
          
          <div className="header-actions">
            <div className="time-range-selector">
              <Calendar size={16} />
              <select 
                value={timeRange}
                onChange={(e) => setTimeRange(e.target.value)}
                className="time-range-select"
              >
                {timeRanges.map(range => (
                  <option key={range.value} value={range.value}>
                    {range.label}
                  </option>
                ))}
              </select>
            </div>
            
            <button className="action-btn">
              <Filter size={16} />
              <span>Filter</span>
            </button>
            
            <button className="action-btn">
              <Download size={16} />
              <span>Export</span>
            </button>
            
            <button className="action-btn">
              <RefreshCw size={16} />
              <span>Refresh</span>
            </button>
          </div>
        </div>

        {/* Analytics Navigation */}
        <div className="analytics-navigation">
          <div className="nav-tabs">
            {metrics.map((metric, index) => (
              <motion.button
                key={metric.value}
                className={`nav-tab ${activeMetric === metric.value ? 'active' : ''}`}
                onClick={() => setActiveMetric(metric.value)}
                initial={{ opacity: 0, y: -10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
              >
                <div className="tab-icon">
                  {metric.icon}
                </div>
                <span className="tab-label">{metric.label}</span>
              </motion.button>
            ))}
          </div>
        </div>

        {/* Analytics Content */}
        <div className="analytics-content">
          {/* Current Metric Overview */}
          <div className="metric-overview">
            <div className="overview-header">
              <h3>{currentData.title}</h3>
              <p>{currentData.description}</p>
            </div>
            
            <div className="metrics-grid">
              {(currentData.metrics || []).map((metric, index) => (
                <motion.div
                  key={metric.label}
                  className="metric-card"
                  initial={{ opacity: 0, scale: 0.8 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.05, y: -2 }}
                >
                  <div className="metric-header">
                    <span className="metric-label">{metric.label}</span>
                    <div className={`metric-trend ${darkMode ? getTrendColorDark(metric.trend) : getTrendColor(metric.trend)}`}>
                      {getTrendIcon(metric.trend)}
                      <span>{metric.trend > 0 ? '+' : ''}{metric.trend}%</span>
                    </div>
                  </div>
                  
                  <div className="metric-value">
                    {metric.value}
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Analytics Charts */}
          <div className="analytics-charts">
            <div className="chart-section">
              <h3>Performance Trends</h3>
              <div className="chart-placeholder">
                <BarChart3 size={48} />
                <p>Chart visualization would be implemented here</p>
              </div>
            </div>
            
            <div className="chart-section">
              <h3>User Engagement</h3>
              <div className="chart-placeholder">
                <TrendingUp size={48} />
                <p>Engagement trends chart would be implemented here</p>
              </div>
            </div>
          </div>

          {/* Top Performers */}
          <div className="top-performers">
            <h3>Top Performers</h3>
            <div className="performers-list">
              {contributors.slice(0, 5).map((contributor, index) => (
                <motion.div
                  key={contributor.id}
                  className="performer-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.3, delay: index * 0.1 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                >
                  <div className="performer-rank">
                    #{index + 1}
                  </div>
                  
                  <div className="performer-info">
                    <div className="performer-avatar">
                      {contributor.avatar ? (
                        <img src={contributor.avatar} alt={contributor.name} />
                      ) : (
                        <Users size={20} />
                      )}
                    </div>
                    
                    <div className="performer-details">
                      <span className="performer-name">{contributor.name}</span>
                      <span className="performer-score">{formatNumber(contributor.contribution_score || 0)} points</span>
                    </div>
                  </div>
                  
                  <div className="performer-stats">
                    <div className="stat-item">
                      <MessageCircle size={14} />
                      <span>{contributor.questions_count || 0}</span>
                    </div>
                    <div className="stat-item">
                      <ThumbsUp size={14} />
                      <span>{contributor.answers_count || 0}</span>
                    </div>
                    <div className="stat-item">
                      <Heart size={14} />
                      <span>{contributor.likes_received || 0}</span>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>

          {/* Analytics Summary */}
          <div className="analytics-summary">
            <h3>Summary</h3>
            <div className="summary-grid">
              <div className="summary-item">
                <Users size={20} />
                <div className="summary-content">
                  <span className="summary-value">{formatNumber(stats.total_members || 0)}</span>
                  <span className="summary-label">Total Members</span>
                </div>
              </div>
              
              <div className="summary-item">
                <MessageCircle size={20} />
                <div className="summary-content">
                  <span className="summary-value">{formatNumber(stats.total_questions || 0)}</span>
                  <span className="summary-label">Total Questions</span>
                </div>
              </div>
              
              <div className="summary-item">
                <ThumbsUp size={20} />
                <div className="summary-content">
                  <span className="summary-value">{formatNumber(stats.total_answers || 0)}</span>
                  <span className="summary-label">Total Answers</span>
                </div>
              </div>
              
              <div className="summary-item">
                <Heart size={20} />
                <div className="summary-content">
                  <span className="summary-value">{formatPercentage(stats.overall_engagement || 0)}</span>
                  <span className="summary-label">Overall Engagement</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityAnalytics;
