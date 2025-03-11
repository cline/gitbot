# Use Node.js LTS version
FROM node:23-slim

# Create app directory
WORKDIR /usr/src/app

# Copy package files
COPY package*.json ./

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . ./

# Expose healthcheck port
EXPOSE 8080

# Start the bot
CMD ["node", "index.js"]
