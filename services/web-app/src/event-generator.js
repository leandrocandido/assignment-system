const fs = require('fs');
const path = require('path');
const { v4: uuidv4 } = require('uuid');

// Define regions
const regions = ['US', 'CA', 'APAC', 'EU'];

// Ensure data directory exists for each region
regions.forEach(region => {
  const dirPath = path.join(__dirname, '../data', region);
  if (!fs.existsSync(dirPath)) {
    fs.mkdirSync(dirPath, { recursive: true });
  }
  
  // Initialize an empty events file if it doesn't exist
  const eventsFile = path.join(dirPath, 'events.json');
  if (!fs.existsSync(eventsFile)) {
    fs.writeFileSync(eventsFile, JSON.stringify([], null, 2));
  }
});

// Event types for random generation
const eventTypes = [
  'PersonDetected', 
  'UnauthorizedAccess', 
  'EquipmentMalfunction', 
  'SafetyViolation',
  'MovementDetected'
];

// Locations for random generation
const locations = [
  'Warehouse A', 
  'Factory B', 
  'Office C', 
  'Loading Dock', 
  'Parking Lot'
];

// Function to generate a random event
function generateRandomEvent(region) {
  const eventType = eventTypes[Math.floor(Math.random() * eventTypes.length)];
  const location = locations[Math.floor(Math.random() * locations.length)];
  
  return {
    eventId: uuidv4(),
    region: region,
    ruleType: eventType,
    location: location,
    severity: Math.floor(Math.random() * 5) + 1, // 1-5 severity
    createdAt: new Date().toISOString(),
    state: 'Not Viewed',
    metadata: {
      deviceId: `device-${Math.floor(Math.random() * 1000)}`,
      cameraId: `cam-${Math.floor(Math.random() * 100)}`,
      frameReference: `frame-${Math.floor(Math.random() * 10000)}`
    }
  };
}

// Generate events for each region and upsert to the same file
function generateEvents(count = 10, maxEvents = 100) {
  console.log(`Generating ${count} events per region at ${new Date().toISOString()}...`);
  
  regions.forEach(region => {
    const eventsFile = path.join(__dirname, '../data', region, 'events.json');
    
    // Read existing events
    let events = [];
    try {
      const fileContent = fs.readFileSync(eventsFile, 'utf8');
      events = JSON.parse(fileContent);
    } catch (error) {
      console.error(`Error reading events file for ${region}: ${error.message}`);
      events = [];
    }
    
    // Add new events
    for (let i = 0; i < count; i++) {
      events.push(generateRandomEvent(region));
    }
    
    // Keep only the latest maxEvents
    if (events.length > maxEvents) {
      events = events.slice(events.length - maxEvents);
    }
    
    // Write back to file
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
    
    console.log(`Updated ${region} events file with ${count} new events. Total events: ${events.length}`);
  });
  
  return regions.map(region => ({
    region,
    count: count
  }));
}

// If called directly, start continuous generation
if (require.main === module) {
  const eventCount = process.argv[2] ? parseInt(process.argv[2]) : 10;
  const intervalMs = process.argv[3] ? parseInt(process.argv[3]) : 2000; // Default to 2 seconds
  const maxEvents = process.argv[4] ? parseInt(process.argv[4]) : 100; // Maximum events per region
  
  console.log(`Starting continuous event generation: ${eventCount} events every ${intervalMs}ms (max ${maxEvents} events per region)`);
  
  // Generate events immediately once
  generateEvents(eventCount, maxEvents);
  
  // Then set interval for continuous generation
  setInterval(() => {
    generateEvents(eventCount, maxEvents);
  }, intervalMs);
}

module.exports = { generateEvents, generateRandomEvent }; 