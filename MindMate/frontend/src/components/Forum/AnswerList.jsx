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
  ChevronUp
} from 'react-feather';
import AnswerCard from './AnswerCard';

const AnswerList = ({ 
  answers, 
  onAnswerEdit,
  onAnswerDelete,
  onLikeToggle,
  likedAnswers,
  currentUserId,
  userType,
  darkMode 
}) => {
  const [expandedAnswer, setExpandedAnswer] = useState(null);
  const [sortBy, setSortBy] = useState('newest');

  const handleAnswerExpand = (answerId) => {
    setExpandedAnswer(expandedAnswer === answerId ? null : answerId);
  };

  const handleLikeToggle = (answerId) => {
    onLikeToggle(answerId, 'answer');
  };

  const handleAnswerEdit = (answer) => {
    onAnswerEdit(answer);
  };

  const handleAnswerDelete = (answerId) => {
    onAnswerDelete(answerId);
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

  const getAuthorName = (answer) => {
    if (answer.is_anonymous) {
      return 'Anonymous';
    }
    return answer.author_name || 'Unknown User';
  };

  const getAuthorType = (answer) => {
    if (answer.specialist_id) {
      return 'Specialist';
    }
    return 'Patient';
  };

  const sortAnswers = (answersList) => {
    switch (sortBy) {
      case 'newest':
        return [...answersList].sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
      case 'oldest':
        return [...answersList].sort((a, b) => new Date(a.created_at) - new Date(b.created_at));
      case 'most_liked':
        return [...answersList].sort((a, b) => (b.helpful_count || 0) - (a.helpful_count || 0));
      case 'specialist_first':
        return [...answersList].sort((a, b) => {
          if (a.specialist_id && !b.specialist_id) return -1;
          if (!a.specialist_id && b.specialist_id) return 1;
          return new Date(b.created_at) - new Date(a.created_at);
        });
      default:
        return answersList;
    }
  };

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: <Clock size={16} /> },
    { value: 'oldest', label: 'Oldest First', icon: <Clock size={16} /> },
    { value: 'most_liked', label: 'Most Liked', icon: <ThumbsUp size={16} /> },
    { value: 'specialist_first', label: 'Specialists First', icon: <Award size={16} /> }
  ];

  const sortedAnswers = sortAnswers(answers);

  if (answers.length === 0) {
    return (
      <div className="answer-list-empty">
        <div className="empty-container">
          <MessageCircle size={48} />
          <h3>No Answers Yet</h3>
          <p>Be the first to answer this question!</p>
        </div>
      </div>
    );
  }

  return (
    <div className={`answer-list ${darkMode ? 'dark' : ''}`}>
      {/* Answer List Header */}
      <div className="answer-list-header">
        <div className="list-info">
          <h3>Answers ({answers.length})</h3>
          <p>Community responses and support</p>
        </div>
        
        <div className="list-actions">
          <div className="sort-dropdown">
            <select 
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              className="sort-select"
            >
              {sortOptions.map(option => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      {/* Answers List */}
      <div className="answers-container">
        <AnimatePresence>
          {sortedAnswers.map((answer, index) => (
            <motion.div
              key={answer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 0.3, delay: index * 0.05 }}
              className="answer-item-wrapper"
            >
              <AnswerCard
                answer={answer}
                isExpanded={expandedAnswer === answer.id}
                onAnswerExpand={handleAnswerExpand}
                onLikeToggle={handleLikeToggle}
                onAnswerEdit={handleAnswerEdit}
                onAnswerDelete={handleAnswerDelete}
                isLiked={likedAnswers.has(answer.id)}
                canEdit={answer.patient_id === currentUserId || answer.specialist_id === currentUserId}
                canDelete={answer.patient_id === currentUserId || answer.specialist_id === currentUserId || userType === 'admin'}
                getAuthorName={getAuthorName}
                getAuthorType={getAuthorType}
                formatTimeAgo={formatTimeAgo}
                darkMode={darkMode}
              />
            </motion.div>
          ))}
        </AnimatePresence>
      </div>

      {/* Answer List Footer */}
      <div className="answer-list-footer">
        <div className="footer-info">
          <p>Showing {answers.length} answer{answers.length !== 1 ? 's' : ''}</p>
        </div>
      </div>
    </div>
  );
};

export default AnswerList;
