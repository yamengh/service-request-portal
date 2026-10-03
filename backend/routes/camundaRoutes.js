const express = require('express');
const router = express.Router();
const camundaController = require('../controllers/camundaController');
const auth = require('../middleware/auth');
const { requireAnyRole } = require('../middleware/rbac');

// All routes require authentication
router.use(auth);

// Get all tasks for current user
router.get('/tasks/my', camundaController.getMyTasks);

// Get task for a specific request
router.get('/tasks/request/:requestId', camundaController.getRequestTask);

// Complete approval task
router.post('/tasks/:taskId/complete', requireAnyRole(['reviewer', 'manager', 'admin']), camundaController.completeApproval);

module.exports = router;
