const { Sequelize } = require('sequelize');
const config = require('../config/database');

const sequelize = new Sequelize(
  config.database,
  config.username,
  config.password,
  {
    host: config.host,
    port: config.port,
    dialect: 'postgres',
    logging: false
  }
);

// Define models
const Event = require('./event')(sequelize);
const Assignment = require('./assignment')(sequelize);
const OutboxAssignment = require('./outboxAssignment')(sequelize);

// Define associations based on actual database schema
Event.hasMany(Assignment, {
  foreignKey: {
    name: 'eventId',
    field: 'event_id'
  }
});

Assignment.belongsTo(Event, {
  foreignKey: {
    name: 'eventId',
    field: 'event_id'
  }
});

// Assignment.hasMany(OutboxAssignment, {
//   foreignKey: {
//     name: 'assignmentId',
//     field: 'assignment_id'
//   }
// });

// OutboxAssignment.belongsTo(Assignment, {
//   foreignKey: {
//     name: 'assignmentId',
//     field: 'assignment_id'
//   }
// });

module.exports = {
  sequelize,
  Event,
  Assignment,
  OutboxAssignment
}; 