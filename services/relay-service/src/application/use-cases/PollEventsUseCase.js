const logger = require('../../shared/utils/logger');

class PollEventsUseCase {
  constructor(eventRepository, messageQueue) {
    this.eventRepository = eventRepository;
    this.messageQueue = messageQueue;
    this.isPolling = false;
    this.pollingTask = null;
    this.eventLimit = parseInt(process.env.EVENT_LIMIT || '10000', 10000);
  }

  async execute() {
    try {
      const pendingEvents = await this.eventRepository.findPendingEvents(this.eventLimit);
      
      for (const event of pendingEvents) {
        if (event.isViewable()) {
          await this.messageQueue.publishEvent(event);
          logger.info(`Published event ${event.eventId} to queue`);
        }
      }
    } catch (error) {
      logger.error('Error in poll events use case:', error);
      throw error;
    }
  }

  startPolling(cronExpression) {
    if (this.isPolling) {
      logger.warn('Event polling is already running');
      return;
    }

    const cron = require('node-cron');
    this.pollingTask = cron.schedule(cronExpression, async () => {
      try {
        await this.execute();
      } catch (error) {
        logger.error('Error during event polling:', error);
      }
    });

    this.isPolling = true;
    logger.info('Event polling started');
  }

  stopPolling() {
    if (this.pollingTask) {
      this.pollingTask.stop();
      this.isPolling = false;
      logger.info('Event polling stopped');
    }
  }
}

module.exports = PollEventsUseCase; 