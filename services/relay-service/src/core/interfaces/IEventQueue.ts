import { Event } from '../entities/Event';

export interface IEventQueue {
  publishEvent(event: Event): Promise<void>;
  consumeResponse(callback: (response: EventResponse) => Promise<void>): Promise<void>;
  close(): Promise<void>;
}

export interface EventResponse {
  eventId: string;
  status: 'accepted' | 'rejected';
  reason?: string;
} 