# Assessment V2 Frontend Integration Guide

This document enumerates the frontend changes needed to integrate the rebuilt backend assessment workflow.  
Use it as a checklist while updating the React components and hooks.

---

## 1. API Contract Updates (handled via `useAssessmentAPI`)

1. **Update response typing/handling** so the hook surfaces new payload fields returned by the backend:
   - `progress_snapshot`, `module_sequence`, `module_status`, `module_timeline`, `next_module`, `background_services`, `flow_info`, `symptom_summary`.
   - Enriched results payload (`module_results`, `module_data`, `agent_status`, `conversation_history`, etc.).
   - Pagination metadata on `getSessions` (`page`, `page_size`, `total_pages`, `has_next`, `has_previous`).
2. Extend `useAssessmentAPI` return values to expose:
   - Pagination helpers (`getSessions(page, pageSize)`).
   - New helper methods as needed (e.g., `getAssessmentData`, `getAnalytics`) returning full structured data.
3. Handle degraded-mode fallbacks gracefully (no SRA/flow data -> keep existing UX).

---

## 2. State Management (`AssessmentPage.jsx`)

1. **Store the richer progress snapshot** in state (`progressDetails`), not just a number.
2. **Track symptom summary** from chat/start/progress responses to show ongoing SRA insights.
3. **Handle pagination** for session list:
   - Manage `page`, `pageSize`, `totalSessions`, `totalPages`, `hasNext`, `hasPrevious`.
   - Update `loadSessions` to consume new pagination payload.
4. Update `currentSession` shape to include:
   - `progress_snapshot`, `module_sequence`, `module_timeline`, `symptom_summary`, `status`, `next_module`.
5. Persist & pass new data down to children (`AssessmentContent`, `AssessmentSidebar`, `AssessmentMain`, etc.).

---

## 3. Sidebar & Session List (`AssessmentSidebar`, `SessionList`, `SessionItem`)

1. Display new session metadata:
   - Progress percentage badge / mini progress bar.
   - Current/next module label.
   - Status (in-progress vs completed) using `session.status`.
2. Add pagination controls (prev/next page, page indicator).
3. Show tooltip or expandable area for quick module timeline / started & updated timestamps.

---

## 4. Main View (`AssessmentMain`, `ChatView`, `ProgressBar`, etc.)

1. **Progress Bar**:
   - Drive from `progress_snapshot.overall_percentage`.
   - Show current module and next module with improved styling.
   - Consider a progress timeline or stepper from `module_status`.
2. **Chat Header**:
   - Display module timeline pill, completed/remaining counts.
   - Add symptom summary button/popover.
3. **Messages List / Typing**:
   - Ensure timeline updates after each message (no extra fetch unless needed).
4. **Completion View**:
   - Access `symptom_summary` & `agent_status` to show what's ready (e.g., DA run complete, TPA ready).
5. **Error state**:
   - If degraded metadata missing, fall back to previous UI but show warning.

---

## 5. Results Modal / Detailed Views (`ResultsView`, `AssessmentMain` results path)

1. When fetching results:
   - Render module sections using `results.module_results`.
   - Show treatment planning (TPA) / diagnostics (DA) statuses via `agent_status`.
   - Present symptom summary (categories, severity distribution).
2. Allow exporting or viewable JSON using `/assessment-data` response (complete dataset with `export_metadata`).
3. Include module timeline and conversation counts in summary cards.

---

## 6. Analytics / History / Session Load

1. **History view** should use `metadata.progress_snapshot`, `module_timeline`, and `symptom_summary` returned by `/history`.
2. **Session load UI** should show:
   - Current module & timeline preview.
   - Last updated timestamp per module.
3. If analytics data is consumed anywhere, wire in `progress_snapshot` / `symptom_summary`.

---

## 7. Styling & UX Enhancements

1. Introduce components for:
   - Module timeline (stepper with statuses).
   - Symptom summary panel (category chips, severity bars).
2. Update CSS themes (`AssessmentPage.css`, `AssessmentContent.css`, etc.) to accommodate new panels / timeline.
3. Ensure responsive layout gracefully handles added elements (especially on mobile).

---

## 8. Testing Considerations

1. Adjust mock data and fixtures in any tests/stories to include new fields.
2. Add unit tests for `useAssessmentAPI` to verify parsing of pagination and progress snapshot.
3. Regression-test chat flow, resuming sessions, and results view with the new shape.

---

## 9. Documentation & Communication

1. Update any existing README / plan docs with new API contracts.
2. Share this guide with designers/PMs in case UI/UX adjustments are needed for symptom analytics or timeline.

---

## 10. Three-Phase Page Structure & Rollout Plan

### Phase 1 – Core Alignment (Foundational Layout)
- **Layout Goals**
  - Keep the existing two-panel layout (sidebar + main chat/results) while wiring in new backend data.
  - Introduce hidden or lightweight placeholders for upcoming timeline and symptom panels so later phases slot in cleanly.
- **UI Sections**
  - Sidebar: Session list with basic pagination controls.
  - Main Panel: Chat header, messages, progress bar, results placeholder.
  - Hidden/Placeholder: Module timeline drawer, symptom overview card, agent status area.
- **Implementation Checklist**
  1. Update `useAssessmentAPI` and container state to expose `progress_snapshot`, `symptom_summary`, pagination metadata.
  2. Ensure all existing components render gracefully with new data shapes (fallback to legacy behaviour when missing).
  3. Validate degraded-mode scenarios (e.g., SRA unavailable).
  4. Capture baseline screenshots for regression comparison.

### Phase 2 – Enhanced Workflow Visualization
- **Layout Goals**
  - Surface the full assessment journey without overwhelming the chat experience.
  - Align visuals with Forum design language (gradient header, cards, spacings).
- **UI Sections**
  - Sidebar: Progress indicators, status chips, mini timeline preview, pagination footer.
  - Main Header: Module timeline stepper highlighting completed/current/next modules; DA/TPA agent badges.
  - Chat Area: Rich progress bar with module names, symptom summary toggle/panel.
  - Results View: Structured tabs/cards for module outputs, DA findings, TPA plan, SRA summary.
- **Implementation Checklist**
  1. Build reusable components (e.g., `ModuleStepper`, `SymptomSummaryCard`, `AgentStatusChips`).
  2. Apply Forum-consistent styling; ensure mobile responsiveness.
  3. Integrate new components into existing hierarchy with accessibility considerations.
  4. Update Storybook/docs to reflect the enhanced UI.

### Phase 3 – Advanced Insights & Export Tools
- **Layout Goals**
  - Provide deep-dive analytics and export capabilities for clinicians/power users.
  - Connect assessment insights to broader platform features (Progress Tracker, Journal).
- **UI Sections**
  - Analytics Drawer: Charts for symptom trends, module durations, agent completion states.
  - Results Modal: Download/export controls (JSON summary, PDF mock), conversation timeline filters.
  - Session Comparison (optional stretch): Compare multiple sessions using pagination metadata.
  - Integrations: Contextual links to other modules when certain triggers appear.
- **Implementation Checklist**
  1. Hook up `/assessment-data` export flow and viewer/downloader.
  2. Visualize `module_data` and `conversation_history` (timelines, heat maps, tables).
  3. Document insights with tooltips and inline guidance.
  4. Conduct usability review with stakeholders; refine onboarding microcopy.

---
