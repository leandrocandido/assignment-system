require('dotenv').config();
const cron = require('node-cron');
const logger = require('./utils/logger');
const inactiveUserJob = require('./jobs/inactiveUserJob');
const expiredEventJob = require('./jobs/expiredEventJob');
const checkReviewedJob = require('./jobs/checkReviewedJob');
const ackQueueConsumer = require('./consumers/ackQueueConsumer');

// Default cron expressions if not provided in environment variables
const DEFAULT_CRON_EXPRESSIONS = {
    INACTIVE_USER_CRON: '0 0 * * *',        // Every day at midnight
    EXPIRED_EVENT_CRON: '0 */2 * * *',      // Every 2 hours
    CHECK_REVIEWED_CRON: '*/30 * * * *'     // Every 30 minutes
};

function scheduleJob(job, cronExpression) {
    if (!cron.validate(cronExpression)) {
        logger.error(`Invalid cron expression for ${job.name}: ${cronExpression}`);
        return;
    }

    cron.schedule(cronExpression, async () => {
        try {
            await job.execute();
        } catch (error) {
            logger.error(`Failed to execute ${job.name}: ${error.message}`);
        }
    });

    logger.info(`Scheduled ${job.name} with cron expression: ${cronExpression}`);
}

// Schedule all jobs
function initializeJobs() {
    const jobs = [
        {
            job: inactiveUserJob,
            cronExp: process.env.INACTIVE_USER_CRON || DEFAULT_CRON_EXPRESSIONS.INACTIVE_USER_CRON
        },
        {
            job: expiredEventJob,
            cronExp: process.env.EXPIRED_EVENT_CRON || DEFAULT_CRON_EXPRESSIONS.EXPIRED_EVENT_CRON
        },
        {
            job: checkReviewedJob,
            cronExp: process.env.CHECK_REVIEWED_CRON || DEFAULT_CRON_EXPRESSIONS.CHECK_REVIEWED_CRON
        }
    ];

    jobs.forEach(({ job, cronExp }) => scheduleJob(job, cronExp));
}

// Start message consumers
async function startConsumers() {
    try {
        await ackQueueConsumer.start();
        logger.info('Ack queue consumer started successfully');
    } catch (error) {
        logger.error('Failed to start ack queue consumer:', error);
        // Don't exit the process as the consumer has its own retry mechanism
    }
}

// Start the application
async function start() {
    logger.info('TaskAdmin service starting...');
    initializeJobs();
    await startConsumers();
    logger.info('TaskAdmin service started successfully');
}

start(); 