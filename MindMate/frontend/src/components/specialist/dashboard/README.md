# Specialist Dashboard - Modular Architecture

## 📁 Structure

```
dashboard/
├── index.js                          # Main exports
├── SpecialistDashboardContainer.jsx  # Main container component
│
├── layout/                          # Layout components
│   ├── DashboardLayout.jsx
│   ├── DashboardHeader.jsx
│   ├── DashboardSidebar.jsx
│   └── DashboardLayout.css
│
├── modules/                         # Feature modules
│   ├── overview/                   # Dashboard overview
│   │   ├── OverviewModule.jsx
│   │   ├── StatsCards.jsx
│   │   └── RecentActivity.jsx
│   │
│   ├── appointments/               # Appointments management
│   │   ├── AppointmentsModule.jsx
│   │   └── AppointmentsModule.css
│   │
│   ├── patients/                   # Patient management
│   │   ├── PatientsModule.jsx
│   │   └── PatientsList.jsx
│   │
│   ├── forum/                      # Forum features
│   │   └── ForumModule.jsx
│   │
│   ├── profile/                    # Profile management
│   │   └── ProfileModule.jsx
│   │
│   └── slots/                      # Availability management
│       └── SlotsModule.jsx
│
├── shared/                          # Shared components
│   ├── EmptyState.jsx
│   ├── LoadingState.jsx
│   ├── ErrorState.jsx
│   ├── StatusBadge.jsx
│   └── Modal.jsx
│
└── hooks/                           # Custom hooks
    ├── useDashboardStats.js
    ├── usePatients.js
    ├── useSlots.js
    └── usePolling.js
```

## 🎯 Features

### 1. Overview Module
- **Backend:** `GET /api/specialists/dashboard/stats`
- Real-time statistics display
- Recent activity timeline
- Welcome dashboard

### 2. Appointments Module
- **Backend:** Multiple appointment endpoints
- Filter by status (All, Pending, Scheduled, Completed, Cancelled)
- Search functionality
- Online/In-person appointment separation
- Payment verification for online appointments
- Real-time polling (30s intervals)

### 3. Patients Module
- **Backend:** `POST /api/specialists/patients/filter`
- Filter by status (All, New, Active, Follow-up, Discharged)
- Search patients
- Patient information table
- Pagination support

### 4. Forum Module
- **Backend:** Forum API endpoints
- Placeholder for future implementation
- Questions, Answers, Moderation sections ready

### 5. Profile Module
- **Backend:** Profile API endpoints
- View specialist information
- Profile sections: View, Edit, Documents, Reviews
- Basic profile display implemented

### 6. Slots Module
- **Backend:** Slots management endpoints
- View all slots
- Availability summary with statistics
- Generate slots feature ready
- Block/Unblock functionality

## 🔄 Data Flow

```
SpecialistDashboardContainer
    ↓
DashboardLayout (Header + Sidebar + Content)
    ↓
Active Module (Overview/Appointments/Patients/etc.)
    ↓
Custom Hooks (API calls)
    ↓
Backend Endpoints
```

## 🎨 Features

✅ **Dark Mode Support** - Full dark mode integration
✅ **Responsive Design** - Mobile, tablet, desktop layouts
✅ **Real-time Updates** - Polling every 30 seconds
✅ **Error Handling** - Comprehensive error states with retry
✅ **Loading States** - Skeleton loaders and loading indicators
✅ **Empty States** - Helpful messages when no data
✅ **Smooth Animations** - Framer Motion transitions
✅ **Context-aware Sidebar** - Dynamic sidebar based on active tab
✅ **Modular Architecture** - Easy to maintain and extend

## 🔌 Backend Integration

All modules integrate with existing backend endpoints:
- Dashboard stats
- Appointments management
- Patient filtering
- Slot management
- Forum (ready for integration)
- Profile management

## 🚀 Usage

```javascript
import SpecialistDashboardContainer from './components/specialist/dashboard';

// In your routes
<Route path="/specialist-dashboard" element={
  <ProtectedRoute allowedUserTypes={['specialist']}>
    <SpecialistDashboardContainer />
  </ProtectedRoute>
} />
```

## 🎯 Navigation

### Main Tabs (Header)
- Overview
- Appointments
- Patients
- Forum
- Availability (Slots)
- Profile

### Sidebar (Context-aware)
Each tab has its own sidebar items for filtering and navigation.

## 📝 Notes

- The old `SpecialistDashboard.jsx` has been migrated to `AppointmentsModule.jsx`
- All components follow the same pattern for consistency
- Hooks are reusable across modules
- Shared components reduce code duplication
- Real-time polling can be enabled/disabled per module

