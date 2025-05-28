import { Pool } from 'pg';
import { v4 as uuidv4 } from 'uuid';
import { Event, EventType } from '../src/core/entities/Event';
import config from '../src/config';

// Configuration for random data generation
const GENERATION_CONFIG = {
  regions: ['US', 'EU', 'ASIA', 'LATAM'],
  locations: ['Warehouse A', 'Warehouse B', 'Office Building 1', 'Parking Lot', 'Loading Dock'],
  severityLevels: [1, 2, 3, 4, 5],
  deviceIds: ['device-123', 'device-456', 'device-789', 'device-012', 'device-345'],
  cameraIds: ['cam-01', 'cam-02', 'cam-03', 'cam-04', 'cam-05']
};

function getRandomElement<T>(array: T[]): T {
  return array[Math.floor(Math.random() * array.length)];
}

function generateRandomEvent(): Event {
  const deviceId = getRandomElement(GENERATION_CONFIG.deviceIds);
  const cameraId = getRandomElement(GENERATION_CONFIG.cameraIds);
  
  return new Event({
    region: getRandomElement(GENERATION_CONFIG.regions),
    deviceId,
    cameraId,
    type: getRandomElement([
      EventType.MOTION_DETECTION,
      EventType.OBJECT_DETECTION,
      EventType.FACE_DETECTION,
      EventType.INTRUSION_DETECTION
    ]),
    severity: getRandomElement(GENERATION_CONFIG.severityLevels),
    location: getRandomElement(GENERATION_CONFIG.locations),
    frameReference: `frame-${Math.floor(Math.random() * 10000)}`,
    processed: false
  });
}

async function insertEvents(numberOfEvents: number): Promise<void> {
  const pool = new Pool(config.database);
  
  try {
    console.log(`Starting to insert ${numberOfEvents} random events`);
    
    for (let i = 0; i < numberOfEvents; i++) {
      const event = generateRandomEvent();
      const eventData = event.toJSON();
      
      await pool.query(
        `INSERT INTO events (
          region, device_id, camera_id, type, severity,
          location, frame_reference, processed, created_at, updated_at
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)`,
        [
          eventData.region,
          eventData.deviceId,
          eventData.cameraId,
          eventData.type,
          eventData.severity,
          eventData.location,
          eventData.frameReference,
          eventData.processed,
          eventData.createdAt,
          eventData.updatedAt
        ]
      );
      
      console.log(`Inserted event ${i + 1}/${numberOfEvents}`);
    }
    
    console.log('Successfully completed inserting random events');
  } catch (error) {
    console.error('Error inserting random events:', error);
    throw error;
  } finally {
    await pool.end();
  }
}

// Get number of events from command line argument or default to 10
const numberOfEvents = parseInt(process.argv[2]) || 10;

// Execute the script
insertEvents(numberOfEvents)
  .then(() => {
    console.log('Script completed successfully');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Script failed:', error);
    process.exit(1);
  }); 