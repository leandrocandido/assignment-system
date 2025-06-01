const { Sequelize, DataTypes } = require('sequelize');
const IAssignmentRepository = require('../../domain/repositories/IAssignmentRepository');
const Assignment = require('../../domain/entities/Assignment');
const logger = require('../../shared/utils/logger');

class PostgresAssignmentRepository extends IAssignmentRepository {
  constructor() {
    super();
    this.sequelize = new Sequelize({
      host: process.env.POSTGRES_HOST,
      port: process.env.POSTGRES_PORT,
      username: process.env.POSTGRES_USER,
      password: process.env.POSTGRES_PASSWORD,
      database: process.env.POSTGRES_DB,
      dialect: 'postgres',
      logging: false
    });

    // Define Assignment model to match existing schema
    this.AssignmentModel = this.sequelize.define('Assignment', {
      assignment_id: {
        type: DataTypes.INTEGER,
        primaryKey: true,
        autoIncrement: true
      },
      user_id: {
        type: DataTypes.INTEGER,
        allowNull: false
      },
      event_id: {
        type: DataTypes.UUID,
        allowNull: false,
        references: {
          model: 'events',
          key: 'event_id'
        }
      },
      status: {
        type: DataTypes.STRING(20),
        allowNull: false,
        validate: {
          isIn: [['pending', 'approved', 'rejected']]
        }
      },
      deleted: {
        type: DataTypes.BOOLEAN,
        defaultValue: false
      },
      created_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
      },
      updated_at: {
        type: DataTypes.DATE,
        defaultValue: Sequelize.NOW
      }
    }, {
      tableName: 'assignments',
      timestamps: true,
      underscored: true
    });
  }

  async createAssignment(assignment) {
    try {
      const result = await this.AssignmentModel.create({
        event_id: assignment.eventId,
        user_id: assignment.userId,
        status: assignment.status,
        created_at: assignment.createdAt
      });
      return new Assignment(
        result.assignment_id,
        result.event_id,
        result.user_id,
        result.status,
        result.created_at
      );
    } catch (error) {
      logger.error('Error creating assignment:', error);
      throw error;
    }
  }

  async getAssignmentsByUser(userId) {
    try {
      const assignments = await this.AssignmentModel.findAll({
        where: { user_id: userId }
      });
      return assignments.map(a => new Assignment(
        a.assignment_id,
        a.event_id,
        a.user_id,
        a.status,
        a.created_at
      ));
    } catch (error) {
      logger.error('Error getting assignments by user:', error);
      throw error;
    }
  }

  async getUserAssignmentCounts() {
    try {
      const results = await this.AssignmentModel.findAll({
        attributes: [
          'user_id',
          [Sequelize.fn('COUNT', Sequelize.col('assignment_id')), 'count']
        ],
        group: ['user_id']
      });

      return results.reduce((acc, result) => {
        acc[result.user_id] = parseInt(result.get('count'));
        return acc;
      }, {});
    } catch (error) {
      logger.error('Error getting user assignment counts:', error);
      throw error;
    }
  }
}

module.exports = PostgresAssignmentRepository; 