const db = require('../config/database');
const logger = require('../config/logger');

class MessageService {
  async getPendingMessages() {
    try {
      const result = await db.query(
        'SELECT * FROM messages WHERE status = $1 LIMIT 100',
        ['PENDING']
      );
      return result.rows;
    } catch (error) {
      logger.error('Error fetching pending messages:', error);
      throw error;
    }
  }

  async updateMessageStatus(messageId, status, processingDetails = null) {
    try {
      const result = await db.query(
        'UPDATE messages SET status = $1, processing_details = $2, updated_at = NOW() WHERE id = $3 RETURNING *',
        [status, processingDetails, messageId]
      );
      return result.rows[0];
    } catch (error) {
      logger.error(`Error updating message status for ID ${messageId}:`, error);
      throw error;
    }
  }

  async createMessage(messageData) {
    try {
      const result = await db.query(
        'INSERT INTO messages (content, status, created_at, updated_at) VALUES ($1, $2, NOW(), NOW()) RETURNING *',
        [messageData.content, 'PENDING']
      );
      return result.rows[0];
    } catch (error) {
      logger.error('Error creating message:', error);
      throw error;
    }
  }
}

module.exports = new MessageService(); 