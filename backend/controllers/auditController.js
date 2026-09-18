const { 
  getAuditLogsForEntity, 
  getAuditLogsForUser, 
  getAllAuditLogs, 
  getAuditLogsByAction 
} = require('../services/auditService');

/**
 * Get all audit logs (admin only)
 */
const getAllAuditLogsHandler = (req, res) => {
  try {
    const limit = parseInt(req.query.limit) || 100;
    const offset = parseInt(req.query.offset) || 0;

    const logs = getAllAuditLogs(limit, offset);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve audit logs' });
  }
};

/**
 * Get audit logs for a specific entity
 */
const getEntityAuditLogs = (req, res) => {
  try {
    const { entityType, entityId } = req.params;

    const logs = getAuditLogsForEntity(entityType, entityId);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve entity audit logs' });
  }
};

/**
 * Get audit logs for current user
 */
const getUserAuditLogs = (req, res) => {
  try {
    const logs = getAuditLogsForUser(req.user.id);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve user audit logs' });
  }
};

/**
 * Get audit logs by action type
 */
const getAuditLogsByActionHandler = (req, res) => {
  try {
    const { action } = req.params;
    const limit = parseInt(req.query.limit) || 50;

    const logs = getAuditLogsByAction(action, limit);

    res.json(logs);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve audit logs by action' });
  }
};

module.exports = {
  getAllAuditLogsHandler,
  getEntityAuditLogs,
  getUserAuditLogs,
  getAuditLogsByActionHandler
};