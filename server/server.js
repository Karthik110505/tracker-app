import express from 'express';
import mongoose from 'mongoose';
import cors from 'cors';
import dotenv from 'dotenv';
import authRoutes from './routes/auth.js';
import folderRoutes from './routes/folders.js';
import testRoutes from './routes/tests.js';
import syncRoutes from './routes/sync.js';

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;
const MONGODB_URI = process.env.MONGODB_URI;
const MONGODB_DB_NAME = process.env.MONGODB_DB_NAME || 'gate_tracker';

// 1. CORS Configuration for Desktop & Mobile
app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like mobile apps, curl, postman)
      if (!origin) return callback(null, true);
      // Allow localhost, capacitor, and LAN origins
      if (
        origin.startsWith('http://localhost') ||
        origin.startsWith('http://127.0.0.1') ||
        origin.startsWith('capacitor://') ||
        origin.startsWith('http://10.0.2.2') ||
        origin.startsWith('http://192.168.') ||
        origin.startsWith('http://10.')
      ) {
        return callback(null, true);
      }
      return callback(null, true); // Permissive for private revision tracking
    },
    credentials: true
  })
);

// 2. LAYER 2 DEFENSE: Strict payload size gate (Blocks multi-MB HTML files)
app.use(express.json({ limit: '500kb' }));
app.use(express.urlencoded({ extended: true, limit: '500kb' }));

// 3. LAYER 3 DEFENSE: Middleware sanitizer to strip paperHtml
app.use((req, res, next) => {
  if (req.body && req.body.paperHtml !== undefined) {
    console.warn('[SECURITY] Intercepted and discarded paperHtml from incoming request body.');
    delete req.body.paperHtml;
  }
  next();
});

// 4. API Routes
app.use('/api/auth', authRoutes);
app.use('/api/folders', folderRoutes);
app.use('/api/tests', testRoutes);
app.use('/api/sync', syncRoutes);

// Health check endpoint
app.get('/api/health', (req, res) => {
  const dbState = mongoose.connection.readyState;
  const states = ['disconnected', 'connected', 'connecting', 'disconnecting'];
  res.json({
    status: 'ok',
    database: states[dbState] || 'unknown',
    databaseName: MONGODB_DB_NAME,
    timestamp: new Date().toISOString()
  });
});

// Centralized error handler
app.use((err, req, res, next) => {
  if (err.type === 'entity.too.large') {
    return res.status(413).json({
      success: false,
      error: 'Payload Too Large: Tests must contain only structured metadata, never raw HTML.'
    });
  }
  console.error('[SERVER ERROR]:', err);
  res.status(500).json({ success: false, error: err.message || 'Internal server error' });
});

// 5. Connect to MongoDB Atlas and Start Server
async function startServer() {
  if (!MONGODB_URI || MONGODB_URI.includes('<db_password>')) {
    console.warn('⚠️ [MONGODB] MONGODB_URI is not configured or contains placeholder in .env.');
    console.warn('⚠️ [MONGODB] The server will run in offline/unconnected mode until valid credentials are provided.');
  } else {
    try {
      console.log(`⏳ Connecting to MongoDB Atlas cluster at ${MONGODB_URI.split('@')[1]?.split('?')[0] || 'Atlas'}...`);
      await mongoose.connect(MONGODB_URI, {
        dbName: MONGODB_DB_NAME,
        serverSelectionTimeoutMS: 8000
      });
      console.log(`✅ [MONGODB] Connected successfully to database: ${MONGODB_DB_NAME}`);
    } catch (err) {
      console.error('❌ [MONGODB ERROR]: Failed to connect to MongoDB Atlas:', err.message);
    }
  }

  if (!process.env.VERCEL) {
    app.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 GATE Tracker API Server running on http://0.0.0.0:${PORT}`);
      console.log(`   Desktop Endpoint: http://localhost:${PORT}/api`);
      console.log(`   Health Check:     http://localhost:${PORT}/api/health`);
    });
  }
}

startServer();

export default app;
