import React, { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Grid, 
  List, 
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
  ChevronUp
} from 'react-feather';
import QuestionCard from './QuestionCard';

const QuestionList = ({ 
  questions, 
  loading, 
  error, 
  viewMode, 
  onViewModeChange,
  onQuestionSelect,
  onQuestionEdit,
  onQuestionDelete,
  onBookmarkToggle,
  onLikeToggle,
  bookmarkedQuestions,
  likedQuestions,
  currentUserId,
  userType,
  darkMode 
}) => {
  const [expandedQuestion, setExpandedQuestion] = useState(null);

  const handleQuestionClick = (question) => {
    onQuestionSelect(question);
  };

  const handleQuestionExpand = (questionId) => {
    setExpandedQuestion(expandedQuestion === questionId ? null : questionId);
  };

  const handleBookmarkToggle = (e, questionId) => {
    e.stopPropagation();
    onBookmarkToggle(questionId);
  };

  const handleLikeToggle = (e, questionId) => {
    e.stopPropagation();
    onLikeToggle(questionId, 'question');
  };

  const handleQuestionEdit = (e, question) => {
    e.stopPropagation();
    onQuestionEdit(question);
  };

  const handleQuestionDelete = (e, questionId) => {
    e.stopPropagation();
    onQuestionDelete(questionId);
  };

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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'answered':
        return <CheckCircle size={16} className="text-green-500" />;
      case 'open':
        return <MessageCircle size={16} className="text-blue-500" />;
      case 'closed':
        return <AlertCircle size={16} className="text-gray-500" />;
      default:
        return <MessageCircle size={16} className="text-gray-500" />;
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'answered':
        return 'Answered';
      case 'open':
        return 'Open';
      case 'closed':
        return 'Closed';
      default:
        return 'Unknown';
    }
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'anxiety':
        return <AlertCircle size={16} />;
      case 'depression':
        return <Heart size={16} />;
      case 'stress':
        return <TrendingUp size={16} />;
      case 'relationships':
        return <User size={16} />;
      case 'addiction':
        return <Flag size={16} />;
      case 'trauma':
        return <Star size={16} />;
      default:
        return <MessageCircle size={16} />;
    }
  };

  if (loading) {
    return (
      <div className="question-list-loading">
        <div className="loading-container">
          <div className="loading-spinner" />
          <p>Loading questions...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="question-list-error">
        <div className="error-container">
          <AlertCircle size={32} />
          <h3>Unable to Load Questions</h3>
          <p>{error}</p>
        </div>
      </div>
    );
  }

  if (questions.length === 0) {
    return (
      <div className="question-list-empty">
        <div className="empty-container">
          <MessageCircle size={48} />
          <h3>No Questions Found</h3>
          <p>Be the first to ask a question in the community!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`question-list ${darkMode ? 'dark' : ''}`}>
      {/* List Header */}
      <div className="list-header">
        <div className="list-info">
          <h3>Questions ({questions.length})</h3>
          <p>Community discussions and support</p>
        </div>
        
        <div className="list-actions">
          <div className="view-mode-toggle">
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => onViewModeChange('grid')}
            >
              <Grid size={18} />
            </button>
            <button 
              className={`view-btn ${viewMode === 'list' ? 'active' : ''}`}
              onClick={() => onViewModeChange('list')}
            >
              <List size={18} />
            </button>
          </div>
        </div>
      </div>

      {/* Questions Grid/List */}
      <div className={`questions-container ${viewMode}`}>
        <AnimatePresence>
          {questions.map((question, index) => (
            <motion.div
              key={question.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="question-item-wrapper"
            >
              <QuestionCard
                question={question}
                isExpanded={expandedQuestion === question.id}
                onQuestionClick={handleQuestionClick}
                onQuestionExpand={handleQuestionExpand}
                onBookmarkToggle={handleBookmarkToggle}
                onLikeToggle={handleLikeToggle}
                onQuestionEdit={handleQuestionEdit}
                onQuestionDelete={handleQuestionDelete}
                isBookmarked={bookmarkedQuestions.has(question.id)}
                isLiked={likedQuestions.has(question.id)}
                canEdit={question.patient_id === currentUserId || question.specialist_id === currentUserId}
                canDelete={question.patient_id === currentUserId || question.specialist_id === currentUserId || userType === 'admin'}
                formatTimeAgo={formatTimeAgo}
                getStatusIcon={getStatusIcon}
                getStatusLabel={getStatusLabel}
                getCategoryIcon={getCategoryIcon}
                darkMode={darkMode}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Load More Button */}
      {questions.length > 0 && (
        <div className="list-footer">
          <motion.button
            className="load-more-btn"
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
          >
            Load More Questions
          </motion.button>
        </div>
      )}
    </div>
  );
};

export default QuestionList;
