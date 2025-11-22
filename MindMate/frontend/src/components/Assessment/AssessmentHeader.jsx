import React from 'react';
import { motion } from 'framer-motion';
import { FileText, Plus, Menu } from 'react-feather';
import './AssessmentHeader.css';

const AssessmentHeader = ({ 
  darkMode = false,
  currentSession = null,
  progress = 0,
  progressDetails = null,
  symptomSummary = null,
  onStartNewSession,
  onMenuToggle
}) => {
  const progressValue = Math.round(Math.max(0, Math.min(100, progress)));
  const currentModule = progressDetails?.current_module || currentSession?.current_module;
  const nextModule = progressDetails?.next_module || currentSession?.next_module;
  const completedModules = Array.isArray(progressDetails?.module_status)
    ? progressDetails.module_status.filter(
        (module) => (module?.status || module?.state) === 'completed' || module?.status === 'done'
      ).length
    : Array.isArray(progressDetails?.completed_modules)
      ? progressDetails.completed_modules.length
      : 0;
  const totalModules =
    progressDetails?.module_sequence?.length ||
    progressDetails?.module_status?.length ||
    progressDetails?.total_modules ||
    0;

  const primarySymptom = Array.isArray(symptomSummary?.categories)
    ? symptomSummary.categories[0]
    : null;

  const formatLabel = (value) => {
    if (!value) return '';
    return value
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div className={`assessment-header ${darkMode ? 'dark' : ''}`}>
      <div className="header-container">
        {/* Left Section - Brand */}
        <div className="header-left">
          {onMenuToggle && (
            <button
              className="header-menu-btn"
              onClick={onMenuToggle}
            >
              <Menu size={20} />
            </button>
          )}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5 }}
            className="header-brand"
          >
            <div className="brand-icon">
              <FileText size={20} />
            </div>
            <div className="brand-content">
              <h1>Assessment</h1>
              <p className="brand-subtitle">Your mental health assessment sessions</p>
            </div>
          </motion.div>
        </div>

        {/* Center Section - Progress (when session is active) */}
        <div className="header-center">
          {currentSession ? (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.5, delay: 0.1 }}
              className="progress-display"
            >
              <div className="progress-info">
                <span className="progress-label">Progress</span>
                <span className="progress-value">{progressValue}%</span>
              </div>
              <div className="progress-bar-container">
                <div 
                  className="progress-bar-fill"
                  style={{ width: `${progressValue}%` }}
                />
              </div>
              <div className="progress-meta">
                {totalModules > 0 && (
                  <span className="progress-pill">
                    Modules {completedModules}/{totalModules}
                  </span>
                )}
                {currentModule && (
                  <span className="progress-pill current">
                    Current: {formatLabel(currentModule)}
                  </span>
                )}
                {nextModule && (
                  <span className="progress-pill next">
                    Next: {formatLabel(nextModule)}
                  </span>
                )}
              </div>
            </motion.div>
          ) : (
            <div className="header-welcome">
              <h2>Start a new assessment to explore the updated workflow</h2>
              <p>The rebuilt backend now tracks modules, timelines, and symptom analytics in real-time.</p>
            </div>
          )}
        </div>

        {/* Right Section - Actions */}
        <div className="header-right">
          {primarySymptom && (
            <div className="symptom-highlight">
              <span className="symptom-label">Top Symptom Focus</span>
              <span className="symptom-value">
                {formatLabel(primarySymptom?.name || primarySymptom?.category)}
              </span>
              {primarySymptom?.severity && (
                <span className={`symptom-severity severity-${primarySymptom.severity}`}>
                  {formatLabel(primarySymptom.severity)}
                </span>
              )}
            </div>
          )}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ duration: 0.5, delay: 0.2 }}
            className="header-actions"
          >
            {/* New Session Button */}
            <button 
              className="action-btn primary-btn"
              onClick={onStartNewSession}
              aria-label="New Assessment"
            >
              <Plus size={16} />
              <span>New Assessment</span>
            </button>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default AssessmentHeader;

