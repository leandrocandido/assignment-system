FROM node:18-alpine

WORKDIR /app

# Copy workspace configuration
COPY package.json ./
COPY common/package.json ./common/
COPY services/assignment-service/package.json ./services/assignment-service/

# Install dependencies using workspaces
RUN npm install --workspace=assignment-service --include-workspace-root --production

# Copy source code
COPY common ./common/
COPY services/assignment-service/src ./services/assignment-service/src/

WORKDIR /app/services/assignment-service

EXPOSE 3000

CMD ["npm", "start"] 