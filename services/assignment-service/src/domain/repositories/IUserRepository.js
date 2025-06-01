class IUserRepository {
  async getActiveUsers() {
    throw new Error('Method not implemented');
  }

  async isUserActive(userId) {
    throw new Error('Method not implemented');
  }

  async getUserAssignmentCount(userId) {
    throw new Error('Method not implemented');
  }

  async updateUserAssignmentCount(userId, count) {
    throw new Error('Method not implemented');
  }
}

module.exports = IUserRepository; 