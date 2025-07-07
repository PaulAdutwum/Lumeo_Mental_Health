
# Lumeo – AI-Powered Mental Wellness Companion

Lumeo is an intelligent mental wellness companion that blends conversational AI, emotional-intelligence analysis, image generation, and personalized counselor recommendations to support your journey toward better mental health. Built on OpenAI GPT-4 for empathy-driven dialogue, DALL·E for therapeutic imagery, and Pinecone for fast vector search, Lumeo connects you to curated self-care tools, local mental health resources, and licensed professionals.

---

## Project URL

[https://lumeo/herokuapp.com](https://lumeo.surge.sh/chat)

---

## Setup

### Environment Variables

Create a file named `.env` in the project root and populate it with:

```
# YouTube & TMDB
VITE_YOUTUBE_API_KEY=your_youtube_api_key
VITE_TMDB_API_KEY=your_tmdb_api_key

# OpenAI & DALL·E
OPENAI_API_KEY=your_openai_api_key

# Pinecone (vector DB for semantic search)
PINECONE_API_KEY=your_pinecone_api_key
PINECONE_ENVIRONMENT=your_pinecone_environment

# AWS (media & data storage)
AWS_REGION=us-east-1
AWS_ACCESS_KEY_ID=your_aws_access_key
AWS_SECRET_ACCESS_KEY=your_aws_secret_key
AWS_S3_BUCKET=lumeo-assets

```

### YouTube API Key

To use the video and music features:

1. Create a Google Cloud project at https://console.cloud.google.com/
2. Enable the YouTube Data API v3
3. Create an API key with appropriate restrictions
4. Add the key to your `.env` file

## Development

```bash
# Install dependencies
npm install

# Start development server
npm run dev
```

## Features

- AI Conversation: Chat with Lumeo about your thoughts and feelings
- Drawing Canvas: Express yourself creatively
- Wellness Videos: Curated content for mindfulness, meditation, and more
- Relaxing Music: Find music to help you unwind and focus
- Breathing Exercises: Guided exercises to help manage anxiety and stress

## Migration from Firebase to PostgreSQL/AWS

This project has been migrated from Firebase to PostgreSQL and AWS for improved performance and scalability. The following guide explains how to set up the new infrastructure and migrate existing data.

## Prerequisites

- Node.js 16+
- PostgreSQL 13+
- AWS account with appropriate permissions
- Firebase project (for data migration)

## Environment Setup

1. Copy the `.env.example` file to `.env` and fill in the required values:

```bash
cp .env.example .env
```

2. Configure the following environment variables:

- **PostgreSQL**:

  - `POSTGRES_URL`: PostgreSQL connection string
  - `POSTGRES_SSL`: Set to `true` if SSL is required

- **AWS**:

  - `AWS_REGION`: AWS region (e.g., us-east-1)
  - `AWS_ACCESS_KEY_ID`: AWS access key
  - `AWS_SECRET_ACCESS_KEY`: AWS secret access key
  - `AWS_S3_BUCKET`: S3 bucket name for media storage

- **API Keys**:
  - `OPENAI_API_KEY`: OpenAI API key for AI features
  - `REPLICATE_API_TOKEN`: Optional for alternative image generation

## Database Setup

1. Create a PostgreSQL database:

```sql
CREATE DATABASE lumeo_db;
```

2. Run the migration script to create tables:

```bash
psql -U postgres -d lumeo_db -f migrations/create_tables.sql
```

## Data Migration

To migrate existing data from Firebase to PostgreSQL:

1. Export your Firebase service account credentials:

   - Go to Firebase console > Project settings > Service accounts
   - Click "Generate new private key" and save as `firebase-credentials.json` in the project root

2. Install dependencies:

```bash
npm install pg pg-format firebase-admin dotenv
```

3. Run the migration script:

```bash
node scripts/migrate-firebase-to-postgres.js
```

## AWS Infrastructure Setup

1. Set up an S3 bucket for media storage:

```bash
aws s3 mb s3://lumeo-assets --region <your-region>
```

2. Configure bucket permissions:

```bash
aws s3api put-bucket-policy --bucket lumeo-assets --policy file://aws/bucket-policy.json
```

3. Create CloudFront distribution for the S3 bucket (optional but recommended)

## Running the Application

1. Install dependencies:

```bash
npm install
```

2. Install server dependencies:

```bash
./setup-server.sh
```

3. Start both server and client in development mode:

```bash
npm run start:dev
```

4. Alternatively, start just the server:

```bash
npm run server:dev
```

5. Or just the client:

```bash
npm run client:dev
```

## Deployment

For production deployment:

1. Build the client:

```bash
npm run build
```

2. Start the production server:

```bash
npm start
```

## Key Features

- **Therapeutic Chat**: AI-powered conversations with emotion analysis
- **Therapeutic Imagery**: Generate calming images based on emotional state
- **Video Recommendations**: YouTube-based therapeutic video recommendations
- **Breathing Exercises**: Guided breathing exercises for anxiety relief
- **Mood Tracking**: Track emotional states over time

## Video Recommendations Feature

The new video recommendations feature allows users to:

1. Set personalized video preferences from categories like relaxation, meditation, etc.
2. Get AI-recommended videos based on their current emotional state
3. Watch videos directly within the application
4. Provide feedback to improve future recommendations
5. Track emotional changes before and after watching videos

## PostgreSQL Schema

The database schema includes tables for:

- Users and authentication
- Chat messages and sentiment analysis
- Media assets (images and videos)
- User preferences and recommendations
- Emotional tracking and analytics

## Server Architecture

The backend server provides the following API endpoints:

- `/api/videos/recommendations` - Get video recommendations based on emotion and preferences
- `/api/videos/watch` - Log video watch events
- `/api/videos/feedback` - Save user feedback about videos
- `/api/videos/preferences` - Save user video category preferences
- `/api/health` - Health check endpoint

## License

[MIT](LICENSE)
