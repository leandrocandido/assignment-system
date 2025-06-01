const Redis = require('ioredis');
const IUserRepository = require('../../domain/repositories/IUserRepository');
const User = require('../../domain/entities/User');
const logger = require('../../shared/utils/logger');

class RedisUserRepository extends IUserRepository {
  constructor() {
    super();
    this.redis = new Redis({
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      maxRetriesPerRequest: null
    });
  }

  async getActiveUsers() {
    try {
      // Get all users from ever_logged_users set
      const everLoggedUsers = await this.redis.smembers('ever_logged_users');
      const activeUsers = [];

      // Check each user's session
      for (const userId of everLoggedUsers) {
        const sessionExists = await this.redis.exists(`user:${userId}`);
        if (sessionExists) {
          const assignmentCount = await this.getUserAssignmentCount(userId);
          activeUsers.push(new User(userId, assignmentCount));
        }
      }

      return activeUsers;
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    }
  }

  async isUserActive(userId) {
    try {
      const [inEverLogged, hasSession] = await Promise.all([
        this.redis.sismember('ever_logged_users', userId),
        this.redis.exists(`user:${userId}`)
      ]);
      return inEverLogged && hasSession;
    } catch (error) {
      logger.error(`Error checking if user ${userId} is active:`, error);
      throw error;
    }
  }

  async getUserAssignmentCount(userId) {
    try {
      const userData = await this.redis.get(`user:${userId}`);
      if (!userData) return 0;

      const user = JSON.parse(userData);
      return user.assignmentCount || 0;
    } catch (error) {
      logger.error(`Error getting assignment count for user ${userId}:`, error);
      throw error;
    }
  }

  async updateUserAssignmentCount(userId, count) {
    try {
      const userData = await this.redis.get(`user:${userId}`);
      if (!userData) {
        logger.warn(`User ${userId} not found in Redis while updating assignment count`);
        return;
      }

      const user = JSON.parse(userData);
      user.assignments = count;
      await this.redis.set(`user:${userId}`, JSON.stringify(user));
    } catch (error) {
      logger.error(`Error updating assignment count for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = RedisUserRepository; 