// Main export for Specialist Dashboard
export { default } from './SpecialistDashboardContainer';
export { default as SpecialistDashboardContainer } from './SpecialistDashboardContainer';

// Layout components
export { default as DashboardLayout } from './layout/DashboardLayout';
export { default as DashboardHeader } from './layout/DashboardHeader';
export { default as DashboardSidebar } from './layout/DashboardSidebar';

// Modules
export { default as OverviewModule } from './modules/overview/OverviewModule';
export { default as AppointmentsModule } from './modules/appointments/AppointmentsModule';
export { default as PatientsModule } from './modules/patients/PatientsModule';
export { default as ForumModule } from './modules/forum/ForumModule';
export { default as ProfileModule } from './modules/profile/ProfileModule';
export { default as SlotsModule } from './modules/slots/SlotsModule';

// Shared components
export { default as EmptyState } from './shared/EmptyState';
export { default as LoadingState } from './shared/LoadingState';
export { default as ErrorState } from './shared/ErrorState';
export { default as StatusBadge } from './shared/StatusBadge';
export { default as Modal } from './shared/Modal';

// Hooks
export { useDashboardStats } from './hooks/useDashboardStats';
export { usePatients } from './hooks/usePatients';
export { useSlots } from './hooks/useSlots';
export { usePolling } from './hooks/usePolling';

