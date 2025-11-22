import React from 'react';
import { motion } from 'framer-motion';
import { 
  Trophy, 
  Award, 
  Star, 
  Crown, 
  Medal, 
  Target, 
  TrendingUp, 
  MessageCircle, 
  ThumbsUp, 
  Heart, 
  Eye, 
  Users, 
  Calendar, 
  Zap,
  Shield,
  Sparkles,
  ArrowRight,
  MoreVertical
} from 'react-feather';

const TopContributors = ({ 
  contributors, 
  loading, 
  showFullList = false,
  darkMode 
}) => {
  const formatNumber = (num) => {
    if (num >= 1000000) return `${(num / 1000000).toFixed(1)}M`;
    if (num >= 1000) return `${(num / 1000).toFixed(1)}K`;
    return num?.toString() || '0';
  };

  const getRankIcon = (rank) => {
    switch (rank) {
      case 1:
        return <Crown size={20} className="text-yellow-500" />;
      case 2:
        return <Medal size={20} className="text-gray-400" />;
      case 3:
        return <Award size={20} className="text-orange-500" />;
      default:
        return <Trophy size={16} className="text-blue-500" />;
    }
  };

  const getRankColor = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-600 bg-yellow-100';
      case 2:
        return 'text-gray-600 bg-gray-100';
      case 3:
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-blue-600 bg-blue-100';
    }
  };

  const getRankColorDark = (rank) => {
    switch (rank) {
      case 1:
        return 'text-yellow-400 bg-yellow-900';
      case 2:
        return 'text-gray-400 bg-gray-900';
      case 3:
        return 'text-orange-400 bg-orange-900';
      default:
        return 'text-blue-400 bg-blue-900';
    }
  };

  const getBadgeIcon = (badge) => {
    switch (badge) {
      case 'expert':
        return <Star size={16} />;
      case 'helper':
        return <Heart size={16} />;
      case 'contributor':
        return <MessageCircle size={16} />;
      case 'moderator':
        return <Shield size={16} />;
      default:
        return <Award size={16} />;
    }
  };

  const getBadgeColor = (badge) => {
    switch (badge) {
      case 'expert':
        return 'text-purple-600 bg-purple-100';
      case 'helper':
        return 'text-green-600 bg-green-100';
      case 'contributor':
        return 'text-blue-600 bg-blue-100';
      case 'moderator':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getBadgeColorDark = (badge) => {
    switch (badge) {
      case 'expert':
        return 'text-purple-400 bg-purple-900';
      case 'helper':
        return 'text-green-400 bg-green-900';
      case 'contributor':
        return 'text-blue-400 bg-blue-900';
      case 'moderator':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const getContributorType = (userType) => {
    switch (userType) {
      case 'specialist':
        return 'Specialist';
      case 'patient':
        return 'Patient';
      case 'admin':
        return 'Admin';
      default:
        return 'Member';
    }
  };

  const getContributorTypeColor = (userType) => {
    switch (userType) {
      case 'specialist':
        return 'text-blue-600 bg-blue-100';
      case 'patient':
        return 'text-green-600 bg-green-100';
      case 'admin':
        return 'text-red-600 bg-red-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getContributorTypeColorDark = (userType) => {
    switch (userType) {
      case 'specialist':
        return 'text-blue-400 bg-blue-900';
      case 'patient':
        return 'text-green-400 bg-green-900';
      case 'admin':
        return 'text-red-400 bg-red-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const displayContributors = showFullList ? contributors : contributors.slice(0, 5);

  return (
    <div className={`top-contributors ${darkMode ? 'dark' : ''}`}>
      <div className="contributors-container">
        {/* Contributors Header */}
        <div className="contributors-header">
          <div className="header-content">
            <Trophy size={24} />
            <h2>{showFullList ? 'All Contributors' : 'Top Contributors'}</h2>
            <p>Community members making the biggest impact</p>
          </div>
          
          {!showFullList && contributors.length > 5 && (
            <button className="view-all-btn">
              <span>View All</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Contributors List */}
        <div className="contributors-list">
          {loading ? (
            <div className="loading-container">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="contributor-skeleton">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-content">
                    <div className="skeleton-name" />
                    <div className="skeleton-stats" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayContributors.length === 0 ? (
            <div className="empty-contributors">
              <Trophy size={48} />
              <h3>No Contributors Yet</h3>
              <p>Be the first to contribute to the community!</p>
            </div>
          ) : (
            displayContributors.map((contributor, index) => (
              <motion.div
                key={contributor.id}
                className="contributor-item"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3, delay: index * 0.1 }}
                whileHover={{ scale: 1.02, y: -2 }}
              >
                {/* Rank */}
                <div className="contributor-rank">
                  <div className={`rank-badge ${darkMode ? getRankColorDark(index + 1) : getRankColor(index + 1)}`}>
                    {getRankIcon(index + 1)}
                    <span>#{index + 1}</span>
                  </div>
                </div>

                {/* Contributor Info */}
                <div className="contributor-info">
                  <div className="contributor-avatar">
                    {contributor.avatar ? (
                      <img src={contributor.avatar} alt={contributor.name} />
                    ) : (
                      <Users size={20} />
                    )}
                  </div>
                  
                  <div className="contributor-details">
                    <div className="contributor-name">
                      <h4>{contributor.name}</h4>
                      <div className={`contributor-type ${darkMode ? getContributorTypeColorDark(contributor.user_type) : getContributorTypeColor(contributor.user_type)}`}>
                        {getContributorType(contributor.user_type)}
                      </div>
                    </div>
                    
                    <div className="contributor-stats">
                      <div className="stat-item">
                        <MessageCircle size={14} />
                        <span>{formatNumber(contributor.questions_count || 0)} Questions</span>
                      </div>
                      <div className="stat-item">
                        <ThumbsUp size={14} />
                        <span>{formatNumber(contributor.answers_count || 0)} Answers</span>
                      </div>
                      <div className="stat-item">
                        <Heart size={14} />
                        <span>{formatNumber(contributor.likes_received || 0)} Likes</span>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Contributor Score */}
                <div className="contributor-score">
                  <div className="score-value">
                    {formatNumber(contributor.contribution_score || 0)}
                  </div>
                  <div className="score-label">Points</div>
                </div>

                {/* Contributor Badges */}
                <div className="contributor-badges">
                  {contributor.badges?.map((badge, badgeIndex) => (
                    <div
                      key={badgeIndex}
                      className={`badge ${darkMode ? getBadgeColorDark(badge.type) : getBadgeColor(badge.type)}`}
                    >
                      {getBadgeIcon(badge.type)}
                      <span>{badge.name}</span>
                    </div>
                  ))}
                </div>

                {/* Contributor Actions */}
                <div className="contributor-actions">
                  <button className="action-btn">
                    <Eye size={16} />
                    <span>View Profile</span>
                  </button>
                  
                  <button className="action-btn">
                    <MessageCircle size={16} />
                    <span>Message</span>
                  </button>
                  
                  <button className="action-btn">
                    <MoreVertical size={16} />
                  </button>
                </div>
              </motion.div>
            ))
          )}
        </div>

        {/* Contributors Summary */}
        {!showFullList && contributors.length > 0 && (
          <div className="contributors-summary">
            <div className="summary-stats">
              <div className="summary-item">
                <Users size={16} />
                <span>{contributors.length} Total Contributors</span>
              </div>
              <div className="summary-item">
                <Trophy size={16} />
                <span>{contributors.filter(c => c.contribution_score > 100).length} High Performers</span>
              </div>
              <div className="summary-item">
                <TrendingUp size={16} />
                <span>{contributors.filter(c => c.is_active).length} Active This Week</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default TopContributors;
