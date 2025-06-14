# Assignment System

This system provides an integrated solution for managing assignments and events across multiple services. It includes a web interface for user interaction and background services for task management.

## System Documentation

For a detailed overview of the system architecture and design decisions, please refer to our [System Solution Presentation](https://docs.google.com/presentation/d/1IaJdsvRjmJMUoLEk54yFs221DifUqluchqmU18xppRc/edit?usp=sharing).

## Architecture Overview

The system is comprised of four main services:

### 1. Relay Service
- Polls PostgreSQL for new events
- Uses cron-based scheduling
- Sends events to RabbitMQ outbound queue
- Processes responses from inbound queue
- Includes event generation utility

### 2. Assignment Service
- Processes events from outbound queue
- Manages user assignments with Redis
- Implements user session tracking (5-minute TTL)
- Enforces maximum 50 assignments per user limit
- Only assigns to active/logged-in users

### 3. TaskFlow Service (Task Admin)
- Manages background jobs and scheduled tasks
- Handles expired assignments
- Processes completed assignments
- Manages user inactivity cleanup
- Runs scheduled jobs:
  - Inactive User Job (Daily at midnight)
  - Expired Event Job (Every 2 hours)
  - Check Reviewed Job (Every 30 minutes)

### 4. Web Application
- Provides user interface for operators and supervisors
- Handles user authentication and session management
- Displays real-time assignment updates
- Manages user interactions and event processing
- Access at: http://localhost:3001

### Infrastructure Components

- PostgreSQL (Port 5432)
- Redis (Port 6379)
- RabbitMQ (Port 5672, Management: 15672)

## Available Login Credentials

### Supervisors
- Emma Wilson (EU) - emma.wilson:pass123
- Sarah Connor (US) - sarah.connor:pass123
- Raj Patel (APAC) - raj.patel:pass123
- James Wilson (US) - james.wilson:pass123

### Operators
- John Smith (US) - john.smith:pass123
- Carlos Garcia (LATAM) - carlos.garcia:pass123
- Liu Yang (APAC) - liu.yang:pass123
- Mike Ross (EU) - mike.ross:pass123
- Ana Silva (LATAM) - ana.silva:pass123
- Marie Dubois (EU) - marie.dubois:pass123

## Project Structure

The system follows a microservices architecture with some services implementing Clean Architecture principles:

```
assignment-system/
├── services/
│   ├── relay-service/           # Event polling and relay service
│   │   ├── src/
│   │   │   ├── domain/         # Business entities and interfaces
│   │   │   ├── application/    # Use cases and business logic
│   │   │   ├── infrastructure/ # External services, DB, messaging
│   │   │   └── interfaces/     # Controllers and external APIs
│   │   └── tests/
│   │
│   ├── assignment-service/      # Event assignment and user management
│   │   ├── src/
│   │   │   ├── domain/         # Core business rules and entities
│   │   │   ├── application/    # Application business rules
│   │   │   ├── infrastructure/ # Frameworks and external services
│   │   │   └── interfaces/     # Controllers and presenters
│   │   └── tests/
│   │
│   ├── task-admin/             # Admin dashboard service (Future Clean Architecture candidate)
│   │   └── src/
│   │
│   └── web-app/                # User interface (Future Clean Architecture candidate)
│       └── src/
│
├── init/postgres/              # Database initialization scripts
└── docker-compose.yml         # Service orchestration
```

### Clean Architecture Implementation

The relay-service and assignment-service have been restructured to follow Clean Architecture principles:

- **Domain Layer**: Contains enterprise business rules, entities, and repository interfaces
- **Application Layer**: Houses use cases and orchestrates domain objects
- **Infrastructure Layer**: Implements technical details (databases, messaging, etc.)
- **Interface Layer**: Handles external communication and API endpoints

This architecture provides:
- Better separation of concerns
- Improved testability
- Independence from external frameworks
- More maintainable and scalable codebase

### Future Improvements

The following services are candidates for Clean Architecture implementation in future updates:

1. **Task Admin Service**:
   - Planned restructuring to separate business logic from infrastructure
   - Implementation of domain-driven design principles
   - Better separation of concerns

2. **Web App**:
   - Future migration to a clean frontend architecture
   - Separation of presentation logic from business rules
   - Implementation of the presenter pattern

## Getting Started

### Setup

1. Clone the repository:
```bash
git clone https://github.com/yourusername/assignment-system.git
cd assignment-system
```

2. Build and start all services:
```bash
docker compose build --no-cache && docker compose up -d
```

3. Verify all containers are running:
```bash
docker compose ps --format 'table {{.Name}}\t{{.Status}}\t{{.Ports}}'
```

You should see the following containers running:
- assignment-system-postgres
- assignment-system-redis
- assignment-system-rabbitmq
- assignment-system-assignment-service
- assignment-system-relay-service
- assignment-system-task-admin
- assignment-system-web-app

### Accessing the Web Application

The web interface is available at: http://localhost:3001

Available users (username:password):
- emma.wilson:pass123 (EU)
- sarah.connor:pass123 (US)
- raj.patel:pass123 (APAC)
- james.wilson:pass123 (US)
- john.smith:pass123 (US)
- carlos.garcia:pass123 (LATAM)
- liu.yang:pass123 (APAC)
- mike.ross:pass123 (EU)
- ana.silva:pass123 (LATAM)
- marie.dubois:pass123 (EU)

### API Login

You can also login via API using curl:
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "liu.yang",
    "password": "pass123"
  }'
```

### Generating Test Events

To generate test events, use the event generator utility:
```bash
# Generate 10 events (default)
docker compose run --rm event-generator

# Generate specific number of events (e.g., 100)
docker compose run --rm event-generator 100
```

### Database Connections

The system uses two separate PostgreSQL databases:

1. **Relay Service Database**
   - Database Name: relay_service
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: postgres

2. **Assignment Service Database**
   - Database Name: assignment_service
   - Host: localhost
   - Port: 5432
   - Username: postgres
   - Password: postgres

To connect using DataGrip:

1. Click "+" to add a new data source
2. Select PostgreSQL
3. Configure two separate connections:
   
   For Relay Service:
   ```
   Name: Relay Service DB
   Host: localhost
   Port: 5432
   Database: relay_service
   User: postgres
   Password: postgres
   ```

   For Assignment Service:
   ```
   Name: Assignment Service DB
   Host: localhost
   Port: 5432
   Database: assignment_service
   User: postgres
   Password: postgres
   ```

4. Test the connection and click "Apply"

## Event Generation

The system includes a utility service for generating test events. This service is not started automatically with the main application but can be run on demand.

### Generating Test Events

To generate test events, use the following command:
```bash
docker compose run --rm event-generator [number_of_events]
```

Examples:
```bash
# Generate 10 events (default)
docker compose run --rm event-generator

# Generate 100 events
docker compose run --rm event-generator 100
```

The event generator will create random events with the following attributes:
- Random regions (NA, EU, APAC, LATAM)
- Various rule types (motion_detection, object_detection, face_detection, intrusion_detection)
- Different locations (entrance, parking_lot, lobby, warehouse, office)
- Severity levels (1-5)
- Random device and camera IDs
- Unique frame references

Each event will be logged to the console as it's generated, making it easy to track the generation process.

## Service Endpoints

### Assignment Service (Port 3000)

#### Health Check
```
GET /health
```

#### User Session Management
```
POST /users/:userId/active    # Mark user as active
DELETE /users/:userId/active  # Mark user as inactive
```

#### Assignment Management
```
PUT /assignments/:assignmentId
Body: { "status": "completed" | "rejected" }
```

## Monitoring

### RabbitMQ Management Interface
- URL: http://localhost:15672
- Default credentials: guest/guest

### PostgreSQL
- Port: 5432
- Databases:
  - relay_service: Main event database
  - assignment_service: Assignment tracking database

### Redis
- Port: 6379
- Key Patterns:
  - active_users: Hash of active user IDs
  - user_assignments: Hash of assignment counts per user

## Development

### Local Setup

1. Install dependencies for all services and packages:
```bash
# Install root dependencies
npm install

# Install common package dependencies
cd common && npm install
cd ..

# Install scripts dependencies
cd scripts && npm install
cd ..

# Install relay service dependencies
cd services/relay-service && npm install
cd ../..

# Install assignment service dependencies
cd services/assignment-service && npm install
cd ../..
```

2. Run services in development mode:
```bash
# In services/relay-service
npm run dev

# In services/assignment-service
npm run dev
```

### Database Migrations

The initial database schema is automatically created when the containers start up using the scripts in `init/postgres/`.

## Troubleshooting

1. If services fail to start:
   - Check if all required ports are available (5432, 6379, 5672, 15672, 3000)
   - Ensure Docker has enough resources allocated
   - Check service logs: `docker compose logs -f [service-name]`

2. If assignments aren't being processed:
   - Verify RabbitMQ connection in both services
   - Check if users are marked as active
   - Verify Redis connection for session management
   - Check PostgreSQL for event and assignment records

3. Database connection issues:
   - Ensure PostgreSQL container is healthy
   - Verify database credentials in environment files
   - Check if databases and tables are created properly

## License

[MIT License](LICENSE)