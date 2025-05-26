FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration
COPY package.json ./
COPY common/package.json ./common/
COPY services/relay-service/package.json ./services/relay-service/

# Install dependencies using workspaces
RUN npm install --workspace=relay-service --include-workspace-root --production

# Copy source code
COPY common ./common/
COPY services/relay-service/src ./services/relay-service/src/

WORKDIR /app/services/relay-service

EXPOSE 3000

CMD ["npm", "start"] 