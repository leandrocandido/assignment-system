const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const sequelize = new Sequelize(
    process.env.DB_NAME || 'assignment_system',
    process.env.DB_USER || 'postgres',
    process.env.DB_PASSWORD || 'postgres',
    {
        host: process.env.DB_HOST || 'localhost',
        port: process.env.DB_PORT || 5432,
        dialect: 'postgres',
        logging: msg => logger.debug(msg)
    }
);

// Define models
const Assignment = require('./Assignment')(sequelize);
const Event = require('./Event')(sequelize);
const OutboxAssignment = require('./OutboxAssignment')(sequelize);

// Define associations
Assignment.belongsTo(Event, { foreignKey: 'eventId' });
Event.hasMany(Assignment, { foreignKey: 'eventId' });
OutboxAssignment.belongsTo(Assignment, { foreignKey: 'assignmentId' });
Assignment.hasOne(OutboxAssignment, { foreignKey: 'assignmentId' });

module.exports = {
    sequelize,
    Assignment,
    Event,
    OutboxAssignment
}; 