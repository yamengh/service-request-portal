const request = require('supertest');
const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');

// Set environment for testing
process.env.NODE_ENV = 'test';
process.env.JWT_SECRET = 'test-secret-key';

const testDbDir = path.join(__dirname, '../database-test');
const testDbPath = path.join(testDbDir, 'test-portal.db');
let db;
let app;

// Setup test database before all tests
beforeAll(() => {
  // Remove existing test database
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  // Import app (this will create the test database)
  app = require('../server');
  db = require('../config/database');

  // Seed test users with known credentials
  const bcrypt = require('bcrypt');
  const userPassword = bcrypt.hashSync('testuser123', 10);
  const adminPassword = bcrypt.hashSync('testadmin123', 10);

  db.prepare('DELETE FROM users').run();
  db.prepare(`
    INSERT INTO users (username, password, role)
    VALUES (?, ?, ?)
  `).run('testuser', userPassword, 'user');

  db.prepare(`
    INSERT INTO users (username, password, role)
    VALUES (?, ?, ?)
  `).run('testadmin', adminPassword, 'admin');
});

// Cleanup after all tests
afterAll(() => {
  if (db) {
    db.close();
  }
  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }
  if (fs.existsSync(testDbDir)) {
    fs.rmdirSync(testDbDir);
  }
});

// Clean tables before each test
beforeEach(() => {
  db.prepare('DELETE FROM notifications').run();
  db.prepare('DELETE FROM requests').run();
});

describe('Authentication Tests', () => {
  test('Valid login', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testuser123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', 'testuser');
    expect(response.body.user).toHaveProperty('role', 'user');
  });

  test('Invalid login - wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'wrongpassword'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('Invalid login - non-existent user', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'nonexistent',
        password: 'password'
      });

    expect(response.status).toBe(401);
    expect(response.body).toHaveProperty('error', 'Invalid credentials');
  });

  test('Invalid login - missing credentials', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Username and password are required');
  });
});

describe('Request Creation Validation', () => {
  let userToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testuser123'
      });
    userToken = loginResponse.body.token;
  });

  test('Valid request creation', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('title', 'Test Request');
    expect(response.body).toHaveProperty('status', 'New');
  });

  test('Invalid request - missing title', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Title is required');
  });

  test('Invalid request - title too short', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Title must be at least 5 characters');
  });

  test('Invalid request - missing description', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        category: 'Hardware',
        priority: 'Medium'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Description is required');
  });

  test('Invalid request - description too short', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'Short',
        category: 'Hardware',
        priority: 'Medium'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Description must be at least 10 characters');
  });

  test('Invalid request - invalid category', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'InvalidCategory',
        priority: 'Medium'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid category');
  });

  test('Invalid request - invalid priority', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'InvalidPriority'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid priority');
  });
});

describe('Status Change Permissions', () => {
  let userToken;
  let adminToken;

  beforeAll(async () => {
    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testuser123'
      });
    userToken = userLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('User cannot change request status', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(403);
    expect(response.body).toHaveProperty('error', 'Insufficient permissions');
  });

  test('Admin can change request status', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'In Progress');
  });
});

describe('Status Transition Validation', () => {
  let adminToken;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('Valid transition: New to In Progress', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'In Progress');
  });

  test('Valid transition: In Progress to Done', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    // First change to In Progress
    await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'In Progress' });

    // Then change to Done
    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Done'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('status', 'Done');
  });

  test('Invalid transition: New to Done', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'Done'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Cannot change status from New to Done');
  });

  test('Invalid transition: Done to In Progress', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    // First change to In Progress
    await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'In Progress' });

    // Then change to Done
    await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'Done' });

    // Try to change back to In Progress
    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error');
    expect(response.body.error).toContain('Cannot change status from Done to In Progress');
  });

  test('Invalid status value', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'InvalidStatus'
      });

    expect(response.status).toBe(400);
    expect(response.body).toHaveProperty('error', 'Invalid status');
  });
});

describe('Notification Creation', () => {
  let adminToken;
  let userToken;
  let userId;

  beforeAll(async () => {
    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;

    const userLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testuser',
        password: 'testuser123'
      });
    userToken = userLogin.body.token;
    userId = userLogin.body.user.id;
  });

  test('Notification is created after status change', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    // Change status as admin
    const statusResponse = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        status: 'In Progress'
      });

    expect(statusResponse.status).toBe(200);

    // Check if notification was created
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE request_id = ? AND user_id = ?
    `).all(requestId, userId);

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]).toHaveProperty('message');
    expect(notifications[0].message).toContain('status changed');
    expect(notifications[0].message).toContain('New');
    expect(notifications[0].message).toContain('In Progress');
  });

  test('Notification has correct user_id (request owner)', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    // Change status
    await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'In Progress' });

    const notification = db.prepare(`
      SELECT * FROM notifications 
      WHERE request_id = ?
    `).get(requestId);

    expect(notification.user_id).toBe(userId);
  });

  test('Notification status is unread by default', async () => {
    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${userToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium'
      });
    const requestId = createResponse.body.id;

    // Change status
    await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${adminToken}`)
      .send({ status: 'In Progress' });

    const notification = db.prepare(`
      SELECT * FROM notifications 
      WHERE request_id = ?
    `).get(requestId);

    expect(notification.status).toBe('unread');
  });
});
