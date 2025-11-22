import React, { useMemo, useState } from 'react';
import { X, Download, FileText, Activity, Clock, AlertTriangle } from 'react-feather';
import './ResultsModal.css';

const formatLabel = (value) => {
  if (!value) return '';
  return value
    .toString()
    .replace(/[_-]/g, ' ')
    .replace(/\b\w/g, (letter) => letter.toUpperCase());
};

const coerceArray = (input) => {
  if (!input) return [];
  if (Array.isArray(input)) return input;
  if (typeof input === 'object') {
    return Object.entries(input).map(([key, value]) => ({
      module: key,
      ...(typeof value === 'object' ? value : { summary: value })
    }));
  }
  return [];
};

const ResultsModal = ({
  open = false,
  darkMode = false,
  session = null,
  results = null,
  progressSnapshot = null,
  symptomSummary = null,
  onClose,
  onExport
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportMessage, setExportMessage] = useState(null);
  const [exportError, setExportError] = useState(null);
  const [showRawData, setShowRawData] = useState(false);

  const moduleResults = useMemo(() => {
    if (!results?.module_results) {
      return [];
    }
    const modules = coerceArray(results.module_results);
    return modules.map((module, index) => {
      const name = module.module || module.module_name || module.name || `Module ${index + 1}`;
      const status = module.status || module.state || module.outcome;
      const summary = module.summary || module.overview || module.description || '';
      const details =
        module.details ||
        module.findings ||
        module.data ||
        module.result ||
        module.output ||
        null;
      const statusKey = status ? status.toLowerCase().replace(/\s+/g, '-') : 'unknown';
      return {
        id: `${name}-${index}`,
        name: formatLabel(name),
        status: statusKey,
        summary,
        details
      };
    });
  }, [results]);

  const agentStatuses = useMemo(() => {
    if (!results?.agent_status || typeof results.agent_status !== 'object') {
      return [];
    }
    return Object.entries(results.agent_status).map(([agent, status]) => {
      const value = typeof status === 'object' ? status.status || status.state : status;
      return {
        agent: formatLabel(agent),
        status: value ? formatLabel(value) : 'Unknown',
        raw: status
      };
    });
  }, [results]);

  const moduleTimeline = useMemo(() => {
    const timeline =
      progressSnapshot?.module_timeline ||
      results?.module_timeline ||
      progressSnapshot?.timeline ||
      [];
    return coerceArray(timeline).map((entry, index) => ({
      key: `${entry.module || entry.module_name || index}-${index}`,
      module: formatLabel(entry.module || entry.module_name || entry.name || `Module ${index + 1}`),
      status: formatLabel(entry.status || entry.state || entry.outcome || 'pending'),
      statusKey: (entry.status || entry.state || entry.outcome || 'pending')
        .toString()
        .toLowerCase()
        .replace(/\s+/g, '-'),
      startedAt: entry.started_at || entry.start_time || entry.startedAt,
      completedAt: entry.completed_at || entry.end_time || entry.completedAt,
      duration: entry.duration || entry.elapsed || null
    }));
  }, [progressSnapshot, results]);

  const symptomCategories = useMemo(() => {
    if (symptomSummary?.categories && Array.isArray(symptomSummary.categories)) {
      return symptomSummary.categories;
    }
    if (results?.symptom_summary?.categories && Array.isArray(results.symptom_summary.categories)) {
      return results.symptom_summary.categories;
    }
    return [];
  }, [results, symptomSummary]);

  if (!open) {
    return null;
  }

  const handleExport = async () => {
    if (!onExport) {
      return;
    }

    setExportError(null);
    setExportMessage(null);
    setIsExporting(true);

    try {
      await onExport('json');
      setExportMessage('Export started. Check your downloads for the JSON file.');
    } catch (error) {
      setExportError(error?.message || 'Failed to export assessment data.');
    } finally {
      setIsExporting(false);
    }
  };

  const closeModal = () => {
    setExportError(null);
    setExportMessage(null);
    setShowRawData(false);
    if (onClose) {
      onClose();
    }
  };

  const renderSymptomSummary = () => {
    if (symptomCategories.length === 0) {
      return <p className="results-empty">No symptom summary available yet.</p>;
    }

    return (
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
            {category.topics && Array.isArray(category.topics) && (
              <div className="symptom-topics">
                {category.topics.map((topic, idx) => (
                  <span className="symptom-topic" key={`${topic}-${idx}`}>
                    {formatLabel(topic)}
                  </span>
                ))}
              </div>
            )}
          </li>
        ))}
      </ul>
    );
  };

  return (
    <div className={`results-modal-overlay ${darkMode ? 'dark' : ''}`}>
      <div className="results-modal">
        <div className="results-modal-header">
          <div>
            <h2>{session?.title || 'Assessment Results'}</h2>
            <p>{session?.session_id || session?.id}</p>
          </div>
          <button className="modal-close-btn" onClick={closeModal} aria-label="Close results">
            <X size={18} />
          </button>
        </div>

        <div className="results-modal-body">
          <section className="results-section summary">
            <h3>
              <FileText size={16} />
              Summary
            </h3>
            <div className="summary-grid">
              <div>
                <span className="summary-label">Overall Progress</span>
                <span className="summary-value">
                  {Math.round(progressSnapshot?.overall_percentage ?? progressSnapshot?.progress_percentage ?? 0)}%
                </span>
              </div>
              <div>
                <span className="summary-label">Modules Completed</span>
                <span className="summary-value">
                  {(progressSnapshot?.completed_modules?.length ?? 0)}/{progressSnapshot?.module_sequence?.length ?? moduleResults.length}
                </span>
              </div>
              <div>
                <span className="summary-label">Current Module</span>
                <span className="summary-value">
                  {formatLabel(progressSnapshot?.current_module || session?.current_module || 'Complete')}
                </span>
              </div>
              <div>
                <span className="summary-label">Conversation Count</span>
                <span className="summary-value">
                  {results?.metadata?.total_messages ??
                    results?.conversation_history?.length ??
                    progressSnapshot?.total_messages ??
                    '--'}
                </span>
              </div>
            </div>
          </section>

          {agentStatuses.length > 0 && (
            <section className="results-section">
              <h3>
                <Activity size={16} />
                Agent Status
              </h3>
              <div className="agent-grid">
                {agentStatuses.map((agent) => (
                  <div className="agent-card" key={agent.agent}>
                    <span className="agent-name">{agent.agent}</span>
                    <span className={`agent-status badge-${agent.status.toLowerCase().replace(/\s+/g, '-')}`}>
                      {agent.status}
                    </span>
                  </div>
                ))}
              </div>
            </section>
          )}

          <section className="results-section">
            <h3>Module Results</h3>
            {moduleResults.length > 0 ? (
              <div className="module-results">
                {moduleResults.map((module) => (
                  <div className="module-card" key={module.id}>
                    <div className="module-card-header">
                      <h4>{module.name}</h4>
                      {module.status && module.status !== 'unknown' && (
                        <span className={`module-status badge-${module.status}`}>
                          {formatLabel(module.status)}
                        </span>
                      )}
                    </div>
                    {module.summary && <p className="module-summary">{module.summary}</p>}
                    {module.details && (
                      <details>
                        <summary>View details</summary>
                        <pre className="module-details">
{JSON.stringify(module.details, null, 2)}
                        </pre>
                      </details>
                    )}
                  </div>
                ))}
              </div>
            ) : (
              <p className="results-empty">Module breakdown will appear when available.</p>
            )}
          </section>

          <section className="results-section">
            <h3>Symptom Summary</h3>
            {renderSymptomSummary()}
          </section>

          {moduleTimeline.length > 0 && (
            <section className="results-section">
              <h3>
                <Clock size={16} />
                Module Timeline
              </h3>
              <ul className="timeline-list">
                {moduleTimeline.map((entry) => (
                  <li key={entry.key}>
                    <div className="timeline-item">
                      <div className="timeline-title">
                        <span>{entry.module}</span>
                        <span className={`timeline-status badge-${entry.statusKey}`}>
                          {entry.status}
                        </span>
                      </div>
                      <div className="timeline-meta">
                        {entry.startedAt && (
                          <span>Started: {new Date(entry.startedAt).toLocaleString()}</span>
                        )}
                        {entry.completedAt && (
                          <span>Completed: {new Date(entry.completedAt).toLocaleString()}</span>
                        )}
                        {entry.duration && <span>Duration: {entry.duration}</span>}
                      </div>
                    </div>
                  </li>
                ))}
              </ul>
            </section>
          )}

          <section className="results-section">
            <div className="results-actions">
              <button
                className="results-action-btn"
                onClick={handleExport}
                disabled={isExporting}
              >
                <Download size={16} />
                <span>{isExporting ? 'Exporting...' : 'Export JSON'}</span>
              </button>
              <button
                className={`results-action-btn ${showRawData ? 'active' : ''}`}
                onClick={() => setShowRawData((prev) => !prev)}
              >
                <FileText size={16} />
                <span>{showRawData ? 'Hide Raw JSON' : 'View Raw JSON'}</span>
              </button>
            </div>
            {exportError && (
              <div className="results-alert error">
                <AlertTriangle size={14} />
                <span>{exportError}</span>
              </div>
            )}
            {exportMessage && (
              <div className="results-alert success">
                <span>{exportMessage}</span>
              </div>
            )}
          </section>

          {showRawData && (
            <section className="results-section raw-json">
              <pre>
{JSON.stringify(results, null, 2)}
              </pre>
            </section>
          )}
        </div>
      </div>
    </div>
  );
};

export default ResultsModal;

