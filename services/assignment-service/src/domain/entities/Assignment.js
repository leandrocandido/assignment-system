class Assignment {
  constructor(id, eventId, userId, status = 'pending', createdAt = new Date()) {
    this.id = id;
    this.eventId = eventId;
    this.userId = userId;
    this.status = status;
    this.createdAt = createdAt;
  }

  toJSON() {
    return {
      id: this.id,
      eventId: this.eventId,
      userId: this.userId,
      status: this.status,
      createdAt: this.createdAt
    };
  }
}

module.exports = Assignment; 