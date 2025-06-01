class Event {
  constructor(eventId, state, ruleType, region, location, severity, deviceId, cameraId, frameReference, createdAt) {
    this.eventId = eventId
    this.state = state;
    this.ruleType = ruleType;
    this.region = region;
    this.location = location;
    this.severity = severity;
    this.deviceId = deviceId;
    this.cameraId = cameraId;
    this.frameReference = frameReference;
    this.createdAt = createdAt;
  }

  isAssignable() {
    return this.state === 'Not Viewed';
  }

  toJSON() {
    return {
      eventId: this.eventId,
      state: this.state,
      ruleType: this.ruleType,
      region: this.region,
      location: this.location,
      severity: this.severity,
      deviceId: this.deviceId,
      cameraId: this.cameraId,
      frameReference: this.frameReference,
      createdAt: this.createdAt
    };
  }
}

module.exports = Event; 