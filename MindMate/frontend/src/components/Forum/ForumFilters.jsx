import React from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  Filter, 
  Calendar, 
  Tag, 
  CheckCircle, 
  AlertCircle,
  Clock,
  TrendingUp,
  Star,
  Heart,
  User,
  Shield,
  HelpCircle,
  Zap,
  MessageCircle
} from 'react-feather';

const ForumFilters = ({ 
  categories, 
  sortOptions, 
  selectedCategory, 
  sortBy, 
  filters, 
  onCategoryChange, 
  onSortChange, 
  onFilterChange, 
  onClose, 
  darkMode 
}) => {
  const handleCategorySelect = (category) => {
    onCategoryChange(category);
  };

  const handleSortSelect = (sort) => {
    onSortChange(sort);
  };

  const handleFilterChange = (filterType, value) => {
    onFilterChange(filterType, value);
  };

  const handleClearFilters = () => {
    onCategoryChange('all');
    onSortChange('newest');
    onFilterChange('status', 'all');
    onFilterChange('dateRange', 'all');
    onFilterChange('tags', []);
    onFilterChange('urgent', false);
    onFilterChange('answered', false);
  };

  const getCategoryIcon = (category) => {
    switch (category) {
      case 'anxiety':
        return <AlertCircle size={16} />;
      case 'depression':
        return <Heart size={16} />;
      case 'stress':
        return <TrendingUp size={16} />;
      case 'relationships':
        return <User size={16} />;
      case 'addiction':
        return <Shield size={16} />;
      case 'trauma':
        return <Star size={16} />;
      default:
        return <MessageCircle size={16} />;
    }
  };

  const getSortIcon = (sort) => {
    switch (sort) {
      case 'newest':
        return <Clock size={16} />;
      case 'oldest':
        return <Clock size={16} />;
      case 'most_answered':
        return <MessageCircle size={16} />;
      case 'most_viewed':
        return <TrendingUp size={16} />;
      case 'most_liked':
        return <Heart size={16} />;
      case 'trending':
        return <Zap size={16} />;
      default:
        return <Clock size={16} />;
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, height: 0 }}
      animate={{ opacity: 1, height: 'auto' }}
      exit={{ opacity: 0, height: 0 }}
      transition={{ duration: 0.3 }}
      className={`forum-filters ${darkMode ? 'dark' : ''}`}
    >
      <div className="filters-container">
        {/* Filters Header */}
        <div className="filters-header">
          <div className="header-content">
            <Filter size={20} />
            <h3>Filters & Sorting</h3>
          </div>
          <button className="close-btn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Filters Content */}
        <div className="filters-content">
          {/* Category Filter */}
          <div className="filter-section">
            <h4>Category</h4>
            <div className="category-grid">
              {categories.map((category) => (
                <motion.button
                  key={category.value}
                  className={`category-btn ${selectedCategory === category.value ? 'selected' : ''}`}
                  onClick={() => handleCategorySelect(category.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="category-icon">
                    {getCategoryIcon(category.value)}
                  </div>
                  <span className="category-label">{category.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Sort Options */}
          <div className="filter-section">
            <h4>Sort By</h4>
            <div className="sort-options">
              {sortOptions.map((option) => (
                <motion.button
                  key={option.value}
                  className={`sort-btn ${sortBy === option.value ? 'selected' : ''}`}
                  onClick={() => handleSortSelect(option.value)}
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                >
                  <div className="sort-icon">
                    {getSortIcon(option.value)}
                  </div>
                  <span className="sort-label">{option.label}</span>
                </motion.button>
              ))}
            </div>
          </div>

          {/* Status Filter */}
          <div className="filter-section">
            <h4>Status</h4>
            <div className="status-options">
              <label className="status-option">
                <input
                  type="radio"
                  name="status"
                  value="all"
                  checked={filters.status === 'all'}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                />
                <div className="option-content">
                  <MessageCircle size={16} />
                  <span>All Questions</span>
                </div>
              </label>
              
              <label className="status-option">
                <input
                  type="radio"
                  name="status"
                  value="open"
                  checked={filters.status === 'open'}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                />
                <div className="option-content">
                  <AlertCircle size={16} />
                  <span>Open Questions</span>
                </div>
              </label>
              
              <label className="status-option">
                <input
                  type="radio"
                  name="status"
                  value="answered"
                  checked={filters.status === 'answered'}
                  onChange={(e) => handleFilterChange('status', e.target.value)}
                />
                <div className="option-content">
                  <CheckCircle size={16} />
                  <span>Answered Questions</span>
                </div>
              </label>
            </div>
          </div>

          {/* Date Range Filter */}
          <div className="filter-section">
            <h4>Date Range</h4>
            <div className="date-options">
              <label className="date-option">
                <input
                  type="radio"
                  name="dateRange"
                  value="all"
                  checked={filters.dateRange === 'all'}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
                <div className="option-content">
                  <Calendar size={16} />
                  <span>All Time</span>
                </div>
              </label>
              
              <label className="date-option">
                <input
                  type="radio"
                  name="dateRange"
                  value="today"
                  checked={filters.dateRange === 'today'}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
                <div className="option-content">
                  <Clock size={16} />
                  <span>Today</span>
                </div>
              </label>
              
              <label className="date-option">
                <input
                  type="radio"
                  name="dateRange"
                  value="week"
                  checked={filters.dateRange === 'week'}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
                <div className="option-content">
                  <Calendar size={16} />
                  <span>This Week</span>
                </div>
              </label>
              
              <label className="date-option">
                <input
                  type="radio"
                  name="dateRange"
                  value="month"
                  checked={filters.dateRange === 'month'}
                  onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                />
                <div className="option-content">
                  <Calendar size={16} />
                  <span>This Month</span>
                </div>
              </label>
            </div>
          </div>

          {/* Special Filters */}
          <div className="filter-section">
            <h4>Special Filters</h4>
            <div className="special-options">
              <label className="special-option">
                <input
                  type="checkbox"
                  checked={filters.urgent}
                  onChange={(e) => handleFilterChange('urgent', e.target.checked)}
                />
                <div className="option-content">
                  <AlertCircle size={16} />
                  <span>Urgent Questions Only</span>
                </div>
              </label>
              
              <label className="special-option">
                <input
                  type="checkbox"
                  checked={filters.answered}
                  onChange={(e) => handleFilterChange('answered', e.target.checked)}
                />
                <div className="option-content">
                  <CheckCircle size={16} />
                  <span>Answered Questions Only</span>
                </div>
              </label>
            </div>
          </div>
        </div>

        {/* Filters Footer */}
        <div className="filters-footer">
          <button 
            className="clear-filters-btn"
            onClick={handleClearFilters}
          >
            <X size={16} />
            <span>Clear All Filters</span>
          </button>
          
          <button 
            className="apply-filters-btn"
            onClick={onClose}
          >
            <CheckCircle size={16} />
            <span>Apply Filters</span>
          </button>
        </div>
      </div>
    </motion.div>
  );
};

export default ForumFilters;
