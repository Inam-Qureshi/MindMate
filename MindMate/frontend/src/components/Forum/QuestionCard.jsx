import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  MessageCircle, 
  Eye, 
  ThumbsUp, 
  Bookmark, 
  Flag, 
  Edit3, 
  Trash2, 
  Clock, 
  User, 
  AlertCircle,
  CheckCircle,
  TrendingUp,
  Heart,
  Star,
  MoreVertical,
  ChevronDown,
  ChevronUp,
  Tag,
  Calendar,
  Shield
} from 'react-feather';

const QuestionCard = ({ 
  question,
  isExpanded,
  onQuestionClick,
  onQuestionExpand,
  onBookmarkToggle,
  onLikeToggle,
  onQuestionEdit,
  onQuestionDelete,
  isBookmarked,
  isLiked,
  canEdit,
  canDelete,
  formatTimeAgo,
  getStatusIcon,
  getStatusLabel,
  getCategoryIcon,
  darkMode 
}) => {
  const [showActions, setShowActions] = useState(false);

  const handleCardClick = () => {
    onQuestionClick(question);
  };

  const handleExpandClick = (e) => {
    e.stopPropagation();
    onQuestionExpand(question.id);
  };

  const handleBookmarkClick = (e) => {
    e.stopPropagation();
    onBookmarkToggle(e, question.id);
  };

  const handleLikeClick = (e) => {
    e.stopPropagation();
    onLikeToggle(e, question.id);
  };

  const handleEditClick = (e) => {
    e.stopPropagation();
    onQuestionEdit(e, question);
  };

  const handleDeleteClick = (e) => {
    e.stopPropagation();
    onQuestionDelete(e, question.id);
  };

  const handleActionsToggle = (e) => {
    e.stopPropagation();
    setShowActions(!showActions);
  };

  const getAuthorName = () => {
    if (question.is_anonymous) {
      return 'Anonymous';
    }
    return question.author_name || 'Unknown User';
  };

  const getAuthorType = () => {
    if (question.specialist_id) {
      return 'Specialist';
    }
    return 'Patient';
  };

  const getTags = () => {
    if (!question.tags) return [];
    return question.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  };

  const getCategoryColor = (category) => {
    switch (category) {
      case 'anxiety':
        return 'text-yellow-600 bg-yellow-100';
      case 'depression':
        return 'text-blue-600 bg-blue-100';
      case 'stress':
        return 'text-red-600 bg-red-100';
      case 'relationships':
        return 'text-pink-600 bg-pink-100';
      case 'addiction':
        return 'text-purple-600 bg-purple-100';
      case 'trauma':
        return 'text-orange-600 bg-orange-100';
      default:
        return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColorDark = (category) => {
    switch (category) {
      case 'anxiety':
        return 'text-yellow-400 bg-yellow-900';
      case 'depression':
        return 'text-blue-400 bg-blue-900';
      case 'stress':
        return 'text-red-400 bg-red-900';
      case 'relationships':
        return 'text-pink-400 bg-pink-900';
      case 'addiction':
        return 'text-purple-400 bg-purple-900';
      case 'trauma':
        return 'text-orange-400 bg-orange-900';
      default:
        return 'text-gray-400 bg-gray-900';
    }
  };

  return (
    <motion.div
      className={`question-card ${darkMode ? 'dark' : ''} ${question.is_urgent ? 'urgent' : ''}`}
      whileHover={{ 
        scale: 1.02, 
        y: -2,
        transition: { duration: 0.2 }
      }}
      whileTap={{ scale: 0.98 }}
      onClick={handleCardClick}
    >
      {/* Card Header */}
      <div className="card-header">
        <div className="question-meta">
          <div className="author-info">
            <div className="author-avatar">
              <User size={16} />
            </div>
            <div className="author-details">
              <span className="author-name">{getAuthorName()}</span>
              <span className="author-type">{getAuthorType()}</span>
            </div>
          </div>
          
          <div className="question-status">
            <div className="status-badge">
              {getStatusIcon(question.status)}
              <span>{getStatusLabel(question.status)}</span>
            </div>
          </div>
        </div>
        
        <div className="question-actions">
          <button 
            className="action-btn"
            onClick={handleActionsToggle}
          >
            <MoreVertical size={16} />
          </button>
        </div>
      </div>

      {/* Card Content */}
      <div className="card-content">
        <div className="question-title">
          <h3>{question.title}</h3>
          {question.is_urgent && (
            <div className="urgent-badge">
              <AlertCircle size={14} />
              <span>Urgent</span>
            </div>
          )}
        </div>
        
        <div className="question-content">
          <p>{question.content}</p>
        </div>
        
        <div className="question-category">
          <div className={`category-badge ${darkMode ? getCategoryColorDark(question.category) : getCategoryColor(question.category)}`}>
            {getCategoryIcon(question.category)}
            <span>{question.category}</span>
          </div>
        </div>
        
        {getTags().length > 0 && (
          <div className="question-tags">
            {getTags().map((tag, index) => (
              <span key={index} className="tag">
                <Tag size={12} />
                {tag}
              </span>
            ))}
          </div>
        )}
      </div>

      {/* Card Footer */}
      <div className="card-footer">
        <div className="question-stats">
          <div className="stat-item">
            <MessageCircle size={14} />
            <span>{question.answer_count || 0}</span>
          </div>
          <div className="stat-item">
            <Eye size={14} />
            <span>{question.view_count || 0}</span>
          </div>
          <div className="stat-item">
            <ThumbsUp size={14} />
            <span>{question.helpful_count || 0}</span>
          </div>
        </div>
        
        <div className="question-time">
          <Clock size={14} />
          <span>{formatTimeAgo(question.asked_at || question.created_at)}</span>
        </div>
      </div>

      {/* Card Actions */}
      <div className="card-actions">
        <button 
          className={`action-btn ${isLiked ? 'liked' : ''}`}
          onClick={handleLikeClick}
        >
          <ThumbsUp size={16} />
          <span>Like</span>
        </button>
        
        <button 
          className={`action-btn ${isBookmarked ? 'bookmarked' : ''}`}
          onClick={handleBookmarkClick}
        >
          <Bookmark size={16} />
          <span>Save</span>
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
                <Calendar size={14} />
                <span>Asked {formatTimeAgo(question.asked_at || question.created_at)}</span>
              </div>
              
              {question.updated_at && question.updated_at !== question.created_at && (
                <div className="detail-item">
                  <Edit3 size={14} />
                  <span>Updated {formatTimeAgo(question.updated_at)}</span>
                </div>
              )}
              
              <div className="detail-item">
                <Shield size={14} />
                <span>{question.is_anonymous ? 'Anonymous' : 'Public'}</span>
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
                <span>View Details</span>
              </button>
              <button className="dropdown-item">
                <Bookmark size={16} />
                <span>Bookmark</span>
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

export default QuestionCard;
