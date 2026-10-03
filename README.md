# Service Request Portal

A service request management application developed across four internship weeks, evolving from a React prototype into a full-stack portal with access controls, subscriptions, workflow orchestration, audit logging, and Camunda integration.

## Week 1

### Frontend MVP

* Dashboard
* New Request form
* My Requests
* Request Details
* React Router navigation
* Form validation
* Responsive design
* Mock request data
* Temporary frontend state

### Technology

* React
* Vite
* React Router
* CSS

## Week 2

### Full-Stack Features

* React frontend connected to backend API
* Node.js + Express backend
* SQLite database
* JWT-based authentication and authorization
* User request creation and viewing
* Admin request management
* Request workflow: `New → In Progress → Done`
* AI-generated request summaries
* AI-generated positive and negative test cases
* In-app status-change notifications

### Technology

* React
* Vite
* Node.js
* Express
* SQLite
* JWT
* bcrypt
* OpenRouter AI

## Week 3

### Enterprise Features

* Role-based access control (RBAC) for applicant, reviewer, manager, and admin roles
* Attribute-based access control (ABAC) using request and user attributes such as department and region
* Service Catalog with subscriptions to active services
* Local workflow engine for request states, transitions, and review assignment
* Audit logging for important user and request actions
* In-memory event bus for application events
* Mock external integrations for ERP, ticketing, and analytics systems

## Week 4

### Camunda 8.9 Approval Workflow

* Camunda 8.9 runs locally in Docker and orchestrates the Service Request Approval BPMN process (`Process_1r2vmgs`)
* New requests start a process instance through the Zeebe gRPC connection
* The AI Classification service task is handled by a backend Zeebe worker
* The Reviewer Approval user task is available in Camunda Tasklist
* An Approve/Reject gateway routes the process to the appropriate outcome
* Zeebe workers update the request status in SQLite and create applicant notifications
* Camunda Tasklist is used for human review; Camunda Operate is used to inspect workflow instances
* The backend integrates with Camunda for process starts, workers, and user-task operations

The BPMN is deployed manually through Camunda Modeler. The backend connects to the already deployed process; it does not deploy the BPMN on startup.

### Technology and Requirements

* Camunda 8.9 running in Docker
* Camunda Modeler for manual BPMN deployment
* Zeebe gRPC connection for process starts and workers
* Camunda Tasklist and Operate for human review and process monitoring

## Architecture

```text
React + Vite frontend
        │ REST API
        ▼
Node.js + Express backend ───── SQLite database
        │                         users, services, requests,
        │                         subscriptions, workflow,
        │                         audit logs, notifications
        ├── OpenRouter AI service
        ├── Mock ERP, ticketing, and analytics integrations
        ├── In-memory application event bus
        └── Zeebe gRPC ── Camunda 8.9 in Docker
                            ├── Tasklist: reviewer tasks
                            └── Operate: process monitoring
```

## User Roles

### Applicant

* Create requests and subscribe to services
* View own requests
* View request details
* Receive request notifications

### Reviewer

* Create requests and subscribe to services
* Review assigned requests through Camunda Tasklist

### Manager

* View requests within the manager's department
* Approve or reject requests and assign reviewers

### Admin

* View all requests and manage services
* Review audit logs
* Change request status and use AI-assisted request tools

## Running the Project

### Frontend

```bash
npm install
npm run dev
```

### Backend

```bash
cd backend
npm install
npm run dev
```

Run the frontend and backend in separate terminals. Camunda-backed workflows also require Camunda 8.9 running in Docker and the BPMN manually deployed through Camunda Modeler.

## Environment Variables

Create:

```text
backend/.env
```

with the required local configuration, including the OpenRouter API key.

For Camunda integration, configure `CAMUNDA_ENABLED`, `ZEEBE_GRPC_ADDRESS`, and `ZEEBE_REST_ADDRESS` as shown in `backend/.env.example`. The backend starts workers and connects to the deployed process when Camunda is enabled.

Do not commit `.env` or API keys to GitHub.

## Project Documentation

Additional project documentation is available in the `docs/` directory.

## Internship Progress

* Week 1 — Frontend MVP ✅
* Week 2 — Full-stack service application ✅
* Week 3 — Access control, service subscriptions, local workflow, audit and integrations ✅
* Week 4 — Camunda approval workflow integration ✅

## Verification

- Backend tests: 23/23 passed
- Frontend production build: passed
- Camunda BPMN deployed successfully through Camunda Modeler
- End-to-end approval workflow verified:
  Request → AI Classification → Reviewer Approval → Approve/Reject → SQLite status update