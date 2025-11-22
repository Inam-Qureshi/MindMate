import React from 'react';
import { motion } from 'framer-motion';
import { 
  Users, 
  MessageCircle, 
  TrendingUp, 
  Award, 
  Star, 
  Heart, 
  Clock, 
  Eye, 
  ThumbsUp, 
  Activity,
  BarChart3,
  Target,
  Trophy,
  Crown,
  Sparkles,
  Zap,
  Shield,
  HelpCircle,
  Calendar,
  ArrowUp,
  ArrowDown,
  Minus
} from 'react-feather';

const CommunityStats = ({ 
  stats, 
  loading, 
  darkMode 
}) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const formatPercentage = (num) => {
    return `${num?.toFixed(1) || 0}%`;
  };

  const getChangeIcon = (change) => {
    if (change > 0) return <ArrowUp size={16} className="text-green-500" />;
    if (change < 0) return <ArrowDown size={16} className="text-red-500" />;
    return <Minus size={16} className="text-gray-500" />;
  };

  const getChangeColor = (change) => {
    if (change > 0) return 'text-green-600';
    if (change < 0) return 'text-red-600';
    return 'text-gray-600';
  };

  const getChangeColorDark = (change) => {
    if (change > 0) return 'text-green-400';
    if (change < 0) return 'text-red-400';
    return 'text-gray-400';
  };

  const statCategories = [
    {
      title: 'Community Growth',
      icon: <TrendingUp size={24} />,
      stats: [
        {
          label: 'New Members This Month',
          value: stats.new_members_month || 0,
          change: stats.new_members_growth || 0,
          icon: <Users size={20} />
        },
        {
          label: 'Active Members',
          value: stats.active_members || 0,
          change: stats.active_members_growth || 0,
          icon: <Activity size={20} />
        },
        {
          label: 'Retention Rate',
          value: formatPercentage(stats.retention_rate || 0),
          change: stats.retention_growth || 0,
          icon: <Heart size={20} />
        }
      ]
    },
    {
      title: 'Content Activity',
      icon: <MessageCircle size={24} />,
      stats: [
        {
          label: 'Questions This Week',
          value: stats.questions_week || 0,
          change: stats.questions_week_growth || 0,
          icon: <MessageCircle size={20} />
        },
        {
          label: 'Answers This Week',
          value: stats.answers_week || 0,
          change: stats.answers_week_growth || 0,
          icon: <ThumbsUp size={20} />
        },
        {
          label: 'Response Rate',
          value: formatPercentage(stats.response_rate || 0),
          change: stats.response_rate_growth || 0,
          icon: <Target size={20} />
        }
      ]
    },
    {
      title: 'Engagement Metrics',
      icon: <Heart size={24} />,
      stats: [
        {
          label: 'Average Engagement',
          value: formatPercentage(stats.avg_engagement || 0),
          change: stats.engagement_growth || 0,
          icon: <Heart size={20} />
        },
        {
          label: 'Top Contributors',
          value: stats.top_contributors_count || 0,
          change: stats.top_contributors_growth || 0,
          icon: <Trophy size={20} />
        },
        {
          label: 'Quality Score',
          value: formatPercentage(stats.quality_score || 0),
          change: stats.quality_score_growth || 0,
          icon: <Star size={20} />
        }
      ]
    }
  ];

  const recentTrends = [
    {
      label: 'Daily Active Users',
      value: stats.daily_active_users || 0,
      trend: stats.daily_active_trend || 0,
      color: 'blue'
    },
    {
      label: 'Weekly Questions',
      value: stats.weekly_questions || 0,
      trend: stats.weekly_questions_trend || 0,
      color: 'green'
    },
    {
      label: 'Monthly Growth',
      value: formatPercentage(stats.monthly_growth || 0),
      trend: stats.monthly_growth_trend || 0,
      color: 'purple'
    },
    {
      label: 'Community Health',
      value: formatPercentage(stats.community_health || 0),
      trend: stats.community_health_trend || 0,
      color: 'orange'
    }
  ];

  const getTrendColor = (color) => {
    switch (color) {
      case 'blue':
        return 'text-blue-600 bg-blue-100';
      case 'green':
        return 'text-green-600 bg-green-100';
      case 'purple':
        return 'text-purple-600 bg-purple-100';
      case 'orange':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getTrendColorDark = (color) => {
    switch (color) {
      case 'blue':
        return 'text-blue-400 bg-blue-900';
      case 'green':
        return 'text-green-400 bg-green-900';
      case 'purple':
        return 'text-purple-400 bg-purple-900';
      case 'orange':
        return 'text-orange-400 bg-orange-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  return (
    <div className={`community-stats ${darkMode ? 'dark' : ''}`}>
      <div className="stats-container">
        {/* Stats Header */}
        <div className="stats-header">
          <div className="header-content">
            <BarChart3 size={24} />
            <h2>Community Statistics</h2>
            <p>Real-time insights into community activity and growth</p>
          </div>
        </div>

        {/* Stats Categories */}
        <div className="stats-categories">
          {statCategories.map((category, categoryIndex) => (
            <motion.div
              key={category.title}
              className="stats-category"
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: categoryIndex * 0.1 }}
            >
              <div className="category-header">
                <div className="category-icon">
                  {category.icon}
                </div>
                <h3>{category.title}</h3>
              </div>
              
              <div className="category-stats">
                {(category.stats || []).map((stat, statIndex) => (
                  <motion.div
                    key={stat.label}
                    className="stat-item"
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    transition={{ duration: 0.3, delay: (categoryIndex * 0.1) + (statIndex * 0.05) }}
                    whileHover={{ scale: 1.02, y: -2 }}
                  >
                    <div className="stat-icon">
                      {stat.icon}
                    </div>
                    <div className="stat-content">
                      <div className="stat-label">{stat.label}</div>
                      <div className="stat-value">
                        {loading ? (
                          <div className="loading-skeleton" />
                        ) : (
                          stat.value
                        )}
                      </div>
                      {stat.change !== 0 && (
                        <div className={`stat-change ${darkMode ? getChangeColorDark(stat.change) : getChangeColor(stat.change)}`}>
                          {getChangeIcon(stat.change)}
                          <span>{stat.change > 0 ? '+' : ''}{stat.change}%</span>
                        </div>
                      )}
                    </div>
                  </motion.div>
                ))}
              </div>
            </motion.div>
          ))}
        </div>

        {/* Recent Trends */}
        <div className="recent-trends">
          <div className="trends-header">
            <TrendingUp size={20} />
            <h3>Recent Trends</h3>
          </div>
          
          <div className="trends-grid">
            {recentTrends.map((trend, index) => (
              <motion.div
                key={trend.label}
                className={`trend-item ${darkMode ? getTrendColorDark(trend.color) : getTrendColor(trend.color)}`}
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05 }}
              >
                <div className="trend-content">
                  <div className="trend-label">{trend.label}</div>
                  <div className="trend-value">{trend.value}</div>
                  <div className="trend-change">
                    {getChangeIcon(trend.trend)}
                    <span>{trend.trend > 0 ? '+' : ''}{trend.trend}%</span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>

        {/* Community Health Score */}
        <div className="community-health">
          <div className="health-header">
            <Shield size={20} />
            <h3>Community Health Score</h3>
          </div>
          
          <div className="health-metrics">
            <div className="health-score">
              <div className="score-circle">
                <div className="score-value">
                  {loading ? (
                    <div className="loading-skeleton" />
                  ) : (
                    formatPercentage(stats.community_health || 0)
                  )}
                </div>
                <div className="score-label">Health Score</div>
              </div>
            </div>
            
            <div className="health-factors">
              <div className="factor-item">
                <div className="factor-label">Content Quality</div>
                <div className="factor-bar">
                  <div 
                    className="factor-fill"
                    style={{ width: `${stats.content_quality || 0}%` }}
                  />
                </div>
                <div className="factor-value">{formatPercentage(stats.content_quality || 0)}</div>
              </div>
              
              <div className="factor-item">
                <div className="factor-label">User Engagement</div>
                <div className="factor-bar">
                  <div 
                    className="factor-fill"
                    style={{ width: `${stats.user_engagement || 0}%` }}
                  />
                </div>
                <div className="factor-value">{formatPercentage(stats.user_engagement || 0)}</div>
              </div>
              
              <div className="factor-item">
                <div className="factor-label">Moderation Effectiveness</div>
                <div className="factor-bar">
                  <div 
                    className="factor-fill"
                    style={{ width: `${stats.moderation_effectiveness || 0}%` }}
                  />
                </div>
                <div className="factor-value">{formatPercentage(stats.moderation_effectiveness || 0)}</div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default CommunityStats;
