const db = require('../config/database');
const logger = require('../config/logger');
const cron = require('node-cron');
const { Event } = require('../models');
const { rabbitmq } = require('@relay-service/common');
const { Op } = require('sequelize');

class EventService {
  constructor() {
    this.isPolling = false;
    this.pollingTask = null;
    this.cronExpression = process.env.CRON_EXPRESSION || '*/10 * * * * *'; // Default to every 10 seconds
  }

  async getPendingEvents() {
    try {
      const result = await db.query(
        'SELECT * FROM events WHERE state = $1 LIMIT 100',
        ['Not Viewed']
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending events:', error);
      throw error;
    }
  }

  // async updateEventState(eventId, state, processingDetails = null) {
  //   try {
  //     const result = await db.query(
  //       'UPDATE events SET state = $1, processing_details = $2, updated_at = NOW() WHERE event_id = $3 RETURNING *',
  //       [state, processingDetails, eventId]
  //     );
  //     return result.rows[0];
  //   } catch (error) {
  //     logger.error(`Error updating event state for ID ${eventId}:`, error);
  //     throw error;
  //   }
  // }

  // async createEvent(eventData) {
  //   try {
  //     const result = await db.query(
  //       `INSERT INTO events (
  //         event_id, region, rule_type, location, severity,
  //         created_at, state, metadata, updated_at
  //       ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW()) RETURNING *`,
  //       [
  //         eventData.eventId,
  //         eventData.region,
  //         eventData.ruleType,
  //         eventData.location,
  //         eventData.severity,
  //         eventData.createdAt,
  //         eventData.state,
  //         eventData.metadata
  //       ]
  //     );
  //     logger.info(`Event created successfully with ID: ${eventData.eventId}`);
  //     return result.rows[0];
  //   } catch (error) {
  //     logger.error('Error creating event:', error);
  //     throw error;
  //   }
  // }

  // async getEventById(eventId) {
  //   try {
  //     const result = await db.query(
  //       'SELECT * FROM events WHERE event_id = $1',
  //       [eventId]
  //     );
  //     return result.rows[0];
  //   } catch (error) {
  //     logger.error(`Error fetching event with ID ${eventId}:`, error);
  //     throw error;
  //   }
  // }

  async startEventPolling() {
    if (this.isPolling) {
      console.log('Event polling is already running');
      return;
    }

    console.log(`Starting event polling with cron expression: ${this.cronExpression}`);
    this.isPolling = true;

    this.pollingTask = cron.schedule(this.cronExpression, async () => {
      try {
        await this.pollAndProcessEvents();
      } catch (error) {
        console.error('Error in event polling:', error);
      }
    });
  }

  async stopEventPolling() {
    if (this.pollingTask) {
      this.pollingTask.stop();
      this.isPolling = false;
      console.log('Event polling stopped');
    }
  }

  async pollAndProcessEvents() {
    try {
      // Find events that haven't been processed yet
      const events = await Event.findAll({
        where: {
          createdAt: {
            [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
          }
        },
        order: [['createdAt', 'ASC']],
        limit: 100
      });

      if (events.length === 0) {
        return;
      }

      console.log(`Found ${events.length} events to process`);

      // Process each event
      for (const event of events) {
        try {
          await rabbitmq.publishMessage('event_assignments', {
            eventId: event.eventId,
            region: event.region,
            ruleType: event.ruleType,
            severity: event.severity,
            deviceId: event.deviceId,
            cameraId: event.cameraId,
            frameReference: event.frameReference,
            timestamp: event.createdAt
          });

          console.log(`Published event ${event.eventId} to queue`);
        } catch (error) {
          console.error(`Error publishing event ${event.eventId}:`, error);
        }
      }
    } catch (error) {
      console.error('Error in pollAndProcessEvents:', error);
      throw error;
    }
  }
}

module.exports = new EventService(); 