import express from 'express';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import cors from 'cors';
import mongoose from 'mongoose';
import { notFound, errorHandler } from './middlewares/errorHandler';
import authRoutes from './routes/authRoutes';
import applicationRoutes from './routes/applicationRoutes';
import userRoutes from './routes/userRoutes';
import notificationRoutes from './routes/notificationRoutes';

dotenv.config();

const app = express();

app.use(cors({
  origin: [
    'http://localhost:5173', 
    'http://127.0.0.1:5173',
    process.env.FRONTEND_URL as string
  ].filter(Boolean),
  credentials: true,
  methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'Cookie'],
}));
app.use(express.json({ limit: '10mb' }));
app.use(cookieParser());

app.get('/', (req, res) => {
  res.send('API is running...');
});

// Routes
app.use('/api/auth', authRoutes);
app.use('/api/applications', applicationRoutes);
app.use('/api/users', userRoutes);
app.use('/api/notifications', notificationRoutes);

// Error handlers
app.use(notFound);
app.use(errorHandler);

const PORT = process.env.PORT || 5000;

// Connection state tracking
let isDbConnected = false;

/**
 * Health check endpoint - Used by Render to determine if app is ready
 */
app.get('/health', (req, res) => {
  if (isDbConnected) {
    res.status(200).json({ status: 'ok', db: 'connected' });
  } else {
    res.status(503).json({ status: 'connecting', db: 'pending' });
  }
});

/**
 * Start server IMMEDIATELY - Don't block on database connection
 * Render uses health checks to determine readiness
 */
const server = app.listen(PORT, () => {
  console.log(`[${new Date().toISOString()}] 🚀 Server started on port ${PORT} (connecting to DB...)`);
});

/**
 * Connect to MongoDB asynchronously with retry logic
 * Connection can happen after server starts for faster deployments
 */
const connectMongoDB = async () => {
  const maxRetries = 5;
  let retries = 0;

  while (retries < maxRetries) {
    try {
      const startTime = Date.now();
      await mongoose.connect(process.env.MONGO_URI as string, {
        // Connection pool optimization
        maxPoolSize: 10,
        minPoolSize: 5,
        socketTimeoutMS: 45000,
        serverSelectionTimeoutMS: 15000,
        connectTimeoutMS: 10000,
        retryWrites: true,
      });
      
      const connectionTime = Date.now() - startTime;
      isDbConnected = true;
      console.log(`[${new Date().toISOString()}] ✅ MongoDB Connected (${connectionTime}ms)`);
      return;
    } catch (error: any) {
      retries++;
      const backoffTime = Math.min(1000 * Math.pow(2, retries), 10000);
      console.warn(
        `[${new Date().toISOString()}] ⚠️  MongoDB Connection failed (attempt ${retries}/${maxRetries}): ${error.message}. Retrying in ${backoffTime}ms...`
      );

      if (retries >= maxRetries) {
        console.error(
          `[${new Date().toISOString()}] ❌ Failed to connect to MongoDB after ${maxRetries} attempts. Shutting down.`
        );
        server.close(() => {
          process.exit(1);
        });
        return;
      }

      await new Promise((resolve) => setTimeout(resolve, backoffTime));
    }
  }
};

// Start connection attempt in background
connectMongoDB().catch((error) => {
  console.error(`[${new Date().toISOString()}] Fatal error in MongoDB connection:`, error);
  process.exit(1);
});

// Graceful shutdown handling
process.on('SIGTERM', () => {
  console.log(`[${new Date().toISOString()}] SIGTERM received, closing gracefully...`);
  server.close(() => {
    console.log(`[${new Date().toISOString()}] Server closed`);
    mongoose.connection.close(false);
    process.exit(0);
  });
});

export default app;
