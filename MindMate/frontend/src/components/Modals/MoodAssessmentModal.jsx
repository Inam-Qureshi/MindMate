import React, { useState, useEffect, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Loader, CheckCircle, Heart, Smile, Frown, Meh } from 'react-feather';
import axios from 'axios';
import Modal from './Modal';
import { API_URL, API_ENDPOINTS } from '../../config/api';
import { AuthStorage } from '../../utils/localStorage';
import toast from 'react-hot-toast';
import './MoodAssessmentModal.css';

const MoodAssessmentModal = ({ isOpen, onClose, darkMode, onComplete }) => {
  const [sessionId, setSessionId] = useState(null);
  const [currentQuestion, setCurrentQuestion] = useState(null);
  const [responses, setResponses] = useState([]);
  const [userInput, setUserInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [metrics, setMetrics] = useState(null);
  const [error, setError] = useState(null);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [responses, currentQuestion]);

  useEffect(() => {
    if (isOpen && !sessionId && !loading) {
      startSession();
    }
    if (isOpen && sessionId) {
      inputRef.current?.focus();
    }
  }, [isOpen]);

  // Reset when modal closes
  useEffect(() => {
    if (!isOpen) {
      // Reset state when modal closes
      setSessionId(null);
      setCurrentQuestion(null);
      setResponses([]);
      setUserInput('');
      setLoading(false);
      setSubmitting(false);
      setCompleted(false);
      setMetrics(null);
      setError(null);
    }
  }, [isOpen]);

  const normalizeQuestionPayload = (payload = {}) => {
    const totalQuestions = payload.total_questions || 6;
    const questionNumber = payload.question_number || 1;

    const fallbackQuestion = 'How would you describe how you are feeling right now?';
    const questionText = (payload.question || '').trim() || fallbackQuestion;
    const progress =
      typeof payload.progress_percent === 'number'
        ? Math.max(0, Math.min(100, payload.progress_percent))
        : Math.max(0, Math.min(100, (questionNumber / totalQuestions) * 100));

    return {
      question: questionText,
      question_number: questionNumber,
      total_questions: totalQuestions,
      theme: payload.theme || 'general',
      progress_percent: progress,
      metadata: payload.metadata || {},
    };
  };

  const startSession = async () => {
    setLoading(true);
    setError(null);
    try {
      const token = AuthStorage.getToken();
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.MOOD_SESSION_START}`,
        {},
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      console.log('[MoodAssessment] Start session response:', response.data);
      const normalizedQuestion = normalizeQuestionPayload(response.data);

      setSessionId(response.data.session_id);
      setCurrentQuestion(normalizedQuestion);

      setResponses([{
        type: 'system',
        message: normalizedQuestion.question,
        question_number: normalizedQuestion.question_number,
        total_questions: normalizedQuestion.total_questions,
        theme: normalizedQuestion.theme,
        progress_percent: normalizedQuestion.progress_percent,
      }]);
    } catch (err) {
      console.error('Error starting mood session:', err);
      setError(err.response?.data?.detail || 'Failed to start mood assessment');
      toast.error('Failed to start mood assessment');
    } finally {
      setLoading(false);
    }
  };

  const submitResponse = async () => {
    if (!userInput.trim() || submitting || completed) return;

    const userMessage = userInput.trim();
    const previousResponses = [...responses]; // Save previous state for error handling
    setUserInput('');
    setSubmitting(true);

    // Add user message to responses
    const newResponses = [...responses, {
      type: 'user',
      message: userMessage,
    }];
    setResponses(newResponses);

    try {
      const token = AuthStorage.getToken();
      const response = await axios.post(
        `${API_URL}${API_ENDPOINTS.PROGRESS_TRACKER.MOOD_SESSION_RESPOND}`,
        {
          session_id: sessionId,
          response: userMessage,
        },
        {
          headers: {
            Authorization: `Bearer ${token}`,
            'Content-Type': 'application/json',
          },
        }
      );

      if (response.data.completed) {
        // Assessment completed
        setCompleted(true);
        const inference = response.data.mood_inference || {};
        const metricsPayload = inference.metrics || {};
        setMetrics({
          mood_score: metricsPayload.mood_score,
          intensity_level: metricsPayload.intensity_level,
          energy_index: metricsPayload.energy_index,
          trigger_index: metricsPayload.trigger_index,
          coping_effectiveness: metricsPayload.coping_effectiveness,
          msi: metricsPayload.msi,
          summary: inference.summary,
          dominant_emotions: inference.dominant_emotions,
          trigger_details: inference.trigger_details,
          needs: inference.needs,
        });
        
        setResponses([
          ...newResponses,
          {
            type: 'system',
            message: 'Thank you for completing the mood assessment! Your responses have been saved.',
            isComplete: true,
          },
        ]);

        toast.success('Mood assessment completed successfully!');
        
        // Trigger dashboard refresh
        window.dispatchEvent(new Event('dashboard-refresh'));
        
        // Call onComplete callback after a delay
        setTimeout(() => {
          if (onComplete) {
            onComplete(response.data.mood_inference);
          }
        }, 500);
        
        // Auto-close after 3 seconds
        setTimeout(() => {
          onClose();
        }, 3000);
      } else {
        // Next question
        const normalizedQuestion = normalizeQuestionPayload(response.data);

        setCurrentQuestion(normalizedQuestion);
        
        setResponses([
          ...newResponses,
          {
            type: 'system',
            message: normalizedQuestion.question,
            question_number: normalizedQuestion.question_number,
            total_questions: normalizedQuestion.total_questions,
            theme: normalizedQuestion.theme,
            progress_percent: normalizedQuestion.progress_percent,
          },
        ]);
      }
    } catch (err) {
      console.error('Error submitting response:', err);
      setError(err.response?.data?.detail || 'Failed to submit response');
      toast.error('Failed to submit response');
      // Revert to previous state on error (remove the user message we just added)
      setResponses(previousResponses);
      setUserInput(userMessage); // Restore user input so they can try again
    } finally {
      setSubmitting(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      submitResponse();
    }
  };

  const getMoodIcon = (score) => {
    if (score >= 7) return <Smile className="mood-icon positive" />;
    if (score >= 4) return <Meh className="mood-icon neutral" />;
    return <Frown className="mood-icon negative" />;
  };

  const resetModal = () => {
    setSessionId(null);
    setCurrentQuestion(null);
    setResponses([]);
    setUserInput('');
    setLoading(false);
    setSubmitting(false);
    setCompleted(false);
    setMetrics(null);
    setError(null);
  };

  const handleClose = () => {
    resetModal();
    onClose();
  };

  return (
    <Modal
      isOpen={isOpen}
      onClose={handleClose}
      title="Mood Check"
      darkMode={darkMode}
      size="medium"
    >
      <div className={`mood-assessment-modal ${darkMode ? 'dark' : ''}`}>
        {loading && !sessionId ? (
          <div className="loading-state">
            <Loader className="spinner" size={32} />
            <p>Starting mood assessment...</p>
          </div>
        ) : error && !sessionId ? (
          <div className="error-state">
            <p>{error}</p>
            <button onClick={startSession} className="retry-btn">
              Try Again
            </button>
          </div>
        ) : (
          <>
            {/* Progress Bar */}
            {currentQuestion && (
              <div className="progress-bar">
                <div className="progress-info">
                  <span>Question {currentQuestion.question_number} of {currentQuestion.total_questions}</span>
                  <span>{Math.round(currentQuestion.progress_percent)}%</span>
                </div>
                <div className="progress-track">
                  <motion.div
                    className="progress-fill"
                    initial={{ width: 0 }}
                    animate={{ width: `${currentQuestion.progress_percent}%` }}
                    transition={{ duration: 0.3 }}
                  />
                </div>
              </div>
            )}

            {/* Chat Messages */}
            <div className="chat-messages">
              <AnimatePresence>
                {responses.map((response, index) => (
                  <motion.div
                    key={index}
                    className={`message ${response.type}`}
                    initial={{ opacity: 0, y: 10 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: index * 0.1 }}
                  >
                    {response.type === 'user' ? (
                      <div className="message-bubble user">
                        <p>{response.message}</p>
                      </div>
                    ) : (
                      <div className="message-bubble system">
                        {response.question_number && response.total_questions && (
                          <span className="message-meta">
                            Question {response.question_number} of {response.total_questions}
                            {typeof response.progress_percent === 'number' && (
                              <>
                                {' '}
                                · {Math.round(response.progress_percent)}%
                              </>
                            )}
                          </span>
                        )}
                        {response.isComplete ? (
                          <div className="complete-message">
                            <CheckCircle size={20} />
                            <p>{response.message}</p>
                          </div>
                        ) : (
                          <p>{response.message}</p>
                        )}
                        {response.theme && !response.isComplete && (
                          <span className="message-theme">{response.theme.replace(/_/g, ' ')}</span>
                        )}
                      </div>
                    )}
                  </motion.div>
                ))}
              </AnimatePresence>
              <div ref={messagesEndRef} />
            </div>

            {/* Metrics Display (when completed) */}
            {completed && metrics && (
              <motion.div
                className="metrics-display"
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
              >
                <h3>Your Mood Assessment</h3>
                {metrics.summary && (
                  <p className="metrics-summary">{metrics.summary}</p>
                )}
                <div className="metrics-grid">
                  <div className="metric-item">
                    <Heart size={20} />
                    <div>
                      <span className="metric-label">Mood Score</span>
                      <span className="metric-value">
                        {metrics.mood_score !== undefined
                          ? metrics.mood_score.toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div>
                      <span className="metric-label">Energy Level</span>
                      <span className="metric-value">
                        {metrics.energy_index !== undefined
                          ? metrics.energy_index.toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div>
                      <span className="metric-label">Trigger Index</span>
                      <span className="metric-value">
                        {metrics.trigger_index !== undefined
                          ? metrics.trigger_index.toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div>
                      <span className="metric-label">Intensity Level</span>
                      <span className="metric-value">
                        {metrics.intensity_level !== undefined
                          ? metrics.intensity_level.toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div>
                      <span className="metric-label">Coping Effectiveness</span>
                      <span className="metric-value">
                        {metrics.coping_effectiveness !== undefined
                          ? metrics.coping_effectiveness.toFixed(1)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                  <div className="metric-item">
                    <div>
                      <span className="metric-label">Mood Stability (MSI)</span>
                      <span className="metric-value">
                        {metrics.msi !== undefined
                          ? metrics.msi.toFixed(2)
                          : 'N/A'}
                      </span>
                    </div>
                  </div>
                </div>

                {(metrics.dominant_emotions?.length || metrics.trigger_details) && (
                  <div className="metrics-additional">
                    {metrics.dominant_emotions?.length > 0 && (
                      <div className="chip-group">
                        <span className="metric-label">Dominant Emotions:</span>
                        {metrics.dominant_emotions.map((emotion, idx) => (
                          <span key={idx} className="chip">
                            {emotion}
                          </span>
                        ))}
                      </div>
                    )}
                    {metrics.trigger_details && (
                      <div className="trigger-groups">
                        {['positive', 'negative', 'neutral'].map((group) => (
                          metrics.trigger_details[group]?.length ? (
                            <div key={group} className={`trigger-group ${group}`}>
                              <span className="metric-label">
                                {group.charAt(0).toUpperCase() + group.slice(1)} Triggers
                              </span>
                              <div className="chip-group">
                                {metrics.trigger_details[group].map((item, idx) => (
                                  <span key={`${group}-${idx}`} className="chip">
                                    {item}
                                  </span>
                                ))}
                              </div>
                            </div>
                          ) : null
                        ))}
                      </div>
                    )}
                    {metrics.needs && (
                      <div className="needs-panel">
                        <span className="metric-label">What you said you need:</span>
                        <p>{metrics.needs}</p>
                      </div>
                    )}
                  </div>
                )}
              </motion.div>
            )}

            {/* Input Area */}
            {!completed && (
              <div className="chat-input-area">
                <div className="input-wrapper">
                  <textarea
                    ref={inputRef}
                    value={userInput}
                    onChange={(e) => setUserInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your response..."
                    rows={2}
                    disabled={submitting || loading}
                    className="chat-input"
                  />
                  <button
                    onClick={submitResponse}
                    disabled={!userInput.trim() || submitting || loading}
                    className="send-btn"
                  >
                    {submitting ? (
                      <Loader className="spinner" size={20} />
                    ) : (
                      <Send size={20} />
                    )}
                  </button>
                </div>
                <p className="input-hint">Press Enter to send, Shift+Enter for new line</p>
              </div>
            )}
          </>
        )}
      </div>
    </Modal>
  );
};

export default MoodAssessmentModal;

