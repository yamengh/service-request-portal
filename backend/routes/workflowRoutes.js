const express = require('express');
const router = express.Router();
const workflowController = require('../controllers/workflowController');
const { requirePermission, requireAnyRole } = require('../middleware/rbac');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get workflow state for a request
router.get('/state/:requestId', workflowController.getWorkflowState);

// Get workflow history for a request
router.get('/history/:requestId', workflowController.getWorkflowHistory);

// Approve request (manager and admin only)
router.post('/approve/:requestId', requireAnyRole(['manager', 'admin']), workflowController.approveRequestHandler);

// Reject request (manager and admin only)
router.post('/reject/:requestId', requireAnyRole(['manager', 'admin']), workflowController.rejectRequestHandler);

// Assign reviewer (manager and admin only)
router.post('/assign-reviewer/:requestId', requireAnyRole(['manager', 'admin']), workflowController.assignReviewer);

// Get pending reviews (all authenticated users, filtered by role)
router.get('/pending', workflowController.getPendingReviews);

module.exports = router;