-- Connect to relay_service database
\c relay_service;

-- Create events table
CREATE TABLE IF NOT EXISTS events (
    event_id UUID PRIMARY KEY,
    region VARCHAR(100) NOT NULL,
    device_id VARCHAR(100) NOT NULL,
    camera_id VARCHAR(100) NOT NULL,
    rule_type VARCHAR(50) NOT NULL,
    severity INTEGER NOT NULL CHECK (severity >= 1 AND severity <= 5),
    location VARCHAR(255) NOT NULL,
    frame_reference VARCHAR(255) NOT NULL,
    processed BOOLEAN NOT NULL DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create indexes
CREATE INDEX IF NOT EXISTS idx_events_created_at ON events(created_at);
CREATE INDEX IF NOT EXISTS idx_events_processed ON events(processed);
CREATE INDEX IF NOT EXISTS idx_rule_type ON events(rule_type);

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Trigger to automatically update updated_at
CREATE TRIGGER update_events_updated_at
    BEFORE UPDATE ON events
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column(); 