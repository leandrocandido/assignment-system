const amqp = require('amqplib');
const { Pool } = require('pg');
const logger = require('../utils/logger');

class AckQueueConsumer {
    constructor() {
        this.queueName = 'ack.queue';
        
        // Initialize Postgres pool
        this.pool = new Pool({
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            host: process.env.POSTGRES_HOST || 'postgres',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'assignment_service'
        });
    }

    async start() {
        try {
            const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
            const channel = await conn.createChannel();
            
            await channel.assertQueue(this.queueName, { durable: true });
            logger.info(`[AckQueueConsumer] Waiting for messages in ${this.queueName}`);

            channel.consume(this.queueName, async (msg) => {
                if (msg !== null) {
                    try {
                        const content = JSON.parse(msg.content.toString());
                        const { assignmentId , eventId } = content;

                        const client = await this.pool.connect();
                        try {
                            await client.query('BEGIN');

                            // Update outbox_assignment status to finished
                            const result = await client.query(
                                `UPDATE outbox_assignments 
                                 SET status = 'finished' 
                                 WHERE assignment_id = $1 
                                 RETURNING assignment_id`,
                                [assignmentId]
                            );

                            if (result.rows.length > 0) {
                                await client.query('COMMIT');
                                logger.info(`[AckQueueConsumer] Updated outbox_assignment ${assignmentId} status to finished`);
                                channel.ack(msg);
                            } else {
                                await client.query('ROLLBACK');
                                logger.warn(`[AckQueueConsumer] Assignment ${assignmentId} not found in outbox_assignments`);
                                // Still acknowledge as we don't want to reprocess non-existent assignments
                                channel.ack(msg);
                            }
                        } catch (error) {
                            await client.query('ROLLBACK');
                            logger.error(`[AckQueueConsumer] Database error: ${error.message}`);
                            // Reject the message and requeue it
                            channel.nack(msg, false, true);
                        } finally {
                            client.release();
                        }
                    } catch (error) {
                        logger.error(`[AckQueueConsumer] Processing error: ${error.message}`);
                        // If we can't parse the message or other critical error, reject without requeue
                        channel.nack(msg, false, false);
                    }
                }
            }, {
                noAck: false // Enable manual acknowledgment
            });

            // Handle connection closure
            conn.on('close', (err) => {
                logger.error('[AckQueueConsumer] Connection closed:', err);
                setTimeout(() => this.start(), 5000); // Attempt to reconnect after 5 seconds
            });

            // Handle errors
            conn.on('error', (err) => {
                logger.error('[AckQueueConsumer] Connection error:', err);
            });

        } catch (error) {
            logger.error(`[AckQueueConsumer] Start error: ${error.message}`);
            setTimeout(() => this.start(), 5000); // Attempt to reconnect after 5 seconds
        }
    }
}

module.exports = new AckQueueConsumer(); 