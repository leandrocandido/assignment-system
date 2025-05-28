export interface EventProps {
  eventId?: string;
  region: string;
  deviceId: string;
  cameraId: string;
  ruleType: RuleType;
  severity: number;
  location: string;
  frameReference: string;
  processed: boolean;
  createdAt?: Date;
  updatedAt?: Date;
}

enum RuleType {
  MOTION_DETECTION = 'motion_detection',
  OBJECT_DETECTION = 'object_detection',
  FACE_DETECTION = 'face_detection',
  INTRUSION_DETECTION = 'intrusion_detection'
}
export default RuleType;

export class Event {
  private readonly props: EventProps;

  constructor(props: EventProps) {
    this.validate(props);
    this.props = {
      ...props,
      processed: props.processed || false,
      createdAt: props.createdAt || new Date(),
      updatedAt: props.updatedAt || new Date()
    };
  }

  private validate(props: EventProps): void {
    if (!props.region) {
      throw new Error('Region is required');
    }

    if (!props.deviceId) {
      throw new Error('Device ID is required');
    }

    if (!props.cameraId) {
      throw new Error('Camera ID is required');
    }

    if (!props.ruleType) {
      throw new Error('Rule type is required');
    }

    if (props.severity < 1 || props.severity > 5) {
      throw new Error('Severity must be between 1 and 5');
    }

    if (!props.location) {
      throw new Error('Location is required');
    }

    if (!props.frameReference) {
      throw new Error('Frame reference is required');
    }
  }

  get eventId(): string | undefined {
    return this.props.eventId;
  }

  get region(): string {
    return this.props.region;
  }

  get deviceId(): string {
    return this.props.deviceId;
  }

  get cameraId(): string {
    return this.props.cameraId;
  }

  get ruleType(): RuleType {
    return this.props.ruleType;
  }

  get severity(): number {
    return this.props.severity;
  }

  get location(): string {
    return this.props.location;
  }

  get frameReference(): string {
    return this.props.frameReference;
  }

  get processed(): boolean {
    return this.props.processed;
  }

  get createdAt(): Date {
    return this.props.createdAt!;
  }

  get updatedAt(): Date {
    return this.props.updatedAt!;
  }

  public markAsProcessed(): void {
    this.props.processed = true;
    this.props.updatedAt = new Date();
  }

  public toJSON(): EventProps {
    return {
      eventId: this.eventId,
      region: this.region,
      deviceId: this.deviceId,
      cameraId: this.cameraId,
      ruleType: this.ruleType,
      severity: this.severity,
      location: this.location,
      frameReference: this.frameReference,
      processed: this.processed,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt
    };
  }
} 