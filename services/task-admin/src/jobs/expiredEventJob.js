const logger = require('../utils/logger');
const { Pool } = require('pg');
const Redis = require('ioredis');

class ExpiredEventJob {
    constructor() {
        this.name = 'ExpiredEventJob';
        
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

            await client.query('BEGIN'); // Start transaction

            // Get assignments older than 15 minutes
            const expiredAssignmentsResult = await client.query(
                `SELECT assignment_id, event_id, user_id 
                 FROM assignments 
                 WHERE created_at < NOW() - INTERVAL '15 minutes'
                 AND deleted = false`
            );

            const expiredAssignments = expiredAssignmentsResult.rows;
            logger.info(`[${this.name}] Found ${expiredAssignments.length} expired assignments`);

            if (expiredAssignments.length > 0) {
                // Mark assignments as deleted
                await client.query(
                    `UPDATE assignments 
                     SET deleted = true 
                     WHERE assignment_id = ANY($1)`,
                    [expiredAssignments.map(a => a.assignment_id)]
                );

                // Remove associated events from dedup_events
                await client.query(
                    `DELETE FROM dedup_events 
                     WHERE event_id = ANY($1)`,
                    [expiredAssignments.map(a => a.event_id)]
                );

                await client.query('COMMIT');

                // Update Redis cache for affected users
                const userIds = [...new Set(expiredAssignments.map(a => a.user_id))];
                
                for (const userId of userIds) {
                    // Get current assignment count for user
                    const currentAssignments = await client.query(
                        `SELECT COUNT(*) as count
                         FROM assignments
                         WHERE user_id = $1
                         AND deleted = false`,
                        [userId]
                    );
                    
                    const assignmentCount = parseInt(currentAssignments.rows[0].count, 10);
                    
                    // Update user's assignment count in Redis
                    const userSession = await this.redis.get(`user:${userId}`);
                    if (userSession) {
                        const sessionData = JSON.parse(userSession);
                        sessionData.assignments = assignmentCount;
                        
                        // Get TTL of existing key
                        const ttl = await this.redis.ttl(`user:${userId}`);
                        if (ttl > 0) {
                            await this.redis.setex(
                                `user:${userId}`,
                                ttl,
                                JSON.stringify(sessionData)
                            );
                            logger.info(`Updated assignments count for user ${userId} to ${assignmentCount}`);
                        }
                    }
                }

                logger.info(`[${this.name}] Successfully processed ${expiredAssignments.length} expired assignments`);
            } else {
                await client.query('ROLLBACK');
            }

            logger.info(`[${this.name}] Job completed successfully`);
        } catch (error) {
            await client.query('ROLLBACK');
            logger.error(`[${this.name}] Transaction error: ${error.message}`);
            throw error;
        } finally {
            client.release();
        }
    }
}

module.exports = new ExpiredEventJob(); 