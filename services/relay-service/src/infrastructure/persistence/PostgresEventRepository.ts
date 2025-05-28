import { injectable } from 'inversify';
import { Pool } from 'pg';
import { Event, EventProps } from '../../core/entities/Event';
import { IEventRepository } from '../../core/interfaces/IEventRepository';
import RuleType from '../../core/entities/Event';

@injectable()
export class PostgresEventRepository implements IEventRepository {
  constructor(private readonly pool: Pool) {}

  async findById(eventId: string): Promise<Event | null> {
    const result = await this.pool.query(
      'SELECT * FROM events WHERE event_id = $1',
      [eventId]
    );

    if (result.rows.length === 0) {
      return null;
    }

    return this.mapToEntity(result.rows[0]);
  }

  async findUnprocessed(limit: number): Promise<Event[]> {
    const result = await this.pool.query(
      'SELECT * FROM events WHERE processed = false ORDER BY created_at ASC LIMIT $1',
      [limit]
    );

    return result.rows.map(row => this.mapToEntity(row));
  }

  async save(event: Event): Promise<Event> {
    const result = await this.pool.query(
      `INSERT INTO events (
        region, device_id, camera_id, type, severity, location, frame_reference, processed
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8) RETURNING *`,
      [
        event.region,
        event.deviceId,
        event.cameraId,
        event.ruleType,
        event.severity,
        event.location,
        event.frameReference,
        event.processed
      ]
    );

    return this.mapToEntity(result.rows[0]);
  }

  async update(event: Event): Promise<Event> {
    if (!event.eventId) {
      throw new Error('Cannot update event without event_id');
    }

    const result = await this.pool.query(
      `UPDATE events SET
        region = $1,
        device_id = $2,
        camera_id = $3,
        type = $4,
        severity = $5,
        location = $6,
        frame_reference = $7,
        processed = $8
      WHERE event_id = $9
      RETURNING *`,
      [
        event.region,
        event.deviceId,
        event.cameraId,
        event.ruleType,
        event.severity,
        event.location,
        event.frameReference,
        event.processed,
        event.eventId
      ]
    );

    if (result.rows.length === 0) {
      throw new Error(`Event with id ${event.eventId} not found`);
    }

    return this.mapToEntity(result.rows[0]);
  }

  async delete(eventId: string): Promise<void> {
    await this.pool.query('DELETE FROM events WHERE event_id = $1', [eventId]);
  }

  private mapToEntity(row: any): Event {
    const props: EventProps = {
      eventId: row.event_id,
      region: row.region,
      deviceId: row.device_id,
      cameraId: row.camera_id,
      ruleType: row.rule_type as RuleType,
      severity: row.severity,
      location: row.location,
      frameReference: row.frame_reference,
      processed: row.processed,
      createdAt: row.created_at,
      updatedAt: row.updated_at
    };

    return new Event(props);
  }
} 