const { DedupEvent, Event, Assignment, OutboxAssignment, sequelize } = require('../models');
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const userSessionService = require('./userSessionService');

class AssignmentService {
  constructor() {
    this.MAX_ASSIGNMENTS = 50;
    this.SESSION_TTL = 300; // 5 minutes in seconds
  }

  async processEvent(eventData) {
    const transaction = await sequelize.transaction();

    try {
      // Check if event already exists
      const existingEvent = await DedupEvent.findOne({
        where: { eventId: eventData.eventId },
        transaction
      });

      if (existingEvent) {
        console.log(`Event ${eventData.eventId} already processed`);
        await transaction.commit();
        return;
      }

      // Find available user with least assignments
      const availableUser = await this.findAvailableUser();
      if (!availableUser) {
        console.log('No available users found');
        await transaction.commit();
        return;
      }

      // Create dedup event
      await DedupEvent.create({
        eventId: eventData.eventId
      }, { transaction });

      // Create event
      await Event.create({
        eventId: eventData.eventId,
        region: eventData.region,
        ruleType: eventData.ruleType,
        location: eventData.location,
        severity: eventData.severity,
        deviceId: eventData.deviceId,
        cameraId: eventData.cameraId,
        frameReference: eventData.frameReference
      }, { transaction });

      // Create assignment
      const assignment = await Assignment.create({
        userId: availableUser.userId,
        eventId: eventData.eventId,
        status: 'pending'
      }, { transaction });

      // Create outbox entry
      await OutboxAssignment.create({
        assignmentId: assignment.assignmentId,
        status: 'pending'
      }, { transaction });

      // Increment assignment count in Redis
      await redis.hincrby('user_assignments', availableUser.userId, 1);

      await transaction.commit();
      return assignment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findAvailableUser() {
    // Get all active users from Redis
    const activeUsers = await redis.hgetall('active_users');
    if (!activeUsers || Object.keys(activeUsers).length === 0) {
      return null;
    }

    // Get assignment counts for all users
    const assignmentCounts = await redis.hgetall('user_assignments');

    // Find user with least assignments
    let selectedUser = null;
    let minAssignments = this.MAX_ASSIGNMENTS;

    for (const userId of Object.keys(activeUsers)) {
      const count = parseInt(assignmentCounts[userId] || '0');
      if (count < minAssignments) {
        selectedUser = { userId: parseInt(userId), count };
        minAssignments = count;
      }
    }

    return selectedUser;
  }

  async updateAssignment(assignmentId, status) {
    const transaction = await sequelize.transaction();

    try {
      const assignment = await Assignment.findByPk(assignmentId, { transaction });
      if (!assignment) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }

      assignment.status = status;
      await assignment.save({ transaction });

      await OutboxAssignment.create({
        assignmentId: assignment.assignmentId,
        status
      }, { transaction });

      if (status === 'completed' || status === 'rejected') {
        // Decrement assignment count in Redis
        await redis.hincrby('user_assignments', assignment.userId, -1);
      }

      await transaction.commit();
      return assignment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async markUserActive(userId) {
    await redis.hset('active_users', userId, '1');
    await redis.expire(`active_users:${userId}`, this.SESSION_TTL);
  }

  async markUserInactive(userId) {
    await redis.hdel('active_users', userId);
  }

  async getAssignmentCount(userId) {
    try {
      const result = await sequelize.query(
        'SELECT COUNT(*) FROM events WHERE assigned_to = $1 AND state = $2',
        { replacements: [userId, 'Processing'], type: sequelize.QueryTypes.SELECT }
      );
      return parseInt(result[0].count);
    } catch (error) {
      logger.error(`Error getting assignment count for user ${userId}:`, error);
      throw error;
    }
  }

  async findEligibleUser() {
    try {
      // Get active users from Redis
      const activeUsers = await userSessionService.getActiveUsers();
      
      if (activeUsers.length === 0) {
        logger.info('No active users available for assignment');
        return null;
      }

      // Get assignment counts for active users
      const assignmentCounts = await Promise.all(
        activeUsers.map(async (userId) => {
          const count = await this.getAssignmentCount(userId);
          return { userId, count };
        })
      );

      // Filter users who haven't reached the maximum assignments
      const maxAssignments = parseInt(process.env.MAX_ASSIGNMENTS_PER_USER) || 50;
      const eligibleUsers = assignmentCounts.filter(user => user.count < maxAssignments);

      if (eligibleUsers.length === 0) {
        logger.info('No eligible users available (all have reached maximum assignments)');
        return null;
      }

      // Find user with least assignments
      const selectedUser = eligibleUsers.reduce((min, user) => 
        user.count < min.count ? user : min
      );

      return selectedUser.userId;
    } catch (error) {
      logger.error('Error finding eligible user:', error);
      throw error;
    }
  }

  async assignEvent(event) {
    try {
      const userId = await this.findEligibleUser();
      
      if (!userId) {
        logger.info(`No eligible user found for event ${event.event_id}`);
        return null;
      }

      const result = await sequelize.query(
        `UPDATE events 
         SET assigned_to = $1, 
             assigned_at = NOW(),
             state = 'Processing'
         WHERE event_id = $2
         RETURNING *`,
        { replacements: [userId, event.event_id], type: sequelize.QueryTypes.UPDATE }
      );

      const assignedEvent = result[0][0];
      logger.info(`Event ${event.event_id} assigned to user ${userId}`);
      
      return assignedEvent;
    } catch (error) {
      logger.error(`Error assigning event ${event.event_id}:`, error);
      throw error;
    }
  }

  async getUserAssignments(userId) {
    try {
      const result = await sequelize.query(
        'SELECT * FROM events WHERE assigned_to = $1 ORDER BY assigned_at DESC',
        { replacements: [userId], type: sequelize.QueryTypes.SELECT }
      );
      return result[0];
    } catch (error) {
      logger.error(`Error getting assignments for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new AssignmentService(); 