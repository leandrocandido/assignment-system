const cron = require('node-cron');
const logger = require('../config/logger');
const eventService = require('./eventService');
const rabbitmq = require('../config/rabbitmq');

class SchedulerService {
  constructor() {
    this.scheduledJobs = new Map();
  }

  validateCronExpression(cronExpression) {
    return cron.validate(cronExpression);
  }

  async processNotViewedEvents() {
    try {
      const pendingEvents = await eventService.getPendingEvents();
      logger.info(`Found ${pendingEvents.length} not viewed events to process`);
      
      for (const event of pendingEvents) {
        await rabbitmq.publishMessage(process.env.OUTBOUND_QUEUE, event);
        logger.info(`Event ${event.event_id} sent to outbound queue and not marked as Processing`);
      }
    } catch (error) {
      logger.error('Error processing not viewed events:', error);
    }
  }

  scheduleEventProcessing(cronExpression) {
    if (!this.validateCronExpression(cronExpression)) {
      throw new Error('Invalid cron expression');
    }

    // Stop existing job if any
    this.stopEventProcessing();

    // Schedule new job
    const job = cron.schedule(cronExpression, async () => {
      logger.info('Starting scheduled event processing');
      await this.processNotViewedEvents();
    });

    this.scheduledJobs.set('eventProcessing', job);
    logger.info(`Event processing scheduled with cron expression: ${cronExpression}`);
  }

  stopEventProcessing() {
    const existingJob = this.scheduledJobs.get('eventProcessing');
    if (existingJob) {
      existingJob.stop();
      this.scheduledJobs.delete('eventProcessing');
      logger.info('Event processing job stopped');
    }
  }

  getScheduleStatus() {
    const job = this.scheduledJobs.get('eventProcessing');
    return {
      isRunning: !!job,
      nextInvocation: job ? job.nextDate().toString() : null
    };
  }
}

module.exports = new SchedulerService(); 