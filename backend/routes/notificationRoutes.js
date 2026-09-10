const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const {
  getNotifications,
  markAsRead,
  getUnreadCount
} = require('../controllers/notificationController');

// All notification routes require authentication
router.use(auth);

// Get all notifications for current user
router.get('/', getNotifications);

// Get unread count for current user
router.get('/unread-count', getUnreadCount);

// Mark notification as read
router.put('/:id/read', markAsRead);

module.exports = router;
