class IAssignmentRepository {
  async createAssignment(assignment) {
    throw new Error('Method not implemented');
  }

  async getAssignmentsByUser(userId) {
    throw new Error('Method not implemented');
  }

  async getUserAssignmentCounts() {
    throw new Error('Method not implemented');
  }
}

module.exports = IAssignmentRepository; 