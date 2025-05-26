const redis = require('../config/redis');
const logger = require('../config/logger');

const SESSION_PREFIX = 'user:session:';
const ACTIVE_USERS_SET = 'active:users';

class UserSessionService {
  async isUserActive(userId) {
    try {
      const [sessionExists, isInActiveSet] = await Promise.all([
        redis.exists(`${SESSION_PREFIX}${userId}`),
        redis.sismember(ACTIVE_USERS_SET, userId.toString())
      ]);

      return sessionExists === 1 && isInActiveSet === 1;
    } catch (error) {
      logger.error(`Error checking user ${userId} active status:`, error);
      throw error;
    }
  }

  async setUserSession(userId) {
    try {
      const sessionKey = `${SESSION_PREFIX}${userId}`;
      const sessionTTL = parseInt(process.env.USER_SESSION_TTL) || 300; // 5 minutes default

      await Promise.all([
        redis.set(sessionKey, 'active', 'EX', sessionTTL),
        redis.sadd(ACTIVE_USERS_SET, userId.toString())
      ]);

      logger.info(`User ${userId} session created/renewed`);
    } catch (error) {
      logger.error(`Error setting session for user ${userId}:`, error);
      throw error;
    }
  }

  async removeUserSession(userId) {
    try {
      const sessionKey = `${SESSION_PREFIX}${userId}`;
      
      await Promise.all([
        redis.del(sessionKey),
        redis.srem(ACTIVE_USERS_SET, userId.toString())
      ]);

      logger.info(`User ${userId} session removed`);
    } catch (error) {
      logger.error(`Error removing session for user ${userId}:`, error);
      throw error;
    }
  }

  async getActiveUsers() {
    try {
      const activeUsers = await redis.smembers(ACTIVE_USERS_SET);
      const activeSessionUsers = await Promise.all(
        activeUsers.map(async (userId) => {
          const isSessionActive = await redis.exists(`${SESSION_PREFIX}${userId}`);
          return isSessionActive ? userId : null;
        })
      );

      return activeSessionUsers.filter(Boolean);
    } catch (error) {
      logger.error('Error getting active users:', error);
      throw error;
    }
  }

  async refreshSession(userId) {
    try {
      const sessionKey = `${SESSION_PREFIX}${userId}`;
      const sessionTTL = parseInt(process.env.USER_SESSION_TTL) || 300;

      const exists = await redis.exists(sessionKey);
      if (exists) {
        await redis.expire(sessionKey, sessionTTL);
        logger.info(`User ${userId} session refreshed`);
      }
    } catch (error) {
      logger.error(`Error refreshing session for user ${userId}:`, error);
      throw error;
    }
  }
}

module.exports = new UserSessionService(); 