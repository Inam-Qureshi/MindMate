import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import './ProgressBar.css';

const formatModuleName = (moduleName) => {
  if (!moduleName) return '';
  return moduleName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const ProgressBar = ({
  darkMode = false,
  progress = 0,
  progressDetails = null,
  currentModule = null,
  symptomSummary = null,
  isComplete = false
}) => {
  const progressValue = Math.max(0, Math.min(100, progress));

  const {
    totalModules,
    completedModules,
    nextModule,
    moduleSequence,
    moduleStatuses
  } = useMemo(() => {
    const sequence = progressDetails?.module_sequence || [];
    const statuses = progressDetails?.module_status || [];
    const completedFromStatus = statuses.filter((status) => {
      const value = status?.status || status?.state;
      return value === 'completed' || value === 'done';
    }).length;
    const completedFromList = Array.isArray(progressDetails?.completed_modules)
      ? progressDetails.completed_modules.length
      : 0;

    return {
      totalModules: sequence.length || statuses.length || (progressDetails?.total_modules ?? 0),
      completedModules: completedFromStatus || completedFromList || (progressDetails?.completed_modules_count ?? 0),
      nextModule: progressDetails?.next_module || null,
      moduleSequence: sequence,
      moduleStatuses: statuses
    };
  }, [progressDetails]);

  const getModuleStatus = (moduleName, index) => {
    if (!moduleName) return 'pending';
    const statusEntry = moduleStatuses.find(
      (status) =>
        status?.module === moduleName ||
        status?.module_name === moduleName ||
        status?.name === moduleName
    );
    const statusValue = statusEntry?.status || statusEntry?.state;
    if (statusValue) {
      return statusValue.toLowerCase();
    }
    if (progressDetails?.current_module === moduleName || currentModule === moduleName) {
      return 'active';
    }
    if (Array.isArray(progressDetails?.completed_modules) && progressDetails.completed_modules.includes(moduleName)) {
      return 'completed';
    }
    if (index < completedModules) {
      return 'completed';
    }
    if (index === completedModules) {
      return 'active';
    }
    return 'pending';
  };

  return (
    <div className={`progress-bar-container ${darkMode ? 'dark' : ''}`}>
      <div className="progress-bar-wrapper">
        <motion.div
          className="progress-bar-fill"
          initial={{ width: '0%' }}
          animate={{ width: `${progressValue}%` }}
          transition={{ duration: 0.5, ease: 'easeOut' }}
        />
      </div>

      {progressValue > 0 && (
        <div className="progress-bar-info">
          <div className="progress-bar-summary">
            <span className="progress-bar-text">{Math.round(progressValue)}% Complete</span>
            {totalModules > 0 && (
              <span className="progress-bar-step">
                Step {Math.min(completedModules + (isComplete ? 0 : 1), totalModules)} of {totalModules}
              </span>
            )}
          </div>

          <div className="progress-bar-modules">
            {!isComplete && (currentModule || progressDetails?.current_module) && (
              <span className="progress-bar-module current">
                Current: {formatModuleName(progressDetails?.current_module || currentModule)}
              </span>
            )}
            {!isComplete && (nextModule || progressDetails?.next_module) && (
              <span className="progress-bar-module next">
                Next: {formatModuleName(nextModule || progressDetails?.next_module)}
              </span>
            )}
            {isComplete && (
              <span className="progress-bar-module completed">
                Assessment Complete
              </span>
            )}
          </div>
        </div>
      )}

      {Array.isArray(moduleSequence) && moduleSequence.length > 0 && (
        <div className="progress-bar-steps">
          {moduleSequence.map((moduleName, index) => {
            const status = getModuleStatus(moduleName, index);
            return (
              <span
                key={`${moduleName}-${index}`}
                className={`progress-step ${status}`}
              >
                {formatModuleName(moduleName)}
              </span>
            );
          })}
        </div>
      )}

      {symptomSummary?.severity && (
        <div className="progress-bar-symptoms">
          <span className="symptom-label">Symptom Severity:</span>
          <span className={`symptom-value severity-${symptomSummary.severity}`}>
            {formatModuleName(symptomSummary.severity)}
          </span>
        </div>
      )}
    </div>
  );
};

export default ProgressBar;

