class IEventRepository {
  async saveEvent(event) {
    throw new Error('Method not implemented');
  }

  async eventExists(eventId) {
    throw new Error('Method not implemented');
  }

  async isDuplicate(eventId) {
    throw new Error('Method not implemented');
  }

  async markEventAsProcessed(eventId) {
    throw new Error('Method not implemented');
  }
}

module.exports = IEventRepository; 