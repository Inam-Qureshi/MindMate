import React, { useState } from 'react';
import { motion } from 'framer-motion';
import { 
  X, 
  MapPin, 
  Clock, 
  DollarSign, 
  Globe, 
  Award,
  Calendar,
  Filter,
  ChevronDown,
  ChevronUp
} from 'react-feather';

const SearchFilters = ({ 
  filters, 
  onFilterChange, 
  specialistTypes, 
  consultationModes, 
  sortOptions, 
  darkMode 
}) => {
  const [expandedSections, setExpandedSections] = useState({
    type: true,
    location: false,
    availability: false,
    pricing: false,
    languages: false,
    specializations: false
  });

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const handleFilterChange = (key, value) => {
    onFilterChange({ [key]: value });
  };

  const handleMultiSelect = (key, value) => {
    const currentValues = filters[key] || [];
    const newValues = currentValues.includes(value)
      ? currentValues.filter(v => v !== value)
      : [...currentValues, value];
    
    onFilterChange({ [key]: newValues });
  };

  const clearAllFilters = () => {
    onFilterChange({
      specialist_type: '',
      consultation_mode: '',
      city: '',
      languages: [],
      specializations: [],
      budget_max: null,
      available_from: null,
      available_to: null
    });
  };

  const hasActiveFilters = () => {
    return filters.specialist_type || 
           filters.consultation_mode || 
           filters.city || 
           (filters.languages && filters.languages.length > 0) ||
           (filters.specializations && filters.specializations.length > 0) ||
           filters.budget_max ||
           filters.available_from ||
           filters.available_to;
  };

  const languages = [
    'English', 'Urdu', 'Hindi', 'Punjabi', 'Sindhi', 'Balochi', 'Pashto', 'Arabic'
  ];

  const specializations = [
    'Anxiety', 'Depression', 'PTSD', 'Bipolar Disorder', 'Schizophrenia',
    'Eating Disorders', 'Substance Abuse', 'Grief Counseling', 'Family Therapy',
    'Couples Therapy', 'Child Psychology', 'Adolescent Psychology',
    'Geriatric Psychology', 'Trauma Therapy', 'Cognitive Behavioral Therapy'
  ];

  const cities = [
    'Karachi', 'Lahore', 'Islamabad', 'Rawalpindi', 'Faisalabad',
    'Multan', 'Peshawar', 'Quetta', 'Sialkot', 'Gujranwala'
  ];

  return (
    <div className={`search-filters ${darkMode ? 'dark' : ''}`}>
      <div className="filters-header">
        <h3>Filter Results</h3>
        {hasActiveFilters() && (
          <button className="clear-filters" onClick={clearAllFilters}>
            <X size={14} />
            Clear All
          </button>
        )}
      </div>

      <div className="filters-content">
        {/* Specialist Type */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('type')}
          >
            <Award size={16} />
            <span>Specialist Type</span>
            {expandedSections.type ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.type && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              {specialistTypes.map(type => (
                <label key={type.value} className="filter-option">
                  <input
                    type="radio"
                    name="specialist_type"
                    value={type.value}
                    checked={filters.specialist_type === type.value}
                    onChange={(e) => handleFilterChange('specialist_type', e.target.value)}
                  />
                  <span className="option-icon">{type.icon}</span>
                  <span className="option-label">{type.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </div>

        {/* Consultation Mode */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('consultation')}
          >
            <Calendar size={16} />
            <span>Consultation Mode</span>
            {expandedSections.consultation ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.consultation && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              {consultationModes.map(mode => (
                <label key={mode.value} className="filter-option">
                  <input
                    type="radio"
                    name="consultation_mode"
                    value={mode.value}
                    checked={filters.consultation_mode === mode.value}
                    onChange={(e) => handleFilterChange('consultation_mode', e.target.value)}
                  />
                  <span className="option-icon">{mode.icon}</span>
                  <span className="option-label">{mode.label}</span>
                </label>
              ))}
            </motion.div>
          )}
        </div>

        {/* Location */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('location')}
          >
            <MapPin size={16} />
            <span>Location</span>
            {expandedSections.location ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.location && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              <div className="location-input">
                <input
                  type="text"
                  placeholder="Enter city name..."
                  value={filters.city}
                  onChange={(e) => handleFilterChange('city', e.target.value)}
                  className="location-search"
                />
              </div>
              
              <div className="popular-cities">
                <h4>Popular Cities</h4>
                <div className="city-tags">
                  {cities.map(city => (
                    <button
                      key={city}
                      className={`city-tag ${filters.city === city ? 'active' : ''}`}
                      onClick={() => handleFilterChange('city', city)}
                    >
                      {city}
                    </button>
                  ))}
                </div>
              </div>
            </motion.div>
          )}
        </div>

        {/* Languages */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('languages')}
          >
                <Globe size={16} />
            <span>Languages</span>
            {expandedSections.languages ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.languages && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              <div className="language-tags">
                {languages.map(language => (
                  <label key={language} className="language-option">
                    <input
                      type="checkbox"
                      checked={filters.languages?.includes(language) || false}
                      onChange={() => handleMultiSelect('languages', language)}
                    />
                    <span className="language-tag">{language}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Specializations */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('specializations')}
          >
            <Award size={16} />
            <span>Specializations</span>
            {expandedSections.specializations ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.specializations && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              <div className="specialization-tags">
                {specializations.map(specialization => (
                  <label key={specialization} className="specialization-option">
                    <input
                      type="checkbox"
                      checked={filters.specializations?.includes(specialization) || false}
                      onChange={() => handleMultiSelect('specializations', specialization)}
                    />
                    <span className="specialization-tag">{specialization}</span>
                  </label>
                ))}
              </div>
            </motion.div>
          )}
        </div>

        {/* Pricing */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('pricing')}
          >
            <DollarSign size={16} />
            <span>Pricing</span>
            {expandedSections.pricing ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.pricing && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              <div className="pricing-range">
                <label className="pricing-label">
                  Maximum Budget (PKR)
                </label>
                <input
                  type="number"
                  placeholder="Enter maximum budget..."
                  value={filters.budget_max || ''}
                  onChange={(e) => handleFilterChange('budget_max', e.target.value ? parseFloat(e.target.value) : null)}
                  className="budget-input"
                  min="0"
                  step="100"
                />
              </div>
              
              <div className="pricing-presets">
                <button 
                  className={`pricing-preset ${filters.budget_max === 2000 ? 'active' : ''}`}
                  onClick={() => handleFilterChange('budget_max', 2000)}
                >
                  Under PKR 2,000
                </button>
                <button 
                  className={`pricing-preset ${filters.budget_max === 5000 ? 'active' : ''}`}
                  onClick={() => handleFilterChange('budget_max', 5000)}
                >
                  Under PKR 5,000
                </button>
                <button 
                  className={`pricing-preset ${filters.budget_max === 10000 ? 'active' : ''}`}
                  onClick={() => handleFilterChange('budget_max', 10000)}
                >
                  Under PKR 10,000
                </button>
              </div>
            </motion.div>
          )}
        </div>

        {/* Availability */}
        <div className="filter-section">
          <button 
            className="filter-section-header"
            onClick={() => toggleSection('availability')}
          >
            <Clock size={16} />
            <span>Availability</span>
            {expandedSections.availability ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
          </button>
          
          {expandedSections.availability && (
            <motion.div 
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: 'auto' }}
              exit={{ opacity: 0, height: 0 }}
              className="filter-options"
            >
              <div className="availability-dates">
                <div className="date-input">
                  <label>Available From</label>
                  <input
                    type="date"
                    value={filters.available_from || ''}
                    onChange={(e) => handleFilterChange('available_from', e.target.value)}
                    className="date-picker"
                  />
                </div>
                <div className="date-input">
                  <label>Available To</label>
                  <input
                    type="date"
                    value={filters.available_to || ''}
                    onChange={(e) => handleFilterChange('available_to', e.target.value)}
                    className="date-picker"
                  />
                </div>
              </div>
            </motion.div>
          )}
        </div>
      </div>
    </div>
  );
};

export default SearchFilters;
