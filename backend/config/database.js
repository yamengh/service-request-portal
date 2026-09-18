const Database = require('better-sqlite3');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcrypt');

// Determine database directory based on environment
const isTest = process.env.NODE_ENV === 'test';
const dbDir = isTest 
  ? path.join(__dirname, '../database-test') 
  : path.join(__dirname, '../database');

// Ensure database directory exists
if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

// Create database connection
const dbPath = path.join(dbDir, isTest ? 'test-portal.db' : 'service-portal.db');
const db = new Database(dbPath);

// Enable foreign keys
db.pragma('foreign_keys = ON');

// Create tables
const initDatabase = () => {
  // Users table (enhanced for RBAC/ABAC)
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password TEXT NOT NULL,
      role TEXT NOT NULL,
      department TEXT,
      region TEXT,
      email TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Services table
  db.exec(`
    CREATE TABLE IF NOT EXISTS services (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      department TEXT,
      requires_approval BOOLEAN DEFAULT 1,
      active BOOLEAN DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    )
  `);

  // Service subscriptions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS service_subscriptions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER NOT NULL,
      service_id INTEGER NOT NULL,
      subscribed_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      UNIQUE(user_id, service_id)
    )
  `);

  // Requests table (enhanced for workflow)
  db.exec(`
    CREATE TABLE IF NOT EXISTS requests (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      title TEXT NOT NULL,
      description TEXT NOT NULL,
      category TEXT NOT NULL,
      priority TEXT NOT NULL,
      status TEXT DEFAULT 'Submitted',
      workflow_status TEXT,
      user_id INTEGER NOT NULL,
      service_id INTEGER,
      department TEXT,
      region TEXT,
      reviewer_id INTEGER,
      manager_id INTEGER,
      ai_summary TEXT,
      ai_positive_tests TEXT,
      ai_negative_tests TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      updated_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id),
      FOREIGN KEY (service_id) REFERENCES services(id),
      FOREIGN KEY (reviewer_id) REFERENCES users(id),
      FOREIGN KEY (manager_id) REFERENCES users(id)
    )
  `);

  // Workflow states table
  db.exec(`
    CREATE TABLE IF NOT EXISTS workflow_states (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      current_state TEXT NOT NULL,
      previous_state TEXT,
      actor_id INTEGER,
      actor_role TEXT,
      transition_reason TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (actor_id) REFERENCES users(id)
    )
  `);

  // Audit logs table
  db.exec(`
    CREATE TABLE IF NOT EXISTS audit_logs (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      user_id INTEGER,
      action TEXT NOT NULL,
      entity_type TEXT NOT NULL,
      entity_id INTEGER,
      old_values TEXT,
      new_values TEXT,
      ip_address TEXT,
      user_agent TEXT,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  // Notifications table (existing)
  db.exec(`
    CREATE TABLE IF NOT EXISTS notifications (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      request_id INTEGER NOT NULL,
      user_id INTEGER NOT NULL,
      message TEXT NOT NULL,
      status TEXT DEFAULT 'unread',
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (request_id) REFERENCES requests(id),
      FOREIGN KEY (user_id) REFERENCES users(id)
    )
  `);

  console.log('Database tables initialized');
};

// Seed demo users
const seedUsers = () => {
  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  
  if (userCount === 0) {
    // Hash passwords
    const applicantPassword = bcrypt.hashSync('applicant123', 10);
    const reviewerPassword = bcrypt.hashSync('reviewer123', 10);
    const managerPassword = bcrypt.hashSync('manager123', 10);
    const adminPassword = bcrypt.hashSync('admin123', 10);

    // Insert demo applicant
    db.prepare(`
      INSERT INTO users (username, password, role, department, region, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('applicant', applicantPassword, 'applicant', 'IT', 'North', 'applicant@example.com');

    // Insert demo reviewer
    db.prepare(`
      INSERT INTO users (username, password, role, department, region, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('reviewer', reviewerPassword, 'reviewer', 'IT', 'North', 'reviewer@example.com');

    // Insert demo manager
    db.prepare(`
      INSERT INTO users (username, password, role, department, region, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('manager', managerPassword, 'manager', 'IT', 'North', 'manager@example.com');

    // Insert demo admin
    db.prepare(`
      INSERT INTO users (username, password, role, department, region, email)
      VALUES (?, ?, ?, ?, ?, ?)
    `).run('admin', adminPassword, 'admin', 'IT', 'North', 'admin@example.com');

    console.log('Demo users seeded: applicant/applicant123, reviewer/reviewer123, manager/manager123, admin/admin123');
  }
};

// Seed demo services
const seedServices = () => {
  const serviceCount = db.prepare('SELECT COUNT(*) as count FROM services').get().count;
  
  if (serviceCount === 0) {
    const services = [
      { name: 'Laptop Request', description: 'Request for a new or replacement laptop', category: 'Hardware', department: 'IT', requires_approval: 1 },
      { name: 'Monitor Request', description: 'Request for additional or replacement monitors', category: 'Hardware', department: 'IT', requires_approval: 1 },
      { name: 'Software License', description: 'Request for software licenses and installations', category: 'Software', department: 'IT', requires_approval: 1 },
      { name: 'System Access', description: 'Request for system access and permissions', category: 'Access', department: 'IT', requires_approval: 1 },
      { name: 'VPN Access', description: 'Request for VPN remote access', category: 'Access', department: 'IT', requires_approval: 0 },
      { name: 'Email Account', description: 'Request for email account creation or modification', category: 'Access', department: 'IT', requires_approval: 0 },
      { name: 'Network Request', description: 'Request for network connectivity or changes', category: 'Infrastructure', department: 'IT', requires_approval: 1 },
      { name: 'Server Access', description: 'Request for server access and permissions', category: 'Infrastructure', department: 'IT', requires_approval: 1 },
      { name: 'Technical Support', description: 'Request for technical support and troubleshooting', category: 'Support', department: 'IT', requires_approval: 0 },
      { name: 'Hardware Repair', description: 'Request for hardware repair services', category: 'Hardware', department: 'IT', requires_approval: 0 }
    ];

    const insertService = db.prepare(`
      INSERT INTO services (name, description, category, department, requires_approval, active)
      VALUES (?, ?, ?, ?, ?, 1)
    `);

    services.forEach(service => {
      insertService.run(service.name, service.description, service.category, service.department, service.requires_approval);
    });

    console.log('Demo services seeded: 10 services created');
  }
};

// Initialize database on module load
initDatabase();
seedUsers();
seedServices();

module.exports = db;
