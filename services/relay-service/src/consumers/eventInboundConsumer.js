const amqp = require('amqplib');
const { Pool } = require('pg');
const logger = require('../utils/logger');

class EventInboundConsumer {
    constructor() {
        this.queueName = 'events.inbound';
        
        // Initialize Postgres pool
        this.pool = new Pool({
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            host: process.env.POSTGRES_HOST || 'postgres',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'relay_service'
        });
    }

    async start() {
        try {
            const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
            const channel = await conn.createChannel();
            
            await channel.assertQueue(this.queueName, { durable: true });
            logger.info(`[EventInboundConsumer] Waiting for messages in ${this.queueName}`);

            channel.consume(this.queueName, async (msg) => {
                if (msg !== null) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        const { eventId } = content;

                        const client = await this.pool.connect();
                        try {
                            await client.query('BEGIN');

                            // Check if event exists
                            const eventResult = await client.query(
                                'SELECT event_id FROM events WHERE event_id = $1',
                                [eventId]
                            );

                            if (eventResult.rows.length > 0) {
                                // Update event state to viewed
                                await client.query(
                                    'UPDATE events SET state = $1 WHERE event_id = $2',
                                    ['viewed', eventId]
                                );

                                logger.info(`[EventInboundConsumer] Updated event ${eventId} state to viewed`);
                                await client.query('COMMIT');
                                channel.ack(msg);

                                // Forward the original message to ack.queue
                                await channel.assertQueue('ack.queue', { durable: true });
                                channel.sendToQueue('ack.queue', msg.content);
                                logger.info(`[EventInboundConsumer] Forwarded event ${eventId} to ack.queue`);

                            } else {
                                logger.warn(`[EventInboundConsumer] Event ${eventId} not found`);
                                // Still acknowledge the message as we don't want to reprocess non-existent events
                                channel.ack(msg);
                            }
                        } catch (error) {
                            await client.query('ROLLBACK');
                            logger.error(`[EventInboundConsumer] Database error: ${error.message}`);
                            // Reject the message and requeue it
                            channel.nack(msg, false, true);
                        } finally {
                            client.release();
                        }
                    } catch (error) {
                        logger.error(`[EventInboundConsumer] Processing error: ${error.message}`);
                        // If we can't parse the message or other critical error, reject without requeue
                        channel.nack(msg, false, false);
                    }
                }
            }, {
                noAck: false // Enable manual acknowledgment
            });

            // Handle connection closure
            conn.on('close', (err) => {
                logger.error('[EventInboundConsumer] Connection closed:', err);
                setTimeout(() => this.start(), 5000); // Attempt to reconnect after 5 seconds
            });

            // Handle errors
            conn.on('error', (err) => {
                logger.error('[EventInboundConsumer] Connection error:', err);
            });

        } catch (error) {
            logger.error(`[EventInboundConsumer] Start error: ${error.message}`);
            setTimeout(() => this.start(), 5000); // Attempt to reconnect after 5 seconds
        }
    }
}

module.exports = new EventInboundConsumer(); 