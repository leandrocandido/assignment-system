const amqp = require('amqplib');

class RabbitMQClient {
  constructor() {
    this.connection = null;
    this.channel = null;
    this.RETRY_INTERVAL = 5000; // 5 seconds
    this.MAX_RETRIES = 12; // 1 minute total retry time
  }

  async connect(retryCount = 0) {
    try {
      // Use default vhost "/" if RABBITMQ_VHOST is not specified
      const vhost = process.env.RABBITMQ_VHOST || '/';
      const url = `amqp://${process.env.RABBITMQ_USER}:${process.env.RABBITMQ_PASSWORD}@${process.env.RABBITMQ_HOST}:${process.env.RABBITMQ_PORT}${vhost}`;
      
      console.log('Attempting to connect to RabbitMQ...');
      this.connection = await amqp.connect(url);
      
      // Handle connection errors and closure
      this.connection.on('error', (err) => {
        console.error('RabbitMQ connection error:', err);
      });

      this.connection.on('close', () => {
        console.error('RabbitMQ connection closed unexpectedly');
        // Try to reconnect when connection is closed
        setTimeout(() => this.connect(), this.RETRY_INTERVAL);
      });

      this.channel = await this.connection.createChannel();
      
      // Handle channel errors
      this.channel.on('error', (err) => {
        console.error('RabbitMQ channel error:', err);
      });

      this.channel.on('close', () => {
        console.error('RabbitMQ channel closed unexpectedly');
      });

      // Set up queues
      await this.setupQueues();

      console.log('Successfully connected to RabbitMQ');
      return this;
    } catch (error) {
      console.error('Failed to connect to RabbitMQ:', error.message);
      
      if (retryCount < this.MAX_RETRIES) {
        console.log(`Retrying connection in ${this.RETRY_INTERVAL/1000} seconds... (Attempt ${retryCount + 1}/${this.MAX_RETRIES})`);
        await new Promise(resolve => setTimeout(resolve, this.RETRY_INTERVAL));
        return this.connect(retryCount + 1);
      } else {
        console.error('Max retry attempts reached. Unable to connect to RabbitMQ.');
        throw error;
      }
    }
  }

  async setupQueues() {
    // Ensure queues exist
    await this.channel.assertQueue('event_assignments', { durable: true });
    await this.channel.assertQueue('assignment_updates', { durable: true });
  }

  async publishMessage(queue, message) {
    try {
      await this.channel.sendToQueue(queue, Buffer.from(JSON.stringify(message)));
      console.log(`Message published to queue: ${queue}`);
    } catch (error) {
      console.error(`Error publishing message to queue ${queue}:`, error);
      throw error;
    }
  }

  async consumeMessages(queue, callback, options = {}) {
    try {
      // Set prefetch if specified in options
      if (options.prefetch) {
        await this.channel.prefetch(options.prefetch);
      }

      await this.channel.consume(queue, async (message) => {
        if (message) {
          try {
            await callback(JSON.parse(message.content.toString()));
            this.channel.ack(message);
          } catch (error) {
            console.error(`Error processing message from queue ${queue}:`, error);
            // Requeue the message by default
            this.channel.nack(message, false, options.requeue !== false);
          }
        }
      });
      console.log(`Started consuming messages from queue: ${queue}`);
    } catch (error) {
      console.error(`Error setting up consumer for queue ${queue}:`, error);
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
      console.log('RabbitMQ connection closed');
    } catch (error) {
      console.error('Error closing RabbitMQ connection:', error);
      throw error;
    }
  }
}

// Export a singleton instance
module.exports = new RabbitMQClient(); 