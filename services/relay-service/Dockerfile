FROM node:16-alpine

WORKDIR /app

# Copy package files
COPY package*.json ./

# Install production dependencies only
RUN npm install --only=production

# Copy source code
COPY . .

# Install dev dependencies for TypeScript compilation
RUN npm install --no-save typescript

# Build TypeScript
RUN npm run build

# Start the service
CMD ["npm", "start"]

# Add an alternative command for event generation
# Usage: docker compose run --rm event-generator <number_of_events>
#ENTRYPOINT ["node", "dist/scripts/generateEvents.js"] 