const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const authorize = require('../middleware/authorize');
const { validateRequest, validateStatusChange } = require('../middleware/validate');
const {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
  generateAISummary,
  generateAITestCases
} = require('../controllers/requestController');

// All request routes require authentication
router.use(auth);

// Get all requests (user: own only, admin: all)
router.get('/', getAllRequests);

// Get specific request
router.get('/:id', getRequestById);

// Create new request (authenticated users)
router.post('/', validateRequest, createRequest);

// Update request status (admin only)
router.put('/:id/status', authorize(['admin']), validateStatusChange, updateRequestStatus);

// Generate AI summary (admin only)
router.post('/:id/summarize', authorize(['admin']), generateAISummary);

// Generate AI test cases (admin only)
router.post('/:id/test-cases', authorize(['admin']), generateAITestCases);

module.exports = router;
