import React, { useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { MessageSquare, Search, Filter, Clock, Eye, ArrowUp, AlertCircle } from 'react-feather';
import axios from 'axios';
import LoadingState from '../../shared/LoadingState';
import ErrorState from '../../shared/ErrorState';
import EmptyState from '../../shared/EmptyState';
import StatusBadge from '../../shared/StatusBadge';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:8000';

const ForumQuestionsList = ({ darkMode, onQuestionSelect, onFilterChange }) => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [searchQuery, setSearchQuery] = useState('');
  const [filters, setFilters] = useState({
    category: 'all',
    status: 'open',
    sort_by: 'newest',
    urgent_only: false
  });
  const [pagination, setPagination] = useState({
    page: 1,
    limit: 20,
    total: 0,
    pages: 0,
    has_next: false,
    has_prev: false
  });

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'depression', label: 'Depression' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'trauma', label: 'Trauma' },
    { value: 'addiction', label: 'Addiction' },
    { value: 'other', label: 'Other' }
  ];

  const sortOptions = [
    { value: 'newest', label: 'Newest First', icon: Clock },
    { value: 'oldest', label: 'Oldest First', icon: Clock },
    { value: 'most_viewed', label: 'Most Viewed', icon: Eye },
    { value: 'urgent', label: 'Urgent First', icon: AlertCircle }
  ];

  // Fetch questions
  const fetchQuestions = async (page = 1) => {
    setLoading(true);
    setError('');

    try {
      const token = localStorage.getItem('access_token');
      const params = {
        limit: pagination.limit,
        offset: (page - 1) * pagination.limit,
        sort_by: filters.sort_by
      };

      if (filters.category !== 'all') {
        params.category = filters.category;
      }

      if (filters.status !== 'all') {
        params.question_status = filters.status;
      }

      if (filters.urgent_only) {
        params.urgent_only = true;
      }

      const response = await axios.get(`${API_URL}/api/forum/questions`, {
        params,
        headers: { Authorization: `Bearer ${token}` }
      });

      let questionsData = response.data.questions || response.data || [];
      
      // Apply search filter client-side
      if (searchQuery.trim()) {
        const query = searchQuery.toLowerCase();
        questionsData = questionsData.filter(q => 
          q.title?.toLowerCase().includes(query) ||
          q.content?.toLowerCase().includes(query) ||
          q.category?.toLowerCase().includes(query)
        );
      }

      setQuestions(questionsData);
      
      // Update pagination
      if (response.data.pagination) {
        setPagination({
          ...pagination,
          page: response.data.pagination.page || page,
          total: response.data.pagination.total || questionsData.length,
          pages: response.data.pagination.pages || 1,
          has_next: response.data.pagination.has_next || false,
          has_prev: response.data.pagination.has_prev || false
        });
      }

      // Notify parent of filter change
      if (onFilterChange) {
        onFilterChange(filters);
      }

    } catch (err) {
      console.error('Error fetching questions:', err);
      setError(err.response?.data?.detail || 'Failed to load questions');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions(1);
  }, [filters.category, filters.status, filters.sort_by, filters.urgent_only]);

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
    setPagination(prev => ({ ...prev, page: 1 }));
  };

  const handlePageChange = (newPage) => {
    fetchQuestions(newPage);
  };

  const getCategoryColor = (category) => {
    const colors = {
      general: 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200',
      anxiety: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200',
      depression: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200',
      relationships: 'bg-pink-100 text-pink-800 dark:bg-pink-900 dark:text-pink-200',
      trauma: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200',
      addiction: 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200',
      other: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200'
    };
    return colors[category] || colors.other;
  };

  if (loading && questions.length === 0) {
    return <LoadingState message="Loading questions..." />;
  }

  if (error && questions.length === 0) {
    return <ErrorState error={error} onRetry={() => fetchQuestions(1)} />;
  }

  return (
    <div className="space-y-4">
      {/* Search and Filters */}
      <div className={`p-4 rounded-xl ${
        darkMode ? 'bg-gray-800 border border-gray-700' : 'bg-white border border-gray-200'
      }`}>
        {/* Search */}
        <div className="mb-4">
          <div className="relative">
            <Search className={`absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 ${
              darkMode ? 'text-gray-400' : 'text-gray-500'
            }`} />
            <input
              type="text"
              placeholder="Search questions..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className={`w-full pl-10 pr-4 py-2 rounded-lg border ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white placeholder-gray-400'
                  : 'bg-white border-gray-300 text-gray-900 placeholder-gray-500'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            />
          </div>
        </div>

        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          {/* Category */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Category
            </label>
            <select
              value={filters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              {categories.map(cat => (
                <option key={cat.value} value={cat.value}>
                  {cat.label}
                </option>
              ))}
            </select>
          </div>

          {/* Status */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Status
            </label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              <option value="all">All Status</option>
              <option value="open">Open</option>
              <option value="closed">Closed</option>
              <option value="answered">Answered</option>
            </select>
          </div>

          {/* Sort By */}
          <div>
            <label className={`block text-sm font-medium mb-2 ${
              darkMode ? 'text-gray-300' : 'text-gray-700'
            }`}>
              Sort By
            </label>
            <select
              value={filters.sort_by}
              onChange={(e) => handleFilterChange('sort_by', e.target.value)}
              className={`w-full px-3 py-2 rounded-lg border text-sm ${
                darkMode
                  ? 'bg-gray-700 border-gray-600 text-white'
                  : 'bg-white border-gray-300 text-gray-900'
              } focus:ring-2 focus:ring-emerald-500 focus:border-transparent`}
            >
              {sortOptions.map(opt => (
                <option key={opt.value} value={opt.value}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          {/* Urgent Only */}
          <div className="flex items-end">
            <label className="flex items-center space-x-2 cursor-pointer">
              <input
                type="checkbox"
                checked={filters.urgent_only}
                onChange={(e) => handleFilterChange('urgent_only', e.target.checked)}
                className="w-4 h-4 text-emerald-600 rounded focus:ring-emerald-500"
              />
              <span className={`text-sm ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Urgent Only
              </span>
            </label>
          </div>
        </div>
      </div>

      {/* Questions List */}
      {questions.length === 0 ? (
        <EmptyState
          icon={MessageSquare}
          title="No Questions Found"
          message={searchQuery ? "No questions match your search criteria." : "No questions available in this category."}
        />
      ) : (
        <>
          <div className="space-y-3">
            {questions.map((question, index) => (
              <motion.div
                key={question.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.05 }}
                onClick={() => onQuestionSelect && onQuestionSelect(question)}
                className={`p-5 rounded-xl border cursor-pointer transition-all ${
                  darkMode
                    ? 'bg-gray-800 border-gray-700 hover:bg-gray-750 hover:border-emerald-600'
                    : 'bg-white border-gray-200 hover:bg-gray-50 hover:border-emerald-500'
                }`}
              >
                {/* Header */}
                <div className="flex items-start justify-between mb-3">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      {question.is_urgent && (
                        <span className="px-2 py-1 text-xs font-medium rounded-full bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200">
                          Urgent
                        </span>
                      )}
                      <span className={`px-2 py-1 text-xs font-medium rounded-full ${getCategoryColor(question.category)}`}>
                        {question.category}
                      </span>
                      <StatusBadge status={question.status} />
                    </div>
                    <h3 className={`text-lg font-semibold mb-2 ${
                      darkMode ? 'text-white' : 'text-gray-900'
                    }`}>
                      {question.title}
                    </h3>
                  </div>
                </div>

                {/* Content Preview */}
                <p className={`text-sm mb-3 line-clamp-2 ${
                  darkMode ? 'text-gray-400' : 'text-gray-600'
                }`}>
                  {question.content}
                </p>

                {/* Footer */}
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center space-x-4">
                    <div className={`flex items-center space-x-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <MessageSquare className="h-4 w-4" />
                      <span>{question.answers_count || 0} answers</span>
                    </div>
                    <div className={`flex items-center space-x-1 ${
                      darkMode ? 'text-gray-400' : 'text-gray-600'
                    }`}>
                      <Eye className="h-4 w-4" />
                      <span>{question.view_count || 0} views</span>
                    </div>
                    <div className={`${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                      {question.time_ago || question.formatted_date || new Date(question.asked_at || question.created_at).toLocaleDateString()}
                    </div>
                  </div>
                  <div className={`text-sm ${darkMode ? 'text-gray-400' : 'text-gray-600'}`}>
                    {question.is_anonymous ? 'Anonymous' : question.author_name || 'User'}
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Pagination */}
          {pagination.pages > 1 && (
            <div className="flex items-center justify-center space-x-2 pt-4">
              <button
                onClick={() => handlePageChange(pagination.page - 1)}
                disabled={!pagination.has_prev}
                className={`px-4 py-2 rounded-lg ${
                  pagination.has_prev
                    ? darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Previous
              </button>
              <span className={`px-4 py-2 ${darkMode ? 'text-gray-300' : 'text-gray-700'}`}>
                Page {pagination.page} of {pagination.pages}
              </span>
              <button
                onClick={() => handlePageChange(pagination.page + 1)}
                disabled={!pagination.has_next}
                className={`px-4 py-2 rounded-lg ${
                  pagination.has_next
                    ? darkMode
                      ? 'bg-gray-700 hover:bg-gray-600 text-white'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-300'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'
                }`}
              >
                Next
              </button>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default ForumQuestionsList;

