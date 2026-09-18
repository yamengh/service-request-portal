const db = require('../config/database');
const { createAuditLog } = require('../services/auditService');
const { eventBus, EventTypes } = require('../services/eventBus');
const externalApiService = require('../services/externalApi.js');
const { 
  getCurrentWorkflowState, 
  getWorkflowHistory,
  approveRequest,
  rejectRequest,
  autoAssignReviewer
} = require('../services/workflowEngine');

/**
 * Get current workflow state for a request
 */
const getWorkflowState = (req, res) => {
  try {
    const { requestId } = req.params;

    const state = getCurrentWorkflowState(requestId);

    if (!state) {
      return res.status(404).json({ error: 'Workflow state not found' });
    }

    res.json(state);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve workflow state' });
  }
};

/**
 * Get workflow history for a request
 */
const getWorkflowHistoryHandler = (req, res) => {
  try {
    const { requestId } = req.params;

    const history = getWorkflowHistory(requestId);

    res.json(history);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve workflow history' });
  }
};

/**
 * Approve a request
 */
const approveRequestHandler = (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    // Get request details
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if request is already finalized
    if (request.status === 'Approved' || request.status === 'Rejected') {
      return res.status(400).json({ error: 'Request is already finalized' });
    }

    // Directly update status and workflow for approval
    db.prepare(`
      UPDATE requests 
      SET status = 'Approved', workflow_status = 'Approved', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(requestId);

    // Create workflow state record
    const currentState = db.prepare(`
      SELECT current_state FROM workflow_states 
      WHERE request_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(requestId);

    db.prepare(`
      INSERT INTO workflow_states (request_id, current_state, previous_state, actor_id, actor_role, transition_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requestId, 'Approved', currentState ? currentState.current_state : null, req.user.id, req.user.role, reason || 'Request approved');

    // Create notification for request owner
    const message = `Your request "${request.title}" has been approved${reason ? `: ${reason}` : ''}`;
    db.prepare(`
      INSERT INTO notifications (request_id, user_id, message)
      VALUES (?, ?, ?)
    `).run(requestId, request.user_id, message);

    // Emit notification event
    eventBus.emit(EventTypes.NOTIFICATION_CREATED, {
      requestId,
      userId: request.user_id,
      message
    });

    // Create audit log
    createAuditLog(
      req.user.id,
      'APPROVE',
      'request',
      requestId,
      { status: request.status },
      { status: 'Approved' },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit approval event
    eventBus.emit(EventTypes.REQUEST_APPROVED, {
      requestId,
      approverId: req.user.id,
      reason
    });

    // Get updated request
    const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

    res.json({
      message: 'Request approved successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Request approval failed:', error);
    res.status(500).json({ error: 'Failed to approve request' });
  }
};

/**
 * Reject a request
 */
const rejectRequestHandler = (req, res) => {
  try {
    const { requestId } = req.params;
    const { reason } = req.body;

    if (!reason) {
      return res.status(400).json({ error: 'Rejection reason is required' });
    }

    // Get request details
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Check if request is already finalized
    if (request.status === 'Approved' || request.status === 'Rejected') {
      return res.status(400).json({ error: 'Request is already finalized' });
    }

    // Directly update status and workflow for rejection
    db.prepare(`
      UPDATE requests 
      SET status = 'Rejected', workflow_status = 'Rejected', updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(requestId);

    // Create workflow state record
    const currentState = db.prepare(`
      SELECT current_state FROM workflow_states 
      WHERE request_id = ? 
      ORDER BY created_at DESC 
      LIMIT 1
    `).get(requestId);

    db.prepare(`
      INSERT INTO workflow_states (request_id, current_state, previous_state, actor_id, actor_role, transition_reason)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run(requestId, 'Rejected', currentState ? currentState.current_state : null, req.user.id, req.user.role, reason);

    // Create notification for request owner
    const message = `Your request "${request.title}" has been rejected: ${reason}`;
    db.prepare(`
      INSERT INTO notifications (request_id, user_id, message)
      VALUES (?, ?, ?)
    `).run(requestId, request.user_id, message);

    // Emit notification event
    eventBus.emit(EventTypes.NOTIFICATION_CREATED, {
      requestId,
      userId: request.user_id,
      message
    });

    // Create audit log
    createAuditLog(
      req.user.id,
      'REJECT',
      'request',
      requestId,
      { status: request.status },
      { status: 'Rejected', reason },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit rejection event
    eventBus.emit(EventTypes.REQUEST_REJECTED, {
      requestId,
      rejecterId: req.user.id,
      reason
    });

    // Get updated request
    const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

    res.json({
      message: 'Request rejected successfully',
      request: updatedRequest
    });
  } catch (error) {
    console.error('Request rejection failed:', error);
    res.status(500).json({ error: 'Failed to reject request' });
  }
};

/**
 * Assign reviewer to a request
 */
const assignReviewer = (req, res) => {
  try {
    const { requestId } = req.params;
    const { reviewerId } = req.body;

    if (!reviewerId) {
      return res.status(400).json({ error: 'Reviewer ID is required' });
    }

    // Get request details
    const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);
    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    // Validate reviewer exists and has correct role
    const reviewer = db.prepare('SELECT * FROM users WHERE id = ? AND role = ?').get(reviewerId, 'reviewer');
    if (!reviewer) {
      return res.status(400).json({ error: 'Invalid reviewer ID or user is not a reviewer' });
    }

    // Update request with reviewer
    db.prepare(`
      UPDATE requests 
      SET reviewer_id = ? 
      WHERE id = ?
    `).run(reviewerId, requestId);

    // Get updated request
    const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

    // Create notification for reviewer
    const message = `You have been assigned to review request "${request.title}"`;
    db.prepare(`
      INSERT INTO notifications (request_id, user_id, message)
      VALUES (?, ?, ?)
    `).run(requestId, reviewerId, message);

    // Emit events
    eventBus.emit(EventTypes.REQUEST_ASSIGNED, {
      requestId,
      reviewerId,
      assignerId: req.user.id
    });

    eventBus.emit(EventTypes.NOTIFICATION_CREATED, {
      requestId,
      userId: reviewerId,
      message
    });

    // Create audit log
    createAuditLog(
      req.user.id,
      'ASSIGN',
      'request',
      requestId,
      { reviewer_id: request.reviewer_id },
      { reviewer_id: reviewerId },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    res.json({
      message: 'Reviewer assigned successfully',
      request: updatedRequest
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to assign reviewer' });
  }
};

/**
 * Get all requests pending review for current user
 */
const getPendingReviews = (req, res) => {
  try {
    let requests;

    if (req.user.role === 'admin') {
      // Admins see all pending requests
      requests = db.prepare(`
        SELECT r.*, u.username as requester_username, s.name as service_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN services s ON r.service_id = s.id
        WHERE r.status NOT IN ('Approved', 'Rejected')
        ORDER BY r.created_at DESC
      `).all();
    } else if (req.user.role === 'manager') {
      // Managers see pending requests in their department
      requests = db.prepare(`
        SELECT r.*, u.username as requester_username, s.name as service_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN services s ON r.service_id = s.id
        WHERE r.status NOT IN ('Approved', 'Rejected') 
        AND (r.department = ? OR r.user_id = ?)
        ORDER BY r.created_at DESC
      `).all(req.user.department, req.user.id);
    } else if (req.user.role === 'reviewer') {
      // Reviewers see requests assigned to them
      requests = db.prepare(`
        SELECT r.*, u.username as requester_username, s.name as service_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN services s ON r.service_id = s.id
        WHERE r.reviewer_id = ? AND r.status NOT IN ('Approved', 'Rejected')
        ORDER BY r.created_at DESC
      `).all(req.user.id);
    } else {
      // Applicants see their own pending requests
      requests = db.prepare(`
        SELECT r.*, u.username as requester_username, s.name as service_name
        FROM requests r
        JOIN users u ON r.user_id = u.id
        LEFT JOIN services s ON r.service_id = s.id
        WHERE r.user_id = ? AND r.status NOT IN ('Approved', 'Rejected')
        ORDER BY r.created_at DESC
      `).all(req.user.id);
    }

    res.json(requests);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve pending reviews' });
  }
};

module.exports = {
  getWorkflowState,
  getWorkflowHistory: getWorkflowHistoryHandler,
  approveRequestHandler,
  rejectRequestHandler,
  assignReviewer,
  getPendingReviews
};