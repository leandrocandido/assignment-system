import amqp, { Connection, Channel, ConsumeMessage } from 'amqplib';
import logger from './logger';

class RabbitMQConnection {
  private connection: Connection | null = null;
  private channel: Channel | null = null;

  async connect(): Promise<void> {
    try {
      const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}`;
      this.connection = await amqp.connect(url);
      this.channel = await this.connection.createChannel();
      
      // Ensure queues exist
      if (process.env.OUTBOUND_QUEUE) {
        await this.channel.assertQueue(process.env.OUTBOUND_QUEUE, { durable: true });
      }
      if (process.env.INBOUND_QUEUE) {
        await this.channel.assertQueue(process.env.INBOUND_QUEUE, { durable: true });
      }
      
      logger.info('Successfully connected to RabbitMQ');
    } catch (error) {
      logger.error('Error connecting to RabbitMQ:', error);
      throw error;
    }
  }

  async publishMessage<T>(queue: string, message: T): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      logger.info(`Message published to queue: ${queue}`);
    } catch (error) {
      logger.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeMessages<T>(queue: string, callback: (message: T) => Promise<void>): Promise<void> {
    try {
      if (!this.channel) {
        throw new Error('Channel not initialized');
      }
      await this.channel.consume(queue, async (message: ConsumeMessage | null) => {
        if (message) {
          try {
            const parsedMessage = JSON.parse(message.content.toString()) as T;
            await callback(parsedMessage);
            this.channel?.ack(message);
          } catch (error) {
            logger.error(`Error processing message from queue ${queue}:`, error);
            this.channel?.nack(message);
          }
        }
      });
      logger.info(`Started consuming messages from queue: ${queue}`);
    } catch (error) {
      logger.error(`Error setting up consumer for queue ${queue}:`, error);
      throw error;
    }
  }

  async close(): Promise<void> {
    try {
      if (this.channel) {
        await this.channel.close();
        this.channel = null;
      }
      if (this.connection) {
        await this.connection.close();
        this.connection = null;
      }
      logger.info('RabbitMQ connection closed');
    } catch (error) {
      logger.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

export default new RabbitMQConnection(); 