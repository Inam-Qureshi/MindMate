import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  ThumbsUp, 
  ThumbsDown, 
  Flag, 
  Edit3, 
  Trash2, 
  Clock, 
  User, 
  CheckCircle,
  Star,
  Award,
  Heart,
  TrendingUp,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Shield,
  Zap
} from 'react-feather';

const AnswerCard = ({ 
  answer,
  isExpanded,
  onAnswerExpand,
  onLikeToggle,
  onAnswerEdit,
  onAnswerDelete,
  isLiked,
  canEdit,
  canDelete,
  getAuthorName,
  getAuthorType,
  formatTimeAgo,
  darkMode 
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleExpandClick = () => {
    onAnswerExpand(answer.id);
  };

  const handleLikeClick = () => {
    onLikeToggle(answer.id);
  };

  const handleEditClick = () => {
    onAnswerEdit(answer);
  };

  const handleDeleteClick = () => {
    onAnswerDelete(answer.id);
  };

  const handleActionsToggle = () => {
    setShowActions(!showActions);
  };

  const getAuthorName = () => {
    if (answer.is_anonymous) {
      return 'Anonymous';
    }
    return answer.author_name || 'Unknown User';
  };

  const getAuthorType = () => {
    if (answer.specialist_id) {
      return 'Specialist';
    }
    return 'Patient';
  };

  const getAuthorIcon = () => {
    if (answer.specialist_id) {
      return <Award size={16} className="text-blue-500" />;
    }
    return <User size={16} className="text-gray-500" />;
  };

  const getAuthorTypeColor = () => {
    if (answer.specialist_id) {
      return 'text-blue-600 bg-blue-100';
    }
    return 'text-gray-600 bg-gray-100';
  };

  const getAuthorTypeColorDark = () => {
    if (answer.specialist_id) {
      return 'text-blue-400 bg-blue-900';
    }
    return 'text-gray-400 bg-gray-900';
  };

  return (
    <motion.div
      className={`answer-card ${darkMode ? 'dark' : ''} ${answer.specialist_id ? 'specialist-answer' : ''}`}
      whileHover={{ 
        scale: 1.01, 
        y: -1,
        transition: { duration: 0.2 }
      }}
    >
      {/* Answer Header */}
      <div className="answer-header">
        <div className="author-info">
          <div className="author-avatar">
            {getAuthorIcon()}
          </div>
          <div className="author-details">
            <span className="author-name">{getAuthorName()}</span>
            <span className={`author-type ${darkMode ? getAuthorTypeColorDark() : getAuthorTypeColor()}`}>
              {getAuthorType()}
            </span>
          </div>
        </div>
        
        <div className="answer-meta">
          <div className="answer-time">
            <Clock size={14} />
            <span>{formatTimeAgo(answer.created_at)}</span>
          </div>
          
          <div className="answer-actions">
            <button 
              className="action-btn"
              onClick={handleActionsToggle}
            >
              <MoreVertical size={16} />
            </button>
          </div>
        </div>
      </div>

      {/* Answer Content */}
      <div className="answer-content">
        <div className="answer-text">
          <p>{answer.content}</p>
        </div>
        
        {answer.is_anonymous && (
          <div className="anonymous-badge">
            <Shield size={14} />
            <span>Anonymous Answer</span>
          </div>
        )}
      </div>

      {/* Answer Stats */}
      <div className="answer-stats">
        <div className="stat-item">
          <ThumbsUp size={14} />
          <span>{answer.helpful_count || 0}</span>
        </div>
        <div className="stat-item">
          <MessageCircle size={14} />
          <span>{answer.reply_count || 0}</span>
        </div>
        {answer.is_featured && (
          <div className="stat-item featured">
            <Star size={14} />
            <span>Featured</span>
          </div>
        )}
      </div>

      {/* Answer Actions */}
      <div className="answer-actions">
        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLikeClick}
        >
          <ThumbsUp size={16} />
          <span>{isLiked ? 'Liked' : 'Like'}</span>
        </button>
        
        <button className="action-btn">
          <Flag size={16} />
          <span>Report</span>
        </button>
        
        <button 
          className="action-btn"
          onClick={handleExpandClick}
        >
          {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          <span>{isExpanded ? 'Less' : 'More'}</span>
        </button>
      </div>

      {/* Expanded Content */}
      <AnimatePresence>
        {isExpanded && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.3 }}
            className="expanded-content"
          >
            <div className="expanded-details">
              <div className="detail-item">
                <Clock size={14} />
                <span>Answered {formatTimeAgo(answer.created_at)}</span>
              </div>
              
              {answer.updated_at && answer.updated_at !== answer.created_at && (
                <div className="detail-item">
                  <Edit3 size={14} />
                  <span>Updated {formatTimeAgo(answer.updated_at)}</span>
                </div>
              )}
              
              <div className="detail-item">
                <Shield size={14} />
                <span>{answer.is_anonymous ? 'Anonymous' : 'Public'}</span>
              </div>
            </div>
            
            <div className="expanded-actions">
              {canEdit && (
                <button 
                  className="action-btn edit-btn"
                  onClick={handleEditClick}
                >
                  <Edit3 size={14} />
                  <span>Edit</span>
                </button>
              )}
              
              {canDelete && (
                <button 
                  className="action-btn delete-btn"
                  onClick={handleDeleteClick}
                >
                  <Trash2 size={14} />
                  <span>Delete</span>
                </button>
              )}
              
              <button className="action-btn report-btn">
                <Flag size={14} />
                <span>Report</span>
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Actions Dropdown */}
      <AnimatePresence>
        {showActions && (
          <motion.div
            initial={{ opacity: 0, scale: 0.9, y: -10 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.9, y: -10 }}
            className="actions-dropdown"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="dropdown-content">
              <button className="dropdown-item">
                <MessageCircle size={16} />
                <span>Reply</span>
              </button>
              <button className="dropdown-item">
                <ThumbsUp size={16} />
                <span>Like</span>
              </button>
              <button className="dropdown-item">
                <Flag size={16} />
                <span>Report</span>
              </button>
              {canEdit && (
                <button className="dropdown-item" onClick={handleEditClick}>
                  <Edit3 size={16} />
                  <span>Edit</span>
                </button>
              )}
              {canDelete && (
                <button className="dropdown-item" onClick={handleDeleteClick}>
                  <Trash2 size={16} />
                  <span>Delete</span>
                </button>
              )}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.div>
  );
};

export default AnswerCard;
