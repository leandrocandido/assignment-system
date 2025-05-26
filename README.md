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

1. Install dependencies for each service:
```bash
cd services/relay-service && npm install
cd ../assignment-service && npm install
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