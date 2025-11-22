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
  HelpCircle
} from 'react-feather';

const CommunityHeader = ({ 
  stats, 
  loading, 
  darkMode 
}) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const getStatIcon = (statType) => {
    switch (statType) {
      case 'members':
        return <Users size={20} />;
      case 'questions':
        return <MessageCircle size={20} />;
      case 'answers':
        return <ThumbsUp size={20} />;
      case 'activity':
        return <Activity size={20} />;
      case 'growth':
        return <TrendingUp size={20} />;
      case 'engagement':
        return <Heart size={20} />;
      default:
        return <BarChart3 size={20} />;
    }
  };

  const getStatColor = (statType) => {
    switch (statType) {
      case 'members':
        return 'text-blue-600 bg-blue-100';
      case 'questions':
        return 'text-green-600 bg-green-100';
      case 'answers':
        return 'text-purple-600 bg-purple-100';
      case 'activity':
        return 'text-orange-600 bg-orange-100';
      case 'growth':
        return 'text-pink-600 bg-pink-100';
      case 'engagement':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getStatColorDark = (statType) => {
    switch (statType) {
      case 'members':
        return 'text-blue-400 bg-blue-900';
      case 'questions':
        return 'text-green-400 bg-green-900';
      case 'answers':
        return 'text-purple-400 bg-purple-900';
      case 'activity':
        return 'text-orange-400 bg-orange-900';
      case 'growth':
        return 'text-pink-400 bg-pink-900';
      case 'engagement':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const statItems = [
    {
      type: 'members',
      label: 'Community Members',
      value: stats.total_members || 0,
      change: stats.members_growth || 0,
      icon: <Users size={20} />
    },
    {
      type: 'questions',
      label: 'Questions Asked',
      value: stats.total_questions || 0,
      change: stats.questions_growth || 0,
      icon: <MessageCircle size={20} />
    },
    {
      type: 'answers',
      label: 'Answers Given',
      value: stats.total_answers || 0,
      change: stats.answers_growth || 0,
      icon: <ThumbsUp size={20} />
    },
    {
      type: 'activity',
      label: 'Active Today',
      value: stats.active_today || 0,
      change: stats.activity_growth || 0,
      icon: <Activity size={20} />
    },
    {
      type: 'growth',
      label: 'Growth Rate',
      value: `${stats.growth_rate || 0}%`,
      change: stats.growth_change || 0,
      icon: <TrendingUp size={20} />
    },
    {
      type: 'engagement',
      label: 'Engagement',
      value: `${stats.engagement_rate || 0}%`,
      change: stats.engagement_change || 0,
      icon: <Heart size={20} />
    }
  ];

  return (
    <div className={`community-header ${darkMode ? 'dark' : ''}`}>
      <div className="header-container">
        {/* Header Content */}
        <div className="header-content">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="header-brand"
          >
            <div className="brand-icon">
              <Users size={32} />
            </div>
            <div className="brand-text">
              <h1>Community Hub</h1>
              <p>Connect, share, and grow together</p>
            </div>
          </motion.div>
        </div>

        {/* Community Stats */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.2 }}
          className="community-stats"
        >
          <div className="stats-grid">
            {statItems.map((stat, index) => (
              <motion.div
                key={stat.type}
                className={`stat-card ${darkMode ? 'dark' : ''}`}
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.05, y: -2 }}
              >
                <div className="stat-icon">
                  {stat.icon}
                </div>
                <div className="stat-content">
                  <div className="stat-value">
                    {loading ? (
                      <div className="loading-skeleton" />
                    ) : (
                      formatNumber(stat.value)
                    )}
                  </div>
                  <div className="stat-label">{stat.label}</div>
                  {stat.change !== 0 && (
                    <div className={`stat-change ${stat.change > 0 ? 'positive' : 'negative'}`}>
                      {stat.change > 0 ? '+' : ''}{stat.change}%
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* Community Highlights */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.4 }}
          className="community-highlights"
        >
          <div className="highlights-container">
            <div className="highlight-item">
              <div className="highlight-icon">
                <Trophy size={20} />
              </div>
              <div className="highlight-content">
                <span className="highlight-label">Top Contributor</span>
                <span className="highlight-value">{stats.top_contributor || 'Dr. Sarah Johnson'}</span>
              </div>
            </div>
            
            <div className="highlight-item">
              <div className="highlight-icon">
                <Star size={20} />
              </div>
              <div className="highlight-content">
                <span className="highlight-label">Most Helpful</span>
                <span className="highlight-value">{stats.most_helpful || 'John Doe'}</span>
              </div>
            </div>
            
            <div className="highlight-item">
              <div className="highlight-icon">
                <Crown size={20} />
              </div>
              <div className="highlight-content">
                <span className="highlight-label">Community Leader</span>
                <span className="highlight-value">{stats.community_leader || 'Dr. Mike Chen'}</span>
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default CommunityHeader;
