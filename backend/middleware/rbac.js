const db = require('../config/database');

// Role hierarchy for permission checks
const ROLE_HIERARCHY = {
  applicant: 1,
  reviewer: 2,
  manager: 3,
  admin: 4
};

// Permission definitions
const PERMISSIONS = {
  // Request permissions
  createRequest: ['applicant', 'reviewer', 'manager', 'admin'],
  viewOwnRequests: ['applicant', 'reviewer', 'manager', 'admin'],
  viewAllRequests: ['manager', 'admin'],
  viewDepartmentRequests: ['manager'],
  updateOwnRequest: ['applicant', 'reviewer', 'manager', 'admin'],
  deleteOwnRequest: ['applicant', 'admin'],
  approveRequest: ['manager', 'admin'],
  rejectRequest: ['manager', 'admin'],
  assignReviewer: ['manager', 'admin'],
  
  // Service permissions
  viewServices: ['applicant', 'reviewer', 'manager', 'admin'],
  subscribeToServices: ['applicant', 'reviewer', 'manager', 'admin'],
  manageServices: ['admin'],
  
  // User permissions
  manageUsers: ['admin'],
  viewAllUsers: ['admin'],
  
  // Audit permissions
  viewAuditLogs: ['admin']
};

/**
 * Check if user has required role
 */
const hasRole = (user, requiredRole) => {
  if (!user || !user.role) return false;
  
  // If admin, always grant access
  if (user.role === 'admin') return true;
  
  // Check exact role match
  if (user.role === requiredRole) return true;
  
  // Check role hierarchy
  const userLevel = ROLE_HIERARCHY[user.role] || 0;
  const requiredLevel = ROLE_HIERARCHY[requiredRole] || 0;
  
  return userLevel >= requiredLevel;
};

/**
 * Check if user has any of the required roles
 */
const hasAnyRole = (user, roles) => {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  return roles.includes(user.role);
};

/**
 * Check if user has specific permission
 */
const hasPermission = (user, permission) => {
  if (!user || !user.role) return false;
  if (user.role === 'admin') return true;
  
  const allowedRoles = PERMISSIONS[permission];
  if (!allowedRoles) return false;
  
  return allowedRoles.includes(user.role);
};

/**
 * Middleware to check if user has required role
 */
const requireRole = (requiredRole) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasRole(req.user, requiredRole)) {
      return res.status(403).json({ 
        error: `Role '${requiredRole}' required`,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has any of the required roles
 */
const requireAnyRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasAnyRole(req.user, roles)) {
      return res.status(403).json({ 
        error: `One of roles [${roles.join(', ')}] required`,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to check if user has specific permission
 */
const requirePermission = (permission) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    if (!hasPermission(req.user, permission)) {
      return res.status(403).json({ 
        error: `Permission '${permission}' required`,
        currentRole: req.user.role
      });
    }

    next();
  };
};

/**
 * Middleware to check if user can access request based on role
 */
const canAccessRequest = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  const requestId = req.params.id;
  const request = db.prepare('SELECT * FROM requests WHERE id = ?').get(requestId);

  if (!request) {
    return res.status(404).json({ error: 'Request not found' });
  }

  // Admin can access all requests
  if (req.user.role === 'admin') {
    req.request = request;
    return next();
  }

  // Manager can access department requests
  if (req.user.role === 'manager' && req.user.department === request.department) {
    req.request = request;
    return next();
  }

  // Users can access their own requests
  if (request.user_id === req.user.id) {
    req.request = request;
    return next();
  }

  // Reviewers can access assigned requests
  if (req.user.role === 'reviewer' && request.reviewer_id === req.user.id) {
    req.request = request;
    return next();
  }

  return res.status(403).json({ error: 'Access denied to this request' });
};

module.exports = {
  hasRole,
  hasAnyRole,
  hasPermission,
  requireRole,
  requireAnyRole,
  requirePermission,
  canAccessRequest,
  ROLE_HIERARCHY,
  PERMISSIONS
};