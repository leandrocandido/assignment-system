const Redis = require('ioredis');
require('dotenv').config();
const logger = require('./logger');

// Log Redis configuration for debugging
const redisConfig = {
  host: process.env.REDIS_HOST || 'redis',
  port: parseInt(process.env.REDIS_PORT || '6379'),
  maxRetriesPerRequest: null,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000);
    return delay;
  }
};

logger.info('Redis Configuration:', redisConfig);

const redis = new Redis(redisConfig);

redis.on('connect', () => {
  logger.info('Successfully connected to Redis');
});

redis.on('error', (error) => {
  logger.error('Redis connection error:', error);
});

module.exports = redis; 