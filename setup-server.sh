#!/bin/bash

# Stop script on error
set -e

echo "Installing server dependencies..."
npm install express cors body-parser pg dotenv axios nodemon concurrently

echo "Installing AWS SDK..."
npm install aws-sdk @aws-sdk/client-s3

echo "Creating necessary directories if they don't exist..."
mkdir -p server

echo "Setup complete! You can now run the server with 'npm run server:dev' or start both server and client with 'npm run start:dev'" 