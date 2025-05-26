const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const DedupEvent = sequelize.define('DedupEvent', {
    eventId: {
      type: DataTypes.UUID,
      primaryKey: true
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW
    }
  }, {
    tableName: 'dedup_events',
    timestamps: false
  });

  return DedupEvent;
}; 