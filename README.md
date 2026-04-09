# 🏢 Soon — AI-Assisted Tracker (Backend)

The powerful backend engine for **Soon**, featuring a modular AI integration layer, automated Gmail synchronization, and a secure JWT-based authentication system.

**Live Demo:** [https://ai-assisted-job-application-tracker.vercel.app/](https://ai-assisted-job-application-tracker.vercel.app/)  
**Frontend Repo:** [https://github.com/mahammadanish321/AI-Assisted-Job-Application-Tracker-frontend](https://github.com/mahammadanish321/AI-Assisted-Job-Application-Tracker-frontend)  
**Backend Repo:** [https://github.com/mahammadanish321/AI-Assisted-Job-Application-Tracker-backend](https://github.com/mahammadanish321/AI-Assisted-Job-Application-Tracker-backend)

---

## 🧠 Modular AI Engine
The backend features a **Provider-Agnostic AI Service**. You can switch between leading AI models seamlessly by changing a single environment variable.
- **Supported Providers:** Google Gemini (1.5 Pro/Flash) and OpenAI (o3-mini/o4-mini).
- **Intelligent Fallback:** If the primary model fails or hits rate limits, the system can automatically downgrade to a faster/more available model to ensure service continuity.
- **JSON Enforcement:** The AI service uses strict schemas to ensure extracted job data is always perfectly formatted for the frontend.

---

## 📧 Gmail Intelligence & Filtering
- **Automated Sync:** Uses Google OAuth to securely access job-related communications.
- **Smart Filtering:** Instead of scanning every email, the system uses specific keyword heuristics to identify interview invites, application confirmations, and rejection updates.
- **Status Mapping:** Detected emails automatically suggest status updates for your tracked applications.

---

## 📂 Profile & Resume Management
- **Multi-Resume Support:** Integration with Cloudinary allows users to upload multiple resumes.
- **Metadata Tracking:** Each application is linked to a specific resume version, making it easy to track which resume performed best.
- **Profile Customization:** Comprehensive user management including avatars and career preferences.

---

## 🛠️ Installation & Setup

### 1. Clone the Repository
```bash
git clone https://github.com/mahammadanish321/AI-Assisted-Job-Application-Tracker-backend.git
cd AI-Assisted-Job-Application-Tracker-backend
```

### 2. Environment Variables
Create a `.env` file:
```env
# Server & Security
PORT=5000
JWT_ACCESS_SECRET=your_secret
FRONTEND_URL=https://your-frontend.vercel.app

# Database
MONGO_URI=mongodb+srv://...

# AI Modularity (Provider: 'gemini' or 'openai')
AI_PROVIDER=gemini
GEMINI_API_KEY=...
OPENAI_API_KEY=...

# Cloudinary (Resumes & Avatars)
CLOUDINARY_URL=cloudinary://...
```

### 3. Build & Run
```bash
# Install dependencies
npm install

# Run development
npm run dev

# Production Build
npm run build
npm start
```

---

## 🏗️ Architecture
- **Controllers:** Modular request handlers.
- **Services:** Decoupled logic for AI, Gmail, and File Uploads.
- **Middlewares:** Global error handling and JWT verification.
- **Database:** MongoDB with Mongoose for structured career data.
