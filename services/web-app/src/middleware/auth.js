const redisService = require('../services/redisService');

async function authMiddleware(req, res, next) {
  const userId = req.headers['x-user-id'];

  if (!userId) {
    return res.status(401).json({ error: 'No user ID provided' });
  }

  const isValid = await redisService.isSessionValid(userId);
  if (!isValid) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  const userData = await redisService.getSession(userId);
  req.user = userData;
  next();
}

module.exports = authMiddleware; 