import { injectable } from 'inversify';
import { Connection, Channel, connect } from 'amqplib';
import { IEventQueue, EventResponse } from '../../core/interfaces/IEventQueue';
import { Event } from '../../core/entities/Event';
import config from '../../config';

type RabbitMQConfig = typeof config.rabbitmq;

@injectable()
export class RabbitMQEventQueue implements IEventQueue {
  private connection: Connection | null = null;
  private channel: Channel | null = null;
  private readonly outboundQueue = 'events.outbound';
  private readonly inboundQueue = 'events.inbound';

  constructor(private readonly config: RabbitMQConfig) {}

  private async initialize(): Promise<void> {
    if (!this.connection) {
      const url = `amqp://${this.config.user}:${this.config.password}@${this.config.host}:${this.config.port}${this.config.vhost}`;
      this.connection = await connect(url);
      this.channel = await this.connection.createChannel();
      
      // Ensure queues exist
      await this.channel.assertQueue(this.outboundQueue, { durable: true });
      await this.channel.assertQueue(this.inboundQueue, { durable: true });
    }
  }

  async publishEvent(event: Event): Promise<void> {
    await this.initialize();
    if (!this.channel) throw new Error('Channel not initialized');

    const message = JSON.stringify(event.toJSON());
    this.channel.sendToQueue(this.outboundQueue, Buffer.from(message), {
      persistent: true,
      messageId: event.eventId
    });
  }

  async consumeResponse(callback: (response: EventResponse) => Promise<void>): Promise<void> {
    await this.initialize();
    if (!this.channel) throw new Error('Channel not initialized');

    await this.channel.consume(this.inboundQueue, async (msg) => {
      if (!msg) return;

      try {
        const response: EventResponse = JSON.parse(msg.content.toString());
        await callback(response);
        this.channel?.ack(msg);
      } catch (error) {
        console.error('Error processing response:', error);
        this.channel?.nack(msg, false, false);
      }
    });
  }

  async close(): Promise<void> {
    if (this.channel) {
      await this.channel.close();
      this.channel = null;
    }
    if (this.connection) {
      await this.connection.close();
      this.connection = null;
    }
  }
} 