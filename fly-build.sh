#!/bin/bash

# Exit on error
set -e

echo "Starting Fly.io build script..."

# Create server-esm.js if it doesn't exist
if [ ! -f server-esm.js ]; then
  echo "Creating minimal server-esm.js..."
  cat > server-esm.js << 'EOF'
// Minimal ESM server for deployment
import express from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { dirname } from 'path';
import fs from 'fs';

// Get __dirname equivalent 
const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

// Create Express app
const app = express();

// Log startup info
console.log('Starting server in directory:', __dirname);
console.log('Files in current directory:', fs.readdirSync(__dirname));

// Serve static files
app.use(express.static(path.join(__dirname, 'dist')));

// Health check endpoint
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date() });
});

// Send all requests to index.html
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'dist', 'index.html'));
});

// Start the server
const PORT = process.env.PORT || 5000;
app.listen(PORT, '0.0.0.0', () => {
  console.log(`Server running on port ${PORT}`);
});
EOF
fi

# Deploy
echo "Deploying to Fly.io..."
flyctl deploy --remote-only

echo "Deployment completed!" 