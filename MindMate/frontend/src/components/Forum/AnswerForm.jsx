import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Send, 
  Save, 
  AlertCircle, 
  CheckCircle,
  MessageCircle,
  Heart,
  Star,
  Zap,
  Shield,
  User,
  Clock,
  Tag
} from 'react-feather';

const AnswerForm = ({ 
  answer, 
  answerData, 
  onAnswerDataChange, 
  onSubmit, 
  onCancel, 
  loading, 
  darkMode 
}) => {
  const [errors, setErrors] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleInputChange = (value) => {
    onAnswerDataChange(value);
    
    // Clear error when user starts typing
    if (errors.content) {
      setErrors(prev => ({
        ...prev,
        content: ''
      }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!answerData.trim()) {
      newErrors.content = 'Answer content is required';
    } else if (answerData.length < 10) {
      newErrors.content = 'Answer must be at least 10 characters';
    } else if (answerData.length > 5000) {
      newErrors.content = 'Answer must be less than 5000 characters';
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
      await onSubmit({ content: answerData });
    } catch (error) {
      console.error('Error submitting answer:', error);
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

  const isEditing = !!answer;

  return (
    <div className={`answer-form ${darkMode ? 'dark' : ''}`}>
      <div className="form-container">
        {/* Form Header */}
        <div className="form-header">
          <div className="header-content">
            <h3>{isEditing ? 'Edit Answer' : 'Add Your Answer'}</h3>
            <p>{isEditing ? 'Update your answer' : 'Share your knowledge and help others'}</p>
          </div>
          <button className="close-btn" onClick={onCancel}>
            <X size={18} />
          </button>
        </div>

        {/* Form Content */}
        <form onSubmit={handleSubmit} className="form-content">
          {/* Answer Content */}
          <div className="form-group">
            <label htmlFor="content" className="form-label">
              Your Answer *
            </label>
            <textarea
              id="content"
              value={answerData}
              onChange={(e) => handleInputChange(e.target.value)}
              placeholder="Share your thoughts, experiences, or advice. Be helpful and respectful..."
              className={`form-textarea ${errors.content ? 'error' : ''}`}
              rows={6}
              maxLength={5000}
            />
            <div className="form-footer">
              <div className={`character-count ${getCharacterCountColor(answerData, 5000)}`}>
                {getCharacterCount(answerData, 5000)}
              </div>
              {errors.content && (
                <div className="field-error">
                  <AlertCircle size={14} />
                  <span>{errors.content}</span>
                </div>
              )}
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
                onClick={onCancel}
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
                <span>{isEditing ? 'Update Answer' : 'Post Answer'}</span>
              </button>
            </div>
          </div>
        </form>

        {/* Form Tips */}
        <div className="form-tips">
          <h4>Tips for a Great Answer</h4>
          <div className="tips-list">
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Be specific and helpful</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Share your personal experience if relevant</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Be respectful and supportive</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Provide actionable advice</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AnswerForm;
