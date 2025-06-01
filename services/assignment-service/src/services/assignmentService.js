const { Event, Assignment, OutboxAssignment, sequelize } = require('../models');
const redis = require('../config/redis');
const { v4: uuidv4 } = require('uuid');
const logger = require('../config/logger');
const userSessionService = require('./userSessionService');

// Configuration constants
const DEFAULT_MAX_ASSIGNMENTS = 50;
const DEFAULT_SESSION_TTL = 300;

class AssignmentService {
  constructor(eventRepository) {   
    this.MAX_ASSIGNMENTS = parseInt(process.env.MAX_ASSIGNMENTS || DEFAULT_MAX_ASSIGNMENTS);
    this.SESSION_TTL = parseInt(process.env.SESSION_TTL || DEFAULT_SESSION_TTL);
    this.eventRepository = eventRepository;
    
    logger.info('AssignmentService Configuration:', {
      MAX_ASSIGNMENTS: this.MAX_ASSIGNMENTS,
      SESSION_TTL: this.SESSION_TTL
    });
  }

  async syncAssignmentCounts() {
    try {
      // Get all users from ever_logged_users set
      const everLoggedUsers = await redis.smembers('ever_logged_users');
      if (!everLoggedUsers || everLoggedUsers.length === 0) {
        logger.info('No users have ever logged in, skipping assignment count sync');
        return;
      }

      // For each user, get their pending assignments count from database
      for (const userId of everLoggedUsers) {
        const [results] = await sequelize.query(
          `SELECT COUNT(*) as count 
           FROM assignments 
           WHERE user_id = :userId 
           AND status = 'pending' 
           AND deleted = false`,
          {
            replacements: { userId: parseInt(userId) },
            type: sequelize.QueryTypes.SELECT
          }
        );

        const count = parseInt(results.count);
        logger.info(`User ${userId} has ${count} pending assignments`);

        // Update Redis hash with the count
        await redis.hset('user_assignments', userId, count);
      }

      logger.info('Successfully synced assignment counts to Redis');
    } catch (error) {
      logger.error('Error syncing assignment counts:', error);
      throw error;
    }
  }

  async processEvent(eventData) {
    const transaction = await sequelize.transaction();
    console.log('Processing event:', eventData);
    try {
      // Check if event already exists using repository
      const isDuplicate = await this.eventRepository.isDuplicate(eventData.eventId);

      if (isDuplicate) {
        console.log(`Event ${eventData.eventId} already processed`);
        await transaction.commit();
        return;
      }

      // Get available user from Redis
      const availableUser = await this.findAvailableUser();
      
      if (!availableUser) {
        console.log('No available users found');
        await transaction.rollback();
        return;
      }

      // Mark event as processed using repository
      await this.eventRepository.markEventAsProcessed(eventData.eventId);

      // Check if event exists in events table
      const eventExists = await this.eventRepository.eventExists(eventData.eventId);

      // Only create event if it doesn't exist
      if (!eventExists) {
        const event = {
          id: eventData.eventId,
          region: eventData.region,
          ruleType: eventData.ruleType,
          location: eventData.location,
          severity: eventData.severity,
          deviceId: eventData.deviceId,
          cameraId: eventData.cameraId,
          frameReference: eventData.frameReference
        };
        await this.eventRepository.saveEvent(event);
      }     

      // Create assignment
      const assignment = await Assignment.create({
        userId: availableUser.userId,
        eventId: eventData.eventId,
        status: 'pending'
      }, { transaction });

      await transaction.commit();

      // Increment assignment count in Redis
      // Get current session data
      
      const userSession = await redis.get(`user:${availableUser.userId}`);
      if (userSession) {
        const sessionData = JSON.parse(userSession);
        sessionData.assignments = (sessionData.assignments || 0) + 1;

        await redis.setex(
          `user:${availableUser.userId}`,
          process.env.SESSION_TTL,
          JSON.stringify(sessionData)
        );

        logger.info(`Incremented assignments count for user ${availableUser.userId} to ${sessionData.assignments}`);
      }

      return assignment;
    } catch (error) {
      await transaction.rollback();
      throw error;
    }
  }

  async findAvailableUser() {   
    try {
      // Get users from ever_logged_users set
      const everLoggedUsers = await redis.smembers('ever_logged_users');
      if (!everLoggedUsers || everLoggedUsers.length === 0) {
        logger.info('No users have ever logged in');
        return null;
      }

      logger.info(`Found ${everLoggedUsers.length} users who have logged in before`);

      // Check which users have active sessions
      const activeUsers = [];
      for (const userId of everLoggedUsers) {
        const userKey = `user:${userId}`;
        const exists = await redis.exists(userKey);
        if (exists) {
          activeUsers.push(userId);
        }
      }

      if (activeUsers.length === 0) {
        logger.info('No users with active sessions found');
        return null;
      }

      logger.info(`Found ${activeUsers.length} users with active sessions`);

      // Get assignment counts for active users
      // Get assignment counts from user sessions
      const sessionAssignmentCounts = await Promise.all(
        activeUsers.map(async (userId) => {
          const userSession = await redis.get(`user:${userId}`);
          let assignments = 0;
          if (userSession) {
            try {
              const sessionData = JSON.parse(userSession);
              assignments = sessionData.assignments || 0;
            } catch (error) {
              logger.error(`Error parsing session data for user ${userId}:`, error);
            }
          }
          return { userId: parseInt(userId), count: assignments };
        })
      );

      // Sort users by assignment count
      const eligibleUsers = sessionAssignmentCounts.filter(user => user.count < process.env.MAX_ASSIGNMENTS );
      eligibleUsers.sort((a, b) => a.count - b.count);

      // Get user with least assignments from sessions
      const selectedUser = eligibleUsers[0];
      if (selectedUser) {
        logger.info(`User ${selectedUser.userId} has least assignments: ${selectedUser.count}`);
      }

      return selectedUser;

    } catch (error) {
      logger.error('Error finding available user:', error);
      return null;
    }
  }

  async updateAssignment(assignmentId, status) {
    const transaction = await sequelize.transaction();

    try {
      const assignment = await Assignment.findByPk(assignmentId, { transaction });
      if (!assignment) {
        throw new Error(`Assignment ${assignmentId} not found`);
      }

      console.log(`assignment Id ${assignmentId} changed to status ${status}`);

      assignment.status = status;
      await assignment.save({ transaction });

      await OutboxAssignment.create({
        assignmentId: assignment.assignmentId,
        status: 'completed'
      }, { transaction });      

      await transaction.commit();

      if (status === 'approved' || status === 'rejected') {
        // Decrement assignment count in Redis
         
        const userSession = await redis.get(`user:${assignment.userId}`);

        console.log(`trying update the cache assignments number for user ${assignment.userId}`);

        if (userSession) {
          const [results] = await sequelize.query(
            `SELECT COUNT(*) as count 
             FROM assignments 
             WHERE user_id = :userId 
             AND status = 'pending' 
             AND deleted = false`,
          {
              replacements: { userId: parseInt(assignment.userId) },
              type: sequelize.QueryTypes.SELECT
          });
          const count = parseInt(results.count);
                  
          console.log(`current number of assignments ${count}`);

          const sessionData = JSON.parse(userSession);
          sessionData.assignments = count;
          
          await redis.setex(
            `user:${assignment.userId}`,
            process.env.SESSION_TTL,
            JSON.stringify(sessionData)
          );
  
          logger.info(`Decremented assignments count for user ${assignment.userId} to ${sessionData.assignments}`);          

        }                      
      }

      return assignment;
    } catch (error) {
      console.log(`error updating the assigment for assignmentId ${assignmentId} msg: ${error}`);
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
      const maxAssignments = parseInt(process.env.MAX_ASSIGNMENTS) || 50;
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

module.exports = AssignmentService; 