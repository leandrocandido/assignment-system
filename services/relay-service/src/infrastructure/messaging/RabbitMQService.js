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

  async publishEvent(event) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      const queue = 'events.outbound';
      await this.channel.assertQueue(queue, { durable: true });
      
      const message = JSON.stringify(event);
      this.channel.sendToQueue(queue, Buffer.from(message));
      logger.info(`Published event to queue ${queue}`);
    } catch (error) {
      logger.error('Error publishing event:', error);
      throw error;
    }
  }

  async consumeEvents(queueName, handler) {
    try {
      if (!this.channel) {
        throw new Error('RabbitMQ channel not initialized');
      }

      await this.channel.assertQueue(queueName, { durable: true });
      
      this.channel.consume(queueName, async (msg) => {
        if (msg !== null) {
          try {
            await handler(JSON.parse(msg.content.toString()));
            this.channel.ack(msg);
          } catch (error) {
            logger.error('Error processing message:', error);
            this.channel.nack(msg);
          }
        }
      });

      logger.info(`Started consuming from queue ${queueName}`);
    } catch (error) {
      logger.error('Error setting up consumer:', error);
      throw error;
    }
  }
}

module.exports = new RabbitMQService(); 