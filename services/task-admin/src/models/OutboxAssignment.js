const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const OutboxAssignment = sequelize.define('OutboxAssignment', {
        assignmentId: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'completed',
            validate: {
                isIn: [['completed']]
            }
        }
    }, {
        tableName: 'outbox_assignments',
        timestamps: true,
        underscored: true
    });

    return OutboxAssignment;
}; 