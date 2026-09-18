const express = require('express');
const router = express.Router();
const auditController = require('../controllers/auditController');
const { requirePermission } = require('../middleware/rbac');
const { authenticate } = require('../middleware/auth');

// All routes require authentication
router.use(authenticate);

// Get all audit logs (admin only)
router.get('/all', requirePermission('viewAuditLogs'), auditController.getAllAuditLogsHandler);

// Get audit logs for specific entity (admin only)
router.get('/entity/:entityType/:entityId', requirePermission('viewAuditLogs'), auditController.getEntityAuditLogs);

// Get current user's audit logs
router.get('/my', auditController.getUserAuditLogs);

// Get audit logs by action type (admin only)
router.get('/action/:action', requirePermission('viewAuditLogs'), auditController.getAuditLogsByActionHandler);

module.exports = router;