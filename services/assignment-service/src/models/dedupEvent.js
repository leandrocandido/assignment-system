const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DedupEvent = sequelize.define('DedupEvent', {
    eventId: {
      type: DataTypes.UUID,
      primaryKey: true,
      field: 'event_id'
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'dedup_events',
    timestamps: false
  });

  return DedupEvent;
}; 