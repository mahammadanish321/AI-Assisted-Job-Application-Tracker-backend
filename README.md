# AI-Assisted Job Application Tracker - Backend

This is the backend API for the AI-Assisted Job Application Tracker. It is built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication**: JWT-based auth with Access & Refresh tokens.
- **AI Integration**: Automatically extracts job details from descriptions using OpenAI/Gemini.
- **Gmail Sync**: Scans unread emails for updates from tracked companies.
- **Resume Tailoring**: Generates impact-driven resume bullets tailored to specific job descriptions.
- **Kanban Management**: Tracks job applications through customizable stages.

## Render Deployment Optimization

This project has been optimized for **fast, reliable deployment on Render**. Expected deployment time: **5-10 minutes** (down from 30+ minutes).

### Key Optimizations Implemented

1. **Non-Blocking Startup**
   - Server starts immediately (<100ms)
   - MongoDB connection happens asynchronously in background
   - Health check endpoint for Render readiness detection

2. **Lightweight Dependencies**
   - Replaced `googleapis` (144MB) with `google-auth-library` (8MB)
   - Replaced `bcrypt` with `bcryptjs` for faster build compilation
   - Moved all `@types/*` to devDependencies

3. **Database Connection Pooling**
   - Optimized MongoDB connection pool (min 5, max 10)
   - Intelligent retry logic with exponential backoff
   - Connection timeouts tuned for production

4. **Gmail Sync Performance**
   - Parallel batch processing (10 concurrent requests)
   - Batch database inserts with `insertMany()`
   - Smart deduplication for notifications

5. **Build Configuration**
   - `render.yaml` for deployment hints
   - `.npmrc` for optimized npm installs
   - `.dockerignore` to reduce Docker build size
   - TypeScript incremental compilation enabled

See [DEPLOYMENT.md](./DEPLOYMENT.md) for complete deployment guide.

## Environment Variables

Create a `.env` file based on `.env.example`:

```env
MONGO_URI=your_mongodb_uri
FRONTEND_URL=your_frontend_url
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
OPENAI_API_KEY=your_key
AI_PROVIDER=gemini # or openai
CLOUDINARY_CLOUD_NAME=your_name
CLOUDINARY_API_KEY=your_key
CLOUDINARY_API_SECRET=your_secret
```

## Getting Started

### Installation
```bash
npm install
```

### Development
```bash
npm run dev
```

### Build
```bash
npm run build
```

### Production Start
```bash
npm start
```

## API Endpoints

- `POST /api/auth/register` - Register user
- `POST /api/auth/login` - Login user
- `GET /api/applications` - Get user applications
- `POST /api/applications` - Create/Extract application
- `POST /api/notifications/sync-gmail` - Sync Gmail updates
