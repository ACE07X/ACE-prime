# Use Node.js 20 LTS
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package files from web/ directory
COPY web/package*.json ./

# Install dependencies
RUN npm install

# Copy source code from web/ directory
COPY web/ .

# Build Next.js application
RUN npm run build

# Expose port 3000
EXPOSE 3000

# Start the application
CMD ["npm", "start"]
