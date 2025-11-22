import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import AssessmentContent from './AssessmentContent';
import { useAssessmentAPI } from '../../hooks/useAssessmentAPI';
import { useQuestionnaireCheck } from '../../hooks/useQuestionnaireCheck';
import { AuthStorage } from '../../utils/localStorage';
import apiClient from '../../utils/axiosConfig';
import { API_ENDPOINTS } from '../../config/api';
import { ROUTES } from '../../config/routes';
import Header from '../Home/Navigation/Header';
import './AssessmentPage.css';

const AssessmentPage = ({
  darkMode: propDarkMode,
  sessionId: initialSessionId,
  onSessionUpdate: externalOnSessionUpdate
}) => {
  const navigate = useNavigate();
  // Check if questionnaire is completed before allowing access to assessment
  useQuestionnaireCheck();

  // State management
  const [darkMode, setDarkMode] = useState(propDarkMode !== undefined ? propDarkMode : false);
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [sessions, setSessions] = useState([]);
  const [currentSession, setCurrentSession] = useState(null);
  const [messages, setMessages] = useState([]);
  const [progress, setProgress] = useState(0);
  const [progressDetails, setProgressDetails] = useState(null);
  const [symptomSummary, setSymptomSummary] = useState(null);
  const [currentModule, setCurrentModule] = useState(null);
  const [isComplete, setIsComplete] = useState(false);
  const [isTyping, setIsTyping] = useState(false);
  const [error, setError] = useState(null);
  const [pagination, setPagination] = useState({
    page: 1,
    pageSize: 20,
    totalPages: 0,
    totalSessions: 0,
    hasNext: false,
    hasPrevious: false
  });
  
  // View states
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [sessionResults, setSessionResults] = useState(null);
  const [sidebarOpen, setSidebarOpen] = useState(true);

  // Custom hooks
  const {
    getSessions,
    startSession,
    continueSession,
    deleteSession,
    resumeSession,
    loadSession,
    getProgress,
    getEnhancedProgress,
    getResults,
    getAssessmentData,
    getHistory,
    clearError
  } = useAssessmentAPI();

  const updateSessionMetadata = useCallback((sessionId, updater) => {
    if (!sessionId) return;
    setSessions(prevSessions =>
      prevSessions.map(session => {
        if (!session) return session;
        const existingId = session.id || session.session_id;
        if (existingId !== sessionId) return session;
        const updates = typeof updater === 'function' ? updater(session) : updater;
        return { ...session, ...updates };
      })
    );
  }, []);

  const applyProgressUpdate = useCallback((sessionId, snapshot, summary) => {
    if (!sessionId) return;

    const normalizedSnapshot = snapshot
      ? {
          ...snapshot,
          overall_percentage:
            typeof snapshot.overall_percentage === 'number'
              ? snapshot.overall_percentage
              : Number(
                  snapshot.overall_percentage ??
                  snapshot.progress_percentage ??
                  snapshot.overall ??
                  0
                ),
          current_module: snapshot.current_module ?? snapshot.active_module ?? null,
          next_module: snapshot.next_module ?? null,
          module_sequence: snapshot.module_sequence ?? [],
          module_status: snapshot.module_status ?? [],
          module_timeline: snapshot.module_timeline ?? null,
          is_complete: snapshot.is_complete ?? snapshot.completed ?? false
        }
      : null;

    const progressValue = normalizedSnapshot?.overall_percentage ?? 0;
    setProgress(progressValue);
    setProgressDetails(normalizedSnapshot);
    setCurrentModule(normalizedSnapshot?.current_module ?? null);
    const complete = Boolean(normalizedSnapshot?.is_complete);
    setIsComplete(complete);
    if (summary !== undefined) {
      setSymptomSummary(summary);
    }

    const mergedUpdates = {
      progress_snapshot: normalizedSnapshot,
      progress_percentage: progressValue,
      current_module: normalizedSnapshot?.current_module ?? null,
      next_module: normalizedSnapshot?.next_module ?? null,
      module_sequence: normalizedSnapshot?.module_sequence ?? [],
      module_status: normalizedSnapshot?.module_status ?? [],
      module_timeline: normalizedSnapshot?.module_timeline ?? null,
      symptom_summary: summary ?? null,
      status: complete ? 'completed' : 'in_progress',
      is_complete: complete
    };

    updateSessionMetadata(sessionId, mergedUpdates);

    setCurrentSession(prevSession => {
      if (!prevSession) return prevSession;
      const prevId = prevSession.id || prevSession.session_id;
      if (prevId !== sessionId) return prevSession;
      return {
        ...prevSession,
        ...mergedUpdates
      };
    });
  }, [updateSessionMetadata]);

  // Fetch user
  const fetchUser = useCallback(async () => {
      try {
        const token = AuthStorage.getToken();
        if (!token) {
          setLoading(false);
          return;
        }

        const response = await apiClient.get(API_ENDPOINTS.AUTH.ME);
        setCurrentUser(response.data);
      } catch (error) {
        console.error("Error fetching user:", error);
      } finally {
        setLoading(false);
      }
  }, []);

  // Load sessions
  const loadSessions = useCallback(async (requestedPage = 1, requestedPageSize = pagination.pageSize || 20) => {
    try {
      setError(null);
      const activeSessionId = currentSession ? (currentSession.id || currentSession.session_id) : null;
      const response = await getSessions(requestedPage, requestedPageSize);
      const sessionsArray = response.sessions || [];

      setSessions(sessionsArray);
      if (activeSessionId) {
        const refreshed = sessionsArray.find(session => (session.id || session.session_id) === activeSessionId);
        if (refreshed) {
          setCurrentSession(prev => (prev ? { ...prev, ...refreshed } : refreshed));
          if (refreshed.progress_snapshot) {
            applyProgressUpdate(activeSessionId, refreshed.progress_snapshot, refreshed.symptom_summary);
          }
        }
      }
      if (response.pagination) {
        setPagination(prev => ({
          ...prev,
          ...response.pagination,
          pageSize: response.pagination.pageSize ?? prev.pageSize ?? requestedPageSize
        }));
      } else {
        setPagination(prev => ({
          ...prev,
          page: requestedPage,
          pageSize: requestedPageSize,
          totalPages: response.total_pages || 0,
          totalSessions: response.total_sessions || sessionsArray.length,
          hasNext: Boolean(response.has_next),
          hasPrevious: Boolean(response.has_previous)
        }));
      }
    } catch (err) {
      console.error('Load sessions error:', err);
      setError('Failed to load sessions. Please refresh the page.');
      setSessions([]);
      setPagination(prev => ({
        ...prev,
        page: 1,
        totalPages: 0,
        totalSessions: 0,
        hasNext: false,
        hasPrevious: false
      }));
    }
  }, [applyProgressUpdate, currentSession, getSessions, pagination.pageSize]);

  // Start new session
  const handleStartNewSession = useCallback(async () => {
    try {
      setError(null);
      
      const response = await startSession();
      if (response?.requires_initial_info) {
        try {
          if (response.initial_info) {
            sessionStorage.setItem('initial_info_prefill', JSON.stringify(response.initial_info));
          }
          if (response.missing_fields) {
            sessionStorage.setItem('initial_info_missing_fields', JSON.stringify(response.missing_fields));
          }
        } catch (storageError) {
          console.warn('Unable to cache initial info prefill:', storageError);
        }
        setError('We need a bit more information before starting your assessment.');
        navigate(`${ROUTES.INITIAL_INFORMATION}?redirect=${encodeURIComponent(ROUTES.ASSESSMENT)}`);
        return;
      }
      const normalizedSession = response?.normalized_session;
      const sessionId = normalizedSession?.id || response?.session_id;

      if (!sessionId) {
        throw new Error('Invalid session response: missing session_id');
      }

      const newSession = normalizedSession || {
        id: sessionId,
        session_id: sessionId,
        title: response.title || response.metadata?.session_title || `Assessment ${sessions.length + 1}`,
        status: 'in_progress',
        created_at: new Date().toISOString(),
        started_at: new Date().toISOString(),
        progress_snapshot: response.progress_snapshot || null,
        module_sequence: response.module_sequence || [],
        module_status: response.module_status || [],
        module_timeline: response.module_timeline || null,
        current_module: response.current_module || null,
        next_module: response.next_module || null,
        symptom_summary: response.symptom_summary || null,
        progress_percentage: 0,
        is_complete: false
      };
      
      setSessions(prev => {
        const filtered = prev.filter(session => (session.id || session.session_id) !== sessionId);
        return [newSession, ...filtered];
      });
      setCurrentSession(newSession);
      
      const initialMessage = {
        id: `msg_${Date.now()}`,
        role: 'assistant',
        content: response.message || response.greeting || 'Hello! Welcome to your assessment. Let\'s begin with some basic information.',
        timestamp: new Date().toISOString()
      };
      
      setMessages([initialMessage]);
      applyProgressUpdate(
        sessionId,
        {
          current_module: response.current_module || null,
          module_sequence: response.module_sequence || [],
          module_status: response.module_status || [],
          module_timeline: response.module_timeline || null,
          next_module: response.next_module || null,
          overall_percentage: response.progress_percentage || 0,
          is_complete: response.assessment_complete || false,
          risk_level: response.risk_level,
          empathy_score: response.empathy_score,
          question_count: response.question_count
        },
        response.symptom_summary
      );

      setPagination(prev => ({
        ...prev,
        page: 1,
        hasPrevious: false,
        totalSessions: (prev.totalSessions || 0) + 1
      }));

      if (pagination.page !== 1) {
        loadSessions(1);
      }
    } catch (err) {
      setError('Failed to start new session');
      console.error('Start session error:', err);
    }
  }, [applyProgressUpdate, loadSessions, navigate, pagination.page, sessions.length, startSession]);

  // Fetch progress
  const fetchProgress = useCallback(async (sessionId, { allowFallback = true } = {}) => {
    if (!sessionId) return;

    try {
      const progressData = await getEnhancedProgress(sessionId);
      if (progressData) {
        const snapshot = progressData.progress_snapshot || progressData;
        applyProgressUpdate(sessionId, snapshot, progressData.symptom_summary);
        return;
      }
    } catch (err) {
      const is404 = err?.response?.status === 404;
      if (!is404 && allowFallback) {
        try {
          const regularProgress = await getProgress(sessionId);
          if (regularProgress) {
            const snapshot = regularProgress.progress_snapshot || regularProgress;
            applyProgressUpdate(sessionId, snapshot, regularProgress.symptom_summary);
            return;
          }
        } catch (fallbackErr) {
          if (fallbackErr.response?.status !== 404) {
            console.error('Error fetching progress (fallback):', fallbackErr);
          }
        }
      }
      if (!is404) {
        console.error('Error fetching enhanced progress:', err);
      }
    }
  }, [getEnhancedProgress, getProgress, applyProgressUpdate]);

  // Load existing session
  const handleLoadSession = useCallback(async (sessionId) => {
    try {
      setError(null);
      
      const session = sessions.find(s => (s.id || s.session_id) === sessionId);
      if (!session) return;

      setCurrentSession(session);
      
      // Load session history
      try {
        const loadResponse = await loadSession(sessionId);
        if (loadResponse?.messages && Array.isArray(loadResponse.messages) && loadResponse.messages.length > 0) {
          const mappedMessages = loadResponse.messages.map(msg => ({
            id: msg.id || `msg_${Date.now()}_${Math.random()}`,
            role: msg.role || 'assistant',
            content: msg.content || msg.message || msg.text || 'No content available',
            text: msg.text || msg.message || msg.content,
            message: msg.message || msg.content || msg.text,
            timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
            metadata: msg.metadata || {}
          }));
          setMessages(mappedMessages);
        } else {
          const historyResponse = await getHistory(sessionId);
          if (historyResponse?.messages && Array.isArray(historyResponse.messages) && historyResponse.messages.length > 0) {
            const mappedMessages = historyResponse.messages.map(msg => ({
              id: msg.id || `msg_${Date.now()}_${Math.random()}`,
              role: msg.role || 'assistant',
              content: msg.content || msg.message || msg.text || 'No content available',
              text: msg.text || msg.message || msg.content,
              message: msg.message || msg.content || msg.text,
              timestamp: msg.timestamp || msg.created_at || new Date().toISOString(),
              metadata: msg.metadata || {}
            }));
            setMessages(mappedMessages);
          } else {
            setMessages([]);
          }
        }

        if (loadResponse?.progress) {
          applyProgressUpdate(sessionId, loadResponse.progress, loadResponse.symptom_summary);
        } else {
          setSymptomSummary(loadResponse?.symptom_summary ?? null);
        }

        updateSessionMetadata(sessionId, {
          module_timeline: loadResponse?.module_timeline ?? session.module_timeline ?? null,
          session_state: loadResponse?.session_state ?? session.session_state,
          symptom_summary: loadResponse?.symptom_summary ?? session.symptom_summary ?? null
        });

        setCurrentSession(prevSession => {
          if (!prevSession) return prevSession;
          const prevId = prevSession.id || prevSession.session_id;
          if (prevId !== sessionId) return prevSession;
          return {
            ...prevSession,
            module_timeline: loadResponse?.module_timeline ?? prevSession.module_timeline ?? null,
            session_state: loadResponse?.session_state ?? prevSession.session_state,
            symptom_summary: loadResponse?.symptom_summary ?? prevSession.symptom_summary ?? null
          };
        });

        if (!loadResponse?.progress) {
          await fetchProgress(sessionId);
        }
      } catch (loadErr) {
        console.error('Failed to load session messages:', loadErr);
        setMessages([]);
        await fetchProgress(sessionId);
      }

    } catch (err) {
      setError('Failed to load session');
      console.error('Load session error:', err);
    }
  }, [applyProgressUpdate, fetchProgress, getHistory, loadSession, sessions, updateSessionMetadata]);

  // Delete session
  const handleDeleteSession = useCallback(async (sessionId, e) => {
    if (e) {
      e.stopPropagation();
    }
    
    if (!sessionId || sessionId === 'undefined') {
      return;
    }
    
    if (!window.confirm('Are you sure you want to delete this session?')) {
      return;
    }
    
    try {
      await deleteSession(sessionId);
      // Remove from sessions list
      setSessions(prev => prev.filter(s => (s.id || s.session_id) !== sessionId));
      const nextTotalSessions = Math.max((pagination.totalSessions || sessions.length) - 1, 0);
      const nextTotalPages = nextTotalSessions > 0 ? Math.ceil(nextTotalSessions / (pagination.pageSize || 20)) : 0;
      const nextPage = nextTotalPages === 0 ? 1 : Math.min(pagination.page, nextTotalPages);
      setPagination(prev => ({
        ...prev,
        totalSessions: nextTotalSessions,
        totalPages: nextTotalPages,
        page: nextPage,
        hasNext: nextPage < nextTotalPages,
        hasPrevious: nextPage > 1
      }));
      
      // Clear current session if it's the one being deleted
      const currentSessionId = currentSession?.id || currentSession?.session_id;
      if (currentSessionId === sessionId) {
        setCurrentSession(null);
        setMessages([]);
        setProgress(0);
        setProgressDetails(null);
        setSymptomSummary(null);
        setCurrentModule(null);
        setIsComplete(false);
      }

      loadSessions(nextPage);
    } catch (err) {
      // Handle 404 gracefully - session might already be deleted or not exist
      if (err.response?.status === 404) {
        // Session not found - remove it from UI anyway (it's already deleted or doesn't exist)
        setSessions(prev => prev.filter(s => (s.id || s.session_id) !== sessionId));
        const nextTotalSessions = Math.max((pagination.totalSessions || sessions.length) - 1, 0);
        const nextTotalPages = nextTotalSessions > 0 ? Math.ceil(nextTotalSessions / (pagination.pageSize || 20)) : 0;
        const nextPage = nextTotalPages === 0 ? 1 : Math.min(pagination.page, nextTotalPages);
        setPagination(prev => ({
          ...prev,
          totalSessions: nextTotalSessions,
          totalPages: nextTotalPages,
          page: nextPage,
          hasNext: nextPage < nextTotalPages,
          hasPrevious: nextPage > 1
        }));
        
        const currentSessionId = currentSession?.id || currentSession?.session_id;
        if (currentSessionId === sessionId) {
          setCurrentSession(null);
          setMessages([]);
          setProgress(0);
          setProgressDetails(null);
          setSymptomSummary(null);
          setCurrentModule(null);
          setIsComplete(false);
        }
        loadSessions(nextPage);
        // Don't show error for 404 - it's expected if session doesn't exist
        return;
      }
      
      // For other errors, show error message
      setError(err.response?.data?.detail || 'Failed to delete session');
      console.error('Delete session error:', err);
    }
  }, [currentSession, deleteSession, loadSessions, pagination.page, pagination.pageSize, pagination.totalSessions, sessions.length]);

  // Send message
  const handleSendMessage = useCallback(async (message) => {
    if (!currentSession || !message.trim()) return;

    try {
      setIsTyping(true);
      
      // Add user message
      const userMessage = {
        id: `msg_${Date.now()}`,
        content: message,
        role: 'user',
        timestamp: new Date().toISOString()
      };
      
      setMessages(prev => [...prev, userMessage]);
      
      // Send to API
      const response = await continueSession(currentSession.id, message);
      
      // Check for degraded mode
      if (response.metadata?.degraded_mode) {
        setError('Assessment system is temporarily unavailable. Please try again later.');
        return;
      }
      
      // Add bot response (v2 format)
      const botMessageContent = response.content || response.response || response.message || 'No response available';
      const botMessage = {
        id: `msg_${Date.now() + 1}`,
        content: botMessageContent,
        role: 'assistant',
        timestamp: new Date().toISOString(),
        text: botMessageContent,
        message: botMessageContent,
        metadata: response.question_metadata || response.metadata || {}
      };
      
      setMessages(prev => [...prev, botMessage]);

      const responseSnapshot = {
        current_module: response.current_module,
        next_module: response.next_module,
        module_sequence: response.module_sequence || [],
        module_status: response.module_status || [],
        module_timeline: response.module_timeline,
        overall_percentage: response.progress_percentage || progress,
        is_complete: response.assessment_complete || false,
        risk_level: response.risk_level,
        empathy_score: response.empathy_score,
        question_count: response.question_count
      };
      applyProgressUpdate(currentSession.id, responseSnapshot, response.symptom_summary);

      updateSessionMetadata(currentSession.id, prev => ({
        ...prev,
        module_sequence: response.module_sequence ?? prev?.module_sequence ?? [],
        module_status: response.module_status ?? prev?.module_status ?? [],
        module_timeline: response.module_timeline ?? prev?.module_timeline ?? null,
        next_module: response.next_module ?? prev?.next_module ?? null,
        current_module: response.current_module ?? prev?.current_module ?? null,
        metadata: {
          ...(prev?.metadata || {}),
          background_services: response.background_services ?? prev?.metadata?.background_services ?? null,
          flow_info: response.flow_info ?? prev?.metadata?.flow_info ?? null,
          processing_time_ms: response.metadata?.processing_time_ms ?? prev?.metadata?.processing_time_ms,
          last_interaction: new Date().toISOString()
        }
      }));
      
    } catch (err) {
      // Enhanced error handling for different error types
      if (err.response?.status === 403) {
        setError('Access denied. Please ensure you own this session.');
      } else if (err.response?.status === 404) {
        setError('Session not found. Please start a new session.');
      } else if (err.response?.status === 503) {
        setError('Assessment system is temporarily unavailable. Please try again later.');
      } else {
        const errorMessage = err.response?.data?.detail || err.message || 'Failed to send message';
        setError(errorMessage);
      }
      console.error('Send message error:', err);
    } finally {
      setIsTyping(false);
    }
  }, [applyProgressUpdate, continueSession, currentSession, progress, updateSessionMetadata]);

  // View results
  const handleViewResults = useCallback(async () => {
    if (!currentSession?.id) return;

    try {
      const results = await getResults(currentSession.id);
      setSessionResults(results);
      if (results?.symptom_summary) {
        setSymptomSummary(results.symptom_summary);
      }
      setShowResultsModal(true);
    } catch (err) {
      console.error('Error fetching results:', err);
    }
  }, [currentSession, getResults]);

  const handleCloseResults = useCallback(() => {
    setShowResultsModal(false);
  }, []);

  const handleExportAssessmentData = useCallback(async (format = 'json') => {
    if (!currentSession?.id) {
      throw new Error('No session selected for export');
    }

    try {
      const data = await getAssessmentData(currentSession.id, format);
      if (!data) {
        return null;
      }

      if (format === 'json') {
        const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `${currentSession.id}_assessment.json`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);
        URL.revokeObjectURL(url);
      }

      return data;
    } catch (error) {
      console.error('Export assessment data error:', error);
      throw error;
    }
  }, [currentSession, getAssessmentData]);

  const handleSessionsPageChange = useCallback((target) => {
    let nextPage = pagination.page || 1;
    if (typeof target === 'number' && !Number.isNaN(target)) {
      nextPage = target;
    } else if (target === 'next') {
      nextPage = (pagination.page || 1) + 1;
    } else if (target === 'previous') {
      nextPage = (pagination.page || 1) - 1;
    }

    const safeTotalPages = pagination.totalPages || Math.max(1, Math.ceil((pagination.totalSessions || sessions.length) / (pagination.pageSize || 20)));
    const clampedPage = Math.min(Math.max(nextPage, 1), Math.max(safeTotalPages, 1));

    if (clampedPage !== pagination.page) {
      setPagination(prev => ({
        ...prev,
        page: clampedPage
      }));
    }
    loadSessions(clampedPage);
  }, [loadSessions, pagination.page, pagination.pageSize, pagination.totalPages, pagination.totalSessions, sessions.length]);

  const handleSessionsPageSizeChange = useCallback((nextPageSize) => {
    if (!nextPageSize || nextPageSize === pagination.pageSize) {
      return;
    }
    setPagination(prev => ({
      ...prev,
      pageSize: nextPageSize,
      page: 1
    }));
    loadSessions(1, nextPageSize);
  }, [loadSessions, pagination.pageSize]);

  const hasInitializedRef = useRef(false);

  // Sync dark mode preference
  useEffect(() => {
    if (propDarkMode !== undefined) {
      setDarkMode(propDarkMode);
    } else {
      const savedMode = localStorage.getItem("darkMode") === "true";
      setDarkMode(savedMode);
    }
  }, [propDarkMode]);

  // Initial data load (run once)
  useEffect(() => {
    if (hasInitializedRef.current) {
      return;
    }
    hasInitializedRef.current = true;
    fetchUser();
    loadSessions(1);
  }, [fetchUser, loadSessions]);

  // Load initial session if sessionId prop is provided
  useEffect(() => {
    if (initialSessionId && sessions.length > 0) {
      const session = sessions.find(s => s.id === initialSessionId);
      if (session && (!currentSession || currentSession.id !== initialSessionId)) {
        handleLoadSession(initialSessionId);
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [initialSessionId, sessions.length]);

  // Notify parent of progress updates
  useEffect(() => {
    if (externalOnSessionUpdate) {
      externalOnSessionUpdate(progress);
    }
  }, [progress, externalOnSessionUpdate]);

  // Toggle dark mode
  const toggleDarkMode = () => {
    // Only toggle if darkMode is managed internally (no prop)
    if (propDarkMode === undefined) {
      const newMode = !darkMode;
      setDarkMode(newMode);
      localStorage.setItem("darkMode", newMode.toString());
    }
    // If prop is provided, dark mode is controlled by parent
  };

  if (loading) {
    return (
      <div className={`assessment-page ${darkMode ? 'dark' : ''}`}>
        <Header darkMode={darkMode} setDarkMode={toggleDarkMode} currentUser={currentUser} />
        <div className="assessment-container">
          <div className="loading-container">
            <div className="loading-spinner" />
            <p>Loading assessment...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={`assessment-page ${darkMode ? 'dark' : ''}`}>
      <Header darkMode={darkMode} setDarkMode={toggleDarkMode} currentUser={currentUser} />
      
      <div className="assessment-container">
        {/* Assessment Content */}
        <AssessmentContent
          darkMode={darkMode}
          sessions={sessions}
          currentSession={currentSession}
          messages={messages}
          isTyping={isTyping}
          progress={progress}
          currentModule={currentModule}
          isComplete={isComplete}
          error={error}
          sidebarOpen={sidebarOpen}
          onSidebarToggle={() => setSidebarOpen(prev => !prev)}
          onStartNewSession={handleStartNewSession}
          onLoadSession={handleLoadSession}
          onDeleteSession={handleDeleteSession}
          onSendMessage={handleSendMessage}
          onViewResults={handleViewResults}
          onRetry={() => {
            clearError();
            loadSessions(pagination.page || 1);
          }}
          progressDetails={progressDetails}
          symptomSummary={symptomSummary}
          pagination={pagination}
          onPaginateSessions={handleSessionsPageChange}
          onChangePageSize={handleSessionsPageSizeChange}
          onRefreshSessions={() => loadSessions(pagination.page || 1)}
          sessionResults={sessionResults}
          showResultsModal={showResultsModal}
          onCloseResults={handleCloseResults}
          onExportResults={handleExportAssessmentData}
        />
      </div>
    </div>
  );
};

export default AssessmentPage;
