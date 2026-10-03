# Week 4: Camunda 8 Integration

## Overview
This integration connects the Service Request Portal backend to a local Camunda 8 instance for orchestration of the approval workflow.

## What Was Changed

### New Files Created
1. **docs/week-4/service-request-approval.bpmn** - BPMN process definition for the approval workflow
2. **backend/services/camundaService.js** - Camunda 8 client wrapper for process management
3. **backend/services/camundaWorkers.js** - Workers for AI classification, approval, and rejection tasks
4. **backend/controllers/camundaController.js** - Controller for Camunda task management APIs
5. **backend/routes/camundaRoutes.js** - REST routes for Camunda task operations
6. **backend/.env.example** - Environment configuration template

### Modified Files
1. **backend/config/database.js** - Added `ai_classification` and `camunda_process_instance_id` columns to requests table
2. **backend/controllers/requestController.js** - Integrated Camunda process instance start on request creation
3. **backend/server.js** - Added Camunda routes, BPMN deployment, and worker startup on server initialization

## BPMN Process Flow
The BPMN process defines the following workflow:
1. **Start Event** - Request submitted
2. **AI Classification** (External Task: `ai-classification`) - Uses OpenRouter AI to classify the request
3. **Human Review** (User Task) - Manual review by assigned reviewer
4. **Gateway** - Approval decision based on `approved` variable
5. **Update Approved** (External Task: `update-approved`) - Updates request status to Approved
6. **Update Rejected** (External Task: `update-rejected`) - Updates request status to Rejected
7. **End Events** - Process completion

## Configuration
Add to your `.env` file:
```env
CAMUNDA_ENABLED=true
CAMUNDA_BASE_URL=http://localhost:26500
CAMUNDA_USERNAME=demo
CAMUNDA_PASSWORD=demo
```

## Workers Implemented
1. **ai-classification worker** - Calls the existing OpenRouter AI service to classify requests
2. **update-approved worker** - Updates request status to Approved and creates notifications
3. **update-rejected worker** - Updates request status to Rejected and creates notifications

## New API Endpoints
- `GET /api/camunda/tasks/my` - Get all tasks assigned to current user
- `GET /api/camunda/tasks/request/:requestId` - Get task for a specific request
- `POST /api/camunda/tasks/:taskId/complete` - Complete an approval task with `{ approved: boolean, reason: string }`

## Graceful Degradation
The integration is designed to work without Camunda:
- If `CAMUNDA_ENABLED=false` or Camunda is unavailable, the local Week 3 workflow engine handles requests
- All existing Week 1-3 functionality remains intact
- Tests pass with `CAMUNDA_ENABLED=false`

## Testing the Integration

### Prerequisites
1. Start Camunda 8 locally at `http://localhost:26500`
2. Set `CAMUNDA_ENABLED=true` in `.env`
3. Restart the backend server

### Test Steps
1. Create a new request - should start a Camunda process instance
2. AI classification worker should automatically classify the request
3. Retrieve user tasks via `GET /api/camunda/tasks/my`
4. Complete the review task via `POST /api/camunda/tasks/:taskId/complete`
5. Verify request status updates to Approved/Rejected in SQLite
6. Verify notifications are created

## Current Status
- ✅ BPMN process definition created
- ✅ Camunda SDK installed (@camunda8/sdk)
- ✅ Service and workers implemented
- ✅ API endpoints implemented
- ✅ Database schema updated
- ✅ Graceful degradation implemented
- ✅ All Week 1-3 tests pass (23/23)
- ⚠️ Camunda 8 not running at localhost:26500 (user needs to start it)
- ⚠️ BPMN not yet deployed (requires Camunda to be running)

## How to Deploy and Test with Camunda
1. Start Camunda 8 (e.g., using Docker Compose or Camunda Desktop)
2. Ensure Camunda is accessible at `http://localhost:26500`
3. Set `CAMUNDA_ENABLED=true` in backend `.env`
4. Restart the backend server - it will automatically:
   - Deploy the BPMN process
   - Start the three workers
5. Create a test request and observe the workflow in Camunda Operate
