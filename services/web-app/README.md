# Protex Observability System

A simple system for generating, viewing, and managing events from multiple regions.

## Features

- Continuous generation of random events for multiple regions (US, CA, APAC, EU)
- Simple web interface to view and manage events
- Real-time updates via WebSockets
- Filter events by region
- Approve or reject events
- Track event states (Not Viewed/Approved/Rejected)

## Setup

### Prerequisites

- Node.js (v18 or later)
- npm

### Installation

1. Clone the repository:```bash
git clone <repository-url>
cd protex-observability-system
```

2. Install dependencies:
```bash
npm install
```

3. Start the server:
```bash
npm run start
```

The server will run on port 3000 by default. Access the UI at http://localhost:3000.

4. Generate events (optional):
```bash
node src/event-generator
```

This will start generating random events for all regions.

## Usage

- When the server starts, it will automatically generate events for each region every few seconds
- Open the web interface to view and manage events
- Use the region buttons to filter events by region
- Approve or reject events to update their state
- Events are automatically stored in JSON files in the data directory

## Project Structure

- `src/index.js`: Main server file
- `src/event-generator.js`: Event generation logic
- `public/index.html`: Web interface
- `data/{region}/events.json`: Stored events for each region

## Event Structure

```json
{
  "eventId": "unique-uuid",
  "region": "US",
  "ruleType": "PersonDetected",
  "location": "Warehouse A",
  "severity": 3,
  "createdAt": "2023-08-15T12:34:56.789Z",
  "state": "Not Viewed",
  "metadata": {
    "deviceId": "device-123",
    "cameraId": "cam-45",
    "frameReference": "frame-6789"
  }
}
``` 
