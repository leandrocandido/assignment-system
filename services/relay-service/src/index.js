require('dotenv').config();
const { Sequelize } = require('sequelize');
const dbConfig = require('./infrastructure/config/database');
const logger = require('./shared/utils/logger');

const PostgresEventRepository = require('./infrastructure/persistence/PostgresEventRepository');
const RabbitMQService = require('./infrastructure/messaging/RabbitMQService');
const PollEventsUseCase = require('./application/use-cases/PollEventsUseCase');
const ConsumeEventsUseCase = require('./application/use-cases/ConsumeEventsUseCase');

async function startServer() {
  try {
    // Initialize database
    const sequelize = new Sequelize(dbConfig);
    await sequelize.authenticate();
    logger.info('Connected to PostgreSQL database');

    // Initialize dependencies
    const eventRepository = new PostgresEventRepository(sequelize);
    const messageQueue = RabbitMQService;
    
    // Connect to RabbitMQ
    await messageQueue.connect();
    logger.info('Connected to RabbitMQ');

    // Initialize use cases
    const pollEventsUseCase = new PollEventsUseCase(eventRepository, messageQueue);
    const consumeEventsUseCase = new ConsumeEventsUseCase(eventRepository, messageQueue);

    // Start event polling
    const cronExpression = process.env.CRON_EXPRESSION || '*/15 * * * * *';
    pollEventsUseCase.startPolling(cronExpression);
    logger.info('Event polling started');

    // Start event consumer
    await consumeEventsUseCase.execute();
    logger.info('Event consumer started');

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Shutting down gracefully...');
      pollEventsUseCase.stopPolling();
      await messageQueue.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 