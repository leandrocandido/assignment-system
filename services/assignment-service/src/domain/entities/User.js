class User {
  constructor(id, assignmentCount = 0) {
    this.id = id;
    this.assignmentCount = assignmentCount;
  }

  incrementAssignmentCount() {
    this.assignmentCount += 1;
  }

  isActive() {
    return true; // This will be determined by the repository layer checking Redis
  }

  static compareByAssignmentCount(a, b) {
    return a.assignmentCount - b.assignmentCount;
  }
}

module.exports = User; 