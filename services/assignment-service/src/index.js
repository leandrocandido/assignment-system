require('dotenv').config();
const express = require('express');
const rabbitmq = require('../../../common/config/rabbitmq');
const { sequelize } = require('./models');
const AssignmentService = require('./services/assignmentService');
const redis = require('./config/redis');
const cors = require('cors');
const RabbitMQService = require('./infrastructure/messaging/RabbitMQService');
const RedisUserRepository = require('./infrastructure/persistence/RedisUserRepository');
const PostgresEventRepository = require('./infrastructure/persistence/PostgresEventRepository');
const PostgresAssignmentRepository = require('./infrastructure/persistence/PostgresAssignmentRepository');
const ConsumeEventsUseCase = require('./application/use-cases/ConsumeEventsUseCase');
const logger = require('./shared/utils/logger');

const app = express();

// Enable CORS for all routes
app.use(cors());
app.use(express.json());

// Initialize repositories
const userRepository = new RedisUserRepository();
const eventRepository = new PostgresEventRepository();
const assignmentRepository = new PostgresAssignmentRepository();

// Initialize services
const assignmentService = new AssignmentService(eventRepository);

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

async function startServer() {
  try {
    // Initialize message queue
    const messageQueue = new RabbitMQService();
    await messageQueue.connect();
    logger.info('Connected to RabbitMQ');

    // Initialize use cases
    const consumeEventsUseCase = new ConsumeEventsUseCase(
      messageQueue,
      userRepository,
      eventRepository,
      assignmentRepository
    );

    // Start consuming events
    await consumeEventsUseCase.execute();
    logger.info('Assignment service started successfully');

    // Start HTTP server
    const port = process.env.PORT || 3000;
    app.listen(port, () => {
      logger.info(`HTTP server listening on port ${port}`);
    });

    // Handle graceful shutdown
    process.on('SIGTERM', async () => {
      logger.info('SIGTERM signal received');
      await messageQueue.close();
      process.exit(0);
    });

    process.on('SIGINT', async () => {
      logger.info('SIGINT signal received');
      await messageQueue.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error starting assignment service:', error);
    process.exit(1);
  }
}

startServer(); 