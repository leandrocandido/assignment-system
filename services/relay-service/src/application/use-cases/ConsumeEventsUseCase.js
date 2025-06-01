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


        console.log(`message from inbound queue ${message}`);

        const { eventId, assignmentId } = message;
        
        if (!eventId || !assignmentId) {
          throw new Error('Invalid message format');
        }

        await this.eventRepository.updateEventState(eventId, 'Viewed');
        logger.info(`Updated event ${eventId} state to Viewed`);

        // Publish message to acknowledgment queue
        await this.messageQueue.publishEventToQueue('ack.queue', message);
        logger.info(`Published message to ack.queue: ${JSON.stringify(message)}`);

      });
    } catch (error) {
      logger.error('Error in consume events use case:', error);
      throw error;
    }
  }
}

module.exports = ConsumeEventsUseCase; 