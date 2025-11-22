import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Users, ArrowUp, BarChart2 } from 'react-feather';
import axios from 'axios';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ForumStats = ({ darkMode }) => {
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [myAnswersCount, setMyAnswersCount] = useState(0);

  // Fetch forum statistics
  const fetchStats = async () => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      
      // Get forum stats
      const statsResponse = await axios.get(`${API_URL}/api/forum/stats`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      setStats(statsResponse.data);

      // Get current specialist ID and count their answers
      const meResponse = await axios.get(`${API_URL}/api/auth/me`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const specialistId = meResponse.data.id;

      // Get all questions and count answers
      const questionsResponse = await axios.get(
        `${API_URL}/api/forum/questions?limit=100`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      const questions = questionsResponse.data.questions || questionsResponse.data || [];
      let myAnswers = 0;

      for (const question of questions) {
        try {
          const answersResponse = await axios.get(
            `${API_URL}/api/forum/questions/${question.id}/answers`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const answers = answersResponse.data || [];
          myAnswers += answers.filter(a => a.specialist_id === specialistId).length;
        } catch (err) {
          // Skip if can't fetch
        }
      }

      setMyAnswersCount(myAnswers);
    } catch (err) {
      console.error('Error fetching forum stats:', err);
      setError(err.response?.data?.detail || 'Failed to load statistics');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStats();
  }, []);

  if (loading) {
    return <LoadingState message="Loading statistics..." />;
  }

  if (error) {
    return <ErrorState error={error} onRetry={fetchStats} />;
  }

  if (!stats) {
    return null;
  }

  return (
    <div className="space-y-6">
      <h2 className={`text-2xl font-bold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
        Forum Statistics
      </h2>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Total Questions */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className={`h-8 w-8 ${darkMode ? 'text-blue-400' : 'text-blue-600'}`} />
          </div>
          <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.total_questions || 0}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Questions
          </div>
        </motion.div>

        {/* Total Answers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <MessageSquare className={`h-8 w-8 ${darkMode ? 'text-green-400' : 'text-green-600'}`} />
          </div>
          <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.total_answers || 0}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Total Answers
          </div>
        </motion.div>

        {/* My Answers */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <BarChart2 className={`h-8 w-8 ${darkMode ? 'text-emerald-400' : 'text-emerald-600'}`} />
          </div>
          <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {myAnswersCount}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Your Answers
          </div>
        </motion.div>

        {/* Active Users */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className={`p-6 rounded-xl ${
            darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
          }`}
        >
          <div className="flex items-center justify-between mb-4">
            <Users className={`h-8 w-8 ${darkMode ? 'text-purple-400' : 'text-purple-600'}`} />
          </div>
          <div className={`text-3xl font-bold mb-1 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
            {stats.active_users || stats.total_members || 0}
          </div>
          <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
            Active Users
          </div>
        </motion.div>
      </div>

      {/* Additional Info */}
      <div className={`p-6 rounded-xl ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        <h3 className={`text-lg font-semibold mb-4 ${darkMode ? 'text-white' : 'text-gray-900'}`}>
          Your Contribution
        </h3>
        <div className="space-y-2">
          <div className="flex items-center justify-between">
            <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
              Answers Posted
            </span>
            <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
              {myAnswersCount}
            </span>
          </div>
          {stats.total_answers > 0 && (
            <div className="flex items-center justify-between">
              <span className={darkMode ? 'text-gray-400' : 'text-gray-600'}>
                Contribution Rate
              </span>
              <span className={`font-semibold ${darkMode ? 'text-white' : 'text-gray-900'}`}>
                {((myAnswersCount / stats.total_answers) * 100).toFixed(1)}%
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ForumStats;

