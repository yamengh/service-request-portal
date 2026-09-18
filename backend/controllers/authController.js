const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../config/database');
const { createAuditLog } = require('../services/auditService');
const { eventBus, EventTypes } = require('../services/eventBus');

const login = (req, res) => {
  const { username, password } = req.body;

  if (!username || !password) {
    return res.status(400).json({ error: 'Username and password are required' });
  }

  const user = db.prepare('SELECT * FROM users WHERE username = ?').get(username);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  bcrypt.compare(password, user.password, (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Server error' });
    }

    if (!result) {
      return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = jwt.sign(
      { 
        id: user.id, 
        username: user.username, 
        role: user.role,
        department: user.department,
        region: user.region,
        email: user.email
      },
      process.env.JWT_SECRET,
      { expiresIn: '24h' }
    );

    // Create audit log
    createAuditLog(
      user.id,
      'LOGIN',
      'user',
      user.id,
      null,
      { loginTime: new Date().toISOString() },
      { ipAddress: req.ip || req.connection?.remoteAddress || 'unknown', userAgent: req.get('user-agent') }
    );

    // Emit event
    eventBus.emit(EventTypes.USER_LOGGED_IN, {
      userId: user.id,
      username: user.username,
      timestamp: new Date().toISOString()
    });

    res.json({
      token,
      user: {
        id: user.id,
        username: user.username,
        role: user.role,
        department: user.department,
        region: user.region,
        email: user.email
      }
    });
  });
};

const getCurrentUser = (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      username: req.user.username,
      role: req.user.role,
      department: req.user.department,
      region: req.user.region,
      email: req.user.email
    }
  });
};

module.exports = { login, getCurrentUser };
