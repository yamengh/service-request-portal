const db = require('../config/database');

const getNotifications = (req, res) => {
  const notifications = db.prepare(`
    SELECT n.*, r.title as request_title 
    FROM notifications n 
    JOIN requests r ON n.request_id = r.id 
    WHERE n.user_id = ? 
    ORDER BY n.created_at DESC
  `).all(req.user.id);

  res.json(notifications);
};

const markAsRead = (req, res) => {
  const { id } = req.params;

  const notification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

  if (!notification) {
    return res.status(404).json({ error: 'Notification not found' });
  }

  if (notification.user_id !== req.user.id) {
    return res.status(403).json({ error: 'Access denied' });
  }

  db.prepare(`
    UPDATE notifications 
    SET status = 'read' 
    WHERE id = ?
  `).run(id);

  const updatedNotification = db.prepare('SELECT * FROM notifications WHERE id = ?').get(id);

  res.json(updatedNotification);
};

const getUnreadCount = (req, res) => {
  const count = db.prepare(`
    SELECT COUNT(*) as count 
    FROM notifications 
    WHERE user_id = ? AND status = 'unread'
  `).get(req.user.id);

  res.json({ count: count.count });
};

module.exports = {
  getNotifications,
  markAsRead,
  getUnreadCount
};
