// src/App.jsx
import { BrowserRouter as Router, Routes, Route } from "react-router-dom";

// Marketing components
import { LandingPage } from "./components/marketing";

// Auth components
import { Login, Signup, OTP, ForgotPassword, PasswordReset, OAuthSuccess, InitialInformation } from "./components/auth";

// Layout components
import { Footer } from "./components/layout";

// Assessment components (commented out - no longer used)
// import { MandatoryQuestionnaire } from "./components/assessment";

// Specialist components
import {
  CompleteProfile,
  ApplicationStatus,
  PendingApproval,
  ApplicationRejected,
  ForumPage
} from "./components/specialist";

// Import new modular dashboard
import SpecialistDashboardContainer from "./components/specialist/dashboard";

// Admin components
import { AdminDashboard, SpecialistApplicationPage } from "./components/admin";

// Common components
import ProtectedRoute from "./components/common/ProtectedRoute";
import ErrorBoundary from "./components/common/ErrorBoundary";

// Feature components
import MainLayout from "./components/Home/MainLayout";
import SpecialistProfile from "./components/Appointments/SpecialistProfile";
import SpecialistProfilePage from "./components/Appointments/SpecialistProfilePage";
import PatientAppointmentsHub from "./components/Appointments/PatientAppointmentsHub";
import AppointmentsPage from "./components/Appointments/AppointmentsPage";
import AssessmentPage from "./components/Assessment/AssessmentPage";
import { Toaster } from "react-hot-toast";
import { ToastProvider } from "./components/UI/Toast";
import { useEffect } from "react";
import PatientTerms from "./components/legal/PatientTerms";
import SpecialistTerms from "./components/legal/SpecialistTerms";
import { ROUTES } from "./config/routes";

function App() {
  // Global error handler to suppress browser extension errors
  useEffect(() => {
    const originalConsoleError = console.error;
    const originalConsoleWarn = console.warn;
    
    console.error = (...args) => {
      const message = args.join(' ');
      // Filter out common browser extension errors
      if (message.includes('Grammarly') || 
          message.includes('grm ERROR') || 
          message.includes('iterable') ||
          message.includes('moz-extension://') ||
          message.includes('chrome-extension://') ||
          message.includes('Not supported: in app messages')) {
        return; // Suppress these errors
      }
      originalConsoleError.apply(console, args);
    };

    console.warn = (...args) => {
      const message = args.join(' ');
      // Filter out common browser extension warnings
      if (message.includes('Grammarly') || 
          message.includes('grm ERROR') || 
          message.includes('iterable') ||
          message.includes('moz-extension://') ||
          message.includes('chrome-extension://')) {
        return; // Suppress these warnings
      }
      originalConsoleWarn.apply(console, args);
    };

    return () => {
      console.error = originalConsoleError;
      console.warn = originalConsoleWarn;
    };
  }, []);
  return (
    <ToastProvider>
      <ErrorBoundary>
        <Router>
          <Toaster position="bottom-center" />
          <Routes>
        <Route path="/" element={<LandingPage />} />
        <Route path="/dashboard/*" element={<MainLayout />} />
        <Route path="/home/*" element={<MainLayout />} /> {/* Legacy route for backward compatibility */}
        <Route path="/login" element={<Login />} />
        <Route path="/signup" element={<Signup />} />
        <Route path="/register" element={<Signup />} />
        <Route path="/otp" element={<OTP />} />
        <Route path="/forgot-password" element={<ForgotPassword />} />
        <Route path="/reset-password" element={<PasswordReset />} />
        <Route path="/oauth-success" element={<OAuthSuccess />} />
        <Route path={ROUTES.PATIENT_TERMS} element={<PatientTerms />} />
        <Route path={ROUTES.SPECIALIST_TERMS} element={<SpecialistTerms />} />
        <Route path={ROUTES.INITIAL_INFORMATION} element={
          <ProtectedRoute allowedUserTypes={['patient']}>
            <InitialInformation />
          </ProtectedRoute>
        } />
        {/* Admin Routes */}
        <Route path="/admin" element={
          <ProtectedRoute allowedUserTypes={['admin']}>
            <ErrorBoundary>
              <AdminDashboard />
            </ErrorBoundary>
          </ProtectedRoute>
        } />

        {/* Specialist Routes - Protected */}
        <Route path="/specialist-dashboard" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ErrorBoundary>
              <SpecialistDashboardContainer />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/specialist" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ErrorBoundary>
              <SpecialistDashboardContainer />
            </ErrorBoundary>
          </ProtectedRoute>
        } /> {/* Legacy route */}
        <Route path="/specialist/dashboard" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ErrorBoundary>
              <SpecialistDashboardContainer />
            </ErrorBoundary>
          </ProtectedRoute>
        } />

        {/* Specialist Profile Routes */}
        <Route path="/specialist/complete-profile" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <CompleteProfile />
          </ProtectedRoute>
        } />
        <Route path="/specialist/application-status" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ApplicationStatus />
          </ProtectedRoute>
        } />
        <Route path="/specialist/application-rejected" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ApplicationRejected />
          </ProtectedRoute>
        } />
        <Route path="/specialists/forum" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ForumPage />
          </ProtectedRoute>
        } />

        {/* Legacy routes for backward compatibility */}
        <Route path="/complete-profile" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <CompleteProfile />
          </ProtectedRoute>
        } />
        <Route path="/specialist-complete-profile" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <CompleteProfile />
          </ProtectedRoute>
        } />
        <Route path="/pending-approval" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ApplicationStatus />
          </ProtectedRoute>
        } />
        <Route path="/application-rejected" element={
          <ProtectedRoute allowedUserTypes={['specialist']}>
            <ApplicationRejected />
          </ProtectedRoute>
        } />
        
        {/* Specialist Profile Routes */}
        <Route path="/specialist/:id" element={<SpecialistProfile />} />
        <Route path="/specialists/profile/:id" element={<SpecialistProfilePage />} />
        
        {/* Patient Appointments Page - Protected (Direct Page in Header) */}
        <Route path="/appointments" element={
          <ProtectedRoute allowedUserTypes={['patient']}>
            <AppointmentsPage />
          </ProtectedRoute>
        } />
        
        {/* Patient Assessment Page - Protected */}
        <Route path="/assessment" element={
          <ProtectedRoute allowedUserTypes={['patient']}>
            <ErrorBoundary>
              <AssessmentPage />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        <Route path="/assessment/*" element={
          <ProtectedRoute allowedUserTypes={['patient']}>
            <ErrorBoundary>
              <AssessmentPage />
            </ErrorBoundary>
          </ProtectedRoute>
        } />
        
        {/* Admin Application Review Routes */}
        <Route path="/admin/specialists/application/:id" element={
          <ProtectedRoute allowedUserTypes={['admin']}>
            <SpecialistApplicationPage />
          </ProtectedRoute>
        } />
          </Routes>
        </Router>
      </ErrorBoundary>
      </ToastProvider>
  );
}

export default App;

