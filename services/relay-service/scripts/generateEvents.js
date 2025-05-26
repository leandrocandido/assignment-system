require('dotenv').config();
const { v4: uuidv4 } = require('uuid');
const db = require('../src/config/database');
const logger = require('../src/config/logger');

// Configuration for random data generation
const CONFIG = {
  regions: ['US', 'EU', 'ASIA', 'LATAM'],
  ruleTypes: ['PersonDetected', 'VehicleDetected', 'UnauthorizedAccess', 'MotionDetected', 'ObjectLeft'],
  locations: ['Warehouse A', 'Warehouse B', 'Office Building 1', 'Parking Lot', 'Loading Dock'],
  severityLevels: [1, 2, 3, 4, 5],
  deviceIds: ['device-123', 'device-456', 'device-789', 'device-012', 'device-345'],
  cameraIds: ['cam-01', 'cam-02', 'cam-03', 'cam-04', 'cam-05']
};

function getRandomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomEvent() {
  const deviceId = getRandomElement(CONFIG.deviceIds);
  const cameraId = getRandomElement(CONFIG.cameraIds);
  
  return {
    eventId: uuidv4(),
    region: getRandomElement(CONFIG.regions),
    ruleType: getRandomElement(CONFIG.ruleTypes),
    location: getRandomElement(CONFIG.locations),
    severity: getRandomElement(CONFIG.severityLevels),
    createdAt: new Date().toISOString(),
    state: 'Not Viewed',
    metadata: {
      deviceId,
      cameraId,
      frameReference: `frame-${Math.floor(Math.random() * 10000)}`
    }
  };
}

async function insertEvents(numberOfEvents) {
  try {
    logger.info(`Starting to insert ${numberOfEvents} random events`);
    
    for (let i = 0; i < numberOfEvents; i++) {
      const event = generateRandomEvent();
      
      await db.query(
        `INSERT INTO events (
          event_id, region, rule_type, location, severity,
          created_at, state, metadata, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, NOW())`,
        [
          event.eventId,
          event.region,
          event.ruleType,
          event.location,
          event.severity,
          event.createdAt,
          event.state,
          event.metadata
        ]
      );
      
      logger.info(`Inserted event ${i + 1}/${numberOfEvents} with ID: ${event. top }`);
    }
    
    logger.info('Successfully completed inserting random events');
  } catch (error) {
    logger.error('Error inserting random events:', error);
  } finally {
    await db.end();
  }
}

// Get number of events from command line argument or default to 10
const numberOfEvents = parseInt(process.argv[2]) || 10;

// Execute the script
insertEvents(numberOfEvents)
  .then(() => {
    logger.info('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    logger.error('Script failed:', error);
    process.exit(1);
  }); 