const amqp = require('amqplib');
const logger = require('./logger');

class RabbitMQConnection {
  constructor() {
    this.connection = null;
    this.channel = null;
  }

  async connect() {
    try {
      const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Ensure queues exist
      await this.channel.assertQueue(process.env.OUTBOUND_QUEUE, { durable: true });
      await this.channel.assertQueue(process.env.INBOUND_QUEUE, { durable: true });
      
      logger.info('Successfully connected to RabbitMQ');
    } catch (error) {
      logger.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async publishMessage(queue, message) {
    try {
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      logger.info(`Message published to queue: ${queue}`);
    } catch (error) {
      logger.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeMessages(queue, callback) {
    try {
      await this.channel.consume(queue, async (message) => {
        if (message) {
          try {
            await callback(JSON.parse(message.content.toString()));
            this.channel.ack(message);
          } catch (error) {
            logger.error(`Error processing message from queue ${queue}:`, error);
            this.channel.nack(message);
          }
        }
      });
      logger.info(`Started consuming messages from queue: ${queue}`);
    } catch (error) {
      logger.error(`Error setting up consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async close() {
    try {
      await this.channel.close();
      await this.connection.close();
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQConnection(); 