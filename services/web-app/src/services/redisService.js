require('dotenv').config();
const Redis = require('ioredis');

class RedisService {
  constructor() {
    console.log('Redis Config:', {
      host: process.env.REDIS_HOST,
      port: process.env.REDIS_PORT,
      sessionTTL: process.env.SESSION_TTL
    });

    this.client = new Redis({
      host: process.env.REDIS_HOST || 'redis',
      port: parseInt(process.env.REDIS_PORT || '6379', 10),
    });

    this.sessionTTL = parseInt(process.env.SESSION_TTL || '120', 10); // Default 2 minutes in seconds
    this.LOGGED_USERS_SET = 'ever_logged_users'; // Key for the permanent set of users
  }

  async setSession(userId, userData) {
    try {
      // Set the session with expiration
      await this.client.setex(
        `user:${userId}`,
        this.sessionTTL,
        JSON.stringify(userData)
      );

      // Add user to the permanent set of logged users
      await this.client.sadd(this.LOGGED_USERS_SET, userId);
      
      return true;
    } catch (error) {
      console.error('Error setting session:', error);
      return false;
    }
  }

  async getSession(userId) {
    try {
      const data = await this.client.get(`user:${userId}`);
      return data ? JSON.parse(data) : null;
    } catch (error) {
      console.error('Error getting session:', error);
      return null;
    }
  }

  async removeSession(userId) {
    try {
      // Only remove the user's session key, keeping their record in ever_logged_users
      const sessionKey = `user:${userId}`;
      await this.client.del(sessionKey);
      
      return true;
    } catch (error) {
      console.error('Error removing session:', error);
      return false;
    }
  }

  async isSessionValid(userId) {
    try {
      const exists = await this.client.exists(`user:${userId}`);
      return exists === 1;
    } catch (error) {
      console.error('Error checking session:', error);
      return false;
    }
  }

  // Method used by the supervisor dashboard
  async getLoggedUsers() {
    try {
      return await this.client.smembers(this.LOGGED_USERS_SET);
    } catch (error) {
      console.error('Error getting logged users:', error);
      return [];
    }
  }
}

module.exports = new RedisService(); 