# Use Node.js LTS version
FROM node:23-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm ci --only=production

# Copy app source
COPY . .

# Create volume mount points
VOLUME ["/usr/src/app/data"]

# Expose healthcheck port
EXPOSE 8080

# Start the bot
CMD ["npm", "start"]
