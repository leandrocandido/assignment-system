require('dotenv').config();
const { sequelize } = require('./models');
const { rabbitmq } = require('@relay-service/common');
const eventService = require('./services/eventService');
const schedulerService = require('./services/schedulerService');
const eventInboundConsumer = require('./consumers/eventInboundConsumer');
const logger = require('./utils/logger');

async function startServer() {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    logger.info('Connected to PostgreSQL database');

    // Connect to RabbitMQ
    await rabbitmq.connect();
    logger.info('Connected to RabbitMQ');

    // Start event polling
    await eventService.startEventPolling();
    //await schedulerService.scheduleEventProcessing(process.env.CRON_EXPRESSION);
    logger.info('Event polling started');

    // Start event inbound consumer
    await eventInboundConsumer.start();
    logger.info('Event inbound consumer started');

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      logger.info('Received SIGTERM. Shutting down gracefully...');
      await eventService.stopEventPolling();
      await rabbitmq.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    logger.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 