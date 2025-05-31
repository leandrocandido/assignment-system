class IMessageQueue {
  async connect() {
    throw new Error('Method not implemented');
  }

  async close() {
    throw new Error('Method not implemented');
  }

  async publishEvent(event) {
    throw new Error('Method not implemented');
  }

  async consumeEvents(queueName, handler) {
    throw new Error('Method not implemented');
  }
}

module.exports = IMessageQueue; 