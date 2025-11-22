import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { 
  Search, 
  X, 
  Clock, 
  TrendingUp, 
  Star, 
  MessageCircle,
  Tag,
  User,
  Calendar,
  Filter,
  CheckCircle,
  AlertCircle
} from 'react-feather';

const ForumSearch = ({ 
  onSearch, 
  onClose, 
  darkMode 
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFilters, setSearchFilters] = useState({
    category: 'all',
    dateRange: 'all',
    status: 'all',
    tags: []
  });
  const [recentSearches, setRecentSearches] = useState([]);
  const [popularSearches, setPopularSearches] = useState([]);
  const [searchSuggestions, setSearchSuggestions] = useState([]);

  const categories = [
    { value: 'all', label: 'All Categories' },
    { value: 'general', label: 'General' },
    { value: 'anxiety', label: 'Anxiety' },
    { value: 'depression', label: 'Depression' },
    { value: 'stress', label: 'Stress' },
    { value: 'relationships', label: 'Relationships' },
    { value: 'addiction', label: 'Addiction' },
    { value: 'trauma', label: 'Trauma' },
    { value: 'other', label: 'Other' }
  ];

  const dateRanges = [
    { value: 'all', label: 'All Time' },
    { value: 'today', label: 'Today' },
    { value: 'week', label: 'This Week' },
    { value: 'month', label: 'This Month' },
    { value: 'year', label: 'This Year' }
  ];

  const statusOptions = [
    { value: 'all', label: 'All Status' },
    { value: 'open', label: 'Open' },
    { value: 'answered', label: 'Answered' },
    { value: 'closed', label: 'Closed' }
  ];

  const popularTags = [
    'anxiety', 'depression', 'stress', 'relationships', 'work', 'family', 
    'therapy', 'medication', 'coping', 'support', 'mental health', 'self-care'
  ];

  useEffect(() => {
    // Load recent searches from localStorage
    const recent = JSON.parse(localStorage.getItem('forum_recent_searches') || '[]');
    setRecentSearches(recent);
    
    // Load popular searches (this would come from backend)
    setPopularSearches([
      'How to manage anxiety at work?',
      'Dealing with depression',
      'Stress management techniques',
      'Relationship advice',
      'Therapy options'
    ]);
  }, []);

  useEffect(() => {
    // Generate search suggestions based on query
    if (searchQuery.length > 2) {
      const suggestions = [
        `${searchQuery} anxiety`,
        `${searchQuery} depression`,
        `${searchQuery} stress`,
        `${searchQuery} relationships`,
        `${searchQuery} therapy`
      ].filter(s => s !== searchQuery);
      setSearchSuggestions(suggestions);
    } else {
      setSearchSuggestions([]);
    }
  }, [searchQuery]);

  const handleSearchSubmit = (e) => {
    e.preventDefault();
    if (searchQuery.trim()) {
      // Add to recent searches
      const recent = [searchQuery, ...recentSearches.filter(s => s !== searchQuery)].slice(0, 5);
      setRecentSearches(recent);
      localStorage.setItem('forum_recent_searches', JSON.stringify(recent));
      
      // Perform search
      onSearch(searchQuery);
    }
  };

  const handleSuggestionClick = (suggestion) => {
    setSearchQuery(suggestion);
    onSearch(suggestion);
  };

  const handleRecentSearchClick = (search) => {
    setSearchQuery(search);
    onSearch(search);
  };

  const handlePopularSearchClick = (search) => {
    setSearchQuery(search);
    onSearch(search);
  };

  const handleFilterChange = (filterType, value) => {
    setSearchFilters(prev => ({
      ...prev,
      [filterType]: value
    }));
  };

  const handleTagClick = (tag) => {
    setSearchQuery(prev => prev ? `${prev} ${tag}` : tag);
  };

  const handleClearSearch = () => {
    setSearchQuery('');
    setSearchFilters({
      category: 'all',
      dateRange: 'all',
      status: 'all',
      tags: []
    });
  };

  return (
    <div className={`forum-search ${darkMode ? 'dark' : ''}`}>
      <div className="search-container">
        {/* Search Header */}
        <div className="search-header">
          <div className="header-content">
            <Search size={20} />
            <h3>Advanced Search</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Search Form */}
        <form onSubmit={handleSearchSubmit} className="search-form">
          <div className="search-input-group">
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search questions, answers, and topics..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
                autoFocus
              />
              {searchQuery && (
                <button 
                  type="button"
                  className="clear-search-btn"
                  onClick={handleClearSearch}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            <button type="submit" className="search-submit-btn">
              <Search size={18} />
            </button>
          </div>
        </form>

        {/* Search Filters */}
        <div className="search-filters">
          <div className="filter-group">
            <label>Category</label>
            <select 
              value={searchFilters.category}
              onChange={(e) => handleFilterChange('category', e.target.value)}
              className="filter-select"
            >
              {categories.map(category => (
                <option key={category.value} value={category.value}>
                  {category.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Date Range</label>
            <select 
              value={searchFilters.dateRange}
              onChange={(e) => handleFilterChange('dateRange', e.target.value)}
              className="filter-select"
            >
              {dateRanges.map(range => (
                <option key={range.value} value={range.value}>
                  {range.label}
                </option>
              ))}
            </select>
          </div>
          
          <div className="filter-group">
            <label>Status</label>
            <select 
              value={searchFilters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="filter-select"
            >
              {statusOptions.map(status => (
                <option key={status.value} value={status.value}>
                  {status.label}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Search Suggestions */}
        <AnimatePresence>
          {searchSuggestions.length > 0 && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="search-suggestions"
            >
              <h4>Suggestions</h4>
              <div className="suggestions-list">
                {searchSuggestions.map((suggestion, index) => (
                  <button
                    key={index}
                    className="suggestion-item"
                    onClick={() => handleSuggestionClick(suggestion)}
                  >
                    <Search size={14} />
                    <span>{suggestion}</span>
                  </button>
                ))}
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Recent Searches */}
        {recentSearches.length > 0 && (
          <div className="recent-searches">
            <h4>Recent Searches</h4>
            <div className="searches-list">
              {(recentSearches || []).map((search, index) => (
                <button
                  key={index}
                  className="search-item"
                  onClick={() => handleRecentSearchClick(search)}
                >
                  <Clock size={14} />
                  <span>{search}</span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Popular Searches */}
        <div className="popular-searches">
          <h4>Popular Searches</h4>
          <div className="searches-list">
            {popularSearches.map((search, index) => (
              <button
                key={index}
                className="search-item"
                onClick={() => handlePopularSearchClick(search)}
              >
                <TrendingUp size={14} />
                <span>{search}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Popular Tags */}
        <div className="popular-tags">
          <h4>Popular Tags</h4>
          <div className="tags-list">
            {popularTags.map((tag, index) => (
              <button
                key={index}
                className="tag-item"
                onClick={() => handleTagClick(tag)}
              >
                <Tag size={12} />
                <span>{tag}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Search Tips */}
        <div className="search-tips">
          <h4>Search Tips</h4>
          <div className="tips-list">
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Use specific keywords for better results</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Try different combinations of words</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Use quotes for exact phrases</span>
            </div>
            <div className="tip-item">
              <CheckCircle size={14} />
              <span>Filter by category and date for precise results</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForumSearch;
