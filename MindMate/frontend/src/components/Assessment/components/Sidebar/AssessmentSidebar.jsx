import React from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, MessageCircle, AlertCircle, RefreshCw, ChevronLeft, ChevronRight } from 'react-feather';
import SessionList from './SessionList';
import './AssessmentSidebar.css';

const paginationOptions = [10, 20, 50];

const AssessmentSidebar = ({
  darkMode = false,
  sessions = [],
  currentSession = null,
  sidebarOpen = false,
  onSidebarToggle,
  onStartNewSession,
  onLoadSession,
  onDeleteSession,
  error = null,
  onRetry,
  pagination = null,
  onPaginateSessions,
  onChangePageSize,
  onRefreshSessions
}) => {
  // Safety check for handlers
  const handleSidebarToggle = onSidebarToggle || (() => {});
  const handleStartNewSession = onStartNewSession || (() => {});
  const handleLoadSession = onLoadSession || (() => {});
  const handleDeleteSession = onDeleteSession || (() => {});
  const handleRetry = onRetry || (() => {});
  const handleRefresh = onRefreshSessions || (() => {});

  const totalSessionsCount = pagination?.totalSessions ?? sessions.length;
  const currentPage = pagination?.page ?? 1;
  const totalPages = pagination?.totalPages ?? Math.max(1, Math.ceil(totalSessionsCount / (pagination?.pageSize || 20)));
  const pageSize = pagination?.pageSize ?? 20;

  const handlePageChange = (direction) => {
    if (!onPaginateSessions) return;
    onPaginateSessions(direction);
  };

  const handlePageSizeChange = (event) => {
    const nextValue = Number(event.target.value);
    if (Number.isFinite(nextValue) && onChangePageSize) {
      onChangePageSize(nextValue);
    }
  };

  return (
    <>
      {/* Mobile Overlay */}
      <AnimatePresence>
        {sidebarOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="sidebar-overlay"
            onClick={handleSidebarToggle}
          />
        )}
      </AnimatePresence>

      {/* Sidebar */}
      <div
        className={`assessment-sidebar ${darkMode ? 'dark' : ''} ${sidebarOpen ? 'open' : ''}`}
      >
        {/* Sidebar Header */}
        <div className="sidebar-header">
          <h2>Sessions</h2>
          <button
            className="sidebar-close-btn"
            onClick={handleSidebarToggle}
          >
            <X size={20} />
          </button>
        </div>

        {/* New Session Button */}
        <div className="sidebar-actions">
          <button
            className="new-session-btn"
            onClick={handleStartNewSession}
          >
            <MessageCircle size={18} />
            <span>New Assessment</span>
          </button>
          <button
            className="refresh-session-btn"
            onClick={handleRefresh}
            title="Refresh sessions"
          >
            <RefreshCw size={16} />
          </button>
        </div>

        <div className="sidebar-meta">
          <span className="sidebar-meta-count">
            {totalSessionsCount} session{totalSessionsCount === 1 ? '' : 's'}
          </span>
          <span className="sidebar-meta-page">
            Page {currentPage} / {Math.max(totalPages, 1)}
          </span>
        </div>

        {/* Error Display */}
        {error && (
          <div className="sidebar-error">
            <AlertCircle size={16} />
            <span>{error}</span>
            <button onClick={handleRetry} className="retry-btn">
              Retry
            </button>
          </div>
        )}

        {/* Sessions List */}
        <div className="sidebar-content">
          <SessionList
            sessions={sessions || []}
            currentSession={currentSession}
            onSelectSession={handleLoadSession}
            onDeleteSession={handleDeleteSession}
            darkMode={darkMode}
          />
        </div>

        <div className="sidebar-footer">
          <div className="sidebar-pagination">
            <button
              className="pagination-btn"
              onClick={() => handlePageChange('previous')}
              disabled={!pagination?.hasPrevious}
            >
              <ChevronLeft size={14} />
              <span>Prev</span>
            </button>
            <span className="pagination-status">
              {currentPage} / {Math.max(totalPages, 1)}
            </span>
            <button
              className="pagination-btn"
              onClick={() => handlePageChange('next')}
              disabled={!pagination?.hasNext}
            >
              <span>Next</span>
              <ChevronRight size={14} />
            </button>
          </div>
          <div className="sidebar-page-size">
            <label htmlFor="page-size-select">Per page</label>
            <select
              id="page-size-select"
              value={pageSize}
              onChange={handlePageSizeChange}
            >
              {paginationOptions.map((option) => (
                <option key={option} value={option}>
                  {option}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

    </>
  );
};

export default AssessmentSidebar;

