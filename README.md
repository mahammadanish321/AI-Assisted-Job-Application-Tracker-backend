# AI-Assisted Job Application Tracker - Backend

This is the backend API for the AI-Assisted Job Application Tracker. It is built with Node.js, Express, TypeScript, and MongoDB.

## Features

- **Authentication**: JWT-based auth with Access & Refresh tokens.
- **AI Integration**: Automatically extracts job details from descriptions using OpenAI/Gemini.
- **Gmail Sync**: Scans unread emails for updates from tracked companies.
- **Resume Tailoring**: Generates impact-driven resume bullets tailored to specific job descriptions.
- **Kanban Management**: Tracks job applications through customizable stages.

## Deployment Ready Fixes

The following issues were resolved to ensure deployment success on Render/Vercel:
1. **TypeScript Configuration**: Fixed `module` and `moduleResolution` to match CommonJS environment. Removed broken `types` array.
2. **Dependency Management**: Moved `@types/*` and `typescript` to `devDependencies`.
3. **Build Script**: Switched to `rimraf` for reliable cross-platform builds.
4. **Type Compatibility**: Downgraded Express 5 to 4.21 to resolve strict type conflicts with `express-async-handler`.

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
