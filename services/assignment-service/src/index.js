require('dotenv').config();
const express = require('express');
const rabbitmq = require('../../../common/config/rabbitmq');
const { sequelize } = require('./models');
const assignmentService = require('./services/assignmentService');
const redis = require('./config/redis');

const app = express();
app.use(express.json());

// Health check endpoint
app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

// Redis test endpoint
app.get('/redis-test', async (req, res) => {
  try {
    const config = {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      sessionTTL: process.env.SESSION_TTL
    };
    
    // Test Redis connection
    await redis.ping();
    
    res.json({
      status: 'ok',
      config,
      message: 'Redis connection successful'
    });
  } catch (error) {
    res.status(500).json({
      status: 'error',
      config: {
        host: process.env.REDIS_HOST,
        port: process.env.REDIS_PORT,
        sessionTTL: process.env.SESSION_TTL
      },
      error: error.message
    });
  }
});

// Assignment count sync endpoint
app.post('/sync-assignment-counts', async (req, res) => {
  try {
    await assignmentService.syncAssignmentCounts();
    res.json({ status: 'ok', message: 'Assignment counts synced successfully' });
  } catch (error) {
    console.error('Error syncing assignment counts:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// User session endpoints
app.post('/users/:userId/active', async (req, res) => {
  try {
    await assignmentService.markUserActive(req.params.userId);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error marking user active:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

app.delete('/users/:userId/active', async (req, res) => {
  try {
    await assignmentService.markUserInactive(req.params.userId);
    res.json({ status: 'ok' });
  } catch (error) {
    console.error('Error marking user inactive:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Assignment endpoints
app.put('/assignments/:assignmentId', async (req, res) => {
  try {
    const { status } = req.body;
    const assignment = await assignmentService.updateAssignment(
      req.params.assignmentId,
      status
    );
    res.json(assignment);
  } catch (error) {
    console.error('Error updating assignment:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

async function setupMessageConsumer() {
  try {
    await rabbitmq.connect();

    // Consume events from the event_assignments queue with prefetch=1
    await rabbitmq.consumeMessages('event_assignments', async (eventData) => {
      await assignmentService.processEvent(eventData);
    }, { prefetch: 1, requeue: false });

    console.log('RabbitMQ consumer setup complete');
  } catch (error) {
    console.error('Error setting up RabbitMQ consumer:', error);
    // Don't exit the process, let it retry
    setTimeout(setupMessageConsumer, 5000);
  }
}

async function startServer() {
  try {
    // Test database connection
    await sequelize.authenticate();
    console.log('Database connection established');

    // Sync assignment counts on startup
    try {
      await assignmentService.syncAssignmentCounts();
      console.log('Initial assignment count sync completed');
    } catch (error) {
      console.error('Error during initial assignment count sync:', error);
    }

    // Start the express server
    const port = process.env.PORT || 3000;
    const server = app.listen(port, () => {
      console.log(`Server listening on port ${port}`);
    });

    // Setup message consumer
    await setupMessageConsumer();

    // Setup periodic sync (every 5 minutes)
    setInterval(async () => {
      try {
        await assignmentService.syncAssignmentCounts();
        console.log('Periodic assignment count sync completed');
      } catch (error) {
        console.error('Error during periodic assignment count sync:', error);
      }
    }, 5 * 60 * 1000); // 5 minutes

    // Graceful shutdown
    process.on('SIGTERM', gracefulShutdown);
    process.on('SIGINT', gracefulShutdown);

    async function gracefulShutdown() {
      console.log('Received shutdown signal');
      
      // Close the HTTP server
      server.close(() => {
        console.log('HTTP server closed');
      });

      // Close RabbitMQ connection
      try {
        await rabbitmq.close();
        console.log('RabbitMQ connection closed');
      } catch (err) {
        console.error('Error closing RabbitMQ connection:', err);
      }

      // Close database connection
      try {
        await sequelize.close();
        console.log('Database connection closed');
      } catch (err) {
        console.error('Error closing database connection:', err);
      }

      process.exit(0);
    }

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 