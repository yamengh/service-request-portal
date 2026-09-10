const db = require('../config/database');
const { generateSummary, generateTestCases } = require('../services/aiService');

const getAllRequests = (req, res) => {
  let requests;

  if (req.user.role === 'admin') {
    requests = db.prepare(`
      SELECT r.*, u.username as user_name 
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      ORDER BY r.created_at DESC
    `).all();
  } else {
    requests = db.prepare(`
      SELECT * FROM requests 
      WHERE user_id = ? 
      ORDER BY created_at DESC
    `).all(req.user.id);
  }

  res.json(requests);
};

const getRequestById = (req, res) => {
  const { id } = req.params;
  let request;

  if (req.user.role === 'admin') {
    request = db.prepare(`
      SELECT r.*, u.username as user_name 
      FROM requests r 
      JOIN users u ON r.user_id = u.id 
      WHERE r.id = ?
    `).get(id);
  } else {
    request = db.prepare(`
      SELECT * FROM requests 
      WHERE id = ? AND user_id = ?
    `).get(id, req.user.id);
  }

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  res.json(request);
};

const createRequest = (req, res) => {
  const { title, description, category, priority } = req.body;

  const result = db.prepare(`
    INSERT INTO requests (title, description, category, priority, user_id)
    VALUES (?, ?, ?, ?, ?)
  `).run(title, description, category, priority, req.user.id);

  const newRequest = db.prepare('SELECT * FROM requests WHERE id = ?').get(result.lastInsertRowid);

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
    'New': ['In Progress'],
    'In Progress': ['Done'],
    'Done': []
  };

  const allowedStatuses = validTransitions[request.status];
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

    res.json(updatedRequest);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
};

module.exports = {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
  generateAISummary,
  generateAITestCases
};
