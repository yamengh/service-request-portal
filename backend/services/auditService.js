const db = require('../config/database');

/**
 * Audit Logging Service
 * Records all important actions for compliance and security
 */

/**
 * Create an audit log entry
 */
const createAuditLog = (userId, action, entityType, entityId, oldValues = null, newValues = null, metadata = {}) => {
  try {
    const logData = {
      user_id: userId,
      action: action,
      entity_type: entityType,
      entity_id: entityId,
      old_values: oldValues ? JSON.stringify(oldValues) : null,
      new_values: newValues ? JSON.stringify(newValues) : null,
      ip_address: metadata.ipAddress || null,
      user_agent: metadata.userAgent || null
    };

    const result = db.prepare(`
      INSERT INTO audit_logs (user_id, action, entity_type, entity_id, old_values, new_values, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(
      logData.user_id,
      logData.action,
      logData.entity_type,
      logData.entity_id,
      logData.old_values,
      logData.new_values,
      logData.ip_address,
      logData.user_agent
    );

    return { success: true, logId: result.lastInsertRowid };
  } catch (error) {
    console.error('Audit log creation failed:', error);
    return { success: false, error: error.message };
  }
};

/**
 * Get audit logs for a specific entity
 */
const getAuditLogsForEntity = (entityType, entityId) => {
  try {
    const logs = db.prepare(`
      SELECT al.*, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.entity_type = ? AND al.entity_id = ?
      ORDER BY al.timestamp DESC
    `).all(entityType, entityId);

    return logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve audit logs:', error);
    return [];
  }
};

/**
 * Get audit logs for a specific user
 */
const getAuditLogsForUser = (userId) => {
  try {
    const logs = db.prepare(`
      SELECT * FROM audit_logs
      WHERE user_id = ?
      ORDER BY timestamp DESC
      LIMIT 100
    `).all(userId);

    return logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve user audit logs:', error);
    return [];
  }
};

/**
 * Get all audit logs (admin only)
 */
const getAllAuditLogs = (limit = 100, offset = 0) => {
  try {
    const logs = db.prepare(`
      SELECT al.*, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT ? OFFSET ?
    `).all(limit, offset);

    return logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve all audit logs:', error);
    return [];
  }
};

/**
 * Get audit logs by action type
 */
const getAuditLogsByAction = (action, limit = 50) => {
  try {
    const logs = db.prepare(`
      SELECT al.*, u.username, u.role
      FROM audit_logs al
      LEFT JOIN users u ON al.user_id = u.id
      WHERE al.action = ?
      ORDER BY al.timestamp DESC
      LIMIT ?
    `).all(action, limit);

    return logs.map(log => ({
      ...log,
      old_values: log.old_values ? JSON.parse(log.old_values) : null,
      new_values: log.new_values ? JSON.parse(log.new_values) : null
    }));
  } catch (error) {
    console.error('Failed to retrieve audit logs by action:', error);
    return [];
  }
};

/**
 * Middleware to automatically log requests
 */
const auditMiddleware = (action, entityType) => {
  return (req, res, next) => {
    // Store original json method to intercept response
    const originalJson = res.json.bind(res);
    
    res.json = function(data) {
      // Only log successful operations
      if (res.statusCode >= 200 && res.statusCode < 300) {
        const entityId = req.params.id || (data.id || data.requestId);
        const userId = req.user ? req.user.id : null;
        
        const metadata = {
          ipAddress: req.ip || req.connection.remoteAddress,
          userAgent: req.get('user-agent')
        };

        createAuditLog(
          userId,
          action,
          entityType,
          entityId,
          null,
          data,
          metadata
        );
      }
      
      return originalJson(data);
    };
    
    next();
  };
};

module.exports = {
  createAuditLog,
  getAuditLogsForEntity,
  getAuditLogsForUser,
  getAllAuditLogs,
  getAuditLogsByAction,
  auditMiddleware
};