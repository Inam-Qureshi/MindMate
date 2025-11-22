# Assessment Page Rebuild Plan

## Overview
This document outlines the plan to recreate the Assessment page from scratch using a component-based architecture. The new architecture will be modular, maintainable, and aligned with the backend API endpoints.

**Design Consistency**: This plan follows the Forum page design patterns to ensure visual consistency across the application. All components, styling, and layout patterns match the Forum page structure.

## Key Design Principles (Matching Forum)
1. **Consistent Layout**: Outer gradient background, inner white container with rounded corners
2. **Header Design**: Gradient header with three-section layout (brand, center, actions)
3. **Navigation**: Tab-based navigation with active states
4. **Color Scheme**: Purple/indigo gradient (#667eea to #764ba2)
5. **Typography**: Consistent font sizes and weights
6. **Spacing**: Uniform padding and margins
7. **Responsive**: Mobile-first approach with breakpoints at 768px and 480px
8. **Dark Mode**: Full dark mode support with gradient variants

## Backend API Endpoints Analysis

### Core Assessment Endpoints

#### 1. Session Management
- **POST `/api/assessment/start`** - Start new assessment session
  - Request: `{ session_id?: string }`
  - Response: `{ session_id: string, greeting: string, available_modules: string[], metadata: object }`

- **GET `/api/assessment/sessions`** - Get all user sessions
  - Response: `{ sessions: Session[], total_sessions: number }`

- **GET `/api/assessment/sessions/{session_id}/load`** - Load specific session
  - Response: `{ session_id: string, messages: Message[], progress: object, session_state: object }`

- **DELETE `/api/assessment/sessions/{session_id}`** - Delete session
  - Response: `{ success: boolean, message: string, session_id: string }`

- **POST `/api/assessment/sessions/save`** - Save session
  - Request: `{ session_id: string, ...data }`
  - Response: `{ success: boolean, message: string, session_summary: object }`

#### 2. Conversation Endpoints
- **POST `/api/assessment/chat`** - Main chat endpoint
  - Request: `{ message: string, session_id?: string }`
  - Response: `{ response: string, session_id: string, current_module?: string, is_complete: boolean, metadata: object }`

- **POST `/api/assessment/continue`** - Continue conversation
  - Request: `{ message: string, session_id: string }`
  - Response: Same as chat endpoint

- **GET `/api/assessment/session/{session_id}/history`** - Get conversation history
  - Response: `{ session_id: string, messages: Message[], total_messages: number, session_duration?: string }`

#### 3. Progress Tracking
- **GET `/api/assessment/session/{session_id}/progress`** - Get progress
  - Response: `{ session_id: string, progress_percentage: number, current_module?: string, completed_modules: string[], total_modules: number, is_complete: boolean, started_at?: string, estimated_completion?: string }`

- **GET `/api/assessment/session/{session_id}/enhanced-progress`** - Get enhanced progress
  - Response: Same as progress endpoint with additional metrics

#### 4. Results & Reports
- **GET `/api/assessment/session/{session_id}/results`** - Get assessment results
  - Response: `{ session_id: string, is_complete: boolean, results: object, module_data: object[], summary?: string, recommendations?: string }`

- **GET `/api/assessment/assessment_result/{session_id}`** - Get comprehensive assessment result
  - Response: Complete assessment workflow result (Demographics, SRA, DA, TPA)

- **GET `/api/assessment/session/{session_id}/comprehensive-report`** - Get comprehensive report
  - Response: `{ session_id: string, report: string, report_length: number, generated_at: string }`

- **GET `/api/assessment/session/{session_id}/comprehensive-assessment-data`** - Get comprehensive assessment data
  - Response: Complete assessment data including all modules, conversation history, progress, and report

#### 5. Analytics
- **GET `/api/assessment/session/{session_id}/analytics`** - Get session analytics
  - Response: Detailed session analytics for monitoring and insights

#### 6. Module Management
- **GET `/api/assessment/modules`** - List available modules
  - Response: `{ modules: Module[], total_count: number, available: boolean }`

- **POST `/api/assessment/modules/{module_name}/deploy`** - Deploy module
  - Request: `{ module_name: string, force: boolean }`
  - Response: `{ success: boolean, module_name: string, message: string }`

- **POST `/api/assessment/session/{session_id}/switch-module`** - Switch module
  - Request: `{ module_name: string }`
  - Response: `{ success: boolean, message: string, session_id: string, current_module: string }`

#### 7. Health Check
- **GET `/api/assessment/health`** - Health check
  - Response: `{ status: string, assessment_available: boolean, agents_available: boolean, modules_count: number, enhanced_features: object, timestamp: number }`

## Design System (Matching Forum Page)

### Design Patterns from Forum Page

#### Page Structure
- **Outer Container**: Gradient background (`linear-gradient(135deg, #f8fafc 0%, #e2e8f0 100%)`)
- **Inner Container**: White background with rounded corners (`border-radius: 1rem`), box shadow, max-width 1200px
- **Dark Mode**: Gradient changes to `linear-gradient(135deg, #1a202c 0%, #2d3748 100%)`, background to `#2d3748`

#### Header Design
- **Background**: Gradient (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- **Layout**: Three-section layout (left: brand, center: search/actions, right: actions)
- **Brand Section**: Icon with background (`rgba(255, 255, 255, 0.2)`), title, subtitle
- **Stats Section**: Optional stats bar below header with background (`rgba(255, 255, 255, 0.1)`)

#### Navigation
- **Background**: White (dark mode: `#374151`)
- **Tabs**: Rounded buttons with active state (background: `#667eea`)
- **Border**: Bottom border (`1px solid #e5e7eb`)

#### Content Area
- **Padding**: `2rem`
- **Background**: Inherits from container
- **Min Height**: `400px` or `calc(100vh - header height)`

#### Color Palette
- **Primary Gradient**: `#667eea` to `#764ba2`
- **Dark Mode Gradient**: `#4a5568` to `#2d3748`
- **Text**: Light mode `#1f2937`, Dark mode `#f7fafc`
- **Borders**: Light mode `#e5e7eb`, Dark mode `#4b5563`
- **Shadows**: `0 10px 25px -5px rgba(0, 0, 0, 0.1)`

#### Typography
- **Headers**: `font-size: 1.5rem`, `font-weight: 700`
- **Body**: `font-size: 0.875rem`
- **Labels**: `font-size: 0.75rem`, `opacity: 0.9`

#### Spacing
- **Page Padding**: `1rem`
- **Content Padding**: `2rem`
- **Gap**: `1rem` between elements
- **Border Radius**: `1rem` for containers, `0.5rem` for buttons

#### Responsive Design
- **Mobile**: `max-width: 768px` - Stack layout, reduced padding
- **Small Mobile**: `max-width: 480px` - Full width, no border radius

## Component Architecture

### Component Hierarchy (Matching Forum Structure)

```
AssessmentPage (Container - matches ForumPage structure)
├── assessment-page (Outer wrapper with gradient background)
│   └── assessment-container (Inner container with white background, rounded, shadow)
│       ├── AssessmentHeader (Header with gradient background - matches ForumHeader)
│       │   ├── Header Left (Brand: icon, title, subtitle)
│       │   ├── Header Center (Search/Filter - optional)
│       │   ├── Header Right (Actions: New Session, Filters)
│       │   └── Header Stats (Optional: Session count, Progress stats)
│       │
│       ├── AssessmentNavigation (Navigation tabs - matches ForumNavigation)
│       │   ├── Nav Tabs (All Sessions, Active, Completed, etc.)
│       │   └── Nav Actions (View mode, Sort options)
│       │
│       └── AssessmentContent (Main content area - matches ForumContent)
│           ├── Two-Column Layout (Sidebar + Main) or Single Column
│           │
│           ├── AssessmentSidebar (Session list - collapsible on mobile)
│           │   ├── SessionList (List of sessions)
│           │   │   ├── SessionGroup (Date-grouped sessions)
│           │   │   └── SessionItem (Individual session item)
│           │   └── NewSessionButton (Button to start new session)
│           │
│           └── AssessmentMain (Main content area)
│               ├── WelcomeScreen (Empty state when no session selected)
│               │   └── StartAssessmentCard (Card to start new assessment)
│               │
│               ├── ChatView (Chat interface when session is active)
│               │   ├── ChatHeader (Session info, progress, actions)
│               │   ├── ProgressBar (Progress indicator)
│               │   ├── MessagesList (List of messages)
│               │   │   ├── MessageBubble (Individual message)
│               │   │   └── TypingIndicator (Typing indicator)
│               │   └── MessageInput (Input area)
│               │
│               └── ResultsView (Results display when complete)
│                   ├── ResultsHeader (Results header)
│                   ├── ResultsSummary (Summary section)
│                   ├── ResultsDetails (Detailed results)
│                   └── ResultsRecommendations (Recommendations)
│
└── Modals
    ├── ResultsModal (Modal for viewing results - matches Forum modal style)
    ├── DeleteSessionModal (Confirmation modal)
    └── SessionDetailsModal (Session details modal)
```

## Component Specifications

### 1. AssessmentPage (Container Component)
**Purpose**: Main page container matching ForumPage structure
**Responsibilities**:
- Manage global state (dark mode, user, current session)
- Handle session lifecycle (create, load, delete)
- Coordinate between header, navigation, and content
- Handle authentication and user data
- Apply Forum-style page wrapper with gradient background

**Structure**: Matches ForumPage.jsx
- Outer `div` with class `assessment-page` and gradient background
- Inner `div` with class `assessment-container` (max-width 1200px, centered)
- Contains AssessmentHeader, AssessmentNavigation, AssessmentContent

**Props**: None (fetches user data internally)
**State**:
- `darkMode: boolean`
- `currentUser: User | null`
- `currentSession: Session | null`
- `sessions: Session[]`
- `loading: boolean`
- `error: string | null`
- `activeTab: string` (for navigation)
- `showFilters: boolean`

**Methods**:
- `handleStartNewSession()`
- `handleLoadSession(sessionId)`
- `handleDeleteSession(sessionId)`
- `handleSessionUpdate(progress)`
- `toggleDarkMode()`
- `handleTabChange(tab)`

**CSS Classes**:
- `.assessment-page` - Outer wrapper with gradient background
- `.assessment-page.dark` - Dark mode variant
- `.assessment-container` - Inner container with white background, rounded, shadow

---

### 2. AssessmentHeader
**Purpose**: Header component matching ForumHeader design with gradient background
**Props**:
- `darkMode: boolean`
- `currentSession: Session | null`
- `progress: number`
- `onStartNewSession: () => void`
- `onFilterToggle: () => void`
- `showFilters: boolean`

**Structure**: Matches ForumHeader.jsx
- Three-section layout (left, center, right)
- Gradient background (`linear-gradient(135deg, #667eea 0%, #764ba2 100%)`)
- Optional stats section below

**Features**:
- **Left Section**: Brand icon, title "Assessment", subtitle
- **Center Section**: Search/Filter (optional)
- **Right Section**: New Session button, Filter toggle
- **Stats Section** (optional): Session count, Active sessions, Completed sessions

**CSS Classes**:
- `.assessment-header` - Header with gradient background
- `.header-container` - Flex container for three sections
- `.header-left`, `.header-center`, `.header-right` - Section containers
- `.header-brand` - Brand section with icon and text
- `.brand-icon` - Icon with semi-transparent white background
- `.header-stats` - Stats section below header

---

### 3. AssessmentNavigation
**Purpose**: Navigation tabs matching ForumNavigation design
**Props**:
- `tabs: Tab[]` - Array of tab objects with id, label, icon, count
- `activeTab: string` - Currently active tab id
- `onTabChange: (tabId: string) => void`
- `tabCounts: object` - Counts for each tab
- `darkMode: boolean`

**Structure**: Matches ForumNavigation.jsx
- White background (dark mode: `#374151`)
- Bottom border (`1px solid #e5e7eb`)
- Tabs with active state (background: `#667eea`)
- Optional nav actions (view mode, sort)

**Features**:
- **Tabs**: All Sessions, Active, Completed, Recent, etc.
- **Active State**: Highlighted tab with gradient background
- **Counts**: Show count for each tab
- **Animations**: Smooth transitions using Framer Motion

**CSS Classes**:
- `.assessment-navigation` - Navigation container
- `.navigation-container` - Flex container
- `.nav-tabs` - Tabs container
- `.nav-tab` - Individual tab button
- `.nav-tab.active` - Active tab state
- `.nav-actions` - Actions container

---

### 4. AssessmentContent
**Purpose**: Main content area matching ForumContent structure
**Props**:
- `darkMode: boolean`
- `children: ReactNode`

**Structure**: Matches ForumContent
- Padding: `2rem`
- Min height: `400px` or `calc(100vh - header height)`
- Two-column or single-column layout

**Features**:
- Flexible layout (sidebar + main or single column)
- Responsive design (stacks on mobile)
- Proper spacing and padding

**CSS Classes**:
- `.assessment-content` - Content container
- `.assessment-content-wrapper` - Inner wrapper (if needed)

---

### 5. AssessmentSidebar
**Purpose**: Sidebar displaying session list and new session button
**Props**:
- `darkMode: boolean`
- `sessions: Session[]`
- `currentSession: Session | null`
- `loading: boolean`
- `onStartNewSession: () => void`
- `onLoadSession: (sessionId: string) => void`
- `onDeleteSession: (sessionId: string) => void`
- `isOpen: boolean`
- `onClose: () => void`

**Features**:
- Session list with grouping by date
- New session button
- Session search/filter (optional)
- Infinite scroll for large session lists
- Empty state when no sessions

---

### 6. AssessmentMain
**Purpose**: Main content area displaying chat or welcome screen
**Props**:
- `darkMode: boolean`
- `currentSession: Session | null`
- `messages: Message[]`
- `isTyping: boolean`
- `progress: number`
- `isComplete: boolean`
- `onSendMessage: (message: string) => void`
- `onViewResults: () => void`
- `onStartNewSession: () => void`

**Features**:
- Welcome screen when no session
- Chat interface when session is active
- Results view when assessment is complete
- Progress bar

---

### 7. WelcomeScreen
**Purpose**: Empty state when no session is selected
**Props**:
- `darkMode: boolean`
- `onStartNewSession: () => void`
- `loading: boolean`

**Features**:
- Welcome message
- Start assessment button
- Instructions/guidance
- Visual illustration (optional)

---

### 8. ChatView (ChatContainer)
**Purpose**: Chat interface for assessment conversation
**Props**:
- `darkMode: boolean`
- `session: Session`
- `messages: Message[]`
- `isTyping: boolean`
- `progress: number`
- `currentModule: string | null`
- `isComplete: boolean`
- `onSendMessage: (message: string) => void`
- `onViewResults: () => void`

**Features**:
- Message display
- Typing indicator
- Auto-scroll to latest message
- Progress indicator
- Module indicator
- View results button (when complete)

---

### 9. ChatHeader
**Purpose**: Header for chat interface
**Props**:
- `darkMode: boolean`
- `session: Session`
- `currentModule: string | null`
- `isComplete: boolean`
- `onViewResults: () => void`
- `onRefresh: () => void`

**Features**:
- Session title
- Current module display
- View results button (when complete)
- Refresh button
- Session status

---

### 10. MessagesList
**Purpose**: Display list of messages in the conversation
**Props**:
- `darkMode: boolean`
- `messages: Message[]`
- `isTyping: boolean`

**Features**:
- Message bubbles (user vs assistant)
- Timestamp display
- Smooth animations
- Auto-scroll
- Message grouping by time

---

### 11. MessageBubble
**Purpose**: Individual message bubble
**Props**:
- `darkMode: boolean`
- `message: Message`
- `isUser: boolean`

**Features**:
- Different styling for user vs assistant
- Timestamp
- Avatar/icon
- Message content rendering
- Copy message (optional)

---

### 12. TypingIndicator
**Purpose**: Show typing indicator when assistant is responding
**Props**:
- `darkMode: boolean`

**Features**:
- Animated dots
- Smooth appearance/disappearance

---

### 14. MessageInput
**Purpose**: Input area for sending messages
**Props**:
- `darkMode: boolean`
- `value: string`
- `onChange: (value: string) => void`
- `onSend: (message: string) => void`
- `disabled: boolean`
- `isTyping: boolean`
- `isComplete: boolean`

**Features**:
- Text input
- Send button
- Disabled state when typing or complete
- Keyboard shortcuts (Enter to send)
- Character count (optional)
- Placeholder text

---

### 15. ResultsView
**Purpose**: Display assessment results
**Props**:
- `darkMode: boolean`
- `results: AssessmentResults`
- `session: Session`

**Features**:
- Results summary
- Detailed results
- Recommendations
- Export functionality (optional)
- Print functionality (optional)

---

### 16. ResultsModal
**Purpose**: Modal for viewing assessment results
**Props**:
- `darkMode: boolean`
- `isOpen: boolean`
- `onClose: () => void`
- `results: AssessmentResults`
- `session: Session`

**Features**:
- Modal overlay
- Results display
- Close button
- Export/print options
- Scrollable content

---

### 17. ProgressBar
**Purpose**: Display assessment progress
**Props**:
- `darkMode: boolean`
- `progress: number`
- `currentModule: string | null`
- `isComplete: boolean`

**Features**:
- Progress percentage
- Animated progress bar
- Module indicator
- Completion indicator

---

## State Management

### Global State (AssessmentPage)
- Current user
- Dark mode preference
- Sessions list
- Current session
- Loading states
- Error states

### Session State
- Session ID
- Messages
- Progress
- Current module
- Completion status
- Session metadata

### UI State
- Sidebar open/closed
- Modal open/closed
- Typing indicator
- Input value

## Data Flow

1. **Page Load**:
   - Fetch user data
   - Fetch sessions list
   - Initialize state

2. **Start New Session**:
   - Call `POST /api/assessment/start`
   - Create new session object
   - Add to sessions list
   - Set as current session
   - Display greeting message

3. **Load Session**:
   - Call `GET /api/assessment/sessions/{session_id}/load`
   - Load messages
   - Load progress
   - Set as current session
   - Display messages

4. **Send Message**:
   - Add user message to UI
   - Call `POST /api/assessment/continue`
   - Add assistant response to UI
   - Update progress
   - Check completion status

5. **Delete Session**:
   - Show confirmation modal
   - Call `DELETE /api/assessment/sessions/{session_id}`
   - Remove from sessions list
   - Clear current session if deleted

6. **View Results**:
   - Call `GET /api/assessment/session/{session_id}/results`
   - Display results in modal
   - Option to export/print

## Styling Strategy (Matching Forum Design)

### CSS Architecture
- **Component-scoped CSS**: Each component has its own CSS file
- **Class Naming**: Follow Forum naming convention (`.assessment-header`, `.assessment-navigation`, etc.)
- **CSS Variables**: Use CSS variables for theming (optional)
- **Responsive Breakpoints**: Match Forum breakpoints (768px, 480px)
- **Animation Utilities**: Use Framer Motion for animations

### Theme Colors (Matching Forum)
- **Primary Gradient**: `linear-gradient(135deg, #667eea 0%, #764ba2 100%)`
- **Dark Mode Gradient**: `linear-gradient(135deg, #4a5568 0%, #2d3748 100%)`
- **Background Light**: `#f8fafc` to `#e2e8f0` (gradient)
- **Background Dark**: `#1a202c` to `#2d3748` (gradient)
- **Container Light**: `white`
- **Container Dark**: `#2d3748`
- **Text Light**: `#1f2937`
- **Text Dark**: `#f7fafc`
- **Borders Light**: `#e5e7eb`
- **Borders Dark**: `#4b5563`
- **Active Tab**: `#667eea`
- **Shadows**: `0 10px 25px -5px rgba(0, 0, 0, 0.1)`

### Typography (Matching Forum)
- **Headers**: `font-size: 1.5rem`, `font-weight: 700`
- **Body**: `font-size: 0.875rem`
- **Labels**: `font-size: 0.75rem`, `opacity: 0.9`
- **Small Text**: `font-size: 0.75rem`

### Spacing (Matching Forum)
- **Page Padding**: `1rem`
- **Content Padding**: `2rem`
- **Gap**: `1rem` between elements
- **Border Radius**: `1rem` for containers, `0.5rem` for buttons
- **Icon Size**: `24px` for headers, `18px` for buttons, `16px` for small icons

### Layout Patterns (Matching Forum)
- **Max Width**: `1200px` (centered)
- **Container**: White background, rounded corners, box shadow
- **Header**: Gradient background, three-section layout
- **Navigation**: White background, bottom border, tabs with active state
- **Content**: Padding `2rem`, min height `400px`

### Responsive Design (Matching Forum)
- **Mobile** (`max-width: 768px`):
  - Stack layout
  - Reduced padding (`1rem`)
  - Full-width buttons
  - Collapsible sidebar
  
- **Small Mobile** (`max-width: 480px`):
  - Full width containers
  - No border radius on mobile
  - Stacked header sections
  - Full-width navigation tabs

## Implementation Phases

### Phase 1: Core Structure
1. Create component file structure
2. Implement AssessmentPage container
3. Implement AssessmentLayout
4. Implement AssessmentHeader
5. Basic routing and state management

### Phase 2: Sidebar & Session Management
1. Implement AssessmentSidebar
2. Implement SessionList
3. Implement SessionItem
4. Implement session CRUD operations
5. Add session grouping by date

### Phase 3: Chat Interface
1. Implement ChatContainer
2. Implement MessagesList
3. Implement MessageBubble
4. Implement MessageInput
5. Implement TypingIndicator
6. Add auto-scroll functionality

### Phase 4: Progress & Results
1. Implement ProgressBar
2. Implement ResultsView
3. Implement ResultsModal
4. Add progress tracking
5. Add results display

### Phase 5: Enhancements
1. Add welcome screen
2. Add empty states
3. Add error handling
4. Add loading states
5. Add animations
6. Add keyboard shortcuts
7. Add export functionality

### Phase 6: Testing & Polish
1. Test all functionality
2. Test responsive design
3. Test dark mode
4. Test error scenarios
5. Performance optimization
6. Accessibility improvements
7. Code cleanup and documentation

## API Integration

### Custom Hook: useAssessmentAPI
Already exists at `frontend/src/hooks/useAssessmentAPI.js`

**Methods Available**:
- `getSessions()` - Get all sessions
- `startSession(customSessionId?)` - Start new session
- `continueSession(sessionId, message)` - Continue conversation
- `deleteSession(sessionId)` - Delete session
- `saveSession(sessionId, data)` - Save session
- `loadSession(sessionId)` - Load session
- `getProgress(sessionId)` - Get progress
- `getEnhancedProgress(sessionId)` - Get enhanced progress
- `getResults(sessionId)` - Get results
- `getAssessmentResult(sessionId)` - Get assessment result
- `getHistory(sessionId)` - Get history
- `getAnalytics(sessionId)` - Get analytics
- `getComprehensiveReport(sessionId)` - Get comprehensive report
- `switchModule(sessionId, moduleName)` - Switch module
- `getModules()` - Get available modules
- `getHealth()` - Health check
- `clearError()` - Clear error state

## Error Handling

### Error Types
1. **Network Errors**: Display user-friendly error message
2. **Authentication Errors**: Redirect to login
3. **Session Not Found**: Show error, allow retry
4. **API Errors**: Display error message with retry option
5. **Validation Errors**: Show inline validation errors

### Error Display
- Toast notifications for transient errors
- Inline error messages for form errors
- Error modals for critical errors
- Error boundaries for React errors

## Performance Considerations

### Optimization Strategies
1. **Lazy Loading**: Lazy load components and routes
2. **Memoization**: Memoize expensive computations
3. **Virtual Scrolling**: Use virtual scrolling for large message lists
4. **Debouncing**: Debounce API calls where appropriate
5. **Caching**: Cache session data and messages
6. **Code Splitting**: Split code by route/feature

### Best Practices
- Use React.memo for expensive components
- Use useMemo for expensive calculations
- Use useCallback for event handlers
- Minimize re-renders
- Optimize bundle size
- Use efficient data structures

## Accessibility

### Requirements
1. **Keyboard Navigation**: Full keyboard support
2. **Screen Readers**: ARIA labels and roles
3. **Focus Management**: Proper focus handling
4. **Color Contrast**: WCAG AA compliance
5. **Text Alternatives**: Alt text for images
6. **Form Labels**: Proper form labeling

### Implementation
- Use semantic HTML
- Add ARIA attributes
- Implement keyboard shortcuts
- Test with screen readers
- Ensure color contrast
- Provide text alternatives

## Testing Strategy

### Unit Tests
- Test individual components
- Test utility functions
- Test custom hooks
- Test API integration

### Integration Tests
- Test component interactions
- Test data flow
- Test API calls
- Test state management

### E2E Tests
- Test user workflows
- Test session management
- Test chat functionality
- Test results display

## Documentation

### Component Documentation
- JSDoc comments for all components
- Prop types documentation
- Usage examples
- API documentation

### Code Comments
- Inline comments for complex logic
- Function documentation
- Algorithm explanations
- TODO comments for future work

## Migration Strategy

### From Old to New
1. Keep old components as backup
2. Implement new components alongside old ones
3. Gradually migrate functionality
4. Test thoroughly before removal
5. Remove old components after migration

### Backward Compatibility
- Maintain API compatibility
- Support existing data formats
- Handle migration of saved sessions
- Provide migration utilities if needed

## Future Enhancements

### Potential Features
1. **Session Sharing**: Share sessions with healthcare providers
2. **Export Options**: Export results as PDF/CSV
3. **Session Templates**: Pre-defined session templates
4. **Advanced Analytics**: Detailed analytics dashboard
5. **Multi-language Support**: Support for multiple languages
6. **Voice Input**: Voice-to-text for messages
7. **Session Comparison**: Compare multiple sessions
8. **Reminders**: Schedule assessment reminders
9. **Notifications**: Notifications for session updates
10. **Offline Support**: Offline mode with sync

## File Structure (Matching Forum Structure)

```
frontend/src/components/Assessment/
├── AssessmentPage.jsx (Main container - matches ForumPage.jsx)
├── AssessmentPage.css (Page styles - matches ForumPage.css)
├── AssessmentHeader.jsx (Header component - matches ForumHeader.jsx)
├── AssessmentHeader.css (Header styles - matches ForumHeader styles)
├── AssessmentNavigation.jsx (Navigation tabs - matches ForumNavigation.jsx)
├── AssessmentNavigation.css (Navigation styles - matches ForumNavigation styles)
├── AssessmentContent.jsx (Content wrapper - matches ForumContent)
├── AssessmentContent.css (Content styles)
├── components/
│   ├── Sidebar/
│   │   ├── AssessmentSidebar.jsx
│   │   ├── AssessmentSidebar.css
│   │   ├── SessionList.jsx
│   │   ├── SessionList.css
│   │   ├── SessionItem.jsx
│   │   ├── SessionItem.css
│   │   ├── SessionGroup.jsx
│   │   └── SessionGroup.css
│   ├── Chat/
│   │   ├── ChatView.jsx
│   │   ├── ChatView.css
│   │   ├── ChatHeader.jsx
│   │   ├── ChatHeader.css
│   │   ├── MessagesList.jsx
│   │   ├── MessagesList.css
│   │   ├── MessageBubble.jsx
│   │   ├── MessageBubble.css
│   │   ├── TypingIndicator.jsx
│   │   ├── TypingIndicator.css
│   │   ├── MessageInput.jsx
│   │   └── MessageInput.css
│   ├── Welcome/
│   │   ├── WelcomeScreen.jsx
│   │   ├── WelcomeScreen.css
│   │   ├── StartAssessmentCard.jsx
│   │   └── StartAssessmentCard.css
│   ├── Results/
│   │   ├── ResultsView.jsx
│   │   ├── ResultsView.css
│   │   ├── ResultsHeader.jsx
│   │   ├── ResultsSummary.jsx
│   │   ├── ResultsDetails.jsx
│   │   └── ResultsRecommendations.jsx
│   ├── Progress/
│   │   ├── ProgressBar.jsx
│   │   └── ProgressBar.css
│   └── Modals/
│       ├── ResultsModal.jsx
│       ├── ResultsModal.css (matches Forum modal styles)
│       ├── DeleteSessionModal.jsx
│       └── DeleteSessionModal.css
├── hooks/
│   └── useAssessmentSession.js (Custom hook for session management)
├── utils/
│   ├── sessionHelpers.js (Session utility functions)
│   ├── messageHelpers.js (Message utility functions)
│   └── dateHelpers.js (Date formatting utilities)
├── types/
│   └── assessment.types.js (TypeScript-like type definitions)
└── plan.md (This file)
```

**Note**: File structure follows Forum component organization:
- Main components at root level (AssessmentPage, AssessmentHeader, AssessmentNavigation)
- Sub-components in `components/` folder organized by feature
- Each component has its own CSS file
- Modals follow Forum modal styling patterns

## Implementation Checklist

### Phase 1: Core Structure
- [ ] Create file structure
- [ ] Implement AssessmentPage container
- [ ] Implement AssessmentLayout
- [ ] Implement AssessmentHeader
- [ ] Set up routing
- [ ] Set up state management
- [ ] Add dark mode support

### Phase 2: Sidebar & Session Management
- [ ] Implement AssessmentSidebar
- [ ] Implement SessionList
- [ ] Implement SessionItem
- [ ] Add session CRUD operations
- [ ] Add session grouping
- [ ] Add session search/filter
- [ ] Add infinite scroll

### Phase 3: Chat Interface
- [ ] Implement ChatContainer
- [ ] Implement MessagesList
- [ ] Implement MessageBubble
- [ ] Implement MessageInput
- [ ] Implement TypingIndicator
- [ ] Add auto-scroll
- [ ] Add message grouping
- [ ] Add keyboard shortcuts

### Phase 4: Progress & Results
- [ ] Implement ProgressBar
- [ ] Implement ResultsView
- [ ] Implement ResultsModal
- [ ] Add progress tracking
- [ ] Add results display
- [ ] Add export functionality

### Phase 5: Enhancements
- [ ] Add welcome screen
- [ ] Add empty states
- [ ] Add error handling
- [ ] Add loading states
- [ ] Add animations
- [ ] Add accessibility features
- [ ] Add performance optimizations

### Phase 6: Testing & Polish
- [ ] Write unit tests
- [ ] Write integration tests
- [ ] Write E2E tests
- [ ] Test responsive design
- [ ] Test dark mode
- [ ] Test error scenarios
- [ ] Performance optimization
- [ ] Code cleanup
- [ ] Documentation

## Notes

- All components should be functional components using React Hooks
- Use Framer Motion for animations
- Use React Feather for icons
- Maintain consistency with existing codebase style
- Follow React best practices
- Ensure accessibility compliance
- Optimize for performance
- Write comprehensive tests
- Document all components and functions

## Dependencies

### Required Packages
- `react` - React library
- `react-dom` - React DOM
- `framer-motion` - Animation library
- `react-feather` - Icon library
- `axios` - HTTP client (via apiClient)

### Optional Packages
- `react-virtualized` - Virtual scrolling (for large lists)
- `date-fns` - Date formatting
- `react-markdown` - Markdown rendering (if needed)

## Conclusion

This plan provides a comprehensive roadmap for rebuilding the Assessment page with a component-based architecture. The new architecture will be more maintainable, scalable, and aligned with modern React best practices. Implementation should proceed in phases, with thorough testing at each stage.

