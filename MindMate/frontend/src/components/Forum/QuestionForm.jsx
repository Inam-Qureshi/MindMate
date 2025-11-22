import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Send, 
  Tag, 
  AlertCircle, 
  Eye, 
  EyeOff, 
  Zap, 
  MessageCircle,
  Heart,
  TrendingUp,
  User,
  Shield,
  HelpCircle,
  Star,
  Flag,
  CheckCircle,
  Clock,
  Save
} from 'react-feather';

const QuestionForm = ({ 
  question, 
  questionData, 
  onQuestionDataChange, 
  onSubmit, 
  onClose, 
  loading, 
  darkMode 
}) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const categories = [
    { value: 'general', label: 'General', icon: <MessageCircle size={16} /> },
    { value: 'anxiety', label: 'Anxiety', icon: <AlertCircle size={16} /> },
    { value: 'depression', label: 'Depression', icon: <Heart size={16} /> },
    { value: 'stress', label: 'Stress', icon: <TrendingUp size={16} /> },
    { value: 'relationships', label: 'Relationships', icon: <User size={16} /> },
    { value: 'addiction', label: 'Addiction', icon: <Shield size={16} /> },
    { value: 'trauma', label: 'Trauma', icon: <Star size={16} /> },
    { value: 'other', label: 'Other', icon: <HelpCircle size={16} /> }
  ];

  const handleInputChange = (field, value) => {
    onQuestionDataChange(prev => ({
      ...prev,
      [field]: value
    }));
    
    // Clear error when user starts typing
    if (errors[field]) {
      setErrors(prev => ({
        ...prev,
        [field]: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!questionData.title.trim()) {
      newErrors.title = 'Title is required';
    } else if (questionData.title.length < 10) {
      newErrors.title = 'Title must be at least 10 characters';
    } else if (questionData.title.length > 200) {
      newErrors.title = 'Title must be less than 200 characters';
    }
    
    if (!questionData.content.trim()) {
      newErrors.content = 'Content is required';
    } else if (questionData.content.length < 20) {
      newErrors.content = 'Content must be at least 20 characters';
    } else if (questionData.content.length > 5000) {
      newErrors.content = 'Content must be less than 5000 characters';
    }
    
    if (!questionData.category) {
      newErrors.category = 'Category is required';
    }
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) {
      return;
    }
    
    try {
      setIsSubmitting(true);
      await onSubmit(questionData);
    } catch (error) {
      console.error('Error submitting question:', error);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleSaveDraft = () => {
    // TODO: Implement save draft functionality
    console.log('Save draft');
  };

  const getCharacterCount = (text, maxLength) => {
    return `${text?.length || 0}/${maxLength}`;
  };

  const getCharacterCountColor = (text, maxLength) => {
    const length = text?.length || 0;
    if (length > maxLength * 0.9) return 'text-red-500';
    if (length > maxLength * 0.7) return 'text-yellow-500';
    return 'text-gray-500';
  };

  const isEditing = !!question;

  return (
    <div className={`question-form ${darkMode ? 'dark' : ''}`}>
      <div className="form-container">
        {/* Form Header */}
        <div className="form-header">
          <div className="header-content">
            <h2>{isEditing ? 'Edit Question' : 'Ask a Question'}</h2>
            <p>{isEditing ? 'Update your question details' : 'Share your question with the community'}</p>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="form-content">
          {/* Title Field */}
          <div className="form-group">
            <label htmlFor="title" className="form-label">
              Question Title *
            </label>
            <input
              id="title"
              type="text"
              value={questionData.title}
              onChange={(e) => handleInputChange('title', e.target.value)}
              placeholder="What's your question? Be specific and clear..."
              className={`form-input ${errors.title ? 'error' : ''}`}
              maxLength={200}
            />
            <div className="form-footer">
              <div className={`character-count ${getCharacterCountColor(questionData.title, 200)}`}>
                {getCharacterCount(questionData.title, 200)}
              </div>
              {errors.title && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.title}</span>
                </div>
              )}
            </div>
          </div>

          {/* Content Field */}
          <div className="form-group">
            <label htmlFor="content" className="form-label">
              Question Details *
            </label>
            <textarea
              id="content"
              value={questionData.content}
              onChange={(e) => handleInputChange('content', e.target.value)}
              placeholder="Provide more details about your question. The more specific you are, the better answers you'll get..."
              className={`form-textarea ${errors.content ? 'error' : ''}`}
              rows={6}
              maxLength={5000}
            />
            <div className="form-footer">
              <div className={`character-count ${getCharacterCountColor(questionData.content, 5000)}`}>
                {getCharacterCount(questionData.content, 5000)}
              </div>
              {errors.content && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.content}</span>
                </div>
              )}
            </div>
          </div>

          {/* Category Selection */}
          <div className="form-group">
            <label className="form-label">
              Category *
            </label>
            <div className="category-grid">
              {categories.map((category) => (
                <motion.button
                  key={category.value}
                  type="button"
                  className={`category-btn ${questionData.category === category.value ? 'selected' : ''}`}
                  onClick={() => handleInputChange('category', category.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="category-icon">
                    {category.icon}
                  </div>
                  <span className="category-label">{category.label}</span>
                </motion.button>
              ))}
            </div>
            {errors.category && (
              <div className="field-error">
                <AlertCircle size={14} />
                <span>{errors.category}</span>
              </div>
            )}
          </div>

          {/* Tags Field */}
          <div className="form-group">
            <label htmlFor="tags" className="form-label">
              Tags (Optional)
            </label>
            <input
              id="tags"
              type="text"
              value={questionData.tags}
              onChange={(e) => handleInputChange('tags', e.target.value)}
              placeholder="Add tags separated by commas (e.g., anxiety, work, stress)"
              className="form-input"
            />
            <div className="form-hint">
              <Tag size={14} />
              <span>Add relevant tags to help others find your question</span>
            </div>
          </div>

          {/* Privacy Options */}
          <div className="form-group">
            <label className="form-label">
              Privacy Options
            </label>
            <div className="privacy-options">
              <label className="privacy-option">
                <input
                  type="checkbox"
                  checked={questionData.is_anonymous}
                  onChange={(e) => handleInputChange('is_anonymous', e.target.checked)}
                />
                <div className="option-content">
                  <div className="option-icon">
                    <EyeOff size={16} />
                  </div>
                  <div className="option-text">
                    <span className="option-title">Post Anonymously</span>
                    <span className="option-description">Your name won't be shown to other users</span>
                  </div>
                </div>
              </label>
              
              <label className="privacy-option">
                <input
                  type="checkbox"
                  checked={questionData.is_urgent}
                  onChange={(e) => handleInputChange('is_urgent', e.target.checked)}
                />
                <div className="option-content">
                  <div className="option-icon">
                    <Zap size={16} />
                  </div>
                  <div className="option-text">
                    <span className="option-title">Mark as Urgent</span>
                    <span className="option-description">This question needs immediate attention</span>
                  </div>
                </div>
              </label>
            </div>
          </div>

          {/* Form Actions */}
          <div className="form-actions">
            <div className="form-actions-left">
              <button 
                type="button" 
                className="action-btn secondary-btn"
                onClick={handleSaveDraft}
              >
                <Save size={16} />
                <span>Save Draft</span>
              </button>
            </div>
            
            <div className="form-actions-right">
              <button 
                type="button" 
                className="action-btn cancel-btn"
                onClick={onClose}
              >
                <X size={16} />
                <span>Cancel</span>
              </button>
              
              <button 
                type="submit" 
                className="action-btn primary-btn"
                disabled={loading || isSubmitting}
              >
                {loading || isSubmitting ? (
                  <div className="loading-spinner" />
                ) : (
                  <Send size={16} />
                )}
                <span>{isEditing ? 'Update Question' : 'Post Question'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Form Tips */}
        <div className="form-tips">
          <h3>Tips for a Great Question</h3>
          <div className="tips-list">
            <div className="tip-item">
              <CheckCircle size={16} />
              <span>Be specific and clear about your situation</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={16} />
              <span>Provide relevant context and background</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={16} />
              <span>Use appropriate categories and tags</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={16} />
              <span>Be respectful and considerate</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default QuestionForm;
