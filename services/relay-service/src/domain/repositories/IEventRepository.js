class IEventRepository {
  async findPendingEvents(limit) {
    throw new Error('Method not implemented');
  }

  async updateEventState(eventId, state) {
    throw new Error('Method not implemented');
  }

  async save(event) {
    throw new Error('Method not implemented');
  }
}

module.exports = IEventRepository; 