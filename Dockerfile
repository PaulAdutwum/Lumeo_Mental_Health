# syntax = docker/dockerfile:1

# Adjust NODE_VERSION as desired
ARG NODE_VERSION=18.19.1
FROM node:${NODE_VERSION}-slim AS base

LABEL fly_launch_runtime="Vite+Node.js"

# App lives here
WORKDIR /app

# Set production environment
ENV NODE_ENV="production"


# Throw-away build stage to reduce size of final image
FROM base AS build

# Install packages needed to build node modules
RUN apt-get update -qq && \
    apt-get install --no-install-recommends -y build-essential node-gyp pkg-config python-is-python3 libcairo2-dev libpango1.0-dev libjpeg-dev libgif-dev librsvg2-dev

# Install node modules
COPY package-lock.json package.json ./
RUN npm ci --include=dev

# Copy application code
COPY . .

# Build application
RUN npm run build

# Remove development dependencies
RUN npm prune --omit=dev


# Final stage for app image
FROM nginx AS frontend

# Copy built frontend application
COPY --from=build /app/dist /usr/share/nginx/html

# Copy nginx configuration
COPY nginx.conf /etc/nginx/conf.d/default.conf

# API server stage
FROM base AS api

# Copy application code from build
COPY --from=build /app/node_modules ./node_modules
COPY --from=build /app/api ./api
COPY --from=build /app/server ./server
COPY --from=build /app/package.json ./
COPY --from=build /app/package-lock.json ./
COPY --from=build /app/.env* ./

# Combined stage for both frontend and API
FROM ubuntu:22.04

# Install dependencies
RUN apt-get update && apt-get install -y nginx nodejs npm

# Create app directories
WORKDIR /app
RUN mkdir -p /usr/share/nginx/html /app/api /app/server

# Copy nginx configuration
COPY --from=frontend /etc/nginx/conf.d/default.conf /etc/nginx/conf.d/default.conf

# Copy frontend from frontend stage
COPY --from=frontend /usr/share/nginx/html /usr/share/nginx/html

# Copy API server from api stage
COPY --from=api /app /app

# Expose ports
EXPOSE 80
EXPOSE 3001

# Start both nginx (for frontend) and Node.js API server
CMD /bin/bash -c "cd /app && node server/index.js & nginx -g 'daemon off;'"
