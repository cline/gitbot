# Use Node.js LTS version
FROM node:23-slim

# Create app directory
WORKDIR /app

# Copy package files
COPY package*.json /app/

# Install dependencies
RUN npm install --omit=dev

# Copy app source
COPY . /app/

RUN mkdir /app/data

# Expose healthcheck port
EXPOSE 8080

RUN ls -al /app

# Start the bot
CMD ["node", "index.js"]
