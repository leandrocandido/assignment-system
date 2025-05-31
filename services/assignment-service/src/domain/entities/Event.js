class Event {
  constructor(id, state, ruleType, region, location, severity, deviceId, cameraId, frameReference, createdAt) {
    this.id = id;
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

  markAsAssigned() {
    this.state = 'Assigned';
  }

  toJSON() {
    return {
      id: this.id,
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