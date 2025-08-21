# Use official Node.js image
FROM node:20-alpine

# Set working directory
WORKDIR /app

# Copy package.json and package-lock.json
COPY package*.json ./

# Install dependencies
RUN npm install --production

# Copy the rest of the code
COPY . .

# Build TypeScript
RUN npm run build

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
