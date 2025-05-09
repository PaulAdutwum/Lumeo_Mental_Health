#!/bin/bash

# Skip all optional/native deps (incl. canvas)
export NPM_CONFIG_OPTIONAL=false

# If you still want to be extra-safe, also:
export CANVAS_SKIP_BUILD=1

echo "Installing & building without canvas..."
npm install
npm run build

echo "Setting up server files..."
mkdir -p dist/server/api/media-gen
cp server/index.js dist/server/
cp server/youtubeService.js dist/server/
cp server/api/media-gen/image.js dist/server/api/media-gen/

echo "Build completed successfully!"