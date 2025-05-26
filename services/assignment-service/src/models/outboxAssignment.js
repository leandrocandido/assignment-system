const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
  const OutboxAssignment = sequelize.define('OutboxAssignment', {
    id: {
      type: DataTypes.INTEGER,
      primaryKey: true,
      autoIncrement: true
    },
    assignmentId: {
      type: DataTypes.INTEGER,
      allowNull: false,
      field: 'assignment_id'
    },
    status: {
      type: DataTypes.ENUM('pending', 'assigned', 'completed', 'rejected'),
      allowNull: false
    },
    createdAt: {
      type: DataTypes.DATE,
      defaultValue: DataTypes.NOW,
      field: 'created_at'
    }
  }, {
    tableName: 'outbox_assignments',
    timestamps: false
  });

  return OutboxAssignment;
}; 