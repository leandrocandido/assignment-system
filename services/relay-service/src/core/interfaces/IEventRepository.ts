import { Event } from '../entities/Event';

export interface IEventRepository {
  findById(eventId: string): Promise<Event | null>;
  findUnprocessed(limit: number): Promise<Event[]>;
  save(event: Event): Promise<Event>;
  update(event: Event): Promise<Event>;
  delete(eventId: string): Promise<void>;
} 