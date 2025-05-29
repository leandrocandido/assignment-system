const logger = require('../utils/logger');
const { Pool } = require('pg');
const amqp = require('amqplib');

class CheckReviewedJob {
    constructor() {
        this.name = 'CheckReviewedJob';
        
        // Initialize Postgres pool
        this.pool = new Pool({
            user: process.env.POSTGRES_USER || 'postgres',
            password: process.env.POSTGRES_PASSWORD || 'postgres',
            host: process.env.POSTGRES_HOST || 'postgres',
            port: parseInt(process.env.POSTGRES_PORT || '5432'),
            database: process.env.POSTGRES_DB || 'assignment_service'
        });
    }

    async execute() {
        const client = await this.pool.connect();
        try {
            logger.info(`[${this.name}] Starting job execution`);

            await client.query('BEGIN'); // Start transaction

            // Get assignments with status != pending
            const assignmentsResult = await client.query(
                `SELECT assignment_id, event_id 
                 FROM assignments 
                 WHERE status != 'pending' 
                 AND deleted = false`
            );

            const assignments = assignmentsResult.rows;
            logger.info(`[${this.name}] Found ${assignments.length} non-pending assignments`);

            // Add to outbox_assignments
            for (const assignment of assignments) {
                // Check if the assignment already exists in outbox
                const existingResult = await client.query(
                    `SELECT assignment_id FROM outbox_assignments WHERE assignment_id = $1`,
                    [assignment.assignment_id]
                );

                if (existingResult.rows.length === 0) {
                    // Insert only if it doesn't exist
                    await client.query(
                        `INSERT INTO outbox_assignments (assignment_id, status)
                         VALUES ($1, 'completed')`,
                        [assignment.assignment_id]
                    );
                }
            }

            // Get completed items with event info
            const processedItemsResult = await client.query(
                `SELECT oa.assignment_id, e.event_id
                 FROM outbox_assignments oa
                 INNER JOIN assignments a ON a.assignment_id = oa.assignment_id
                 INNER JOIN events e ON e.event_id = a.event_id
                 WHERE oa.status = 'completed'`
            );

            await client.query('COMMIT'); // Commit transaction

            // Format data for queue
            const queueMessages = processedItemsResult.rows.map(item => ({
                assignmentId: item.assignment_id,
                eventId: item.event_id
            }));

            // Send to RabbitMQ
            const conn = await amqp.connect(process.env.RABBITMQ_URL || 'amqp://rabbitmq:5672');
            const channel = await conn.createChannel();
            const queue = 'events.inbound';

            await channel.assertQueue(queue, { durable: true });

            for (const msg of queueMessages) {
                channel.sendToQueue(queue, Buffer.from(JSON.stringify(msg)));
                logger.info(`Sent message to queue: ${JSON.stringify(msg)}`);
            }

            await channel.close();
            await conn.close();

            logger.info(`[${this.name}] Job completed successfully`);
        } catch (error) {
            await client.query('ROLLBACK'); // Rollback on error
            logger.error(`[${this.name}] Error executing job: ${error.message}`);
            throw error;
        } finally {
            client.release(); // Release the client back to the pool
        }
    }
}

module.exports = new CheckReviewedJob(); 