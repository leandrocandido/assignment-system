const amqp = require('amqplib');
const IMessageQueue = require('../../application/interfaces/IMessageQueue');
const logger = require('../../shared/utils/logger');

class RabbitMQService extends IMessageQueue {
  constructor() {
    super();
    this.connection = null;
    this.channel = null;
    this.url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}/${process.env.RABBITMQ_VHOST}`;
  }

  async connect() {
    try {
      this.connection = await amqp.connect(this.url);
      this.channel = await this.connection.createChannel();
      logger.info('Connected to RabbitMQ');
    } catch (error) {
      logger.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async close() {
    try {
      if (this.channel) {
        await this.channel.close();
      }
      if (this.connection) {
        await this.connection.close();
      }
      logger.info('Disconnected from RabbitMQ');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }

  async consumeEvents(queueName, handler) {
    try {
      await this.channel.assertQueue(queueName, { durable: true });
      await this.channel.prefetch(1);

      logger.info(`Started consuming messages from queue: ${queueName}`);
      
      await this.channel.consume(queueName, async (message) => {
        try {
          if (message) {
            const content = JSON.parse(message.content.toString());
            await handler(content);
            await this.acknowledgeMessage(message);
          }
        } catch (error) {
          logger.error('Error processing message:', error);
          // Reject the message and requeue it
          this.channel.nack(message, false, true);
        }
      });
    } catch (error) {
      logger.error(`Error consuming events from queue ${queueName}:`, error);
      throw error;
    }
  }

  async publishEvent(event, queueName) {
    try {
      await this.channel.assertQueue(queueName, { durable: true });
      const message = Buffer.from(JSON.stringify(event));
      await this.channel.sendToQueue(queueName, message, { persistent: true });
      logger.info(`Published event to queue ${queueName}`);
    } catch (error) {
      logger.error(`Error publishing event to queue ${queueName}:`, error);
      throw error;
    }
  }

  async acknowledgeMessage(message) {
    try {
      await this.channel.ack(message);
    } catch (error) {
      logger.error('Error acknowledging message:', error);
      throw error;
    }
  }
}

module.exports = RabbitMQService; 