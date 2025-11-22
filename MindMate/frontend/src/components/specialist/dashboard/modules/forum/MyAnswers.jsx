import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Eye, Clock, ArrowRight } from 'react-feather';
import axios from 'axios';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const MyAnswers = ({ darkMode, onQuestionSelect }) => {
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [currentSpecialistId, setCurrentSpecialistId] = useState(null);

  // Get current specialist ID
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

  // Fetch all questions and filter for ones I answered
  const fetchMyAnswers = async () => {
    if (!currentSpecialistId) return;

    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      // Get all questions
      const questionsResponse = await axios.get(
        `${API_URL}/api/forum/questions?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const questions = questionsResponse.data.questions || questionsResponse.data || [];
      const myAnswersMap = new Map();

      // For each question, get answers and find mine
      for (const question of questions) {
        try {
          const answersResponse = await axios.get(
            `${API_URL}/api/forum/questions/${question.id}/answers`,
            { headers: { Authorization: `Bearer ${token}` } }
          );

          const questionAnswers = answersResponse.data || [];
          const myAnswer = questionAnswers.find(a => a.specialist_id === currentSpecialistId);

          if (myAnswer) {
            myAnswersMap.set(question.id, {
              question,
              answer: myAnswer
            });
          }
        } catch (err) {
          // Skip if can't fetch answers for this question
          console.warn(`Could not fetch answers for question ${question.id}:`, err);
        }
      }

      setAnswers(Array.from(myAnswersMap.values()));
    } catch (err) {
      console.error('Error fetching my answers:', err);
      setError(err.response?.data?.detail || 'Failed to load your answers');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentSpecialistId) {
      fetchMyAnswers();
    }
  }, [currentSpecialistId]);

  if (loading) {
    return <LoadingState message="Loading your answers..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchMyAnswers} />;
  }

  if (answers.length === 0) {
    return (
      <EmptyState
        icon={MessageSquare}
        title="No Answers Yet"
        message="You haven't answered any questions yet. Browse questions and help patients by sharing your expertise!"
      />
    );
  }

  return (
    <div className="space-y-4">
      <div className={`p-4 rounded-xl ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <h2 className={`text-lg font-semibold mb-1 ${
          darkMode ? 'text-white' : 'text-gray-900'
        }`}>
          Your Contributions
        </h2>
        <p className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
          You've answered {answers.length} question{answers.length !== 1 ? 's' : ''}
        </p>
      </div>

      <div className="space-y-3">
        {answers.map((item, index) => (
          <motion.div
            key={item.question.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.05 }}
            onClick={() => onQuestionSelect && onQuestionSelect(item.question)}
            className={`p-5 rounded-xl border cursor-pointer transition-all ${
              darkMode
                ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-emerald-600'
                : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-emerald-500'
            }`}
          >
            {/* Question Title */}
            <h3 className={`text-lg font-semibold mb-2 ${
              darkMode ? 'text-white' : 'text-gray-900'
            }`}>
              {item.question.title}
            </h3>

            {/* My Answer Preview */}
            <div className={`mb-3 p-3 rounded-lg border-l-4 ${
              darkMode
                ? 'bg-gray-900 border-emerald-600'
                : 'bg-emerald-50 border-emerald-500'
            }`}>
              <div className={`text-xs font-medium mb-1 ${
                darkMode ? 'text-emerald-400' : 'text-emerald-700'
              }`}>
                Your Answer:
              </div>
              <p className={`text-sm line-clamp-2 ${
                darkMode ? 'text-gray-300' : 'text-gray-700'
              }`}>
                {item.answer.content}
              </p>
            </div>

            {/* Footer */}
            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center space-x-4">
                <div className={`flex items-center space-x-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <MessageSquare className="h-4 w-4" />
                  <span>{item.question.answers_count || 0} total answers</span>
                </div>
                <div className={`flex items-center space-x-1 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  <Clock className="h-4 w-4" />
                  <span>Answered {item.answer.time_ago || new Date(item.answer.answered_at || item.answer.created_at).toLocaleDateString()}</span>
                </div>
              </div>
              <ArrowRight className={`h-5 w-5 ${
                darkMode ? 'text-gray-400' : 'text-gray-600'
              }`} />
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

export default MyAnswers;

