# syntax = docker/dockerfile:1

############################################
# Stage 1: Build your Vite + Native deps
############################################
ARG NODE_VERSION=18.19.1
FROM node:${NODE_VERSION}-slim AS builder

WORKDIR /app
ENV NODE_ENV=production
ENV SKIP_CANVAS=1
ENV CANVAS_SKIP_INSTALLATION=1
ENV npm_config_canvas_skip_installation=1

# Install TypeScript globally to ensure tsc is available
RUN npm install -g typescript

# Install all npm deps
COPY package*.json ./
RUN npm ci --no-optional

# Copy config files
COPY tsconfig*.json ./
COPY vite.config.ts ./

# Copy source files
COPY public ./public
COPY src ./src
COPY server-esm.js ./
COPY .env* ./

# Build the front-end
RUN npm run build

############################################
# Stage 2: Production image (Node only)
############################################
FROM node:${NODE_VERSION}-slim

WORKDIR /app
ENV NODE_ENV=production
ENV PORT=5000
ENV SKIP_CANVAS=1
ENV CANVAS_SKIP_INSTALLATION=1
ENV npm_config_canvas_skip_installation=1

# Copy runtime files
COPY package.json ./
RUN npm install --omit=dev --no-optional express

# Copy built front-end and server code
COPY --from=builder /app/dist ./dist
COPY --from=builder /app/server-esm.js ./server.js
COPY --from=builder /app/.env* ./

# Expose & run
EXPOSE 5000
CMD ["node", "server/index.js"]