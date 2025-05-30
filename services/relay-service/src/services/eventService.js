const { Event } = require('../models');
const logger = require('../config/logger');
const cron = require('node-cron');
const { rabbitmq } = require('@relay-service/common');
const { Op } = require('sequelize');

class EventService {
  constructor() {
    this.isPolling = false;
    this.pollingTask = null;
    this.cronExpression = process.env.CRON_EXPRESSION || '*/15 * * * * *'; // Default to every 30 seconds
  }

  async getPendingEvents() {
    try {
      const events = await Event.findAll({
        where: {
          state: 'Not Viewed'
        },
        limit: process.env.EVENT_LIMIT || 10,
        order: [['createdAt', 'ASC']]
      });
      return events;
    } catch (error) {
      logger.error('Error fetching pending events:', error);
      throw error;
    }
  }

  async updateEventState(eventId, state, processingDetails = null) {
    try {
      const [updatedCount, updatedEvents] = await Event.update({
        state,
        processingDetails,
        updatedAt: new Date()
      }, {
        where: { eventId },
        returning: true
      });
      return updatedEvents[0];
    } catch (error) {
      logger.error(`Error updating event state for ID ${eventId}:`, error);
      throw error;
    }
  }

  async createEvent(eventData) {
    try {
      const event = await Event.create({
        eventId: eventData.eventId,
        region: eventData.region,
        ruleType: eventData.ruleType,
        location: eventData.location,
        severity: eventData.severity,
        state: eventData.state,
        metadata: eventData.metadata,
        createdAt: eventData.createdAt
      });
      logger.info(`Event created successfully with ID: ${eventData.eventId}`);
      return event;
    } catch (error) {
      logger.error('Error creating event:', error);
      throw error;
    }
  }

  async getEventById(eventId) {
    try {
      const event = await Event.findByPk(eventId);
      return event;
    } catch (error) {
      logger.error(`Error fetching event with ID ${eventId}:`, error);
      throw error;
    }
  }

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
      // const events = await Event.findAll({
      //   where: {
      //     createdAt: {
      //       [Op.gte]: new Date(Date.now() - 5 * 60 * 1000) // Last 5 minutes
      //     }
      //   },
      //   order: [['createdAt', 'ASC']],
      //   limit: 100
      // });

      const events = await this.getPendingEvents();

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
            location: event.location,
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