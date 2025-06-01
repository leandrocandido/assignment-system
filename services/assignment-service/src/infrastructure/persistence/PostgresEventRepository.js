const { Sequelize, DataTypes, QueryTypes } = require('sequelize');
const IEventRepository = require('../../domain/repositories/IEventRepository');
const Event = require('../../domain/entities/Event');
const logger = require('../../shared/utils/logger');

class PostgresEventRepository extends IEventRepository {
  constructor() {
    super();
    this.sequelize = new Sequelize({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      dialect: 'postgres',
      logging: false
    });

    // Define Event model to match existing schema
    this.EventModel = this.sequelize.define('Event', {
      event_id: {
        type: DataTypes.UUID,
        primaryKey: true,
        allowNull: false,
      },
      region: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      rule_type: {
        type: DataTypes.STRING(100),
        allowNull: false
      },
      location: {
        type: DataTypes.STRING(255),
        allowNull: true
      },
      severity: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      device_id: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      camera_id: {
        type: DataTypes.STRING(100),
        allowNull: true
      },
      frame_reference: {
        type: DataTypes.STRING(255),
        allowNull: true
      }
    }, {
      tableName: 'events',
      timestamps: true,
      createdAt: 'created_at',
      updatedAt: 'updated_at'
    });
  }

  async saveEvent(event) {
    try {
      await this.EventModel.create({
        event_id: event.eventId,
        region: event.region,
        rule_type: event.ruleType,
        location: event.location,
        severity: event.severity,
        device_id: event.deviceId,
        camera_id: event.cameraId,
        frame_reference: event.frameReference,
        created_at: event.createdAt,
        updated_at: new Date()
      });
    } catch (error) {
      logger.error('Error saving event:', error);
      throw error;
    }
  }

  async eventExists(eventId) {
    try {
      if (!eventId) {
        throw new Error('eventId is required');
      }
      
      const result = await this.sequelize.query(
        'SELECT 1 FROM events WHERE event_id = :event_id::uuid LIMIT 1',
        {
          replacements: { event_id: eventId },
          type: QueryTypes.SELECT,
          raw: true
        }
      );
      return result.length > 0;
    } catch (error) {
      logger.error('Error checking if event exists:', error);
      throw error;
    }
  }

  async isDuplicate(eventId) {
    try {
      if (!eventId) {
        throw new Error('eventId is required');
      }

      const result = await this.sequelize.query(
        'SELECT 1 FROM dedup_events WHERE event_id = :event_id::uuid LIMIT 1',
        {
          replacements: { event_id: eventId },
          type: QueryTypes.SELECT,
          raw: true
        }
      );
      return result.length > 0;
    } catch (error) {
      logger.error('Error checking if event is duplicate:', error);
      throw error;
    }
  }

  async markEventAsProcessed(eventId) {
    try {
      if (!eventId) {
        throw new Error('eventId is required');
      }

      await this.sequelize.query(
        'INSERT INTO dedup_events (event_id, created_at) VALUES (:event_id::uuid, NOW())',
        {
          replacements: { event_id: eventId },
          type: QueryTypes.INSERT
        }
      );
    } catch (error) {
      logger.error('Error marking event as processed:', error);
      throw error;
    }
  }
}

module.exports = PostgresEventRepository; 