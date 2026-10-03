const { Camunda8 } = require('@camunda8/sdk');
const db = require('../config/database');
const { generateSummary } = require('./aiService');
const { createAuditLog } = require('./auditService');
const { eventBus, EventTypes } = require('./eventBus');

// Camunda 8 self-managed configuration
const CAMUNDA_CONFIG = {
  ZEEBE_GRPC_ADDRESS: process.env.ZEEBE_GRPC_ADDRESS || 'grpc://localhost:26500',
  ZEEBE_REST_ADDRESS: process.env.ZEEBE_REST_ADDRESS || 'http://localhost:8080',
  CAMUNDA_AUTH_STRATEGY: 'NONE',
  CAMUNDA_OAUTH_DISABLED: true
};

// Create Camunda client for self-managed
let camunda = null;

// Initialize client only if Camunda is enabled
if (process.env.NODE_ENV !== 'test' && process.env.CAMUNDA_ENABLED !== 'false') {
  try {
    camunda = new Camunda8({
      ZEEBE_GRPC_ADDRESS: CAMUNDA_CONFIG.ZEEBE_GRPC_ADDRESS,
      ZEEBE_REST_ADDRESS: CAMUNDA_CONFIG.ZEEBE_REST_ADDRESS,
      CAMUNDA_AUTH_STRATEGY: CAMUNDA_CONFIG.CAMUNDA_AUTH_STRATEGY,
      CAMUNDA_OAUTH_DISABLED: true
    });
  } catch (error) {
    console.log('Failed to initialize Camunda client:', error.message);
    camunda = null;
  }
}

/**
 * Worker for AI Classification task
 */
const aiClassificationWorker = async (job) => {
  const variables = job.variables || {};
  const { requestId, title, description, category, priority } = variables;
  
  try {
    if (requestId === undefined || requestId === null) {
      throw new Error('Missing requestId process variable');
    }

    console.log(`Processing AI classification for request ${requestId}`);
    
    // Use existing AI service to classify the request
    const classification = await generateSummary(title, description, category, priority);
    
    // Update request with classification results
    db.prepare(`
      UPDATE requests 
      SET ai_classification = ?, 
          workflow_status = 'Pending Review',
          updated_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(classification, requestId);
    
    // Create audit log
    createAuditLog(
      job.variables.userId || 1,
      'AI_CLASSIFICATION',
      'request',
      requestId,
      null,
      { classification },
      { worker: 'ai-classification' }
    );
    
    // Emit event
    eventBus.emit(EventTypes.REQUEST_CLASSIFIED, {
      requestId,
      classification
    });
    
    // Complete job with classification result
    return job.complete({
      classification: classification,
      priorityScore: calculatePriorityScore(priority)
    });
  } catch (error) {
    console.error('AI classification failed:', error);
    return job.fail({ errorMessage: error.message });
  }
};

const finalizeRequestOutcome = db.transaction((requestId, status, reason) => {
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
  if (!request) {
    throw new Error(`Request ${requestId} not found`);
  }

  if (request.status === 'Approved' || request.status === 'Rejected') {
    return { finalized: false, request };
  }

  const update = db.prepare(`
    UPDATE requests
    SET status = ?, workflow_status = ?, updated_at = CURRENT_TIMESTAMP
    WHERE id = ? AND status NOT IN ('Approved', 'Rejected')
  `).run(status, status, requestId);

  if (update.changes === 0) {
    return {
      finalized: false,
      request: db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId)
    };
  }

  const normalizedReason = typeof reason === 'string' && reason.trim()
    ? reason.trim()
    : status === 'Rejected' ? 'No reason provided' : null;
  const message = status === 'Approved'
    ? `Your request "${request.title}" has been approved${normalizedReason ? `: ${normalizedReason}` : ''}`
    : `Your request "${request.title}" has been rejected: ${normalizedReason}`;

  db.prepare(`
    INSERT INTO notifications (request_id, user_id, message)
    VALUES (?, ?, ?)
  `).run(requestId, request.user_id, message);

  return { finalized: true, request, previousStatus: request.status, reason: normalizedReason };
});

/**
 * Worker for Update Approved task
 */
const updateApprovedWorker = async (job) => {
  if (job.variables?.approved !== true) {
    return updateRejectedWorker(job);
  }

  const { requestId, reason, userId } = job.variables;

  try {
    console.log(`Processing approved status update for request ${requestId}`);
    const outcome = finalizeRequestOutcome(requestId, 'Approved', reason);

    if (!outcome.finalized) {
      return job.complete({ status: outcome.request.status });
    }

    createAuditLog(
      userId || outcome.request.user_id,
      'APPROVE',
      'request',
      requestId,
      { status: outcome.previousStatus },
      { status: 'Approved' },
      { worker: 'update-approved' }
    );

    eventBus.emit(EventTypes.REQUEST_APPROVED, { requestId, approverId: userId, reason });

    return job.complete({ status: 'Approved', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Update approved failed:', error);
    return job.fail({ errorMessage: error.message });
  }
};

/**
 * Worker for Update Rejected task
 */
const updateRejectedWorker = async (job) => {
  const { requestId, reason, userId } = job.variables;

  try {
    console.log(`Processing rejected status update for request ${requestId}`);
    const outcome = finalizeRequestOutcome(requestId, 'Rejected', reason);

    if (!outcome.finalized) {
      return job.complete({ status: outcome.request.status });
    }

    createAuditLog(
      userId || outcome.request.user_id,
      'REJECT',
      'request',
      requestId,
      { status: outcome.previousStatus },
      { status: 'Rejected', reason: outcome.reason },
      { worker: 'update-rejected' }
    );

    eventBus.emit(EventTypes.REQUEST_REJECTED, { requestId, rejecterId: userId, reason: outcome.reason });

    return job.complete({ status: 'Rejected', updatedAt: new Date().toISOString() });
  } catch (error) {
    console.error('Update rejected failed:', error);
    return job.fail({ errorMessage: error.message });
  }
};

/**
 * Calculate priority score for routing
 */
const calculatePriorityScore = (priority) => {
  const scores = {
    'Low': 1,
    'Medium': 2,
    'High': 3,
    'Critical': 4
  };
  return scores[priority] || 2;
};

/**
 * Start all workers
 */
const startWorkers = async () => {
  if (!camunda) {
    console.log('Camunda client not initialized, skipping worker start');
    return;
  }

  try {
    console.log('Starting Camunda workers...');
    
    // Use Zeebe gRPC client for worker creation
    const zeebeClient = camunda.getZeebeGrpcApiClient();
    
    // Create AI classification worker
    zeebeClient.createWorker({
      id: 'ai-classification-worker',
      taskType: 'ai-classification',
      taskHandler: aiClassificationWorker,
      fetchVariable: ['requestId', 'title', 'description', 'category', 'priority', 'userId'],
      pollInterval: 100,
      maxJobsToActivate: 10,
      timeout: 10000
    });
    
    // Create update-approved worker
    zeebeClient.createWorker({
      id: 'update-approved-worker',
      taskType: 'update-approved',
      taskHandler: updateApprovedWorker,
      pollInterval: 100,
      maxJobsToActivate: 10,
      timeout: 10000
    });
    
    // Create update-rejected worker
    zeebeClient.createWorker({
      id: 'update-rejected-worker',
      taskType: 'update-rejected',
      taskHandler: updateRejectedWorker,
      pollInterval: 100,
      maxJobsToActivate: 10,
      timeout: 10000
    });
    
    console.log('Camunda workers started successfully');
  } catch (error) {
    console.error('Failed to start workers:', error);
  }
};

module.exports = {
  startWorkers,
  aiClassificationWorker,
  updateApprovedWorker,
  updateRejectedWorker
};
