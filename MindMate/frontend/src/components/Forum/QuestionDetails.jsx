import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  ArrowLeft, 
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
  Send,
  Tag,
  Calendar,
  Shield,
  Award,
  Zap
} from 'react-feather';
import AnswerList from './AnswerList';
import AnswerForm from './AnswerForm';

const QuestionDetails = ({ 
  question, 
  answers, 
  onBack, 
  onCreateAnswer,
  onLikeToggle,
  onBookmarkToggle,
  onAnswerEdit,
  onAnswerDelete,
  likedAnswers,
  bookmarkedQuestions,
  currentUserId,
  userType,
  darkMode 
}) => {
  const [showAnswerForm, setShowAnswerForm] = useState(false);
  const [editingAnswer, setEditingAnswer] = useState(null);
  const [newAnswer, setNewAnswer] = useState('');
  const [loading, setLoading] = useState(false);

  const handleCreateAnswer = async (answerData) => {
    try {
      setLoading(true);
      await onCreateAnswer(question.id, answerData);
      setShowAnswerForm(false);
      setNewAnswer('');
    } catch (error) {
      console.error('Error creating answer:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswerEdit = (answer) => {
    setEditingAnswer(answer);
    setNewAnswer(answer.content);
    setShowAnswerForm(true);
  };

  const handleAnswerDelete = async (answerId) => {
    try {
      await onAnswerDelete(answerId);
    } catch (error) {
      console.error('Error deleting answer:', error);
    }
  };

  const handleLikeToggle = (answerId) => {
    onLikeToggle(answerId, 'answer');
  };

  const handleBookmarkToggle = () => {
    onBookmarkToggle(question.id);
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

  const getStatusIcon = (status) => {
    switch (status) {
      case 'answered':
        return <CheckCircle size={20} className="text-green-500" />;
      case 'open':
        return <MessageCircle size={20} className="text-blue-500" />;
      case 'closed':
        return <AlertCircle size={20} className="text-gray-500" />;
      default:
        return <MessageCircle size={20} className="text-gray-500" />;
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
        return <AlertCircle size={20} />;
      case 'depression':
        return <Heart size={20} />;
      case 'stress':
        return <TrendingUp size={20} />;
      case 'relationships':
        return <User size={20} />;
      case 'addiction':
        return <Flag size={20} />;
      case 'trauma':
        return <Star size={20} />;
      default:
        return <MessageCircle size={20} />;
    }
  };

  const getTags = () => {
    if (!question.tags) return [];
    return question.tags.split(',').map(tag => tag.trim()).filter(tag => tag);
  };

  const canEdit = question.patient_id === currentUserId || question.specialist_id === currentUserId;
  const canDelete = canEdit || userType === 'admin';
  const isBookmarked = bookmarkedQuestions.has(question.id);

  return (
    <div className={`question-details ${darkMode ? 'dark' : ''}`}>
      <div className="details-container">
        {/* Header */}
        <div className="details-header">
          <button className="back-btn" onClick={onBack}>
            <ArrowLeft size={18} />
            <span>Back to Questions</span>
          </button>
          
          <div className="header-actions">
            <button 
              className={`action-btn ${isBookmarked ? 'bookmarked' : ''}`}
              onClick={handleBookmarkToggle}
            >
              <Bookmark size={18} />
              <span>{isBookmarked ? 'Saved' : 'Save'}</span>
            </button>
            
            <button className="action-btn">
              <Flag size={18} />
              <span>Report</span>
            </button>
          </div>
        </div>

        {/* Question Content */}
        <div className="question-content">
          <div className="question-header">
            <div className="question-meta">
              <div className="author-info">
                <div className="author-avatar">
                  <User size={20} />
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
            
            <div className="question-time">
              <Clock size={16} />
              <span>Asked {formatTimeAgo(question.asked_at || question.created_at)}</span>
            </div>
          </div>
          
          <div className="question-title">
            <h1>{question.title}</h1>
            {question.is_urgent && (
              <div className="urgent-badge">
                <AlertCircle size={16} />
                <span>Urgent</span>
              </div>
            )}
          </div>
          
          <div className="question-body">
            <p>{question.content}</p>
          </div>
          
          <div className="question-category">
            <div className="category-badge">
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

        {/* Question Stats */}
        <div className="question-stats">
          <div className="stat-item">
            <MessageCircle size={18} />
            <span>{answers.length} Answers</span>
          </div>
          <div className="stat-item">
            <Eye size={18} />
            <span>{question.view_count || 0} Views</span>
          </div>
          <div className="stat-item">
            <ThumbsUp size={18} />
            <span>{question.helpful_count || 0} Helpful</span>
          </div>
        </div>

        {/* Question Actions */}
        <div className="question-actions">
          {canEdit && (
            <button className="action-btn edit-btn">
              <Edit3 size={18} />
              <span>Edit Question</span>
            </button>
          )}
          
          {canDelete && (
            <button className="action-btn delete-btn">
              <Trash2 size={18} />
              <span>Delete Question</span>
            </button>
          )}
        </div>

        {/* Answers Section */}
        <div className="answers-section">
          <div className="answers-header">
            <h2>Answers ({answers.length})</h2>
            <button 
              className="add-answer-btn"
              onClick={() => setShowAnswerForm(true)}
            >
              <Send size={18} />
              <span>Add Answer</span>
            </button>
          </div>
          
          {/* Answer Form */}
          <AnimatePresence>
            {showAnswerForm && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.3 }}
                className="answer-form-container"
              >
                <AnswerForm
                  answer={editingAnswer}
                  answerData={newAnswer}
                  onAnswerDataChange={setNewAnswer}
                  onSubmit={handleCreateAnswer}
                  onCancel={() => {
                    setShowAnswerForm(false);
                    setEditingAnswer(null);
                    setNewAnswer('');
                  }}
                  loading={loading}
                  darkMode={darkMode}
                />
              </motion.div>
            )}
          </AnimatePresence>
          
          {/* Answers List */}
          <AnswerList
            answers={answers}
            onAnswerEdit={handleAnswerEdit}
            onAnswerDelete={handleAnswerDelete}
            onLikeToggle={handleLikeToggle}
            likedAnswers={likedAnswers}
            currentUserId={currentUserId}
            userType={userType}
            darkMode={darkMode}
          />
        </div>
      </div>
    </div>
  );
};

export default QuestionDetails;
