import React from 'react';
import { BarChart2, CheckCircle } from 'react-feather';
import './ResultsView.css';

const ResultsView = ({
  darkMode = false,
  session = null,
  progressDetails = null,
  symptomSummary = null,
  onViewResults
}) => {
  if (!session) {
    return null;
  }
  
  if (!onViewResults) {
    console.warn('ResultsView: onViewResults prop is required');
  }

  const moduleStatuses = progressDetails?.module_status || session?.module_status || [];
  const symptomCategories = symptomSummary?.categories || [];

  const formatLabel = (value) => {
    if (!value) return '';
    return value
      .toString()
      .replace(/_/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase());
  };

  return (
    <div className={`results-view ${darkMode ? 'dark' : ''}`}>
      <div className="results-view-content">
        <div className="results-view-icon">
          <CheckCircle size={64} />
        </div>
        <h2 className="results-view-title">Assessment Completed</h2>
        <p className="results-view-description">
          Your assessment has been completed successfully. Click the button below to view your detailed results and recommendations.
        </p>
        <button
          className="results-view-button"
          onClick={onViewResults}
        >
          <BarChart2 size={18} />
          <span>View Results</span>
        </button>

        <div className="results-summary-grid">
          <div className="results-card">
            <h3>Module Status</h3>
            {moduleStatuses.length > 0 ? (
              <ul>
                {moduleStatuses.map((module, index) => (
                  <li key={`${module.module || module.module_name || index}`}>
                    <span className="module-name">
                      {formatLabel(module.module || module.module_name || module.name || `Module ${index + 1}`)}
                    </span>
                    <span className={`module-status badge-${(module.status || module.state || '').toLowerCase()}`}>
                      {formatLabel(module.status || module.state || 'pending')}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="results-empty">Module breakdown will appear when the assessment completes.</p>
            )}
          </div>

          <div className="results-card">
            <h3>Symptom Summary</h3>
            {symptomCategories.length > 0 ? (
              <ul>
                {symptomCategories.map((category, index) => (
                  <li key={`${category.name || category.category || index}`}>
                    <div className="symptom-item">
                      <span className="symptom-name">{formatLabel(category.name || category.category)}</span>
                      {category.severity && (
                        <span className={`symptom-level badge-${category.severity.toLowerCase()}`}>
                          {formatLabel(category.severity)}
                        </span>
                      )}
                      {typeof category.score === 'number' && (
                        <span className="symptom-score">{category.score.toFixed(1)}</span>
                      )}
                    </div>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="results-empty">Symptom insights will be available once SRA finishes processing.</p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ResultsView;

