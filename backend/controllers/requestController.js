const db = require('../config/database');
const { generateSummary, generateTestCases } = require('../services/aiService');
const { createAuditLog } = require('../services/auditService');
const { eventBus, EventTypes } = require('../services/eventBus');
const { initializeWorkflow, processClassification } = require('../services/workflowEngine');

const getAllRequests = (req, res) => {
  let requests;

  if (req.user.role === 'admin') {
    requests = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      ORDER BY r.created_at DESC
    `).all();
  } else if (req.user.role === 'manager') {
    requests = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.department = ? OR r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.department, req.user.id);
  } else if (req.user.role === 'reviewer') {
    requests = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.reviewer_id = ? OR r.user_id = ?
      ORDER BY r.created_at DESC
    `).all(req.user.id, req.user.id);
  } else {
    requests = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.user_id = ? 
      ORDER BY r.created_at DESC
    `).all(req.user.id);
  }

  res.json(requests);
};

const getRequestById = (req, res) => {
  const { id } = req.params;
  let request;

  if (req.user.role === 'admin') {
    request = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.id = ?
    `).get(id);
  } else {
    request = db.prepare(`
      SELECT r.*, u.username as user_name, s.name as service_name
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      LEFT JOIN services s ON r.service_id = s.id
      WHERE r.id = ? AND r.user_id = ?
    `).get(id, req.user.id);
  }

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json(request);
};

const createRequest = (req, res) => {
  const { title, description, category, priority, service_id } = req.body;

  // Get user department and region
  const user = db.prepare('SELECT department, region FROM users WHERE id = ?').get(req.user.id);

  const result = db.prepare(`
    INSERT INTO requests (title, description, category, priority, user_id, service_id, department, region, status, workflow_status)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'Submitted', 'Submitted')
  `).run(title, description, category, priority, req.user.id, service_id || null, user.department, user.region);

  const newRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(result.lastInsertRowid);

  // Initialize workflow
  initializeWorkflow(result.lastInsertRowid, req.user.id);

  // Create audit log
  createAuditLog(
    req.user.id,
    'CREATE',
    'request',
    result.lastInsertRowid,
    null,
    newRequest,
    { ipAddress: req.ip, userAgent: req.get('user-agent') }
  );

  // Emit event
  eventBus.emit(EventTypes.REQUEST_CREATED, {
    requestId: result.lastInsertRowid,
    userId: req.user.id,
    requestData: newRequest
  });

  // Create notification for relevant users
  const message = `New request "${title}" has been submitted`;
  
  // Notify reviewers in the same department
  const reviewers = db.prepare(`
    SELECT id FROM users WHERE role = 'reviewer' AND department = ?
  `).all(user.department);
  
  reviewers.forEach(reviewer => {
    db.prepare(`
      INSERT INTO notifications (request_id, user_id, message)
      VALUES (?, ?, ?)
    `).run(result.lastInsertRowid, reviewer.id, message);
  });

  res.status(201).json(newRequest);
};

const updateRequestStatus = (req, res) => {
  const { id } = req.params;
  const { status } = req.body;

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  const validTransitions = {
    'Submitted': ['In Progress'],
    'In Progress': ['Approved', 'Rejected'],
    'Approved': [],
    'Rejected': []
  };

  const allowedStatuses = validTransitions[request.status] || [];
  if (!allowedStatuses.includes(status)) {
    return res.status(400).json({ 
      error: `Cannot change status from ${request.status} to ${status}` 
    });
  }

  const oldStatus = request.status;

  db.prepare(`
    UPDATE requests 
    SET status = ?, updated_at = CURRENT_TIMESTAMP 
    WHERE id = ?
  `).run(status, id);

  // Create notification for the request owner
  const message = `Request "${request.title}" status changed from ${oldStatus} to ${status}`;
  db.prepare(`
    INSERT INTO notifications (request_id, user_id, message)
    VALUES (?, ?, ?)
  `).run(id, request.user_id, message);

  // Create audit log
  createAuditLog(
    req.user.id,
    'UPDATE',
    'request',
    id,
    { status: oldStatus },
    { status },
    { ipAddress: req.ip, userAgent: req.get('user-agent') }
  );

  // Emit event
  eventBus.emit(EventTypes.REQUEST_UPDATED, {
    requestId: id,
    userId: req.user.id,
    oldStatus,
    newStatus: status
  });

  const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

  res.json(updatedRequest);
};

const generateAISummary = async (req, res) => {
  const { id } = req.params;

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  try {
    const summary = await generateSummary(
      request.title,
      request.description,
      request.category,
      request.priority
    );

    db.prepare(`
      UPDATE requests 
      SET ai_summary = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(summary, id);

    const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

    // Create audit log
    createAuditLog(
      req.user.id,
      'UPDATE',
      'request',
      id,
      { ai_summary: request.ai_summary },
      { ai_summary: summary },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const generateAITestCases = async (req, res) => {
  const { id } = req.params;

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  try {
    const testCases = await generateTestCases(
      request.title,
      request.description,
      request.category
    );

    db.prepare(`
      UPDATE requests 
      SET ai_positive_tests = ?, ai_negative_tests = ?, updated_at = CURRENT_TIMESTAMP 
      WHERE id = ?
    `).run(JSON.stringify(testCases.positive), JSON.stringify(testCases.negative), id);

    const updatedRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

    // Create audit log
    createAuditLog(
      req.user.id,
      'UPDATE',
      'request',
      id,
      { ai_positive_tests: request.ai_positive_tests, ai_negative_tests: request.ai_negative_tests },
      { ai_positive_tests: JSON.stringify(testCases.positive), ai_negative_tests: JSON.stringify(testCases.negative) },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

const deleteRequest = (req, res) => {
  const { id } = req.params;

  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(id);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  // Check ownership or admin
  if (req.user.role !== 'admin' && request.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  // Check if request is already processed
  if (request.status === 'Approved' || request.status === 'Rejected') {
    return res.status(400).json({ error: 'Cannot delete processed requests' });
  }

  db.prepare('DELETE FROM requests WHERE id = ?').run(id);

  // Create audit log
  createAuditLog(
    req.user.id,
    'DELETE',
    'request',
    id,
    request,
    null,
    { ipAddress: req.ip, userAgent: req.get('user-agent') }
  );

  // Emit event
  eventBus.emit(EventTypes.REQUEST_DELETED, {
    requestId: id,
    userId: req.user.id
  });

  res.json({ message: 'Request deleted successfully' });
};

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
  generateAISummary,
  generateAITestCases,
  deleteRequest
};
