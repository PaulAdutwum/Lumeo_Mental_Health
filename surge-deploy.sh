#!/bin/bash

echo "Deploying Lumeo to Surge.sh..."

# Check if surge is installed
if ! command -v surge &> /dev/null
then
    echo "Error: surge is not installed. Installing it now..."
    npm install -g surge
fi

# Build the app with proper configuration
echo "Building the application..."
npm run build

# Copy index.html to 200.html for client-side routing support
echo "Setting up client-side routing support..."
cp dist/index.html dist/200.html

# Deploy to Surge
echo "Deploying to lumeo.surge.sh..."
cd dist && surge --domain lumeo.surge.sh

echo "Deployment completed!"
echo "Your app should be available at https://lumeo.surge.sh" 