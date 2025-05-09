#!/bin/bash

echo "Deploying Lumeo to Fly.io..."

# Check if flyctl is installed
if ! command -v flyctl &> /dev/null
then
    echo "Error: flyctl is not installed. Please run 'npm install -g @flydotio/fly'"
    exit 1
fi

# Check login status
if ! flyctl auth whoami &> /dev/null
then
    echo "You need to log in to Fly.io first"
    flyctl auth login
fi

# Create required volumes if they don't exist
echo "Creating data volume if needed..."
flyctl volumes list | grep lumeo_data || flyctl volumes create lumeo_data --size 1 --region dfw

# Build and deploy the application
echo "Building and deploying application..."
flyctl deploy

echo "Deployment completed! Your app should be available shortly."
echo "You can check its status with: flyctl status"
echo "Or open it in your browser with: flyctl open" 