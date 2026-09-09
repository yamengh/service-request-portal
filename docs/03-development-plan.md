# Service Request Portal — Week 1 Development Plan

## 1. Technology

- React + Vite
- React Router
- CSS
- Mock data only
- Frontend only

## 2. Project Structure

```text
src/
├── components/
│   ├── shared/
│   ├── dashboard/
│   ├── requests/
│   └── form/
├── pages/
├── context/
├── data/
├── utils/
├── App.jsx
└── main.jsx

3. Development Steps
Phase 1 — Foundation
Set up React + Vite.
Install React Router.
Create the project structure.
Configure application routes.
Create the basic visual design system.
Phase 2 — Shared Components

Create reusable:

Navigation
Button
Card
Badge
Input/Form components
Phase 3 — Mock Data and Validation
Create realistic mock service requests.
Define request statuses, priorities and categories.
Create client-side form validation utilities.
Create date formatting utilities.
Phase 4 — Main Screens

Build:

Dashboard
New Request
My Requests
Request Details
Phase 5 — State and Interaction
Connect navigation using React Router.
Manage form state with React.
Manage submitted requests with shared frontend state.
Display success and validation states.
Phase 6 — Responsive UI
Desktop layout
Tablet layout
Mobile layout
Responsive navigation
Mobile-friendly request list
Phase 7 — Testing and Refinement
Test navigation.
Test request submission.
Test validation.
Test request details.
Test responsive layouts.
Check keyboard accessibility.
Fix problems found during testing.
Improve the UI based on testing results.

Mock Data
    ↓
Requests State
    ↓
Dashboard / My Requests / Request Details

New Request Form
    ↓
Validation
    ↓
Add Request
    ↓
Requests State
    ↓
Updated UI

5. Week 1 Scope
Included
Responsive frontend
Four main screens
Mock requests
Form validation
Client-side routing
Temporary frontend state
Basic accessibility
Professional UI
Excluded
Backend
Database
Authentication
Admin functionality
Real APIs
AI API
Camunda
Message queues
Notifications
File uploads
Search/filtering
Mobile application
6. Testing Strategy

Testing will primarily be manual.

Key checks:

All navigation paths work.
Valid and invalid form submissions behave correctly.
New requests appear during the current session.
Request details display the correct data.
Layout works across desktop, tablet and mobile.
Keyboard navigation and form labels work correctly.
7. Expected Outcome

A professional, responsive Service Request Portal prototype that demonstrates the Week 1 AI-assisted development workflow and provides a foundation for the backend, database, authentication and workflow features introduced in later weeks.


**This is the version I'd actually submit.** It is clear, professional, and doesn't bury the important information under 1,000 lines.
documents that we addde, anything more before we upload on github?
Also, notice I corrected the earlier inconsistency: our actual implementation **does use `RequestsContext`**, so the development plan shouldn't claim that no shared/global state is needed.