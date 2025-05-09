#!/bin/bash

# Check if server/index.js exists
if [ -f server/index.js ]; then
  echo "Starting server with server/index.js..."
  node server/index.js
else
  echo "Starting server with server.js..."
  node server.js
fi 