const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const Event = sequelize.define('Event', {
    eventId: {
      type: DataTypes.UUID,
      primaryKey: true,
      field: 'event_id'
    },
    region: DataTypes.STRING,
    ruleType: {
      type: DataTypes.STRING,
      field: 'rule_type'
    },
    location: DataTypes.STRING,
    severity: DataTypes.INTEGER,
    deviceId: {
      type: DataTypes.STRING,
      field: 'device_id'
    },
    cameraId: {
      type: DataTypes.STRING,
      field: 'camera_id'
    },
    frameReference: {
      type: DataTypes.STRING,
      field: 'frame_reference'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    },
    updatedAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'updated_at'
    }
  }, {
    tableName: 'events',
    timestamps: true
  });

  return Event;
}; 