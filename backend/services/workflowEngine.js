const db = require('../config/database');
const { eventBus, EventTypes } = require('./eventBus');

/**
 * Workflow Engine Service
 * Manages request workflow states and transitions
 */

// Workflow state definitions
const WORKFLOW_STATES = {
  SUBMITTED: 'Submitted',
  CLASSIFYING: 'Classifying',
  REVIEWING: 'Reviewing',
  MANAGER_REVIEW: 'Manager Review',
  ADMIN_REVIEW: 'Admin Review',
  APPROVED: 'Approved',
  REJECTED: 'Rejected'
};

// Valid state transitions
const VALID_TRANSITIONS = {
  [WORKFLOW_STATES.SUBMITTED]: [WORKFLOW_STATES.CLASSIFYING, WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.CLASSIFYING]: [WORKFLOW_STATES.REVIEWING, WORKFLOW_STATES.MANAGER_REVIEW, WORKFLOW_STATES.ADMIN_REVIEW, WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.REVIEWING]: [WORKFLOW_STATES.MANAGER_REVIEW, WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.MANAGER_REVIEW]: [WORKFLOW_STATES.ADMIN_REVIEW, WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.ADMIN_REVIEW]: [WORKFLOW_STATES.APPROVED, WORKFLOW_STATES.REJECTED],
  [WORKFLOW_STATES.APPROVED]: [],
  [WORKFLOW_STATES.REJECTED]: []
};

/**
 * Initialize workflow for a new request
 */
const initializeWorkflow = (requestId, userId) => {
  try {
    // Create initial workflow state
    const result = db.prepare(`
      INSERT INTO workflow_states (request_id, current_state, previous_state, actor_id, actor_role, transition_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requestId, WORKFLOW_STATES.SUBMITTED, null, userId, 'applicant', 'Request submitted');

    // Update request workflow status
    db.prepare(`
      UPDATE requests 
      SET workflow_status = ? 
      WHERE id = ?
    `).run(WORKFLOW_STATES.SUBMITTED, requestId);

    // Emit event
    eventBus.emit(EventTypes.WORKFLOW_STARTED, {
      requestId,
      initialState: WORKFLOW_STATES.SUBMITTED,
      userId
    });

    return { success: true, workflowStateId: result.lastInsertRowid };
  } catch (error) {
    console.error('Workflow initialization failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Transition workflow to next state
 */
const transitionWorkflow = (requestId, toState, actorId, reason = null) => {
  try {
    // Get current workflow state
    const currentState = db.prepare(`
      SELECT current_state FROM workflow_states 
      WHERE request_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(requestId);

    if (!currentState) {
      // Allow transition if no current state exists (for initial transitions)
      // This can happen if workflow wasn't properly initialized
      const actor = db.prepare('SELECT role FROM users WHERE id = ?').get(actorId);
      const actorRole = actor ? actor.role : 'system';

      // Create new workflow state
      const result = db.prepare(`
        INSERT INTO workflow_states (request_id, current_state, previous_state, actor_id, actor_role, transition_reason)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(requestId, toState, null, actorId, actorRole, reason);

      // Update request workflow status
      db.prepare(`
        UPDATE requests 
        SET workflow_status = ? 
        WHERE id = ?
      `).run(toState, requestId);

      // Emit event
      eventBus.emit(EventTypes.WORKFLOW_TRANSITION, {
        requestId,
        fromState: null,
        toState,
        actorId,
        actorRole,
        reason
      });

      return { success: true, workflowStateId: result.lastInsertRowid };
    }

    // Validate transition
    const validTransitions = VALID_TRANSITIONS[currentState.current_state];
    if (!validTransitions.includes(toState)) {
      return { 
        success: false, 
        error: `Invalid transition from ${currentState.current_state} to ${toState}` 
      };
    }

    // Get actor information
    const actor = db.prepare('SELECT role FROM users WHERE id = ?').get(actorId);
    const actorRole = actor ? actor.role : 'system';

    // Create new workflow state
    const result = db.prepare(`
      INSERT INTO workflow_states (request_id, current_state, previous_state, actor_id, actor_role, transition_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requestId, toState, currentState.current_state, actorId, actorRole, reason);

    // Update request workflow status
    db.prepare(`
      UPDATE requests 
      SET workflow_status = ? 
      WHERE id = ?
    `).run(toState, requestId);

    // Emit event
    eventBus.emit(EventTypes.WORKFLOW_TRANSITION, {
      requestId,
      fromState: currentState.current_state,
      toState,
      actorId,
      actorRole,
      reason
    });

    // Check if workflow is complete
    if (toState === WORKFLOW_STATES.APPROVED || toState === WORKFLOW_STATES.REJECTED) {
      eventBus.emit(EventTypes.WORKFLOW_COMPLETED, {
        requestId,
        finalState: toState,
        actorId
      });
    }

    return { success: true, workflowStateId: result.lastInsertRowid };
  } catch (error) {
    console.error('Workflow transition failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get current workflow state for a request
 */
const getCurrentWorkflowState = (requestId) => {
  try {
    const state = db.prepare(`
      SELECT ws.*, u.username as actor_username
      FROM workflow_states ws
      LEFT JOIN users u ON ws.actor_id = u.id
      WHERE ws.request_id = ? 
      ORDER BY ws.created_at DESC 
      LIMIT 1
    `).get(requestId);

    return state;
  } catch (error) {
    console.error('Failed to get current workflow state:', error);
    return null;
  }
};

/**
 * Get workflow history for a request
 */
const getWorkflowHistory = (requestId) => {
  try {
    const history = db.prepare(`
      SELECT ws.*, u.username as actor_username
      FROM workflow_states ws
      LEFT JOIN users u ON ws.actor_id = u.id
      WHERE ws.request_id = ? 
      ORDER BY ws.created_at ASC
    `).all(requestId);

    return history;
  } catch (error) {
    console.error('Failed to get workflow history:', error);
    return [];
  }
};

/**
 * Determine next workflow state based on AI classification
 */
const determineNextState = (classification) => {
  if (!classification) return WORKFLOW_STATES.REVIEWING;

  const { priority, complexity } = classification;

  // Critical requests go to admin review
  if (priority === 'Critical') {
    return WORKFLOW_STATES.ADMIN_REVIEW;
  }

  // Complex requests go to manager review
  if (complexity === 'Complex') {
    return WORKFLOW_STATES.MANAGER_REVIEW;
  }

  // Standard requests go to regular review
  return WORKFLOW_STATES.REVIEWING;
};

/**
 * Auto-assign reviewer based on department and workload
 */
const autoAssignReviewer = (requestId, department) => {
  try {
    // Find available reviewer in the same department
    const reviewer = db.prepare(`
      SELECT id FROM users 
      WHERE role = 'reviewer' AND department = ?
      ORDER BY RANDOM()
      LIMIT 1
    `).get(department);

    if (reviewer) {
      db.prepare(`
        UPDATE requests 
        SET reviewer_id = ? 
        WHERE id = ?
      `).run(reviewer.id, requestId);

      eventBus.emit(EventTypes.REQUEST_ASSIGNED, {
        requestId,
        reviewerId: reviewer.id,
        department
      });

      return reviewer.id;
    }

    return null;
  } catch (error) {
    console.error('Auto-assign reviewer failed:', error);
    return null;
  }
};

/**
 * Process request through classification workflow
 */
const processClassification = (requestId, classification) => {
  try {
    // Transition from Submitted to Classifying
    const transitionResult = transitionWorkflow(
      requestId, 
      WORKFLOW_STATES.CLASSIFYING, 
      null, 
      'AI classification started'
    );

    if (!transitionResult.success) {
      return transitionResult;
    }

    // Determine next state based on classification
    const nextState = determineNextState(classification);

    // Transition to next state
    const nextTransition = transitionWorkflow(
      requestId,
      nextState,
      null,
      `AI classification: ${JSON.stringify(classification)}`
    );

    // Auto-assign reviewer if going to review state
    if (nextState === WORKFLOW_STATES.REVIEWING) {
      const request = db.prepare('SELECT department FROM requests WHERE id = ?').get(requestId);
      if (request) {
        autoAssignReviewer(requestId, request.department);
      }
    }

    // Emit classification event
    eventBus.emit(EventTypes.REQUEST_CLASSIFIED, {
      requestId,
      classification,
      nextState
    });

    return { success: true, nextState };
  } catch (error) {
    console.error('Classification processing failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Approve request
 */
const approveRequest = (requestId, approverId, reason = null) => {
  try {
    const result = transitionWorkflow(
      requestId,
      WORKFLOW_STATES.APPROVED,
      approverId,
      reason || 'Request approved'
    );

    if (result.success) {
      // Update request status
      db.prepare(`
        UPDATE requests 
        SET status = 'Approved' 
        WHERE id = ?
      `).run(requestId);

      // Emit approval event
      eventBus.emit(EventTypes.REQUEST_APPROVED, {
        requestId,
        approverId,
        reason
      });
    }

    return result;
  } catch (error) {
    console.error('Request approval failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Reject request
 */
const rejectRequest = (requestId, rejecterId, reason = null) => {
  try {
    const result = transitionWorkflow(
      requestId,
      WORKFLOW_STATES.REJECTED,
      rejecterId,
      reason || 'Request rejected'
    );

    if (result.success) {
      // Update request status
      db.prepare(`
        UPDATE requests 
        SET status = 'Rejected' 
        WHERE id = ?
      `).run(requestId);

      // Emit rejection event
      eventBus.emit(EventTypes.REQUEST_REJECTED, {
        requestId,
        rejecterId,
        reason
      });
    }

    return result;
  } catch (error) {
    console.error('Request rejection failed:', error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  WORKFLOW_STATES,
  initializeWorkflow,
  transitionWorkflow,
  getCurrentWorkflowState,
  getWorkflowHistory,
  determineNextState,
  autoAssignReviewer,
  processClassification,
  approveRequest,
  rejectRequest
};