const { Pool } = require('pg');
const { v4: uuidv4 } = require('uuid');

// Database configuration for Docker environment
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres',
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB_RELAY || 'relay_service'
});

// Sample data for event generation
const regions = ['NA', 'EU', 'APAC', 'LATAM'];
const ruleTypes = ['motion_detection', 'object_detection', 'face_detection', 'intrusion_detection'];
const locations = ['entrance', 'parking_lot', 'lobby', 'warehouse', 'office'];
const severityLevels = [1, 2, 3, 4, 5];

// Helper function to get random element from array
const getRandomElement = (array) => array[Math.floor(Math.random() * array.length)];

// Generate a single event
const generateEvent = () => ({
  event_id: uuidv4(),
  region: getRandomElement(regions),
  rule_type: getRandomElement(ruleTypes),
  location: getRandomElement(locations),
  severity: getRandomElement(severityLevels),
  device_id: `device_${Math.floor(Math.random() * 100)}`,
  camera_id: `camera_${Math.floor(Math.random() * 50)}`,
  frame_reference: `frame_${Date.now()}_${Math.floor(Math.random() * 1000)}`
});

// Helper function to format value for SQL logging
const formatValue = (val) => {
  if (val === null) return 'NULL';
  if (typeof val === 'object') return `'${JSON.stringify(val)}'`;
  if (typeof val === 'string') return `'${val}'`;
  return val;
};

// Function to insert events into database
async function insertEvents(numEvents) {
  const client = await pool.connect();
  
  try {
    await client.query('BEGIN');
    
    for (let i = 0; i < numEvents; i++) {
      const event = generateEvent();
      const query = `
        INSERT INTO events (
          event_id, region, rule_type, location, severity,
          device_id, camera_id, frame_reference
        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
      `;
      
      const values = [
        event.event_id,
        event.region,
        event.rule_type,
        event.location,
        event.severity,
        event.device_id,
        event.camera_id,
        event.frame_reference
      ];

      // Log the actual query that will be executed
      const interpolatedQuery = query.replace(/\$(\d+)/g, (_, index) => formatValue(values[index - 1]));
      console.log('Executing query:', interpolatedQuery);
      
      await client.query(query, values);
      console.log(`Generated event ${i + 1}/${numEvents}: ${event.event_id}`);
    }
    
    await client.query('COMMIT');
    console.log(`Successfully generated ${numEvents} events`);
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error generating events:', error);
    throw error;
  } finally {
    client.release();
  }
}

// Get number of events from command line argument or default to 10
const numEvents = parseInt(process.argv[2]) || 10;

// Run the script
insertEvents(numEvents)
  .then(() => {
    console.log('Event generation completed');
    process.exit(0);
  })
  .catch((error) => {
    console.error('Failed to generate events:', error);
    process.exit(1);
  }); 