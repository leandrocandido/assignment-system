const { DataTypes } = require('sequelize');

module.exports = (sequelize) => {
    const Assignment = sequelize.define('Assignment', {
        assignmentId: {
            type: DataTypes.UUID,
            primaryKey: true,
            allowNull: false
        },
        eventId: {
            type: DataTypes.UUID,
            allowNull: false
        },
        status: {
            type: DataTypes.STRING,
            allowNull: false,
            defaultValue: 'pending',
            validate: {
                isIn: [['pending', 'completed', 'failed']]
            }
        }
    }, {
        tableName: 'assignments',
        timestamps: true,
        underscored: true
    });

    return Assignment;
}; 