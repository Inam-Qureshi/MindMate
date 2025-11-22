import { config } from './env';

// Centralized API URL - use this everywhere instead of hardcoded URLs
export const API_URL = config.apiBaseUrl;

export const API_CONFIG = {
  baseURL: config.apiBaseUrl,
  timeout: config.apiTimeout,
};

const ASSESSMENT_V2_BASE = '/api/assessment-v2';

export const API_ENDPOINTS = {
  AUTH: {
    LOGIN: '/api/auth/login',
    SIGNUP: '/api/auth/signup',
    LOGOUT: '/api/auth/logout',
    REFRESH: '/api/auth/refresh',
    OTP: '/api/auth/otp',
    FORGOT_PASSWORD: '/api/auth/forgot-password',
    RESET_PASSWORD: '/api/auth/reset-password',
    REQUEST_PASSWORD_RESET: '/api/auth/request-password-reset',
    VERIFY_RESET_OTP: '/api/auth/verify-reset-otp',
    RESEND_RESET_OTP: '/api/auth/resend-reset-otp',
    ME: '/api/auth/me',
    GOOGLE: '/api/auth/google',
  },
  VERIFICATION: {
    REGISTER_PATIENT: '/api/verification/register/patient',
    VERIFY_EMAIL: '/api/verification/verify-email',
    RESEND_OTP: '/api/verification/resend-otp',
    REGISTRATION_STATUS: '/api/verification/registration-status',
    SPECIALIST_TYPES: '/api/verification/specialist-types',
  },
  APPOINTMENTS: {
    // Booking and Availability
    AVAILABLE_SLOTS: '/api/appointments/available-slots',
    SPECIALIST_AVAILABLE_SLOTS: (specialistId) => `/api/appointments/specialists/${specialistId}/available-slots`,
    SPECIALIST_AVAILABLE_SLOTS_DATE: (specialistId) => `/api/appointments/specialists/${specialistId}/available-slots/date`,
    BOOK: '/api/appointments/book',
    UPLOAD_PAYMENT_RECEIPT: '/api/appointments/upload-payment-receipt',
    GET_PAYMENT_RECEIPT: (filename) => `/api/appointments/payment-receipt/${filename}`,
    // Patient Appointments
    MY_APPOINTMENTS: '/api/appointments/my-appointments',
    // Appointment Management
    CANCEL: (id) => `/api/appointments/${id}/cancel`,
    RESCHEDULE: (id) => `/api/appointments/${id}/reschedule`,
    COMPLETE: (id) => `/api/appointments/${id}/complete`,
    SUBMIT_REVIEW: (id) => `/api/appointments/${id}/review`,
    // Specialist Search
    SPECIALISTS_SEARCH: '/api/appointments/specialists/search',
    SPECIALISTS_AVAILABILITY: '/api/appointments/specialists/availability',
    // Payment Confirmation (Specialist Only)
    PENDING_PAYMENTS: '/api/appointments/pending-payments',
    CONFIRM_PAYMENT: (id) => `/api/appointments/${id}/confirm-payment`,
    REJECT_PAYMENT: (id) => `/api/appointments/${id}/reject-payment`,
  },
  SPECIALISTS: {
    // Search and List
    SEARCH: '/api/specialists/search',
    LIST: '/api/specialists/profiles',
    GET: (id) => `/api/specialists/profiles/${id}`,
    PUBLIC_PROFILE: (id) => `/api/specialists/public/${id}`,
    PROTECTED_PROFILE: (id) => `/api/specialists/protected/${id}`,
    PRIVATE_PROFILE: '/api/specialists/private/me',
    REVIEWS: (id) => `/api/specialists/${id}/reviews`,
    // Profile Management
    PROFILE: '/api/specialists/profile',
    PROFILE_COMPLETE: '/api/specialists/profile/complete',
    PROFILE_PROGRESS: '/api/specialists/profile/progress',
    PROFILE_VALIDATE: '/api/specialists/profile/validate',
    PROFILE_SUMMARY: '/api/specialists/profile/summary',
    PROFILE_UPDATE: '/api/specialists/profile/update',
    PROFILE_COMPLETION_STATUS: '/api/specialists/profile/completion-status',
    PROFILE_UPDATE_INTERESTS: (specialistId) => `/api/specialists/profiles/${specialistId}/interests`,
    PROFILE_UPDATE_PROFESSIONAL_STATEMENT: (specialistId) => `/api/specialists/profiles/${specialistId}/professional-statement`,
    PROFILE_UPDATE_EDUCATION: (specialistId) => `/api/specialists/profiles/${specialistId}/education`,
    PROFILE_UPDATE_CERTIFICATIONS: (specialistId) => `/api/specialists/profiles/${specialistId}/certifications`,
    PROFILE_UPDATE_EXPERIENCE: (specialistId) => `/api/specialists/profiles/${specialistId}/experience`,
    APPROVAL_STATUS: '/api/specialists/approval-status',
    DROPDOWN_OPTIONS: '/api/specialists/dropdown-options',
    UPLOAD_DOCUMENT: '/api/specialists/upload-document',
    APPLICATION_STATUS: '/api/specialists/application-status',
    // Documents
    MANDATORY_DOCUMENTS: '/api/specialists/mandatory-documents',
    DOCUMENT_STATUS: '/api/specialists/document-status',
    SUBMIT_DOCUMENTS: '/api/specialists/submit-documents',
    DOCUMENT_DELETE: (documentId) => `/api/specialists/documents/${documentId}`,
    SUBMIT_FOR_APPROVAL: '/api/specialists/submit-for-approval',
    // Dashboard
    DASHBOARD_STATS: '/api/specialists/dashboard/stats',
    // Specialist Operations
    APPOINTMENTS_FILTER: '/api/specialists/appointments/filter',
    APPOINTMENT_STATUS_UPDATE: (appointmentId) => `/api/specialists/appointments/${appointmentId}/status`,
    PATIENTS_FILTER: '/api/specialists/patients/filter',
    // Registration
    REGISTRATION_REGISTER: '/api/specialists/registration/register',
    REGISTRATION_PROGRESS: (specialistId) => `/api/specialists/registration/progress/${specialistId}`,
    REGISTRATION_SUMMARY: (specialistId) => `/api/specialists/registration/summary/${specialistId}`,
    REGISTRATION_VALIDATE: '/api/specialists/registration/validate',
    REGISTRATION_CHECK_EMAIL: (email) => `/api/specialists/registration/check-email/${email}`,
    REGISTRATION_CANCEL_PENDING: (email) => `/api/specialists/registration/cancel-pending/${encodeURIComponent(email)}`,
    // Favorites
    FAVORITES: '/api/specialists/favorites',
    FAVORITE: (specialistId) => `/api/specialists/${specialistId}/favorite`,
    // Slots
    SLOTS: '/api/specialists/slots',
    SLOTS_AVAILABILITY_SUMMARY: '/api/specialists/slots/availability-summary',
    SLOTS_GENERATE: '/api/specialists/slots/generate',
    SLOTS_GET: '/api/specialists/slots',
    SLOTS_SUMMARY: '/api/specialists/slots/summary',
    SLOT_BLOCK: (slotId) => `/api/specialists/slots/${slotId}/block`,
    SLOT_UNBLOCK: (slotId) => `/api/specialists/slots/${slotId}/unblock`,
    SLOT_STATUS_UPDATE: (slotId) => `/api/specialists/slots/${slotId}/status`,
    SLOTS_BULK_BLOCK: '/api/specialists/slots/bulk-block',
    SLOTS_BULK_UNBLOCK: '/api/specialists/slots/bulk-unblock',
    SLOT_UPDATE: (slotId) => `/api/specialists/slots/${slotId}`,
    SLOT_DELETE: (slotId) => `/api/specialists/slots/${slotId}`,
  },
  ASSESSMENT: {
    // Assessment v2 endpoints (LangGraph-based)
    START: `${ASSESSMENT_V2_BASE}/start`,
    CHAT: `${ASSESSMENT_V2_BASE}/chat`,
    CONTINUE: `${ASSESSMENT_V2_BASE}/chat`,
    SESSIONS: `${ASSESSMENT_V2_BASE}/sessions`,
    SESSION_PROGRESS: (sessionId) => `${ASSESSMENT_V2_BASE}/state/${sessionId}`,
    SESSION_RESULTS: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/results`,
    SESSION_HISTORY: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/history`,
    SESSION_ANALYTICS: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/analytics`,
    SESSION_ENHANCED_PROGRESS: (sessionId) => `${ASSESSMENT_V2_BASE}/state/${sessionId}`,
    SESSION_COMPREHENSIVE_REPORT: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/assessment-data`,
    SESSION_SWITCH_MODULE: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/switch-module`,
    SESSION_ASSESSMENT_DATA: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/assessment-data`,
    SESSION_SAVE: `${ASSESSMENT_V2_BASE}/sessions/save`,
    SESSION_LOAD: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/load`,
    SESSION_DELETE: (sessionId) => `${ASSESSMENT_V2_BASE}/end/${sessionId}`,
    ASSESSMENT_RESULT: (sessionId) => `${ASSESSMENT_V2_BASE}/sessions/${sessionId}/results`,
    MODULES: `${ASSESSMENT_V2_BASE}/modules`,
    MODULE_DEPLOY: (moduleName) => `${ASSESSMENT_V2_BASE}/modules/${moduleName}/deploy`,
    HEALTH: `${ASSESSMENT_V2_BASE}/health`,
    // Resume endpoint for v2
    RESUME: (sessionId) => `${ASSESSMENT_V2_BASE}/resume/${sessionId}`,
    SAVE_INITIAL_INFO: `${ASSESSMENT_V2_BASE}/initial-info`,
  },
  FORUM: {
    // Questions
    QUESTIONS: '/api/forum/questions',
    QUESTION_GET: (questionId) => `/api/forum/questions/${questionId}`,
    QUESTION_CREATE: '/api/forum/questions',
    QUESTION_UPDATE: (questionId) => `/api/forum/questions/${questionId}`,
    QUESTION_DELETE: (questionId) => `/api/forum/questions/${questionId}`,
    QUESTION_MODERATE: (questionId) => `/api/forum/questions/${questionId}/moderate`,
    // Answers
    ANSWERS: '/api/forum/answers',
    ANSWERS_BY_QUESTION: (questionId) => `/api/forum/questions/${questionId}/answers`,
    ANSWER_CREATE: (questionId) => `/api/forum/questions/${questionId}/answers`,
    ANSWER_UPDATE: (answerId) => `/api/forum/answers/${answerId}`,
    ANSWER_DELETE: (answerId) => `/api/forum/answers/${answerId}`,
    // Moderation and Reports
    MODERATION_QUEUE: '/api/forum/moderation/queue',
    REPORTS: '/api/forum/reports',
    STATS: '/api/forum/stats',
    TOP_CONTRIBUTORS: '/api/forum/top-contributors',
  },
  PROGRESS_TRACKER: {
    DASHBOARD: '/api/progress-tracker/dashboard',
    STATS: '/api/progress-tracker/stats',
    // Sessions
    SESSIONS_START: '/api/progress-tracker/sessions/start',
    SESSION_QUICK_COMPLETE: '/api/progress-tracker/sessions/quick-complete',
    SESSIONS: '/api/progress-tracker/sessions',
    SESSION_UPDATE: (sessionId) => `/api/progress-tracker/sessions/${sessionId}`,
    SESSION_COMPLETE: (sessionId) => `/api/progress-tracker/sessions/${sessionId}/complete`,
    // Goals
    GOALS: (statusFilter) => `/api/progress-tracker/goals?status_filter=${statusFilter || 'active'}`,
    GOALS_CREATE: '/api/progress-tracker/goals',
    GOALS_UPDATE: (goalId) => `/api/progress-tracker/goals/${goalId}`,
    GOALS_DELETE: (goalId) => `/api/progress-tracker/goals/${goalId}`,
    // Achievements
    ACHIEVEMENTS: '/api/progress-tracker/achievements',
    ACHIEVEMENT_GET: (achievementId) => `/api/progress-tracker/achievements/${achievementId}`,
    ACHIEVEMENT_ACKNOWLEDGE: (achievementId) => `/api/progress-tracker/achievements/${achievementId}/acknowledge`,
    // Timeline and Calendar
    TIMELINE: (page = 1, pageSize = 10, activityType = 'all', days) => {
      const params = new URLSearchParams({
        page: page.toString(),
        page_size: pageSize.toString(),
        activity_type: activityType,
      });
      if (days) params.append('days', days.toString());
      return `/api/progress-tracker/timeline?${params.toString()}`;
    },
    CALENDAR: (days = 30) => `/api/progress-tracker/calendar?days=${days}`,
    CALENDAR_YEAR: (year) => `/api/progress-tracker/calendar/year/${year}`,
    // Exercises Progress
    EXERCISES: '/api/progress-tracker/exercises',
    EXERCISE_GET: (exerciseName) => `/api/progress-tracker/exercises/${exerciseName}`,
    EXERCISE_UPDATE: (exerciseName) => `/api/progress-tracker/exercises/${exerciseName}`,
    EXERCISE_FAVORITE: (exerciseName) => `/api/progress-tracker/exercises/${exerciseName}/favorite`,
    // Streak
    STREAK: '/api/progress-tracker/streak',
    // Analytics
    ANALYTICS_EXERCISES: '/api/progress-tracker/analytics/exercises',
    ANALYTICS_MOOD_TRENDS: '/api/progress-tracker/analytics/mood-trends',
    // Data Management
    RESET: '/api/progress-tracker/reset',
    DATA_DELETE: '/api/progress-tracker/data',
    // Mood
    MOOD_HISTORY: (page = 1, pageSize = 5) => `/api/progress-tracker/mood/history?page=${page}&page_size=${pageSize}`,
    MOOD_SESSION_START: '/api/progress-tracker/mood/session/start',
    MOOD_SESSION_RESPOND: '/api/progress-tracker/mood/session/respond',
    MOOD_SESSION_STATUS: (sessionId) => `/api/progress-tracker/mood/session/${sessionId}/status`,
    MOOD_SESSION_DELETE: (sessionId) => `/api/progress-tracker/mood/session/${sessionId}`,
    MOOD_ANALYTICS: '/api/progress-tracker/mood/analytics',
    MOOD_STATS: '/api/progress-tracker/mood/stats',
    MOOD_ADMIN_CLEANUP: '/api/progress-tracker/mood/admin/cleanup',
    MOOD_HEALTH: '/api/progress-tracker/mood/health',
  },
  JOURNAL: {
    ENTRIES: '/api/journal/entries',
    ENTRY_CREATE: '/api/journal/entries',
    ENTRY_GET: (entryId) => `/api/journal/entries/${entryId}`,
    ENTRY_UPDATE: (entryId) => `/api/journal/entries/${entryId}`,
    ENTRY_DELETE: (entryId) => `/api/journal/entries/${entryId}`,
    ENTRY_ARCHIVE: (entryId) => `/api/journal/entries/${entryId}/archive`,
  },
  CHAT: {
    START: '/api/chat/start',
    MESSAGE: '/api/chat/message',
    SESSION: (sessionId) => `/api/chat/sessions/${sessionId}`,
  },
  EXERCISES: {
    LIST: '/api/exercises',
    GET_BY_NAME: (exerciseName) => `/api/exercises/${exerciseName}`,
  },
  DASHBOARD: {
    OVERVIEW: '/api/dashboard/overview',
    STATS: '/api/dashboard/stats',
    PROGRESS: '/api/dashboard/progress',
    APPOINTMENTS: '/api/dashboard/appointments',
    ACTIVITY: '/api/dashboard/activity',
    WELLNESS: '/api/dashboard/wellness',
    QUICK_ACTIONS: '/api/dashboard/quick-actions',
    NOTIFICATIONS: '/api/dashboard/notifications',
    UPDATES: '/api/dashboard/updates',
    WIDGETS_PREFERENCES: '/api/dashboard/widgets/preferences',
    EXPORT_PDF: '/api/dashboard/export/pdf',
    EXPORT_EXCEL: '/api/dashboard/export/excel',
    OVERVIEW_TEST: '/api/dashboard/overview-test', // Test endpoint
    TEST: '/api/dashboard/test', // Test endpoint
  },
  USERS: {
    PATIENT_PROFILE: '/api/users/patient/profile',
    PATIENT_PROFILE_UPDATE: '/api/users/patient/profile',
    SPECIALIST_PROFILE: '/api/users/specialist/profile',
    SPECIALIST_PROFILE_UPDATE: '/api/users/specialist/profile',
  },
  QUESTIONNAIRES: {
    MANDATORY_QUESTIONNAIRE: '/api/questionnaires/mandatory-questionnaire',
  },
  WEEKLY_SCHEDULE: {
    GET: '/api/specialists/schedule',
    UPDATE: '/api/specialists/schedule',
    VALIDATE: '/api/specialists/schedule/validate',
    GENERATE_SLOTS: '/api/specialists/schedule/generate-slots',
    AVAILABLE_SLOTS: (specialistId) => `/api/specialists/schedule/${specialistId}/available-slots`,
    AVAILABLE_SLOTS_DAY: (specialistId) => `/api/specialists/schedule/${specialistId}/available-slots/day`,
  },
  ADMIN: {
    DASHBOARD: '/api/admin/dashboard',
    STATS: '/api/admin/stats',
    // Users
    USERS: '/api/admin/users',
    ADMINS: '/api/admin/admins',
    // Patients
    PATIENTS: '/api/admin/patients',
    PATIENT_DELETE: (patientId) => `/api/admin/patients/${patientId}`,
    PATIENT_ACTIVATE: (patientId) => `/api/admin/patients/${patientId}/activate`,
    PATIENT_DEACTIVATE: (patientId) => `/api/admin/patients/${patientId}/deactivate`,
    // Specialists
    SPECIALISTS: '/api/admin/specialists',
    SPECIALIST_DETAILS: (specialistId) => `/api/admin/specialists/${specialistId}/details`,
    SPECIALIST_APPROVE: (specialistId) => `/api/admin/specialists/${specialistId}/approve`,
    SPECIALIST_REJECT: (specialistId) => `/api/admin/specialists/${specialistId}/reject`,
    SPECIALIST_SUSPEND: (specialistId) => `/api/admin/specialists/${specialistId}/suspend`,
    SPECIALIST_UNSUSPEND: (specialistId) => `/api/admin/specialists/${specialistId}/unsuspend`,
    SPECIALIST_DELETE: (specialistId) => `/api/admin/specialists/${specialistId}`,
    SPECIALIST_APPLICATION: (specialistId) => `/api/admin/specialists/${specialistId}/details`, // Use details endpoint instead
    SPECIALIST_DOCUMENT_SERVE: (filePath) => `/api/admin/specialists/documents/${filePath}`,
    SPECIALIST_DOCUMENT_DOWNLOAD: (filePath) => `/api/admin/specialists/documents/${filePath}`,
    // Reports
    REPORTS: '/api/admin/reports',
    REPORT_ACTION: (reportId) => `/api/admin/reports/${reportId}/action`,
    // System
    SYSTEM_BACKUP: '/api/admin/system/backup',
    SYSTEM_LOGS: '/api/admin/system/logs',
    HEALTH: '/api/admin/health',
  },
};

