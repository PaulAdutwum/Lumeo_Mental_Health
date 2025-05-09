#!/bin/bash

# Build the front-end
echo "Building front-end..."
npm run build

# Create the server directory in dist
echo "Setting up server files..."
mkdir -p dist/server
mkdir -p dist/server/api

mkdir -p dist/server/api/media-gen

# Copy server files to dist
cp server/index.js dist/server/

cp server/api/media-gen/image.js dist/server/api/media-gen/

echo "Build completed successfully!" 