# Distributed Event Processing System

A distributed system for processing and assigning events to users, built with Node.js, PostgreSQL, Redis, and RabbitMQ.

## System Architecture

The system consists of two main services:

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

## Prerequisites

- Docker and Docker Compose
- Node.js 18 or higher (for local development)
- PostgreSQL 15
- Redis 7
- RabbitMQ 3

## Project Structure

```
relay-service/
├── services/
│   ├── relay-service/      # Event polling and relay service
│   └── assignment-service/ # Event assignment and user management
├── init/postgres/          # Database initialization scripts
└── docker-compose.yml      # Service orchestration
```

## Getting Started

1. Clone the repository:
```bash
git clone <repository-url>
cd relay-service
```

2. Set up environment variables:

Create `.env` file in `services/relay-service/`:
```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=relay_service
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# RabbitMQ
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_VHOST=/
```

Create `.env` file in `services/assignment-service/`:
```env
# PostgreSQL
POSTGRES_USER=postgres
POSTGRES_PASSWORD=postgres
POSTGRES_DB=assignment_service
POSTGRES_HOST=postgres
POSTGRES_PORT=5432

# RabbitMQ
RABBITMQ_USER=guest
RABBITMQ_PASSWORD=guest
RABBITMQ_HOST=rabbitmq
RABBITMQ_PORT=5672
RABBITMQ_VHOST=/

# Redis
REDIS_HOST=redis
REDIS_PORT=6379
```

3. Start the services:
```bash
docker compose up -d
```

4. Check service status:
```bash
docker compose ps
```

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

# Assignment System

This is a microservices-based assignment system that handles events across different regions.

## Services

- **web-app**: Web interface service (Port 3001)
- **relay-service**: Handles event relay operations
- **assignment-service**: Manages assignment operations (Port 3000)
- **postgres**: Database service (Port 5432)
- **redis**: Session management and caching (Port 6379)
- **rabbitmq**: Message broker (Port 5672, Management: 15672)

## Getting Started

1. Clone the repository
2. Make sure you have Docker and Docker Compose installed
3. Run the services:
```bash
docker compose up -d
```

## API Operations

### Authentication

#### Login
```bash
curl -X POST http://localhost:3001/api/login \
  -H "Content-Type: application/json" \
  -d '{
    "username": "john.doe",
    "password": "password123"
  }'
```

Response will include a userId that you'll need for subsequent requests:
```json
{
  "userId": "1",
  "username": "john.doe",
  "name": "John Doe",
  "role": "supervisor",
  "region": "US"
}
```

#### Logout
```bash
curl -X POST http://localhost:3001/api/logout \
  -H "Content-Type: application/json" \
  -H "x-user-id: YOUR_USER_ID"
```

#### Check Session
```bash
curl http://localhost:3001/api/session \
  -H "x-user-id: YOUR_USER_ID"
```

Note: Replace `YOUR_USER_ID` with the actual userId received from the login response.

### Mock Users

The system comes with 10 pre-configured mock users. Here are some example credentials:

1. Supervisor:
   - Username: john.doe
   - Password: password123

2. Regular User:
   - Username: jane.smith
   - Password: password123

## Environment Variables

The services use various environment variables that can be configured through `.env` files or docker-compose:

- `PORT`: Web app port (default: 3001)
- `REDIS_HOST`: Redis host (default: redis)
- `REDIS_PORT`: Redis port (default: 6379)
- `SESSION_TTL`: Session time-to-live in seconds (default: 300)

## Development

To run the services in development mode:

```bash
docker compose up -d
```

To view logs:
```bash
docker compose logs -f [service-name]
```