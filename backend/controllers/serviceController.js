const db = require('../config/database');
const { createAuditLog } = require('../services/auditService');
const { eventBus, EventTypes } = require('../services/eventBus');

/**
 * Get all services
 */
const getAllServices = (req, res) => {
  try {
    const services = db.prepare(`
      SELECT * FROM services 
      WHERE active = 1 
      ORDER BY category, name
    `).all();

    res.json(services);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve services' });
  }
};

/**
 * Get service by ID
 */
const getServiceById = (req, res) => {
  try {
    const { id } = req.params;
    const service = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

    if (!service) {
      return res.status(404).json({ error: 'Service not found' });
    }

    res.json(service);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve service' });
  }
};

/**
 * Create new service (admin only)
 */
const createService = (req, res) => {
  try {
    const { name, description, category, department, requires_approval } = req.body;

    if (!name || !description || !category) {
      return res.status(400).json({ error: 'Name, description, and category are required' });
    }

    const result = db.prepare(`
      INSERT INTO services (name, description, category, department, requires_approval, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `).run(name, description, category, department || null, requires_approval !== false ? 1 : 0);

    const newService = db.prepare('SELECT * FROM services WHERE id = ?').get(result.lastInsertRowid);

    // Create audit log
    createAuditLog(
      req.user.id,
      'CREATE',
      'service',
      result.lastInsertRowid,
      null,
      newService,
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit event
    eventBus.emit(EventTypes.SERVICE_CREATED, {
      serviceId: result.lastInsertRowid,
      userId: req.user.id
    });

    res.status(201).json(newService);
  } catch (error) {
    res.status(500).json({ error: 'Failed to create service' });
  }
};

/**
 * Update service (admin only)
 */
const updateService = (req, res) => {
  try {
    const { id } = req.params;
    const { name, description, category, department, requires_approval, active } = req.body;

    const existingService = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    const updates = {};
    if (name !== undefined) updates.name = name;
    if (description !== undefined) updates.description = description;
    if (category !== undefined) updates.category = category;
    if (department !== undefined) updates.department = department;
    if (requires_approval !== undefined) updates.requires_approval = requires_approval ? 1 : 0;
    if (active !== undefined) updates.active = active ? 1 : 0;

    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ error: 'No updates provided' });
    }

    const setClause = Object.keys(updates).map(key => `${key} = ?`).join(', ');
    const values = Object.values(updates);

    db.prepare(`
      UPDATE services 
      SET ${setClause}
      WHERE id = ?
    `).run(...values, id);

    const updatedService = db.prepare('SELECT * FROM services WHERE id = ?').get(id);

    // Create audit log
    createAuditLog(
      req.user.id,
      'UPDATE',
      'service',
      id,
      existingService,
      updatedService,
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    res.json(updatedService);
  } catch (error) {
    res.status(500).json({ error: 'Failed to update service' });
  }
};

/**
 * Delete service (admin only)
 */
const deleteService = (req, res) => {
  try {
    const { id } = req.params;

    const existingService = db.prepare('SELECT * FROM services WHERE id = ?').get(id);
    if (!existingService) {
      return res.status(404).json({ error: 'Service not found' });
    }

    // Check if service has active subscriptions
    const subscriptionCount = db.prepare(`
      SELECT COUNT(*) as count FROM service_subscriptions WHERE service_id = ?
    `).get(id).count;

    if (subscriptionCount > 0) {
      return res.status(400).json({ 
        error: 'Cannot delete service with active subscriptions',
        subscriptionCount
      });
    }

    db.prepare('DELETE FROM services WHERE id = ?').run(id);

    // Create audit log
    createAuditLog(
      req.user.id,
      'DELETE',
      'service',
      id,
      existingService,
      null,
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    res.json({ message: 'Service deleted successfully' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to delete service' });
  }
};

/**
 * Get user's service subscriptions
 */
const getUserSubscriptions = (req, res) => {
  try {
    const subscriptions = db.prepare(`
      SELECT s.*, ss.subscribed_at
      FROM services s
      INNER JOIN service_subscriptions ss ON s.id = ss.service_id
      WHERE ss.user_id = ? AND s.active = 1
      ORDER BY s.category, s.name
    `).all(req.user.id);

    res.json(subscriptions);
  } catch (error) {
    res.status(500).json({ error: 'Failed to retrieve subscriptions' });
  }
};

/**
 * Subscribe to a service
 */
const subscribeToService = (req, res) => {
  try {
    const { serviceId } = req.params;

    // Check if service exists and is active
    const service = db.prepare('SELECT * FROM services WHERE id = ? AND active = 1').get(serviceId);
    if (!service) {
      return res.status(404).json({ error: 'Service not found or inactive' });
    }

    // Check if already subscribed
    const existing = db.prepare(`
      SELECT * FROM service_subscriptions 
      WHERE user_id = ? AND service_id = ?
    `).get(req.user.id, serviceId);

    if (existing) {
      return res.status(400).json({ error: 'Already subscribed to this service' });
    }

    // Create subscription
    const result = db.prepare(`
      INSERT INTO service_subscriptions (user_id, service_id)
      VALUES (?, ?)
    `).run(req.user.id, serviceId);

    // Create audit log
    createAuditLog(
      req.user.id,
      'CREATE',
      'subscription',
      result.lastInsertRowid,
      null,
      { userId: req.user.id, serviceId },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit event
    eventBus.emit(EventTypes.SERVICE_SUBSCRIBED, {
      userId: req.user.id,
      serviceId,
      subscriptionId: result.lastInsertRowid
    });

    res.status(201).json({ 
      message: 'Successfully subscribed to service',
      subscriptionId: result.lastInsertRowid
    });
  } catch (error) {
    res.status(500).json({ error: 'Failed to subscribe to service' });
  }
};

/**
 * Unsubscribe from a service
 */
const unsubscribeFromService = (req, res) => {
  try {
    const { serviceId } = req.params;

    // Check if subscription exists
    const subscription = db.prepare(`
      SELECT * FROM service_subscriptions 
      WHERE user_id = ? AND service_id = ?
    `).get(req.user.id, serviceId);

    if (!subscription) {
      return res.status(404).json({ error: 'Subscription not found' });
    }

    db.prepare(`
      DELETE FROM service_subscriptions 
      WHERE user_id = ? AND service_id = ?
    `).run(req.user.id, serviceId);

    // Create audit log
    createAuditLog(
      req.user.id,
      'DELETE',
      'subscription',
      subscription.id,
      { userId: req.user.id, serviceId },
      null,
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit event
    eventBus.emit(EventTypes.SERVICE_UNSUBSCRIBED, {
      userId: req.user.id,
      serviceId,
      subscriptionId: subscription.id
    });

    res.json({ message: 'Successfully unsubscribed from service' });
  } catch (error) {
    res.status(500).json({ error: 'Failed to unsubscribe from service' });
  }
};

module.exports = {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService,
  getUserSubscriptions,
  subscribeToService,
  unsubscribeFromService
};