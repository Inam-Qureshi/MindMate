import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Activity, 
  MessageCircle, 
  ThumbsUp, 
  Heart, 
  Star, 
  Award, 
  Trophy, 
  Crown, 
  Users, 
  User, 
  Clock, 
  Eye, 
  TrendingUp, 
  Zap, 
  Shield, 
  HelpCircle,
  ArrowRight,
  MoreVertical,
  Filter,
  Search
} from 'react-feather';

const RecentActivity = ({ 
  activity, 
  loading, 
  showFullList = false,
  darkMode 
}) => {
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

  const formatTimeAgo = (dateString) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffMs = now - date;
    const diffMins = Math.floor(diffMs / (1000 * 60));
    const diffHours = Math.floor(diffMins / 60);
    const diffDays = Math.floor(diffHours / 24);

    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    if (diffHours < 24) return `${diffHours}h ago`;
    if (diffDays < 7) return `${diffDays}d ago`;
    return date.toLocaleDateString();
  };

  const getActivityIcon = (type) => {
    switch (type) {
      case 'question_asked':
        return <MessageCircle size={16} />;
      case 'answer_given':
        return <ThumbsUp size={16} />;
      case 'question_answered':
        return <Award size={16} />;
      case 'badge_earned':
        return <Trophy size={16} />;
      case 'milestone_reached':
        return <Crown size={16} />;
      case 'new_member':
        return <Users size={16} />;
      case 'moderation_action':
        return <Shield size={16} />;
      case 'community_highlight':
        return <Star size={16} />;
      default:
        return <Activity size={16} />;
    }
  };

  const getActivityColor = (type) => {
    switch (type) {
      case 'question_asked':
        return 'text-blue-600 bg-blue-100';
      case 'answer_given':
        return 'text-green-600 bg-green-100';
      case 'question_answered':
        return 'text-purple-600 bg-purple-100';
      case 'badge_earned':
        return 'text-yellow-600 bg-yellow-100';
      case 'milestone_reached':
        return 'text-orange-600 bg-orange-100';
      case 'new_member':
        return 'text-pink-600 bg-pink-100';
      case 'moderation_action':
        return 'text-red-600 bg-red-100';
      case 'community_highlight':
        return 'text-indigo-600 bg-indigo-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getActivityColorDark = (type) => {
    switch (type) {
      case 'question_asked':
        return 'text-blue-400 bg-blue-900';
      case 'answer_given':
        return 'text-green-400 bg-green-900';
      case 'question_answered':
        return 'text-purple-400 bg-purple-900';
      case 'badge_earned':
        return 'text-yellow-400 bg-yellow-900';
      case 'milestone_reached':
        return 'text-orange-400 bg-orange-900';
      case 'new_member':
        return 'text-pink-400 bg-pink-900';
      case 'moderation_action':
        return 'text-red-400 bg-red-900';
      case 'community_highlight':
        return 'text-indigo-400 bg-indigo-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  const getActivityLabel = (type) => {
    switch (type) {
      case 'question_asked':
        return 'Asked a question';
      case 'answer_given':
        return 'Answered a question';
      case 'question_answered':
        return 'Question was answered';
      case 'badge_earned':
        return 'Earned a badge';
      case 'milestone_reached':
        return 'Reached a milestone';
      case 'new_member':
        return 'Joined the community';
      case 'moderation_action':
        return 'Moderation action taken';
      case 'community_highlight':
        return 'Community highlight';
      default:
        return 'Activity';
    }
  };

  const filterOptions = [
    { value: 'all', label: 'All Activity' },
    { value: 'questions', label: 'Questions' },
    { value: 'answers', label: 'Answers' },
    { value: 'badges', label: 'Badges' },
    { value: 'milestones', label: 'Milestones' },
    { value: 'members', label: 'New Members' }
  ];

  const filteredActivity = activity.filter(item => {
    const matchesFilter = filter === 'all' || item.type.includes(filter);
    const matchesSearch = searchQuery === '' || 
      item.user_name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.description.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesFilter && matchesSearch;
  });

  const displayActivity = showFullList ? filteredActivity : filteredActivity.slice(0, 10);

  return (
    <div className={`recent-activity ${darkMode ? 'dark' : ''}`}>
      <div className="activity-container">
        {/* Activity Header */}
        <div className="activity-header">
          <div className="header-content">
            <Activity size={24} />
            <h2>{showFullList ? 'All Activity' : 'Recent Activity'}</h2>
            <p>Latest community interactions and achievements</p>
          </div>
          
          {!showFullList && activity.length > 10 && (
            <button className="view-all-btn">
              <span>View All</span>
              <ArrowRight size={16} />
            </button>
          )}
        </div>

        {/* Activity Filters */}
        <div className="activity-filters">
          <div className="filter-group">
            <Filter size={16} />
            <select 
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
              className="filter-select"
            >
              {filterOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="search-group">
            <Search size={16} />
            <input
              type="text"
              placeholder="Search activity..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="search-input"
            />
          </div>
        </div>

        {/* Activity List */}
        <div className="activity-list">
          {loading ? (
            <div className="loading-container">
              {[...Array(5)].map((_, index) => (
                <div key={index} className="activity-skeleton">
                  <div className="skeleton-avatar" />
                  <div className="skeleton-content">
                    <div className="skeleton-text" />
                    <div className="skeleton-time" />
                  </div>
                </div>
              ))}
            </div>
          ) : displayActivity.length === 0 ? (
            <div className="empty-activity">
              <Activity size={48} />
              <h3>No Activity Yet</h3>
              <p>Community activity will appear here</p>
            </div>
          ) : (
            <AnimatePresence>
              {displayActivity.map((item, index) => (
                <motion.div
                  key={item.id}
                  className="activity-item"
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: 20 }}
                  transition={{ duration: 0.3, delay: index * 0.05 }}
                  whileHover={{ scale: 1.02, x: 5 }}
                >
                  {/* Activity Icon */}
                  <div className="activity-icon">
                    <div className={`icon-wrapper ${darkMode ? getActivityColorDark(item.type) : getActivityColor(item.type)}`}>
                      {getActivityIcon(item.type)}
                    </div>
                  </div>

                  {/* Activity Content */}
                  <div className="activity-content">
                    <div className="activity-header">
                      <div className="user-info">
                        <div className="user-avatar">
                          {item.user_avatar ? (
                            <img src={item.user_avatar} alt={item.user_name} />
                          ) : (
                            <User size={16} />
                          )}
                        </div>
                        <div className="user-details">
                          <span className="user-name">{item.user_name}</span>
                          <span className="activity-label">{getActivityLabel(item.type)}</span>
                        </div>
                      </div>
                      
                      <div className="activity-time">
                        <Clock size={14} />
                        <span>{formatTimeAgo(item.created_at)}</span>
                      </div>
                    </div>
                    
                    <div className="activity-description">
                      <p>{item.description}</p>
                    </div>
                    
                    {item.details && (
                      <div className="activity-details">
                        <div className="detail-item">
                          <Eye size={14} />
                          <span>{item.details.views || 0} views</span>
                        </div>
                        <div className="detail-item">
                          <ThumbsUp size={14} />
                          <span>{item.details.likes || 0} likes</span>
                        </div>
                        <div className="detail-item">
                          <MessageCircle size={14} />
                          <span>{item.details.comments || 0} comments</span>
                        </div>
                      </div>
                    )}
                  </div>

                  {/* Activity Actions */}
                  <div className="activity-actions">
                    <button className="action-btn">
                      <Eye size={16} />
                      <span>View</span>
                    </button>
                    
                    <button className="action-btn">
                      <ThumbsUp size={16} />
                      <span>Like</span>
                    </button>
                    
                    <button className="action-btn">
                      <MoreVertical size={16} />
                    </button>
                  </div>
                </motion.div>
              ))}
            </AnimatePresence>
          )}
        </div>

        {/* Activity Summary */}
        {!showFullList && activity.length > 0 && (
          <div className="activity-summary">
            <div className="summary-stats">
              <div className="summary-item">
                <Activity size={16} />
                <span>{activity.length} Total Activities</span>
              </div>
              <div className="summary-item">
                <TrendingUp size={16} />
                <span>{activity.filter(a => a.type === 'question_asked').length} Questions Today</span>
              </div>
              <div className="summary-item">
                <ThumbsUp size={16} />
                <span>{activity.filter(a => a.type === 'answer_given').length} Answers Today</span>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RecentActivity;
