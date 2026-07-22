# ---- Build stage ----
# Installs ALL dependencies (including devDependencies like typescript)
# so that `tsc` is available to compile the TypeScript sources.
FROM node:20-alpine AS builder

WORKDIR /app

# Copy manifests and install all deps (dev included)
COPY package*.json ./
RUN npm install

# Copy the rest of the source and build
COPY . .
RUN npm run build

# ---- Runtime stage ----
# Ships only production dependencies + compiled output for a lean image.
FROM node:20-alpine

WORKDIR /app

# Install only production dependencies
COPY package*.json ./
RUN npm install --omit=dev

# Copy compiled JavaScript from the build stage
COPY --from=builder /app/dist ./dist

# Expose the port
EXPOSE 8080

# Start the server
CMD ["npm", "start"]
