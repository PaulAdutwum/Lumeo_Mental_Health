// This file is used to configure API routes
export const config = {
  runtime: 'nodejs18.x',
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  }
}; 