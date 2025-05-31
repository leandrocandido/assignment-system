const logger = require('../../shared/utils/logger');

class ConsumeEventsUseCase {
  constructor(eventRepository, messageQueue) {
    this.eventRepository = eventRepository;
    this.messageQueue = messageQueue;
    this.queueName = 'events.inbound';
  }

  async execute() {
    try {
      await this.messageQueue.consumeEvents(this.queueName, async (message) => {
        const { eventId, state } = message;
        
        if (!eventId || !state) {
          throw new Error('Invalid message format');
        }

        await this.eventRepository.updateEventState(eventId, state);
        logger.info(`Updated event ${eventId} state to ${state}`);
      });
    } catch (error) {
      logger.error('Error in consume events use case:', error);
      throw error;
    }
  }
}

module.exports = ConsumeEventsUseCase; 