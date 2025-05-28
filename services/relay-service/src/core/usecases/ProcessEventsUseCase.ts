import { injectable, inject } from 'inversify';
import { IEventRepository } from '../interfaces/IEventRepository';
import { IEventQueue, EventResponse } from '../interfaces/IEventQueue';
import { Event } from '../entities/Event';

export interface ProcessEventsInput {
  batchSize: number;
}

export interface ProcessEventsOutput {
  processedCount: number;
  failedCount: number;
}

@injectable()
export class ProcessEventsUseCase {
  constructor(
    @inject('EventRepository') private readonly eventRepository: IEventRepository,
    @inject('EventQueue') private readonly eventQueue: IEventQueue
  ) {}

  async execute(input: ProcessEventsInput): Promise<ProcessEventsOutput> {
    const events = await this.eventRepository.findUnprocessed(input.batchSize);
    let processedCount = 0;
    let failedCount = 0;

    for (const event of events) {
      try {
        await this.eventQueue.publishEvent(event);
        //event.markAsProcessed();
        //await this.eventRepository.update(event);
        processedCount++;
      } catch (error) {
        console.error(`Failed to process event ${event.eventId}:`, error);
        failedCount++;
      }
    }

    return {
      processedCount,
      failedCount
    };
  }

  async handleResponse(response: EventResponse): Promise<void> {
    const event = await this.eventRepository.findById(response.eventId);
    if (!event) {
      console.error(`Event not found for response: ${response.eventId}`);
      return;
    }

    if (response.status === 'rejected') {
      console.error(`Event ${response.eventId} was rejected: ${response.reason}`);
      // Here you could implement retry logic or mark the event for manual review
    }
  }
} 