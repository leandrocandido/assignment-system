# Multi-Region Event Handling System - Enhancement Requirements

This document outlines the detailed requirements and expectations for enhancing the current Protex Observability System. The goal is to extend the existing event handling system with robust database integration, user session management, event processing capabilities, and cloud deployment architecture.

## Core Requirements

### Database Implementation
- Implement persistent storage for events using production-ready database technologies
- Replace the current file-based storage system with appropriate database solutions
- Support for at least 4 distinct regional databases (US, CA, APAC, EU)
- Implement appropriate schemas for storing event data with proper indexing
- Ensure data integrity through transactions and consistency checks
- Implement efficient querying mechanisms for event retrieval
- Add caching layer for frequently accessed data
- Support for database migrations and versioning


### Assignment and Locking Implementation
- Implement optimistic or pessimistic locking mechanisms to prevent concurrent modifications of the same event
- Provide clear visual indicators in the UI for locked events
- Add timeout mechanisms for stale locks (e.g., user stops working on an event)
- Implement priority-based assignment capabilities
- Add status tracking for assignments with timestamps
- Support reassignment workflows with proper state transitions
- Include notification system for new assignments
- Implement conflict resolution strategies for concurrent modifications

### Event Generator Enhancement
- Modify the existing event generator to store events directly in the appropriate regional databases

### Event Ingestor
- Create a dedicated event ingestion service/API with the following capabilities:
  - High-throughput event processing

  - Rate limiting and throttling mechanisms
  - Error handling and dead-letter queues for failed events
- Implement validation rules and processing pipeline for incoming events
- Support batch event ingestion for efficiency
- Implement event routing logic to appropriate regional databases
- Add event enrichment capabilities (e.g., adding metadata, normalizing fields)
- Implement event deduplication mechanisms
- Provide metrics and monitoring for ingestion performance
- Support for event buffering during high load
- Implement circuit breakers for downstream system failures
- Add audit logging for all ingested events

### Multi-Region Database Architecture
- Create at least 4 separate databases to represent different geographical regions (US, CA, APAC, EU)
- Implement federation and aggregation at the application level for cross-region queries
- Design and implement a consistent API layer that abstracts the multi-database architecture
- Ensure proper data isolation between regions while allowing global views
- Implement efficient cross-region query capabilities
- Add caching strategies for cross-region queries
- Support for regional data compliance requirements (e.g., data residency)


### User Session Handling
- Implement user authentication where users access the portal via URL: localhost:3000/token
- **Important Note**: No need to create an authentication flow - users can login into the system with direct URL access
- Support the following user accounts with pre-configured tokens:

| UserID | Name | Token                |
|--------|------|----------------------|
| 1      | abc  | 123123123123123      |
| 2      | abc  | 123123123123123      |
| 3      | abc  | 123123123123123      |
| 4      | abc  | 123123123123123      |
| 5      | abc  | 123123123123123      |

- Maintain session state across page refreshes
- Implement session timeout mechanisms
- Add user preferences storage
- Track user activity for auditing purposes
- Support for concurrent sessions from the same user
- Support for secure session management best practices

### Event State Management
- Ensure that approve/reject actions for an event are saved to the source/regional database where the event originated



### Dockerization
- Create a single docker container that can host all components of the system locally:
  - API server
  - Event generator
  - Event ingestor
  - UI server
  - Database instances for each region
  - Monitoring services
- Provide Docker Compose configuration for easy deployment of the entire stack locally
- Ensure container communication is properly configured with appropriate network settings



## Nice to Have Features

### Auditing System
- Implement a comprehensive auditing system for approval/disapproval actions with:
  - User identification
  - Timestamp
  - Previous state
  - New state
  - Action reason field
  - IP address or access information


### Cloud Native Deployment Proposal
- **Mandatory**: Create a detailed proposal for Cloud Native Deployment using AWS (preferred), GCP, or Azure with:
  - Cloud native services Architecture diagrams
  - Service selection with justification
  - Scaling strategies
  - Security considerations etc.
- Include comprehensive network diagrams and specific services to be used for each component
- Reference cloud architecture patterns like: https://aws.amazon.com/solutions/implementations/dynamic-image-transformation-for-amazon-cloudfront/
- Provide migration strategy from local development to cloud infrastructure

### UI Enhancement (Must Have)
The BE app should be functional, please feel free to make any appropiate UI changes required.

### UI Enhancement (Nice to have)
- Modify the existing UI to handle backend updates with improved user experience
- Ensure real-time reflection of event state changes using WebSockets or similar technology
- Improve user experience for event management with:
  - Responsive design for various devices
  - Improved filtering and sorting capabilities
  - Batch operations for events
  - User-customizable views and layouts
  - Keyboard shortcuts for power users
  - Advanced search capabilities
  - Visualization of event patterns and trends
  - Dark/light mode support
  - Accessibility improvements
  - Performance optimization for handling large event volumes
- Add user preferences and personalization features
- Implement progressive loading for large data sets
- Add export capabilities for event data
- Implement notification center for system events
- Add dashboard views with key metrics and insights
- Support for localization and internationalization
- Implement proper error handling and user feedback

## Deliverables

1. Enhanced codebase with all required features implemented with:
2. Detailed documentation for the new features and system architecture:
3. Docker configuration for local deployment:
4. Cloud native deployment proposal
5. Functional E2E application


## Evaluation Criteria

- **Functionality**: All features work as specified with robust error handling and edge case management
- **Design**: Clean, maintainable code with appropriate patterns and architecture
- **Documentation**: Clear, comprehensive documentation for all aspects of the system
- **Scalability**: Solution can handle increased load with proper performance optimization
- **Security**: Proper authentication, authorization, and data protection mechanisms
- **Cloud Architecture**: Well-designed cloud deployment proposal with appropriate service selection and cost optimization (for L3+)
- **Code Quality**: Clean, readable code following industry best practices and standards
- **Testing(Nice to have)**: Comprehensive test coverage with proper test organization
- **Performance**: System meets defined performance requirements under various load conditions
- **User Experience**: UI is intuitive, responsive, and follows best practices in UX design 