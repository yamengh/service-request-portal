require('dotenv').config();
const express = require('express');
const cors = require('cors');
const db = require('./config/database');
const authRoutes = require('./routes/authRoutes');
const requestRoutes = require('./routes/requestRoutes');
const notificationRoutes = require('./routes/notificationRoutes');
const serviceRoutes = require('./routes/serviceRoutes');
const workflowRoutes = require('./routes/workflowRoutes');
const auditRoutes = require('./routes/auditRoutes');
const camundaRoutes = require('./routes/camundaRoutes');
const { startWorkers } = require('./services/camundaWorkers');

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/requests', requestRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/services', serviceRoutes);
app.use('/api/workflow', workflowRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/camunda', camundaRoutes);

// External API mock endpoints
app.get('/api/external/status', (req, res) => {
  const externalApiService = require('./services/externalApi');
  externalApiService.healthCheck().then(result => {
    res.json(result);
  });
});

app.post('/api/external/sync', (req, res) => {
  const externalApiService = require('./services/externalApi');
  externalApiService.syncToERP(req.body).then(result => {
    res.json(result);
  });
});

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ok',
    message: 'Service Request Portal API is running',
    timestamp: new Date().toISOString()
  });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ error: 'Endpoint not found' });
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ error: 'Internal server error' });
});

if (require.main === module) {
  app.listen(PORT, async () => {
    console.log(`Server running on port ${PORT}`);
    console.log(`Health check: http://localhost:${PORT}/api/health`);

    // Connect workers to the process already deployed in Camunda Modeler.
    if (process.env.CAMUNDA_ENABLED !== 'false') {
      console.log('Initializing Camunda integration...');
      try {
        await startWorkers();
      } catch (error) {
        console.log('Failed to start Camunda workers (continuing without Camunda):', error.message);
      }
    } else {
      console.log('Camunda integration disabled via CAMUNDA_ENABLED=false');
    }
  });
}

module.exports = app;
