import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  Search, 
  Filter, 
  Plus, 
  MessageCircle, 
  TrendingUp, 
  Users,
  HelpCircle,
  Zap,
  Sun,
  Moon
} from 'react-feather';
import ForumSearch from './ForumSearch';

const ForumHeader = ({ 
  searchQuery, 
  onSearch, 
  onFilterToggle, 
  onQuestionFormToggle,
  showFilters,
  darkMode 
}) => {
  const [showSearch, setShowSearch] = useState(false);

  const handleSearchToggle = () => {
    setShowSearch(!showSearch);
  };

  const handleSearchSubmit = (query) => {
    onSearch(query);
    setShowSearch(false);
  };

  return (
    <div className={`forum-header ${darkMode ? 'dark' : ''}`}>
      <div className="header-container">
        {/* Left Section - Logo and Title */}
        <div className="header-left">
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="header-brand"
          >
            <div className="brand-icon">
              <MessageCircle size={24} />
            </div>
            <div className="brand-content">
              <h1>Community Forum</h1>
              <p>Connect, share, and learn together</p>
            </div>
          </motion.div>
        </div>

        {/* Center Section - Search */}
        <div className="header-center">
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5, delay: 0.1 }}
            className="search-container"
          >
            <div className="search-input-wrapper">
              <Search size={18} className="search-icon" />
              <input
                type="text"
                placeholder="Search questions, answers, and topics..."
                value={searchQuery}
                onChange={(e) => onSearch(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button 
                  className="clear-search-btn"
                  onClick={() => onSearch('')}
                >
                  <X size={16} />
                </button>
              )}
            </div>
            
            <button 
              className="advanced-search-btn"
              onClick={handleSearchToggle}
            >
              <Filter size={16} />
            </button>
          </motion.div>
        </div>

        {/* Right Section - Actions */}
        <div className="header-right">
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="header-actions"
          >
            {/* Filter Toggle */}
            <button 
              className={`action-btn filter-btn ${showFilters ? 'active' : ''}`}
              onClick={onFilterToggle}
            >
              <Filter size={18} />
              <span>Filters</span>
            </button>

            {/* New Question Button */}
            <button 
              className="action-btn primary-btn"
              onClick={onQuestionFormToggle}
            >
              <Plus size={18} />
              <span>Ask Question</span>
            </button>
          </motion.div>
        </div>
      </div>

      {/* Advanced Search Panel */}
      <motion.div
        initial={{ opacity: 0, height: 0 }}
        animate={{ 
          opacity: showSearch ? 1 : 0, 
          height: showSearch ? 'auto' : 0 
        }}
        transition={{ duration: 0.3 }}
        className="advanced-search-panel"
      >
        <ForumSearch
          onSearch={handleSearchSubmit}
          onClose={() => setShowSearch(false)}
          darkMode={darkMode}
        />
      </motion.div>

      {/* Quick Stats */}
      <div className="header-stats">
        <motion.div
          initial={{ opacity: 0, y: 10 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5, delay: 0.3 }}
          className="stats-container"
        >
          <div className="stat-item">
            <div className="stat-icon">
              <MessageCircle size={16} />
            </div>
            <div className="stat-content">
              <span className="stat-number">1,234</span>
              <span className="stat-label">Questions</span>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">
              <Users size={16} />
            </div>
            <div className="stat-content">
              <span className="stat-number">567</span>
              <span className="stat-label">Active Users</span>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">
              <TrendingUp size={16} />
            </div>
            <div className="stat-content">
              <span className="stat-number">89</span>
              <span className="stat-label">Answered Today</span>
            </div>
          </div>
          
          <div className="stat-item">
            <div className="stat-icon">
              <HelpCircle size={16} />
            </div>
            <div className="stat-content">
              <span className="stat-number">23</span>
              <span className="stat-label">Urgent</span>
            </div>
          </div>
        </motion.div>
      </div>
    </div>
  );
};

export default ForumHeader;
