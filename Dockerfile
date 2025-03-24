# Multi-stage build for IntelliBrowse Agent
# Stage 1: Build React frontend
FROM node:18-alpine as client-build
WORKDIR /app/client

# Copy client package.json and install dependencies
COPY client/package*.json ./
RUN npm install

# Copy client source code and build
COPY client/ ./
RUN npm run build

# Stage 2: Build Node.js backend
FROM node:18-alpine as server-build
WORKDIR /app

# Copy package.json and install dependencies
COPY package*.json ./
RUN npm install

# Copy source code
COPY src/ ./src/

# Stage 3: Final image
FROM node:18-alpine
WORKDIR /app

# Copy built client from stage 1
COPY --from=client-build /app/client/build ./client/build

# Copy backend from stage 2
COPY --from=server-build /app/node_modules ./node_modules
COPY --from=server-build /app/src ./src
COPY package*.json ./

# Environment setup
ENV NODE_ENV=production
ENV PORT=3001

# Expose port
EXPOSE 3001

# Start the app
CMD ["node", "src/index.js"] 