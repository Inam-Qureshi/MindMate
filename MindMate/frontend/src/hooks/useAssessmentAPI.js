import { useState, useCallback } from 'react';
import apiClient from '../utils/axiosConfig';
import { API_ENDPOINTS } from '../config/api';

export const useAssessmentAPI = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleError = (err) => {
    console.error('Assessment API Error:', err);
    const errorMessage = err.response?.data?.detail || err.message || 'An error occurred';
    setError(errorMessage);
    throw err;
  };

  const normalizedTimestamp = (value) => {
    if (!value) return null;
    try {
      const date = new Date(value);
      if (Number.isNaN(date.getTime())) {
        return value;
      }
      return date.toISOString();
    } catch {
      return value;
    }
  };

  const normalizeProgressSnapshot = (snapshot) => {
    if (!snapshot || typeof snapshot !== 'object') {
      return null;
    }

    const overallPercentage =
      snapshot.overall_percentage ??
      snapshot.progress_percentage ??
      snapshot.overall ??
      snapshot.percentage ??
      null;

    return {
      ...snapshot,
      overall_percentage: overallPercentage,
      current_module: snapshot.current_module ?? snapshot.active_module ?? null,
      next_module: snapshot.next_module ?? null,
      module_sequence: snapshot.module_sequence ?? [],
      module_status: snapshot.module_status ?? [],
      module_timeline: snapshot.module_timeline ?? null,
      updated_at: normalizedTimestamp(snapshot.updated_at ?? snapshot.last_updated),
    };
  };

  const normalizeSymptomSummary = (summary) => {
    if (!summary || typeof summary !== 'object') {
      return null;
    }

    return {
      ...summary,
      categories: summary.categories ?? summary.category_counts ?? [],
      last_updated: normalizedTimestamp(summary.last_updated ?? summary.updated_at),
    };
  };

  const normalizeSessionSummary = (session) => {
    if (!session) return null;
    const sessionId = session.session_id ?? session.id;
    const progressSnapshot = normalizeProgressSnapshot(session.progress_snapshot);
    const progressPercentage =
      session.progress_percentage ??
      progressSnapshot?.overall_percentage ??
      0;

    return {
      id: sessionId,
      session_id: sessionId,
      title:
        session.title ??
        session.session_name ??
        `Assessment ${session.session_number ?? ''}`.trim(),
      session_name: session.session_name ?? session.title ?? sessionId,
      status: session.status ?? (session.is_complete ? 'completed' : 'in_progress'),
      is_complete: Boolean(session.is_complete ?? progressSnapshot?.is_complete),
      created_at: normalizedTimestamp(
        session.created_at ??
          session.started_at ??
          session.startedAt ??
          session.start_time
      ),
      updated_at: normalizedTimestamp(
        session.updated_at ??
          session.last_interaction ??
          progressSnapshot?.updated_at
      ),
      started_at: normalizedTimestamp(session.started_at ?? session.start_time),
      progress_percentage: typeof progressPercentage === 'number'
        ? progressPercentage
        : Number(progressPercentage ?? 0),
      current_module: session.current_module ?? progressSnapshot?.current_module ?? null,
      next_module: session.next_module ?? progressSnapshot?.next_module ?? null,
      module_timeline: session.module_timeline ?? progressSnapshot?.module_timeline ?? null,
      module_sequence: session.module_sequence ?? progressSnapshot?.module_sequence ?? [],
      module_status: session.module_status ?? progressSnapshot?.module_status ?? [],
      progress_snapshot: progressSnapshot,
      symptom_summary: normalizeSymptomSummary(session.symptom_summary),
      metadata: {
        ...(session.metadata ?? {}),
        has_background_services: Boolean(
          (progressSnapshot?.background_services && Object.keys(progressSnapshot.background_services).length) ||
            (session.background_services && Object.keys(session.background_services).length)
        ),
      },
      raw: session,
    };
  };

  const attachSessionToResponse = (response) => {
    if (!response) return null;
    const normalized = normalizeSessionSummary(response);
    return {
      ...response,
      normalized_session: normalized,
    };
  };

  const normalizePagination = (payload = {}) => ({
    page: payload.page ?? 1,
    pageSize: payload.page_size ?? payload.pageSize ?? 20,
    totalPages: payload.total_pages ?? payload.totalPages ?? 0,
    totalSessions: payload.total_sessions ?? payload.totalSessions ?? (payload.sessions?.length ?? 0),
    hasNext: payload.has_next ?? payload.page < payload.total_pages ?? false,
    hasPrevious: payload.has_previous ?? (payload.page ?? 1) > 1,
  });

  // Get all sessions with pagination support (v2 - limited support)
  const getSessions = useCallback(async (page = 1, pageSize = 20) => {
    try {
      setIsLoading(true);
      setError(null);
      
      // v2 API doesn't have a sessions listing endpoint
      // Return empty sessions list for now
      // TODO: Implement session persistence/storage on frontend or backend
      return {
        sessions: [],
        pagination: normalizePagination({
          page: 1,
          page_size: pageSize,
          total_pages: 1,
          total_sessions: 0,
          has_next: false,
          has_previous: false
        }),
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Start new assessment session (v2)
  const startSession = useCallback(async (customSessionId = null) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const payload = customSessionId ? { session_id: customSessionId } : {};
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.START, payload);
      const data = response.data ?? {};

      if (data.requires_initial_info) {
        return data;
      }

      // v2 response format is different - normalize it to match expected format
      const normalized = normalizeSessionSummary({
        session_id: data.session_id,
        id: data.session_id,
        title: `Assessment ${new Date().toLocaleDateString()}`,
        status: 'in_progress',
        current_module: data.current_module,
        progress_percentage: data.progress_percentage || 0,
        is_complete: data.assessment_complete || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_snapshot: {
          current_module: data.current_module,
          overall_percentage: data.progress_percentage || 0,
          is_complete: data.assessment_complete || false,
          risk_level: data.risk_level,
          empathy_score: data.empathy_score,
          question_count: data.question_count
        }
      });

      return {
        ...data,
        normalized_session: normalized,
        greeting: data.message || 'Hello! Welcome to MindMate\'s comprehensive mental health assessment. Let\'s begin your journey to better mental wellness together!',
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Continue conversation in session (v2)
  const continueSession = useCallback(async (sessionId, message) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.CONTINUE, {
        session_id: sessionId,
        user_response: message
      });
      const data = response.data ?? {};

      // v2 response format is different - normalize it
      return {
        ...data,
        response: data.content || data.response,
        message: data.content || data.response,
        progress_percentage: data.progress_percentage,
        current_module: data.current_module,
        progress_snapshot: {
          current_module: data.current_module,
          overall_percentage: data.progress_percentage || 0,
          is_complete: data.assessment_complete || false,
          risk_level: data.risk_level,
          empathy_score: data.empathy_score,
          question_count: data.question_count,
          module_status: data.module_status || [],
          module_sequence: data.module_sequence || [],
          module_timeline: data.module_timeline || null,
        },
        module_status: data.module_status || [],
        module_sequence: data.module_sequence || [],
        module_timeline: data.module_timeline || null,
        symptom_summary: normalizeSymptomSummary(data.symptom_summary),
        metadata: data.question_metadata || {},
        risk_alerts: data.risk_alerts || [],
        diagnosis_summary: data.diagnosis_summary,
        treatment_plan: data.treatment_plan,
        completion_summary: data.completion_summary,
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // End/Delete session (v2)
  const deleteSession = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.SESSION_DELETE(sessionId), {
        reason: 'deleted_by_user'
      });
      return response.data;
    } catch (err) {
      // Don't throw 404 errors - they're handled gracefully in the component
      // (session might already be deleted or not exist)
      if (err.response?.status === 404) {
        // Return a success-like response for 404 to allow graceful handling
        return { success: true, message: 'Session not found (already deleted)', session_id: sessionId };
      }
      // For other errors, throw as usual
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save session
  const saveSession = useCallback(async (sessionId, data) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.SESSION_SAVE, {
        session_id: sessionId,
        ...data
      });
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Save/update initial assessment information
  const saveInitialInfo = useCallback(async (payload) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.SAVE_INITIAL_INFO, payload);
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Load session
  const loadSession = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_LOAD(sessionId));
      const data = response.data ?? {};
      return {
        ...data,
        progress: normalizeProgressSnapshot(data.progress),
        symptom_summary: normalizeSymptomSummary(data.symptom_summary),
        module_timeline: data.module_timeline ?? data.progress?.module_timeline ?? null,
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get session progress
  const getProgress = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_PROGRESS(sessionId));
      const data = response.data ?? {};
      return {
        ...data,
        progress_snapshot: normalizeProgressSnapshot(data.progress_snapshot ?? data),
        symptom_summary: normalizeSymptomSummary(data.symptom_summary),
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get enhanced progress (v2 - uses state endpoint)
  const getEnhancedProgress = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_ENHANCED_PROGRESS(sessionId));
      const data = response.data ?? {};

      // v2 state response format is different
      return {
        ...data,
        progress_snapshot: {
          current_module: data.current_module,
          overall_percentage: data.progress_percentage || 0,
          is_complete: data.assessment_complete || false,
          risk_level: data.risk_level,
          empathy_score: data.empathy_score,
          question_count: data.question_count,
          module_status: data.module_status || [],
          module_sequence: data.module_sequence || [],
          module_timeline: data.module_timeline || null,
        },
        symptom_summary: normalizeSymptomSummary(data.symptom_summary),
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get session results
  const getResults = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_RESULTS(sessionId));
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get assessment result
  const getAssessmentResult = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.ASSESSMENT_RESULT(sessionId));
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get session history
  const getHistory = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_HISTORY(sessionId));
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get session analytics
  const getAnalytics = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_ANALYTICS(sessionId));
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get comprehensive report
  const getComprehensiveReport = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.SESSION_COMPREHENSIVE_REPORT(sessionId));
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get comprehensive assessment data (includes all module results, TPA, DA, SRA)
  const getAssessmentData = useCallback(async (sessionId, format = 'json') => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(
        API_ENDPOINTS.ASSESSMENT.SESSION_ASSESSMENT_DATA(sessionId),
        { params: { format } }
      );
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Switch module
  const switchModule = useCallback(async (sessionId, moduleName) => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.SESSION_SWITCH_MODULE(sessionId), {
        module_name: moduleName
      });
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Get available modules
  const getModules = useCallback(async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.MODULES);
      return response.data;
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Resume session (v2)
  const resumeSession = useCallback(async (sessionId) => {
    try {
      setIsLoading(true);
      setError(null);

      const response = await apiClient.post(API_ENDPOINTS.ASSESSMENT.RESUME(sessionId));
      const data = response.data ?? {};

      // Normalize resume response similar to start response
      const normalized = normalizeSessionSummary({
        session_id: data.session_id,
        id: data.session_id,
        title: `Assessment ${new Date().toLocaleDateString()}`,
        status: 'in_progress',
        current_module: data.current_module,
        progress_percentage: data.progress_percentage || 0,
        is_complete: data.assessment_complete || false,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
        progress_snapshot: {
          current_module: data.current_module,
          overall_percentage: data.progress_percentage || 0,
          is_complete: data.assessment_complete || false,
          risk_level: data.risk_level,
          empathy_score: data.empathy_score,
          question_count: data.question_count
        }
      });

      return {
        ...data,
        normalized_session: normalized,
      };
    } catch (err) {
      handleError(err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // Health check
  const getHealth = useCallback(async () => {
    try {
      const response = await apiClient.get(API_ENDPOINTS.ASSESSMENT.HEALTH);
      return response.data;
    } catch (err) {
      console.error('Health check error:', err);
      throw err;
    }
  }, []);

  return {
    // State
    isLoading,
    error,
    
    // Core Actions
    getSessions,
    startSession,
    continueSession,
    deleteSession,
    saveInitialInfo,
    resumeSession,
    saveSession,
    loadSession,
    
    // Progress & Results
    getProgress,
    getEnhancedProgress,
    getResults,
    getAssessmentResult,
    getHistory,
    
    // Analytics & Reports
    getAnalytics,
    getComprehensiveReport,
    getAssessmentData,
    
    // Module Management
    switchModule,
    getModules,
    
    // Utilities
    getHealth,
    clearError: () => setError(null)
  };
};
