require('dotenv').config();
const { sequelize } = require('./models');
const { rabbitmq } = require('@relay-service/common');
const eventService = require('./services/eventService');

async function startServer() {
  try {
    // Connect to PostgreSQL
    await sequelize.authenticate();
    console.log('Connected to PostgreSQL database');

    // Connect to RabbitMQ
    await rabbitmq.connect();
    console.log('Connected to RabbitMQ');

    // Start event polling
    await eventService.startEventPolling();
    console.log('Event polling started');

    // Handle shutdown gracefully
    process.on('SIGTERM', async () => {
      console.log('Received SIGTERM. Shutting down gracefully...');
      await eventService.stopEventPolling();
      await rabbitmq.close();
      await sequelize.close();
      process.exit(0);
    });

  } catch (error) {
    console.error('Error starting server:', error);
    process.exit(1);
  }
}

startServer(); 