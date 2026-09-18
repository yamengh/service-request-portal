const express = require('express');
const router = express.Router();
const serviceController = require('../controllers/serviceController');
const { requirePermission } = require('../middleware/rbac');
const auth = require('../middleware/auth');

// All routes require authentication
router.use(auth);

// Get all services (all authenticated users)
router.get('/', serviceController.getAllServices);

// Get service by ID (all authenticated users)
router.get('/:id', serviceController.getServiceById);

// Create service (admin only)
router.post('/', requirePermission('manageServices'), serviceController.createService);

// Update service (admin only)
router.put('/:id', requirePermission('manageServices'), serviceController.updateService);

// Delete service (admin only)
router.delete('/:id', requirePermission('manageServices'), serviceController.deleteService);

// Get user's subscriptions (all authenticated users)
router.get('/subscriptions/my', serviceController.getUserSubscriptions);

// Subscribe to service (all authenticated users)
router.post('/subscriptions/:serviceId', serviceController.subscribeToService);

// Unsubscribe from service (all authenticated users)
router.delete('/subscriptions/:serviceId', serviceController.unsubscribeFromService);

module.exports = router;