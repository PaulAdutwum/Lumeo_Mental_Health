#!/bin/bash

# Build the app
echo "Building the app..."
npm run build

# Create 200.html for client-side routing
echo "Setting up client-side routing..."
cp dist/index.html dist/200.html

# Create CNAME file if it doesn't exist
if [ ! -f dist/CNAME ]; then
  echo "Creating CNAME file..."
  echo "lumeo-health.surge.sh" > dist/CNAME
fi

# Deploy to Surge
echo "Deploying to Surge..."
cd dist && surge --domain lumeo-health.surge.sh

echo "Deployment complete! Your app should be available at https://lumeo-health.surge.sh" 