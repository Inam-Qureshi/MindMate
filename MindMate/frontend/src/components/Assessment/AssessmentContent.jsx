import React, { useState, useEffect } from 'react';
import AssessmentSidebar from './components/Sidebar/AssessmentSidebar';
import AssessmentMain from './components/Main/AssessmentMain';
import ResultsModal from './components/Results/ResultsModal';
import './AssessmentContent.css';

const AssessmentContent = ({
  darkMode = false,
  sessions = [],
  currentSession = null,
  messages = [],
  isTyping = false,
  progress = 0,
  progressDetails = null,
  currentModule = null,
  symptomSummary = null,
  isComplete = false,
  error = null,
  pagination = null,
  sidebarOpen: initialSidebarOpen = true,
  onSidebarToggle,
  onStartNewSession,
  onLoadSession,
  onDeleteSession,
  onSendMessage,
  onViewResults,
  onRetry,
  onPaginateSessions,
  onChangePageSize,
  onRefreshSessions,
  sessionResults = null,
  showResultsModal = false,
  onCloseResults,
  onExportResults
}) => {
  const [sidebarOpen, setSidebarOpen] = useState(initialSidebarOpen);
  const [isMobile, setIsMobile] = useState(false);

  useEffect(() => {
    setSidebarOpen(initialSidebarOpen);
  }, [initialSidebarOpen]);

  useEffect(() => {
    const checkMobile = () => {
      const mobile = window.innerWidth <= 768;
      setIsMobile(mobile);
      if (mobile && sidebarOpen) {
        // On mobile, close sidebar by default
        setSidebarOpen(false);
        if (onSidebarToggle) onSidebarToggle();
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  const handleSidebarToggle = () => {
    const newState = !sidebarOpen;
    setSidebarOpen(newState);
    if (onSidebarToggle) {
      onSidebarToggle();
    }
  };

  return (
    <div className={`assessment-content ${darkMode ? 'dark' : ''}`}>
      <div className="content-wrapper">
        {/* Sidebar */}
        <AssessmentSidebar
          darkMode={darkMode}
          sessions={sessions}
          currentSession={currentSession}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={handleSidebarToggle}
          onStartNewSession={onStartNewSession}
          onLoadSession={onLoadSession}
          onDeleteSession={onDeleteSession}
          error={error}
          onRetry={onRetry}
          pagination={pagination}
          onPaginateSessions={onPaginateSessions}
          onChangePageSize={onChangePageSize}
          onRefreshSessions={onRefreshSessions}
        />

        {/* Main Content */}
        <AssessmentMain
          darkMode={darkMode}
          currentSession={currentSession}
          messages={messages}
          isTyping={isTyping}
          progress={progress}
          progressDetails={progressDetails}
          currentModule={currentModule}
          symptomSummary={symptomSummary}
          isComplete={isComplete}
          onStartNewSession={onStartNewSession}
          onSendMessage={onSendMessage}
          onViewResults={onViewResults}
        />
      </div>

      <ResultsModal
        darkMode={darkMode}
        open={showResultsModal}
        session={currentSession}
        results={sessionResults}
        progressSnapshot={progressDetails}
        symptomSummary={symptomSummary}
        onClose={onCloseResults}
        onExport={onExportResults}
      />
    </div>
  );
};

export default AssessmentContent;
