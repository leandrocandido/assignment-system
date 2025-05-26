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
const DedupEvent = require('./dedupEvent')(sequelize);
const OutboxAssignment = require('./outboxAssignment')(sequelize);

// Define associations
Event.hasOne(Assignment);
Assignment.belongsTo(Event);

DedupEvent.belongsTo(Event);
Event.hasOne(DedupEvent);

OutboxAssignment.belongsTo(Assignment);
Assignment.hasOne(OutboxAssignment);

module.exports = {
  sequelize,
  Event,
  Assignment,
  DedupEvent,
  OutboxAssignment
}; 