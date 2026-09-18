const db = require('../config/database');

/**
 * ABAC (Attribute-Based Access Control) Rules
 */

/**
 * Department-based access check
 * Users can only access resources from their department unless they are admin
 */
const checkDepartmentAccess = (user, resource) => {
  if (user.role === 'admin') return true;
  if (!user.department || !resource.department) return false;
  return user.department === resource.department;
};

/**
 * Request owner access check
 * Users can only modify their own requests unless they have elevated permissions
 */
const checkOwnerAccess = (user, resource) => {
  if (user.role === 'admin') return true;
  if (user.role === 'manager' && user.department === resource.department) return true;
  return resource.user_id === user.id;
};

/**
 * Priority-based access check
 * High/Critical priority requests require elevated permissions
 */
const checkPriorityAccess = (user, resource) => {
  if (user.role === 'admin') return true;
  
  const highPriorityRoles = ['manager', 'admin'];
  const criticalPriorityRoles = ['admin'];
  
  if (resource.priority === 'Critical') {
    return criticalPriorityRoles.includes(user.role);
  }
  
  if (resource.priority === 'High') {
    return highPriorityRoles.includes(user.role);
  }
  
  return true;
};

/**
 * Region-based access check
 * Regional managers can only access requests in their region
 */
const checkRegionAccess = (user, resource) => {
  if (user.role === 'admin') return true;
  if (!user.region || !resource.region) return true; // No region restriction if not set
  return user.region === resource.region;
};

/**
 * Service-based access check
 * Users can only create requests for services they are subscribed to
 */
const checkServiceSubscription = (userId, serviceId) => {
  const subscription = db.prepare(`
    SELECT * FROM service_subscriptions 
    WHERE user_id = ? AND service_id = ?
  `).get(userId, serviceId);
  
  return !!subscription;
};

/**
 * Combined ABAC check for request access
 */
const canAccessRequestByAttributes = (user, request, action) => {
  // Admin override
  if (user.role === 'admin') return { allowed: true, reason: 'Admin override' };

  // Owner check for modification actions
  if (['update', 'delete'].includes(action)) {
    if (!checkOwnerAccess(user, request)) {
      return { allowed: false, reason: 'Not request owner' };
    }
  }

  // Department check
  if (!checkDepartmentAccess(user, request)) {
    return { allowed: false, reason: 'Department mismatch' };
  }

  // Region check
  if (!checkRegionAccess(user, request)) {
    return { allowed: false, reason: 'Region restriction' };
  }

  // Priority check for approval actions
  if (['approve', 'reject'].includes(action)) {
    if (!checkPriorityAccess(user, request)) {
      return { allowed: false, reason: 'Insufficient permissions for this priority level' };
    }
  }

  return { allowed: true, reason: 'ABAC checks passed' };
};

/**
 * Combined ABAC check for service access
 */
const canAccessServiceByAttributes = (user, service, action) => {
  // Admin override
  if (user.role === 'admin') return { allowed: true, reason: 'Admin override' };

  // Department check for service management
  if (action === 'manage') {
    if (!checkDepartmentAccess(user, service)) {
      return { allowed: false, reason: 'Department mismatch for service management' };
    }
  }

  // Active service check
  if (!service.active) {
    return { allowed: false, reason: 'Service is not active' };
  }

  return { allowed: true, reason: 'ABAC checks passed' };
};

/**
 * Middleware to enforce ABAC rules for request access
 */
const requireRequestAccess = (action) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    const request = req.request || (req.params.id ? 
      db.prepare('SELECT * FROM requests WHERE id = ?').get(req.params.id) : null);

    if (!request) {
      return res.status(404).json({ error: 'Request not found' });
    }

    const accessCheck = canAccessRequestByAttributes(req.user, request, action);

    if (!accessCheck.allowed) {
      return res.status(403).json({ 
        error: 'Access denied',
        reason: accessCheck.reason
      });
    }

    req.request = request;
    next();
  };
};

/**
 * Middleware to enforce ABAC rules for service subscription
 */
const requireServiceSubscription = () => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({ error: 'Authentication required' });
    }

    // Admin can bypass subscription check
    if (req.user.role === 'admin') {
      return next();
    }

    const serviceId = req.body.service_id || req.params.serviceId;
    
    if (!serviceId) {
      return res.status(400).json({ error: 'Service ID required' });
    }

    const isSubscribed = checkServiceSubscription(req.user.id, serviceId);

    if (!isSubscribed) {
      return res.status(403).json({ 
        error: 'Not subscribed to this service',
        message: 'Please subscribe to this service before creating a request'
      });
    }

    next();
  };
};

/**
 * Middleware to enforce department-based filtering
 */
const filterByDepartment = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admin can see all departments
  if (req.user.role === 'admin') {
    req.departmentFilter = null;
    return next();
  }

  // Other users are filtered by their department
  req.departmentFilter = req.user.department;
  next();
};

/**
 * Middleware to enforce region-based filtering
 */
const filterByRegion = (req, res, next) => {
  if (!req.user) {
    return res.status(401).json({ error: 'Authentication required' });
  }

  // Admin can see all regions
  if (req.user.role === 'admin') {
    req.regionFilter = null;
    return next();
  }

  // Other users are filtered by their region
  req.regionFilter = req.user.region;
  next();
};

module.exports = {
  checkDepartmentAccess,
  checkOwnerAccess,
  checkPriorityAccess,
  checkRegionAccess,
  checkServiceSubscription,
  canAccessRequestByAttributes,
  canAccessServiceByAttributes,
  requireRequestAccess,
  requireServiceSubscription,
  filterByDepartment,
  filterByRegion
};