const logger = require('../utils/logger');
const Redis = require('ioredis');
const { Pool } = require('pg');

class InactiveUserJob {
    constructor() {
        this.name = 'InactiveUserJob';
        
        // Initialize Redis client
        this.redis = new Redis({
            host: process.env.REDIS_HOST || 'redis',
            port: parseInt(process.env.REDIS_PORT || '6379', 10)
        });

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

            // Get all users that have logged in before
            const loggedUsers = await this.redis.smembers('ever_logged_users');
            
            // Find inactive users (those without active sessions)
            const inactiveUsers = [];
            for (const userId of loggedUsers) {
                const hasSession = await this.redis.exists(`user:${userId}`);
                if (!hasSession) {
                    inactiveUsers.push(userId);
                }
            }

            logger.info(`[${this.name}] Found ${inactiveUsers.length} inactive users`);

            // For each inactive user, get their pending assignments
            for (const userId of inactiveUsers) {
                try {
                    await client.query('BEGIN'); // Start transaction

                    // Get pending assignments
                    const assignmentsResult = await client.query(
                        `SELECT assignment_id, event_id 
                         FROM assignments 
                         WHERE user_id = $1 
                         AND status = 'pending' 
                         AND deleted = false`,
                        [userId]
                    );

                    const assignments = assignmentsResult.rows;
                    logger.info(`[${this.name}] Found ${assignments.length} pending assignments for user ${userId}`);

                    if (assignments.length > 0) {
                        // Mark assignments as deleted
                        await client.query(
                            `UPDATE assignments 
                             SET deleted = true 
                             WHERE assignment_id = ANY($1)`,
                            [assignments.map(a => a.assignment_id)]
                        );

                        // Remove associated events from dedup_events
                        await client.query(
                            `DELETE FROM dedup_events 
                             WHERE event_id = ANY($1)`,
                            [assignments.map(a => a.event_id)]
                        );

                        // Remove user from ever_logged_users set
                        await this.redis.srem('ever_logged_users', userId);

                        await client.query('COMMIT'); // Commit transaction
                        logger.info(`[${this.name}] Processed assignments and events for user ${userId}`);
                    } else {
                        await client.query('ROLLBACK'); // Rollback if no assignments found
                    }
                } catch (error) {
                    await client.query('ROLLBACK'); // Rollback on error
                    logger.error(`[${this.name}] Error processing user ${userId}: ${error.message}`);
                    // Continue with next user instead of stopping the entire job
                }
            }

            logger.info(`[${this.name}] Job completed successfully`);
        } catch (error) {
            logger.error(`[${this.name}] Error executing job: ${error.message}`);
            throw error;
        } finally {
            client.release(); // Release the client back to the pool
        }
    }
}

module.exports = new InactiveUserJob(); 