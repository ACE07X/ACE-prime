# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files from files/ directory
COPY files/package*.json ./

# Install ALL dependencies (including dev for build)
RUN npm install

# Copy source code from files/ directory
COPY files/ .

# Build TypeScript
RUN npm run build

# Remove dev dependencies after build
RUN npm prune --production

# Expose port (optional, Railway auto-detects)
EXPOSE 3000

# Start the bot
CMD ["npm", "start"]
