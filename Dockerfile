# syntax = docker/dockerfile:1

############################################
# Stage 1: Build your Vite + Native deps
############################################
ARG NODE_VERSION=18.19.1
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app
ENV NODE_ENV=production

# Install OS-level deps for Canvas
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y \
    build-essential node-gyp pkg-config python-is-python3 \
    libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev \
    && rm -rf /var/lib/apt/lists/*

# Install all npm deps
COPY package*.json ./
RUN npm ci

# Copy everything and build the front-end
COPY . .
RUN npm run build

############################################
# Stage 2: Production image (Node only)
############################################
FROM node:${NODE_VERSION}-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000

# Copy only production deps
COPY package*.json ./
RUN npm ci --omit=dev

# Copy built front-end and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server.js ./server.js
# If you have other server files or folders, e.g. /server, copy them too:
COPY --from=builder /app/server ./server

# Expose & run
EXPOSE 5000
CMD ["node", "server.js"]