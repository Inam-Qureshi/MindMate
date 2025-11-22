import React, { useMemo } from 'react';
import { motion } from 'framer-motion';
import { MessageCircle, Trash2, Clock, CheckCircle, Activity } from 'react-feather';
import './SessionItem.css';

const formatDate = (dateString) => {
  if (!dateString) return '';
  try {
    const date = new Date(dateString);
    if (Number.isNaN(date.getTime())) return '';
    return date.toLocaleString('en-US', {
      month: 'short',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch {
    return '';
  }
};

const formatModuleName = (moduleName) => {
  if (!moduleName) return '';
  return moduleName
    .replace(/_/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const SessionItem = ({
  session = {},
  isActive = false,
  onSelect,
  onDelete,
  darkMode = false
}) => {
  const {
    sessionId,
    progressValue,
    statusLabel,
    currentModule,
    nextModule,
    symptomChip,
    lastUpdated
  } = useMemo(() => {
    const id = session?.id || session?.session_id;
    const progressSnapshot = session?.progress_snapshot || {};
    const overallProgress = progressSnapshot?.overall_percentage ?? session?.progress_percentage ?? 0;
    const status = session?.status || (session?.is_complete ? 'completed' : 'in_progress');
    const current = session?.current_module || progressSnapshot?.current_module;
    const next = session?.next_module || progressSnapshot?.next_module;

    let symptomSummaryLabel = null;
    const categories = session?.symptom_summary?.categories;
    if (Array.isArray(categories) && categories.length > 0) {
      const primaryCategory = categories[0];
      const name = primaryCategory?.name || primaryCategory?.category;
      const severity = primaryCategory?.severity || primaryCategory?.level;
      symptomSummaryLabel = `${formatModuleName(name)} • ${formatModuleName(severity || 'tracking')}`;
    }

    const updatedAt =
      session?.updated_at ||
      progressSnapshot?.updated_at ||
      session?.last_interaction ||
      session?.created_at;

    return {
      sessionId: id,
      progressValue: Math.round(Math.max(0, Math.min(100, overallProgress))),
      statusLabel: status,
      currentModule: current,
      nextModule: next,
      symptomChip: symptomSummaryLabel,
      lastUpdated: updatedAt
    };
  }, [session]);

  if (!sessionId) {
    return null;
  }

  const getStatusIcon = () => {
    if (statusLabel === 'completed') {
      return <CheckCircle size={14} />;
    }
    return <Clock size={14} />;
  };

  return (
    <motion.div
      whileHover={{ x: 4 }}
      className={`session-item ${isActive ? 'active' : ''} ${darkMode ? 'dark' : ''}`}
      onClick={onSelect}
    >
      <div className="session-item-content">
        <div className="session-item-icon">
          <MessageCircle size={16} />
        </div>
        <div className="session-item-info">
          <div className="session-item-heading">
            <div className="session-item-title">
              {session.title || `Assessment ${(sessionId || '').slice(-8) || 'New'}`}
            </div>
            <span className={`session-item-status status-${statusLabel}`}>
              {getStatusIcon()}
              {formatModuleName(statusLabel)}
            </span>
          </div>
          <div className="session-item-progress">
            <div className="session-item-progress-bar">
              <div
                className="session-item-progress-fill"
                style={{ width: `${progressValue}%` }}
              />
            </div>
            <span className="session-item-progress-label">{progressValue}%</span>
          </div>
          <div className="session-item-modules">
            {currentModule && (
              <span className="module-chip current">
                Current: {formatModuleName(currentModule)}
              </span>
            )}
            {nextModule && statusLabel !== 'completed' && (
              <span className="module-chip next">
                Next: {formatModuleName(nextModule)}
              </span>
            )}
          </div>
          <div className="session-item-footer">
            <span className="session-item-time">
              {formatDate(lastUpdated)}
            </span>
            {symptomChip && (
              <span className="session-item-symptom">
                <Activity size={12} />
                {symptomChip}
              </span>
            )}
          </div>
        </div>
        <button
          className="session-item-delete"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          title="Delete session"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </motion.div>
  );
};

export default SessionItem;

