require('dotenv').config();
const express = require('express');
const http = require('http');
const path = require('path');
const fs = require('fs');
const cors = require('cors');
const { Server } = require('socket.io');
const { Pool } = require('pg');
const mockUsers = require('./data/mockUsers');
const redisService = require('./services/redisService');
const authMiddleware = require('./middleware/auth');

const app = express();
const server = http.createServer(app);
const io = new Server(server);

// Initialize PostgreSQL connection
const pool = new Pool({
  user: process.env.POSTGRES_USER || 'postgres',
  password: process.env.POSTGRES_PASSWORD || 'postgres123',
  host: process.env.POSTGRES_HOST || 'postgres',
  port: parseInt(process.env.POSTGRES_PORT || '5432'),
  database: process.env.POSTGRES_DB || 'assignment_service'
});

// Log environment variables (for debugging)
console.log('Environment Variables:', {
  PORT: process.env.PORT,
  REDIS_HOST: process.env.REDIS_HOST,
  REDIS_PORT: process.env.REDIS_PORT,
  SESSION_TTL: process.env.SESSION_TTL
});

// Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, '../public')));

// Login endpoint
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;

  // Find user in mock data
  const user = mockUsers.find(u => u.username === username && u.password === password);

  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials' });
  }

  try {
    // Get assignment count from database
    const result = await pool.query(
      `SELECT COUNT(*) 
       FROM assignments 
       WHERE user_id = $1 
       AND status = 'pending' 
       AND deleted = false`,
      [user.id]
    );

    const assignmentCount = parseInt(result.rows[0].count);
    
    // Create session in Redis
    const sessionData = {
      id: user.id,
      username: user.username,
      name: user.name,
      role: user.role,
      region: user.region,
      assignments: assignmentCount
    };

    const success = await redisService.setSession(user.id, sessionData);

    if (!success) {
      return res.status(500).json({ error: 'Failed to create session' });
    }

    res.json({
      userId: user.id,
      ...sessionData
    });
  } catch (error) {
    console.error('Error during login:', error);
    res.status(500).json({ error: 'Internal server error' });
  }
});

// Logout endpoint
app.post('/api/logout', async (req, res) => {
  console.log(`logout received ${req.body}`);

  const { currentUserId } = req.body;
  
  if (!currentUserId) {
    console.log(`No user ID provided${currentUserId}`);
    return res.status(400).json({ error: 'No user ID provided' });
  }

  await redisService.removeSession(currentUserId);
  res.json({ success: true });
});

// Get current user session
app.get('/api/session', async (req, res) => {
  const userId = req.headers['x-user-id'];
  
  if (!userId) {
    return res.status(401).json({ error: 'No user ID provided' });
  }

  const userData = await redisService.getSession(userId);
  
  if (!userData) {
    return res.status(401).json({ error: 'Session expired or invalid' });
  }

  res.json(userData);
});

// Define regions
const regions = ['US', 'CA', 'APAC', 'EU'];

// Routes
app.get('/api/regions', authMiddleware, (req, res) => {
  res.json(regions);
});

// Get events from a specific region
app.get('/api/events/:region', (req, res) => {
  const { region } = req.params;
  
  if (!regions.includes(region)) {
    return res.status(400).json({ error: 'Invalid region' });
  }
  
  try {
    const eventsFile = path.join(__dirname, '../data', region, 'events.json');
    if (!fs.existsSync(eventsFile)) {
      return res.json([]);
    }
    
    const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    res.json(events);
  } catch (error) {
    console.error(`Error reading events for ${region}:`, error);
    res.status(500).json({ error: 'Failed to fetch events' });
  }
});


// Update event state (Not Viewed/Approved/Rejected)
app.post('/api/events/:region/:eventId', (req, res) => {
  const { region, eventId } = req.params;
  const { state } = req.body;
  
  if (!regions.includes(region)) {
    return res.status(400).json({ error: 'Invalid region' });
  }
  
  if (!['Not Viewed', 'Approved', 'Rejected'].includes(state)) {
    return res.status(400).json({ error: 'Invalid state' });
  }
  
  try {
    const eventsFile = path.join(__dirname, '../data', region, 'events.json');
    if (!fs.existsSync(eventsFile)) {
      return res.status(404).json({ error: 'Events file not found' });
    }
    
    const events = JSON.parse(fs.readFileSync(eventsFile, 'utf8'));
    const eventIndex = events.findIndex(event => event.eventId === eventId);
    
    if (eventIndex === -1) {
      return res.status(404).json({ error: 'Event not found' });
    }
    
    events[eventIndex].state = state;
    fs.writeFileSync(eventsFile, JSON.stringify(events, null, 2));
    
    // Broadcast the update to all connected clients
    io.emit('eventUpdated', { region, eventId, state });
    
    res.json({ success: true, event: events[eventIndex] });
  } catch (error) {
    console.error(`Error updating event:`, error);
    res.status(500).json({ error: 'Failed to update event' });
  }
});

// Socket.io connection with authentication
io.use(async (socket, next) => {
  const userId = socket.handshake.auth.userId;
  if (!userId) {
    return next(new Error('Authentication error'));
  }

  const isValid = await redisService.isSessionValid(userId);
  if (!isValid) {
    return next(new Error('Session expired'));
  }

  const userData = await redisService.getSession(userId);
  socket.user = userData;
  next();
});

io.on('connection', (socket) => {
  console.log(`User ${socket.user.name} connected`);
  
  socket.on('disconnect', () => {
    console.log(`User ${socket.user.name} disconnected`);
  });
});

// Get all users who have ever logged in
app.get('/api/users/logged', authMiddleware, async (req, res) => {
  try {
    const loggedUsers = await redisService.getLoggedUsers();
    
    // Only supervisors can see this information
    if (req.user.role !== 'supervisor') {
      return res.status(403).json({ error: 'Access denied. Supervisor role required.' });
    }

    // Get user details for each logged user ID
    const userDetails = loggedUsers.map(userId => {
      const user = mockUsers.find(u => u.id.toString() === userId);
      if (user) {
        return {
          id: user.id,
          name: user.name,
          username: user.username,
          role: user.role,
          region: user.region
        };
      }
      return null;
    }).filter(Boolean);

    res.json(userDetails);
  } catch (error) {
    console.error('Error fetching logged users:', error);
    res.status(500).json({ error: 'Failed to fetch logged users' });
  }
});

// Events endpoint
app.get('/api/events', async (req, res) => {
    console.log('GET /api/events called');
    console.log('Query params:', req.query);
    console.log('User ID from query:', req.query.userId);

    const userId = req.query.userId;
    if (!userId) {
        console.log('No userId provided');
        return res.status(400).json({ error: 'User ID is required' });
    }

    const client = await pool.connect();
    try {
        console.log('Executing database query for userId:', userId);
        const result = await client.query(
            `SELECT 
                e.event_id,
                e.rule_type,
                e.region,
                e.location,
                e.severity,
                e.device_id,
                e.camera_id,
                e.frame_reference,
                e.created_at,
                a.assignment_id,
                a.status as assignment_status
             FROM assignments a
             INNER JOIN events e ON e.event_id = a.event_id
             WHERE a.user_id = $1 
             AND a.status = 'pending'
             AND a.deleted = false
             ORDER BY e.created_at DESC`,
            [userId]
        );

        console.log('Database query completed. Row count:', result.rowCount);
        res.json(result.rows);
    } catch (error) {
        console.error('Error fetching events:', error);
        res.status(500).json({ error: 'Internal server error' });
    } finally {
        client.release();
    }
});

// Start the server
const PORT = process.env.PORT || 3001;
server.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
  
  // Generate initial events
  
  // Start the event generator to run in the background


}); 