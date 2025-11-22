import React, { useMemo, useState } from 'react';
import { RefreshCw, BarChart2, FileText, Activity, ChevronDown } from 'react-feather';
import './ChatHeader.css';

const formatLabel = (value) => {
  if (!value) return '';
  return value
    .toString()
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ChatHeader = ({
  darkMode = false,
  session = null,
  currentModule = null,
  progress = 0,
  progressDetails = null,
  symptomSummary = null,
  isComplete = false,
  onViewResults
}) => {
  const [showSummary, setShowSummary] = useState(false);

  const moduleInfo = useMemo(() => {
    const snapshot = progressDetails || {};
    const activeModule = snapshot.current_module || currentModule;
    const nextModule = snapshot.next_module || session?.next_module;
    const moduleSequence = snapshot.module_sequence || session?.module_sequence || [];
    const moduleStatuses = snapshot.module_status || session?.module_status || [];

    const completedCount = moduleStatuses.filter((module) => {
      const status = module?.status || module?.state;
      return status === 'completed' || status === 'done';
    }).length || (Array.isArray(snapshot.completed_modules) ? snapshot.completed_modules.length : 0);

    const totalModules = moduleSequence.length || moduleStatuses.length || snapshot.total_modules || 0;

    return {
      current: activeModule,
      next: nextModule,
      completedCount,
      totalModules,
      sequence: moduleSequence
    };
  }, [currentModule, progressDetails, session]);

  const progressValue = useMemo(() => {
    const raw =
      typeof progress === 'number'
        ? progress
        : Number(progress) || progressDetails?.overall_percentage || progressDetails?.progress_percentage || 0;
    const normalized = Math.max(0, Math.min(100, Number(raw) || 0));
    return Math.round(normalized);
  }, [progress, progressDetails]);

  const showProgress = Boolean(session);

  const handleToggleSummary = () => {
    setShowSummary((previous) => !previous);
  };

  return (
    <div className={`chat-header ${darkMode ? 'dark' : ''}`}>
      <div className="chat-header-content">
        <div className="chat-header-left">
          <FileText size={20} />
          <div className="chat-header-info">
            <h3 className="chat-header-title">
              {session?.title || 'Assessment Session'}
            </h3>
            <div className="chat-header-meta">
              {moduleInfo.current && (
                <span className="chat-header-pill current">
                  Current: {formatLabel(moduleInfo.current)}
                </span>
              )}
              {moduleInfo.next && !isComplete && (
                <span className="chat-header-pill next">
                  Next: {formatLabel(moduleInfo.next)}
                </span>
              )}
              {moduleInfo.totalModules > 0 && (
                <span className="chat-header-pill">
                  Modules {moduleInfo.completedCount}/{moduleInfo.totalModules}
                </span>
              )}
            </div>
          </div>
        </div>
        <div className="chat-header-right">
          {showProgress && (
            <div className="chat-header-progress" title={`Assessment progress: ${progressValue}%`}>
              <span className="chat-header-progress-label">
                {isComplete ? 'Completed' : `${progressValue}%`}
              </span>
              <div className="chat-header-progress-track">
                <div
                  className="chat-header-progress-fill"
                  style={{ width: `${isComplete ? 100 : progressValue}%` }}
                />
              </div>
            </div>
          )}
          {symptomSummary && (
            <button
              className={`chat-header-button summary-button ${showSummary ? 'active' : ''}`}
              onClick={handleToggleSummary}
            >
              <Activity size={16} />
              <span>Symptom Summary</span>
              <ChevronDown size={14} className={`chevron ${showSummary ? 'open' : ''}`} />
            </button>
          )}
          {isComplete && (
            <button
              className="chat-header-button results-button"
              onClick={onViewResults}
            >
              <BarChart2 size={16} />
              <span>View Results</span>
            </button>
          )}
          <button
            className="chat-header-button"
            onClick={() => window.location.reload()}
          >
            <RefreshCw size={16} />
          </button>
        </div>
      </div>

      {symptomSummary && showSummary && (
        <div className="chat-header-summary">
          <div className="summary-grid">
            {Array.isArray(symptomSummary.categories) && symptomSummary.categories.length > 0 ? (
              symptomSummary.categories.map((category, index) => {
                const name = category?.name || category?.category || `Category ${index + 1}`;
                const severity = category?.severity || category?.level;
                const score = category?.score ?? category?.value;
                return (
                  <div className="symptom-chip" key={`${name}-${index}`}>
                    <span className="symptom-name">{formatLabel(name)}</span>
                    {severity && (
                      <span className={`symptom-severity severity-${severity}`}>
                        {formatLabel(severity)}
                      </span>
                    )}
                    {typeof score === 'number' && (
                      <span className="symptom-score">{score.toFixed(1)}</span>
                    )}
                  </div>
                );
              })
            ) : (
              <p className="symptom-empty">Symptom insights will appear as the assessment progresses.</p>
            )}
          </div>
          {symptomSummary?.last_updated && (
            <p className="symptom-updated">
              Last updated {new Date(symptomSummary.last_updated).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  );
};

export default ChatHeader;

