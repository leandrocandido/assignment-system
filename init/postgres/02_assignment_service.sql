-- Connect to assignment_service database
\c assignment_service;

-- Create events table (mirror of relay service events)
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY,
    region VARCHAR(100) NOT NULL,
    rule_type VARCHAR(100) NOT NULL,
    location VARCHAR(255),
    severity INTEGER NOT NULL,
    device_id VARCHAR(100),
    camera_id VARCHAR(100),
    frame_reference VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create assignments table
CREATE TABLE IF NOT EXISTS assignments (
    assignment_id SERIAL PRIMARY KEY,
    user_id INTEGER NOT NULL,
    event_id UUID NOT NULL REFERENCES events(event_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'assigned', 'completed', 'rejected')),
    deleted BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create dedup_events table for event deduplication
CREATE TABLE IF NOT EXISTS dedup_events (
    event_id UUID PRIMARY KEY REFERENCES events(event_id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create outbox_assignments table for reliable message publishing
CREATE TABLE IF NOT EXISTS outbox_assignments (
    id SERIAL PRIMARY KEY,
    assignment_id INTEGER NOT NULL REFERENCES assignments(assignment_id),
    status VARCHAR(20) NOT NULL CHECK (status IN ('pending', 'assigned', 'completed', 'rejected')),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_assignments_user_id ON assignments(user_id);
CREATE INDEX IF NOT EXISTS idx_assignments_event_id ON assignments(event_id);
CREATE INDEX IF NOT EXISTS idx_assignments_status ON assignments(status);
CREATE INDEX IF NOT EXISTS idx_outbox_assignments_status ON outbox_assignments(status);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Triggers to automatically update updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_assignments_updated_at
    BEFORE UPDATE ON assignments
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 