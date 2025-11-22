import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { ArrowLeft, MessageSquare, Eye, Clock, User, Send, Edit, Trash2, CheckCircle } from 'react-feather';
import axios from 'axios';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import StatusBadge from '../../shared/StatusBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const QuestionDetail = ({ questionId, darkMode, onBack }) => {
  const [question, setQuestion] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [answerContent, setAnswerContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState('');
  const [editingAnswerId, setEditingAnswerId] = useState(null);
  const [editContent, setEditContent] = useState('');

  // Fetch question and answers
  const fetchQuestionDetails = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      // Fetch question
      const questionResponse = await axios.get(
        `${API_URL}/api/forum/questions/${questionId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setQuestion(questionResponse.data);

      // Fetch answers
      const answersResponse = await axios.get(
        `${API_URL}/api/forum/questions/${questionId}/answers`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      setAnswers(answersResponse.data || []);

    } catch (err) {
      console.error('Error fetching question details:', err);
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to load question';
      setError(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (questionId) {
      fetchQuestionDetails();
    }
  }, [questionId]);

  // Submit answer
  const handleSubmitAnswer = async (e) => {
    e.preventDefault();
    
    const trimmedContent = answerContent.trim();
    
    // Frontend validation
    if (!trimmedContent) {
      setSubmitError('Please enter an answer');
      return;
    }

    if (trimmedContent.length < 10) {
      setSubmitError(`Answer must be at least 10 characters long. You have ${trimmedContent.length} characters.`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('access_token');
      await axios.post(
        `${API_URL}/api/forum/questions/${questionId}/answers`,
        { content: trimmedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setAnswerContent('');
      setSubmitError('');
      await fetchQuestionDetails(); // Refresh to show new answer
    } catch (err) {
      console.error('Error submitting answer:', err);
      // Extract error message from response
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to submit answer';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Update answer
  const handleUpdateAnswer = async (answerId) => {
    const trimmedContent = editContent.trim();
    
    // Frontend validation
    if (!trimmedContent) {
      setSubmitError('Please enter an answer');
      return;
    }

    if (trimmedContent.length < 10) {
      setSubmitError(`Answer must be at least 10 characters long. You have ${trimmedContent.length} characters.`);
      return;
    }

    setSubmitting(true);
    setSubmitError('');

    try {
      const token = localStorage.getItem('access_token');
      await axios.put(
        `${API_URL}/api/forum/answers/${answerId}`,
        { content: trimmedContent },
        { headers: { Authorization: `Bearer ${token}` } }
      );

      setEditingAnswerId(null);
      setEditContent('');
      setSubmitError('');
      await fetchQuestionDetails();
    } catch (err) {
      console.error('Error updating answer:', err);
      // Extract error message from response
      const errorMessage = err.response?.data?.detail || 
                          err.response?.data?.message || 
                          err.message || 
                          'Failed to update answer';
      setSubmitError(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  // Delete answer
  const handleDeleteAnswer = async (answerId) => {
    if (!window.confirm('Are you sure you want to delete this answer?')) {
      return;
    }

    try {
      const token = localStorage.getItem('access_token');
      await axios.delete(
        `${API_URL}/api/forum/answers/${answerId}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      await fetchQuestionDetails();
    } catch (err) {
      console.error('Error deleting answer:', err);
      alert(err.response?.data?.detail || 'Failed to delete answer');
    }
  };

  // Get current specialist ID
  const [currentSpecialistId, setCurrentSpecialistId] = useState(null);
  useEffect(() => {
    const fetchCurrentSpecialist = async () => {
      try {
        const token = localStorage.getItem('access_token');
        const response = await axios.get(`${API_URL}/api/auth/me`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        setCurrentSpecialistId(response.data.id);
      } catch (err) {
        console.error('Error fetching current specialist:', err);
      }
    };
    fetchCurrentSpecialist();
  }, []);

  if (loading) {
    return <LoadingState message="Loading question..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchQuestionDetails} />;
  }

  if (!question) {
    return null;
  }

  return (
    <div className="space-y-6">
      {/* Back Button */}
      <button
        onClick={onBack}
        className={`flex items-center space-x-2 px-4 py-2 rounded-lg transition-colors ${
          darkMode ? 'hover:bg-gray-700 text-gray-300' : 'hover:bg-gray-100 text-gray-700'
        }`}
      >
        <ArrowLeft className="h-5 w-5" />
        <span>Back to Questions</span>
      </button>

      {/* Question Card */}
      <div className={`p-6 rounded-xl border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        {/* Question Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex-1">
            <div className="flex items-center space-x-2 mb-3">
              {question.is_urgent && (
                <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                  Urgent
                </span>
              )}
              <span className={`px-2 py-1 text-xs font-medium rounded-full ${
                darkMode ? 'bg-blue-900 text-blue-200' : 'bg-blue-100 text-blue-800'
              }`}>
                {question.category}
              </span>
              <StatusBadge status={question.status} />
            </div>
            <h1 className={`text-2xl font-bold mb-3 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {question.title}
            </h1>
          </div>
        </div>

        {/* Question Content */}
        <div className={`mb-4 whitespace-pre-wrap ${
          darkMode ? 'text-gray-300' : 'text-gray-700'
        }`}>
          {question.content}
        </div>

        {/* Question Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-gray-200 dark:border-gray-700">
          <div className="flex items-center space-x-4 text-sm">
            <div className={`flex items-center space-x-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <User className="h-4 w-4" />
              <span>{question.is_anonymous ? 'Anonymous' : question.author_name || 'User'}</span>
            </div>
            <div className={`flex items-center space-x-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Clock className="h-4 w-4" />
              <span>{question.time_ago || question.formatted_date || new Date(question.asked_at || question.created_at).toLocaleDateString()}</span>
            </div>
            <div className={`flex items-center space-x-1 ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <Eye className="h-4 w-4" />
              <span>{question.view_count || 0} views</span>
            </div>
          </div>
        </div>
      </div>

      {/* Answer Form */}
      <div className={`p-6 rounded-xl border ${
        darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
      }`}>
        <h2 className={`text-xl font-semibold mb-4 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Post Your Answer
        </h2>

        {submitError && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            className="mb-4 p-4 rounded-lg bg-red-100 dark:bg-red-900 border border-red-200 dark:border-red-800"
          >
            <div className="flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-600 dark:text-red-400 flex-shrink-0 mt-0.5" />
              <div className="flex-1">
                <p className="text-sm font-medium text-red-900 dark:text-red-100 mb-1">
                  Validation Error
                </p>
                <p className="text-sm text-red-800 dark:text-red-200">
                  {submitError}
                </p>
              </div>
            </div>
          </motion.div>
        )}

        <form onSubmit={handleSubmitAnswer}>
          <div className="mb-2">
            <textarea
              value={answerContent}
              onChange={(e) => {
                setAnswerContent(e.target.value);
                setSubmitError('');
              }}
              placeholder="Write your answer here... Be helpful and professional. (Minimum 10 characters)"
              rows={6}
              disabled={submitting}
              className={`w-full px-4 py-3 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } ${
                answerContent.trim().length > 0 && answerContent.trim().length < 10
                  ? 'border-yellow-500 focus:ring-yellow-500'
                  : 'focus:ring-emerald-500'
              } focus:ring-2 focus:border-transparent`}
            />
            <div className={`flex justify-between items-center mt-1 text-xs ${
              darkMode ? 'text-gray-400' : 'text-gray-600'
            }`}>
              <span>
                {answerContent.trim().length < 10 && answerContent.trim().length > 0
                  ? `Minimum 10 characters required (${answerContent.trim().length}/10)`
                  : `${answerContent.trim().length} characters`
                }
              </span>
              {answerContent.trim().length >= 10 && (
                <span className="text-green-600 dark:text-green-400">
                  ✓ Ready to submit
                </span>
              )}
            </div>
          </div>
          <button
            type="submit"
            disabled={submitting || !answerContent.trim() || answerContent.trim().length < 10}
            className={`flex items-center space-x-2 px-6 py-2 rounded-lg font-medium text-white transition-all ${
              submitting || !answerContent.trim() || answerContent.trim().length < 10
                ? 'bg-emerald-400 cursor-not-allowed'
                : 'bg-emerald-600 hover:bg-emerald-700 hover:shadow-lg'
            }`}
          >
            {submitting ? (
              <>
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white"></div>
                <span>Submitting...</span>
              </>
            ) : (
              <>
                <Send className="h-5 w-5" />
                <span>Submit Answer</span>
              </>
            )}
          </button>
        </form>
      </div>

      {/* Answers List */}
      <div className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className={`text-xl font-semibold ${
            darkMode ? 'text-white' : 'text-gray-900'
          }`}>
            Answers ({answers.length})
          </h2>
        </div>

        {answers.length === 0 ? (
          <div className={`p-8 text-center rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}>
            <MessageSquare className={`h-12 w-12 mx-auto mb-3 ${
              darkMode ? 'text-gray-600' : 'text-gray-400'
            }`} />
            <p className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              No answers yet. Be the first to help!
            </p>
          </div>
        ) : (
          answers.map((answer, index) => (
            <motion.div
              key={answer.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
              className={`p-6 rounded-xl border ${
                darkMode ? 'bg-gray-800 border-gray-700' : 'bg-white border-gray-200'
              } ${answer.is_best_answer ? 'border-emerald-500 border-2' : ''}`}
            >
              {/* Answer Header */}
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center space-x-3">
                  <div className={`p-2 rounded-full ${
                    darkMode ? 'bg-gray-700' : 'bg-gray-100'
                  }`}>
                    <User className={`h-5 w-5 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`} />
                  </div>
                  <div>
                    <div className="flex items-center space-x-2">
                      <span className={`font-semibold ${
                        darkMode ? 'text-white' : 'text-gray-900'
                      }`}>
                        {answer.specialist_name || 'Specialist'}
                      </span>
                      {answer.is_best_answer && (
                        <span className="flex items-center space-x-1 px-2 py-1 text-xs font-medium rounded-full bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-200">
                          <CheckCircle className="h-3 w-3" />
                          <span>Best Answer</span>
                        </span>
                      )}
                    </div>
                    <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {answer.time_ago || new Date(answer.answered_at || answer.created_at).toLocaleDateString()}
                    </div>
                  </div>
                </div>

                {/* Actions (if own answer) */}
                {currentSpecialistId && answer.specialist_id === currentSpecialistId && (
                  <div className="flex items-center space-x-2">
                    {editingAnswerId === answer.id ? (
                      <>
                        <button
                          onClick={() => {
                            setEditingAnswerId(null);
                            setEditContent('');
                          }}
                          className={`px-3 py-1 text-sm rounded ${
                            darkMode ? 'bg-gray-700 hover:bg-gray-600' : 'bg-gray-200 hover:bg-gray-300'
                          }`}
                        >
                          Cancel
                        </button>
                        <button
                          onClick={() => handleUpdateAnswer(answer.id)}
                          disabled={submitting || !editContent.trim() || editContent.trim().length < 10}
                          className={`px-3 py-1 text-sm rounded text-white ${
                            submitting || !editContent.trim() || editContent.trim().length < 10
                              ? 'bg-emerald-400 cursor-not-allowed'
                              : 'bg-emerald-600 hover:bg-emerald-700'
                          }`}
                        >
                          Save
                        </button>
                      </>
                    ) : (
                      <>
                        <button
                          onClick={() => {
                            setEditingAnswerId(answer.id);
                            setEditContent(answer.content);
                          }}
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-gray-400' : 'hover:bg-gray-100 text-gray-600'
                          }`}
                        >
                          <Edit className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteAnswer(answer.id)}
                          className={`p-2 rounded-lg transition-colors ${
                            darkMode ? 'hover:bg-gray-700 text-red-400' : 'hover:bg-gray-100 text-red-600'
                          }`}
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>

              {/* Answer Content */}
              {editingAnswerId === answer.id ? (
                <div>
                  <textarea
                    value={editContent}
                    onChange={(e) => {
                      setEditContent(e.target.value);
                      setSubmitError('');
                    }}
                    rows={4}
                    className={`w-full px-4 py-2 rounded-lg border ${
                      darkMode
                        ? 'bg-gray-700 border-gray-600 text-white'
                        : 'bg-white border-gray-300 text-gray-900'
                    } ${
                      editContent.trim().length > 0 && editContent.trim().length < 10
                        ? 'border-yellow-500 focus:ring-yellow-500'
                        : 'focus:ring-emerald-500'
                    } focus:ring-2 focus:border-transparent`}
                  />
                  <div className={`mt-1 text-xs ${
                    darkMode ? 'text-gray-400' : 'text-gray-600'
                  }`}>
                    {editContent.trim().length < 10 && editContent.trim().length > 0
                      ? `Minimum 10 characters required (${editContent.trim().length}/10)`
                      : `${editContent.trim().length} characters`
                    }
                  </div>
                </div>
              ) : (
                <div className={`whitespace-pre-wrap ${
                  darkMode ? 'text-gray-300' : 'text-gray-700'
                }`}>
                  {answer.content}
                </div>
              )}
            </motion.div>
          ))
        )}
      </div>
    </div>
  );
};

export default QuestionDetail;

