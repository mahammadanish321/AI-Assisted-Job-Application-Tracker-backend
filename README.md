# 🏢 Soon — AI-Assisted Tracker (Backend)

The powerful backend engine for **Soon**, featuring a modular AI integration layer, automated Gmail synchronization, and a secure JWT-based authentication system.

---

## 🚀 Core Features
*   **🧩 Modular AI Service:** Switch between Google Gemini and OpenAI o3-mini/o4-mini dynamically via environment variables.
*   **📧 Gmail API Integration:** Automated background syncing for interview and job update notifications.
*   **🛠️ Optimized Fallbacks:** Automatic model fallback (e.g., from Gemini 1.5 Pro to Flash) ensuring 99.9% parsing uptime.
*   **🔒 Secure Auth:** JWT authentication with HttpOnly cookies and rotation of refresh tokens.
*   **📁 Task Management:** Robust REST API for Kanban stages, applications, and resume metadata.

---

## 🛠️ Environment Variables
Create a `.env` file in this directory and add the following:

```env
# Server
PORT=5000
NODE_ENV=production
FRONTEND_URL=https://ai-assisted-job-application-tracker.vercel.app

# Database
MONGO_URI=mongodb+srv://user:pass@cluster.mongodb.net/dbname

# AI Configuration (gemini or openai)
AI_PROVIDER=gemini
GEMINI_API_KEY=your_key
GEMINI_MODEL=gemini-1.5-flash
OPENAI_API_KEY=your_key
OPENAI_MODEL=gpt-4o-mini

# Google OAuth (For Gmail Sync)
GOOGLE_CLIENT_ID=your_id
GOOGLE_CLIENT_SECRET=your_secret

# Cloudinary (For Avatars/Resumes)
CLOUDINARY_CLOUD_NAME=name
CLOUDINARY_API_KEY=key
CLOUDINARY_API_SECRET=secret

# JWT
JWT_ACCESS_SECRET=your_secret
JWT_REFRESH_SECRET=your_secret
```

---

## ⚡ Quick Start

```bash
# 1. Install dependencies
npm install

# 2. Run in development
npm run dev

# 3. Build for production
npm run build
```

---

## 🏗️ Architecture
- **Controllers:** Handle HTTP requests and business logic.
- **Services:** Modular logic for AI parsing and Gmail interaction.
- **Middlewares:** Auth verification and error handling.
- **Models:** Typed Mongoose schemas for Users and Applications.
