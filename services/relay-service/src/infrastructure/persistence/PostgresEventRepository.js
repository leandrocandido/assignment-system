const { Sequelize, Model, DataTypes } = require('sequelize');
const IEventRepository = require('../../domain/repositories/IEventRepository');
const Event = require('../../domain/entities/Event');
const logger = require('../../shared/utils/logger');

class EventModel extends Model {}

class PostgresEventRepository extends IEventRepository {
  constructor(sequelize) {
    super();
    this.sequelize = sequelize;
    
    EventModel.init({
      eventId: {
        type: DataTypes.UUID,
        defaultValue: Sequelize.UUIDV4,
        primaryKey: true,
        field: "event_id"
      },
      state: {
        type: DataTypes.STRING,
        allowNull: false,
        defaultValue: 'Not Viewed'
      },
      ruleType: {
        type: DataTypes.STRING,
        allowNull: false,
        field: "rule_type"
      },
      region: {
        type: DataTypes.STRING,
        allowNull: false
      },
      location: {
        type: DataTypes.STRING,
        allowNull: false
      },
      severity: {
        type: DataTypes.STRING,
        allowNull: false
      },
      deviceId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'device_id'
      },
      cameraId: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'camera_id'
      },
      frameReference: {
        type: DataTypes.STRING,
        allowNull: false,
        field: 'frame_reference'
      }
    }, {
      sequelize,
      modelName: 'Event',
      tableName: 'events',
      underscored: true,
      timestamps: true
    });
  }

  async findPendingEvents(limit) {
    try {
      const events = await EventModel.findAll({
        where: {
          state: 'Not Viewed'
        },
        limit: limit,
        order: [['createdAt', 'ASC']]
      });

      return events.map(event => new Event(
        event.eventId,
        event.state,
        event.ruleType,
        event.region,
        event.location,
        event.severity,
        event.deviceId,
        event.cameraId,
        event.frameReference,
        event.createdAt
      ));
    } catch (error) {
      logger.error('Error fetching pending events:', error);
      throw error;
    }
  }

  async updateEventState(eventId, state) {
    try {
      const [updatedRows] = await EventModel.update(
        { state },
        { where: { eventId: eventId } }
      );
      return updatedRows > 0;
    } catch (error) {
      logger.error('Error updating event state:', error);
      throw error;
    }
  }

  async save(event) {
    try {
      const savedEvent = await EventModel.create(event.toJSON());
      return new Event(
        savedEvent.eventId,
        savedEvent.state,
        savedEvent.ruleType,
        savedEvent.region,
        savedEvent.location,
        savedEvent.severity,
        savedEvent.deviceId,
        savedEvent.cameraId,
        savedEvent.frameReference,
        savedEvent.createdAt
      );
    } catch (error) {
      logger.error('Error saving event:', error);
      throw error;
    }
  }
}

module.exports = PostgresEventRepository; 