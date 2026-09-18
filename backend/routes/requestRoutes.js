const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const { requirePermission, requireAnyRole } = require('../middleware/rbac');
const { validateRequest, validateStatusChange } = require('../middleware/validate');
const {
  getAllRequests,
  getRequestById,
  createRequest,
  updateRequestStatus,
  generateAISummary,
  generateAITestCases,
  deleteRequest
} = require('../controllers/requestController');

// All request routes require authentication
router.use(auth);

// Get all requests (filtered by role)
router.get('/', getAllRequests);

// Get specific request
router.get('/:id', getRequestById);

// Create new request (authenticated users)
router.post('/', validateRequest, createRequest);

// Update request status (manager and admin)
router.put('/:id/status', requireAnyRole(['manager', 'admin']), validateStatusChange, updateRequestStatus);

// Delete request (admin and owner only)
router.delete('/:id', deleteRequest);

// Generate AI summary (admin only)
router.post('/:id/summarize', requirePermission('manageRequests'), generateAISummary);

// Generate AI test cases (admin only)
router.post('/:id/test-cases', requirePermission('manageRequests'), generateAITestCases);

module.exports = router;
