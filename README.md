# Service Request Portal

A service request management application developed as part of my IT internship.

The project started as a React frontend prototype in Week 1 and was extended in Week 2 into a full-stack application with a Node.js/Express backend, SQLite database, authentication, role-based access, AI-assisted features, and notifications.

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
* User and Admin authentication
* JWT-based authorization
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

## Architecture

```text
React Frontend
      ↓
REST API
      ↓
Node.js + Express
      ↓
SQLite Database
      ↓
OpenRouter AI Service
```

## User Roles

### User

* Submit requests
* View own requests
* View request details
* Receive status notifications
* Cannot change request status

### Admin

* View all requests
* Change request status
* Generate AI summaries
* Generate AI test cases
* Cannot create requests

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

The frontend and backend should be running in separate terminals.

## Environment Variables

Create:

```text
backend/.env
```

with the required local configuration, including the OpenRouter API key.

Do not commit `.env` or API keys to GitHub.

## Project Documentation

Additional project documentation is available in the `docs/` directory.

## Internship Progress

* Week 1 — Frontend MVP ✅
* Week 2 — Full-stack service application 🔄
