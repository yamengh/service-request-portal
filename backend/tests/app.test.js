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
  const applicantPassword = bcrypt.hashSync('testapplicant123', 10);
  const reviewerPassword = bcrypt.hashSync('testreviewer123', 10);
  const managerPassword = bcrypt.hashSync('testmanager123', 10);
  const adminPassword = bcrypt.hashSync('testadmin123', 10);

  db.prepare('DELETE FROM users').run();
  db.prepare(`
    INSERT INTO users (username, password, role, department, region, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('testapplicant', applicantPassword, 'applicant', 'IT', 'North', 'applicant@test.com');

  db.prepare(`
    INSERT INTO users (username, password, role, department, region, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('testreviewer', reviewerPassword, 'reviewer', 'IT', 'North', 'reviewer@test.com');

  db.prepare(`
    INSERT INTO users (username, password, role, department, region, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('testmanager', managerPassword, 'manager', 'IT', 'North', 'manager@test.com');

  db.prepare(`
    INSERT INTO users (username, password, role, department, region, email)
    VALUES (?, ?, ?, ?, ?, ?)
  `).run('testadmin', adminPassword, 'admin', 'IT', 'North', 'admin@test.com');
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
  db.prepare('DELETE FROM workflow_states').run();
  db.prepare('DELETE FROM requests').run();
  db.prepare('DELETE FROM service_subscriptions').run();
  db.prepare('DELETE FROM services').run();
});

describe('Authentication Tests', () => {
  test('Valid login - applicant', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', 'testapplicant');
    expect(response.body.user).toHaveProperty('role', 'applicant');
    expect(response.body.user).toHaveProperty('department', 'IT');
    expect(response.body.user).toHaveProperty('region', 'North');
  });

  test('Valid login - admin', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });

    expect(response.status).toBe(200);
    expect(response.body).toHaveProperty('token');
    expect(response.body.user).toHaveProperty('username', 'testadmin');
    expect(response.body.user).toHaveProperty('role', 'admin');
  });

  test('Invalid login - wrong password', async () => {
    const response = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
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
  let applicantToken;

  beforeAll(async () => {
    const loginResponse = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });
    applicantToken = loginResponse.body.token;
  });

  test('Valid request creation', async () => {
    // First create a test service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        name: 'Test Service',
        description: 'A test service for testing',
        category: 'Hardware',
        department: 'IT'
      });

    const serviceId = serviceResponse.body.id;

    // Subscribe to the service
    await request(app)
      .post(`/api/services/subscriptions/${serviceId}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceId ? serviceId.toString() : null
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('title', 'Test Request');
    expect(response.body).toHaveProperty('status', 'Submitted');
    expect(response.body).toHaveProperty('workflow_status', 'Submitted');
  });

  test('Invalid request - missing title', async () => {
    const response = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
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
      .set('Authorization', `Bearer ${applicantToken}`)
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
      .set('Authorization', `Bearer ${applicantToken}`)
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
      .set('Authorization', `Bearer ${applicantToken}`)
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
      .set('Authorization', `Bearer ${applicantToken}`)
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
      .set('Authorization', `Bearer ${applicantToken}`)
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
  let applicantToken;
  let managerToken;
  let adminToken;

  beforeAll(async () => {
    const applicantLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });
    applicantToken = applicantLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testmanager',
        password: 'testmanager123'
      });
    managerToken = managerLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('Applicant cannot change request status', async () => {
    // Create a test service first
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service',
        description: 'A test service',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(403);
  });

  test('Manager can change request status', async () => {
    // Create a test service first
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service',
        description: 'A test service',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    const response = await request(app)
      .put(`/api/requests/${requestId}/status`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        status: 'In Progress'
      });

    expect(response.status).toBe(200);
  });
});

describe('Workflow Tests', () => {
  let applicantToken;
  let managerToken;
  let adminToken;

  beforeAll(async () => {
    const applicantLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });
    applicantToken = applicantLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testmanager',
        password: 'testmanager123'
      });
    managerToken = managerLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('Request approval workflow', async () => {
    // Create a test service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service',
        description: 'A test service',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    // Manager approves request
    const approveResponse = await request(app)
      .post(`/api/workflow/approve/${requestId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        reason: 'Request approved for testing'
      });

    expect(approveResponse.status).toBe(200);
    expect(approveResponse.body.request.status).toBe('Approved');
  });

  test('Request rejection workflow', async () => {
    // Create a test service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service 2',
        description: 'Another test service',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request 2',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    // Manager rejects request
    const rejectResponse = await request(app)
      .post(`/api/workflow/reject/${requestId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        reason: 'Budget constraints'
      });

    expect(rejectResponse.status).toBe(200);
    expect(rejectResponse.body.request.status).toBe('Rejected');
  });

  test('Applicant cannot approve requests', async () => {
    // Create a test service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service 3',
        description: 'Another test service',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request 3',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    // Applicant tries to approve
    const approveResponse = await request(app)
      .post(`/api/workflow/approve/${requestId}`)
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        reason: 'Trying to approve own request'
      });

    expect(approveResponse.status).toBe(403);
  });
});

describe('Service Subscription Tests', () => {
  let applicantToken;
  let adminToken;

  beforeAll(async () => {
    const applicantLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });
    applicantToken = applicantLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('Create service (admin only)', async () => {
    const response = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Test Service',
        description: 'A test service for testing',
        category: 'Hardware',
        department: 'IT'
      });

    expect(response.status).toBe(201);
    expect(response.body).toHaveProperty('name', 'Test Service');
  });

  test('Applicant cannot create service', async () => {
    const response = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        name: 'Unauthorized Service',
        description: 'This should fail',
        category: 'Hardware',
        department: 'IT'
      });

    expect(response.status).toBe(403);
  });

  test('Subscribe to service', async () => {
    // First create a service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Subscription Test Service',
        description: 'Service for subscription testing',
        category: 'Software',
        department: 'IT'
      });

    const serviceId = serviceResponse.body.id;

    // Subscribe to service
    const subscribeResponse = await request(app)
      .post(`/api/services/subscriptions/${serviceId}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(subscribeResponse.status).toBe(201);
    expect(subscribeResponse.body).toHaveProperty('message', 'Successfully subscribed to service');
  });

  test('Get user subscriptions', async () => {
    const response = await request(app)
      .get('/api/services/subscriptions/my')
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(response.status).toBe(200);
    expect(Array.isArray(response.body)).toBe(true);
  });

  test('Unsubscribe from service', async () => {
    // Create a service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Unsubscribe Test Service',
        description: 'Service for unsubscribe testing',
        category: 'Access',
        department: 'IT'
      });

    const serviceId = serviceResponse.body.id;

    // Subscribe first
    await request(app)
      .post(`/api/services/subscriptions/${serviceId}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Unsubscribe
    const unsubscribeResponse = await request(app)
      .delete(`/api/services/subscriptions/${serviceId}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    expect(unsubscribeResponse.status).toBe(200);
    expect(unsubscribeResponse.body).toHaveProperty('message', 'Successfully unsubscribed from service');
  });
});

describe('Notification Creation', () => {
  let managerToken;
  let applicantToken;
  let adminToken;

  beforeAll(async () => {
    const applicantLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testapplicant',
        password: 'testapplicant123'
      });
    applicantToken = applicantLogin.body.token;

    const managerLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testmanager',
        password: 'testmanager123'
      });
    managerToken = managerLogin.body.token;

    const adminLogin = await request(app)
      .post('/api/auth/login')
      .send({
        username: 'testadmin',
        password: 'testadmin123'
      });
    adminToken = adminLogin.body.token;
  });

  test('Notification is created after request approval', async () => {
    // Create a test service
    const serviceResponse = await request(app)
      .post('/api/services')
      .set('Authorization', `Bearer ${adminToken}`)
      .send({
        name: 'Notification Test Service',
        description: 'Service for notification testing',
        category: 'Hardware',
        department: 'IT'
      });

    // Subscribe to service
    await request(app)
      .post(`/api/services/subscriptions/${serviceResponse.body.id}`)
      .set('Authorization', `Bearer ${applicantToken}`);

    // Create a test request
    const createResponse = await request(app)
      .post('/api/requests')
      .set('Authorization', `Bearer ${applicantToken}`)
      .send({
        title: 'Test Request',
        description: 'This is a test request description',
        category: 'Hardware',
        priority: 'Medium',
        service_id: serviceResponse.body.id ? serviceResponse.body.id.toString() : null
      });
    const requestId = createResponse.body.id;

    // Approve request as manager
    const approveResponse = await request(app)
      .post(`/api/workflow/approve/${requestId}`)
      .set('Authorization', `Bearer ${managerToken}`)
      .send({
        reason: 'Test approval'
      });

    expect(approveResponse.status).toBe(200);

    // Check if notification was created
    const notifications = db.prepare(`
      SELECT * FROM notifications 
      WHERE request_id = ?
    `).all(requestId);

    expect(notifications.length).toBeGreaterThan(0);
    expect(notifications[0]).toHaveProperty('message');
    // Check that notification was created (message content depends on implementation)
    expect(notifications[0].message).toBeTruthy();
  });
});
