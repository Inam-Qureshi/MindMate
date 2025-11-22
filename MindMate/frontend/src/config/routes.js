export const ROUTES = {
  // Public routes
  HOME: '/',
  LANDING: '/',
  LOGIN: '/login',
  SIGNUP: '/signup',
  OTP: '/otp',
  FORGOT_PASSWORD: '/forgot-password',
  RESET_PASSWORD: '/reset-password',
  OAUTH_SUCCESS: '/oauth-success',
  PATIENT_TERMS: '/legal/terms/patient',
  SPECIALIST_TERMS: '/legal/terms/specialist',
  INITIAL_INFORMATION: '/initial-information',
  
  // Patient routes
  DASHBOARD: '/dashboard',
  PATIENT_DASHBOARD: '/dashboard',
  APPOINTMENTS: '/appointments',
  ASSESSMENT: '/assessment',
  FORUM: '/dashboard/forum',
  COMMUNITY: '/dashboard/community',
  PROFILE: '/dashboard/profile',
  SETTINGS: '/dashboard/settings',
  
  // Specialist routes
  SPECIALIST_DASHBOARD: '/specialist/dashboard',
  SPECIALIST_PROFILE: '/specialist/complete-profile',
  SPECIALIST_APPLICATION: '/specialist/application-status',
  SPECIALIST_APPLICATION_REJECTED: '/specialist/application-rejected',
  SPECIALIST_APPOINTMENTS: '/specialist/appointments',
  SPECIALIST_FORUM: '/specialists/forum',
  SPECIALIST_PROFILE_VIEW: (id) => `/specialist/${id}`,
  SPECIALIST_PROFILE_PAGE: (id) => `/specialists/profile/${id}`,
  
  // Legacy specialist routes
  COMPLETE_PROFILE: '/complete-profile',
  SPECIALIST_COMPLETE_PROFILE: '/specialist-complete-profile',
  PENDING_APPROVAL: '/pending-approval',
  APPLICATION_REJECTED: '/application-rejected',
  
  // Admin routes
  ADMIN_DASHBOARD: '/admin',
  ADMIN_APPLICATIONS: '/admin/specialists/application',
  ADMIN_SPECIALIST_APPLICATION: (id) => `/admin/specialists/application/${id}`,
  
  // Utility routes
  UNAUTHORIZED: '/unauthorized',
};

