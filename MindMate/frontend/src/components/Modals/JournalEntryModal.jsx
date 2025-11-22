import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { BookOpen, Save, Loader, CheckCircle, Tag, Heart } from 'react-feather';
import axios from 'axios';
import Modal from './Modal';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';
import toast from 'react-hot-toast';
import './JournalEntryModal.css';

const JournalEntryModal = ({ isOpen, onClose, darkMode, onComplete }) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('');
  const [tags, setTags] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);

  const moodOptions = [
    { value: 'happy', label: '😊 Happy', color: '#10b981' },
    { value: 'grateful', label: '🙏 Grateful', color: '#3b82f6' },
    { value: 'calm', label: '😌 Calm', color: '#8b5cf6' },
    { value: 'anxious', label: '😰 Anxious', color: '#f59e0b' },
    { value: 'sad', label: '😢 Sad', color: '#6366f1' },
    { value: 'angry', label: '😠 Angry', color: '#ef4444' },
    { value: 'tired', label: '😴 Tired', color: '#6b7280' },
    { value: 'excited', label: '🎉 Excited', color: '#ec4899' },
  ];

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!content.trim()) {
      toast.error('Please write something in your journal entry');
      return;
    }

    setSubmitting(true);
    try {
      const token = AuthStorage.getToken();
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.JOURNAL.ENTRY_CREATE}`,
        {
          content: content.trim(),
          mood: mood || null,
          tags: tags.trim() || null,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      setSubmitted(true);
      toast.success('Journal entry saved successfully!');

      // Trigger dashboard refresh
      window.dispatchEvent(new Event('dashboard-refresh'));

      // Call onComplete callback
      if (onComplete) {
        onComplete(response.data);
      }

      // Auto-close after 2 seconds
      setTimeout(() => {
        handleClose();
      }, 2000);
    } catch (err) {
      console.error('Error saving journal entry:', err);
      toast.error(err.response?.data?.detail || 'Failed to save journal entry');
    } finally {
      setSubmitting(false);
    }
  };

  const handleClose = () => {
    setContent('');
    setMood('');
    setTags('');
    setSubmitting(false);
    setSubmitted(false);
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Journal Entry"
      darkMode={darkMode}
      size="medium"
    >
      <div className={`journal-entry-modal ${darkMode ? 'dark' : ''}`}>
        {submitted ? (
          <motion.div
            className="success-state"
            initial={{ opacity: 0, scale: 0.9 }}
            animate={{ opacity: 1, scale: 1 }}
          >
            <CheckCircle size={48} className="success-icon" />
            <h3>Entry Saved!</h3>
            <p>Your journal entry has been saved successfully.</p>
          </motion.div>
        ) : (
          <form onSubmit={handleSubmit} className="journal-form">
            {/* Content Input */}
            <div className="form-group">
              <label htmlFor="content">
                <BookOpen size={18} />
                What's on your mind?
              </label>
              <textarea
                id="content"
                value={content}
                onChange={(e) => setContent(e.target.value)}
                placeholder="Write about your day, thoughts, feelings, or anything you'd like to remember..."
                rows={8}
                required
                className="journal-textarea"
                disabled={submitting}
              />
              <span className="char-count">{content.length} characters</span>
            </div>

            {/* Mood Selection */}
            <div className="form-group">
              <label htmlFor="mood">
                <Heart size={18} />
                How are you feeling?
              </label>
              <div className="mood-options">
                {moodOptions.map((option) => (
                  <button
                    key={option.value}
                    type="button"
                    className={`mood-option ${mood === option.value ? 'selected' : ''}`}
                    onClick={() => setMood(mood === option.value ? '' : option.value)}
                    disabled={submitting}
                    style={{
                      borderColor: mood === option.value ? option.color : undefined,
                      backgroundColor: mood === option.value ? `${option.color}20` : undefined,
                    }}
                  >
                    {option.label}
                  </button>
                ))}
              </div>
            </div>

            {/* Tags Input */}
            <div className="form-group">
              <label htmlFor="tags">
                <Tag size={18} />
                Tags (optional)
              </label>
              <input
                id="tags"
                type="text"
                value={tags}
                onChange={(e) => setTags(e.target.value)}
                placeholder="e.g., work, family, goals, reflection"
                className="journal-input"
                disabled={submitting}
              />
              <small>Separate tags with commas</small>
            </div>

            {/* Submit Button */}
            <div className="form-actions">
              <button
                type="button"
                onClick={handleClose}
                className="cancel-btn"
                disabled={submitting}
              >
                Cancel
              </button>
              <button
                type="submit"
                className="submit-btn"
                disabled={!content.trim() || submitting}
              >
                {submitting ? (
                  <>
                    <Loader className="spinner" size={18} />
                    Saving...
                  </>
                ) : (
                  <>
                    <Save size={18} />
                    Save Entry
                  </>
                )}
              </button>
            </div>
          </form>
        )}
      </div>
    </Modal>
  );
};

export default JournalEntryModal;

