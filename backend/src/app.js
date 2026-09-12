import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import apiRoutes from './routes/index.routes.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendDistPath = path.resolve(__dirname, '../../frontend/dist');

const app = express();

// Security HTTP headers (configured to allow bundled SPA assets)
app.use(
  helmet({
    contentSecurityPolicy: false,
    crossOriginEmbedderPolicy: false,
  })
);

// CORS configuration (configured for credentials and whitelisted client origins)
const clientOrigins = env.CLIENT_URL.includes(',')
  ? env.CLIENT_URL.split(',').map((url) => url.trim())
  : env.CLIENT_URL;

app.use(
  cors({
    origin: clientOrigins,
    credentials: true,
  })
);

// HTTP request logger (skip during test executions)
if (env.NODE_ENV !== 'test') {
  app.use(morgan('dev'));
}

// Request body parsers
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Cookie parser
app.use(cookieParser());

// Rate limiting for API endpoints
app.use('/api', apiRateLimiter);

// Centralized API routes
app.use('/api', apiRoutes);

// In test environment, provide deterministic JSON root endpoint for test assertions
if (env.NODE_ENV === 'test') {
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Slotify API',
    });
  });
} else if (fs.existsSync(frontendDistPath)) {
  // Production / Single-Origin: Serve compiled React frontend static assets
  app.use(express.static(frontendDistPath));

  // SPA fallback for client-side routing (e.g. /login, /owner, /admin, /book/:slug)
  app.use((req, res, next) => {
    if (req.method === 'GET' && !req.originalUrl.startsWith('/api')) {
      return res.sendFile(path.join(frontendDistPath, 'index.html'));
    }
    next();
  });
} else {
  // Fallback if frontend has not been compiled
  app.get('/', (req, res) => {
    res.status(200).json({
      success: true,
      message: 'Welcome to Slotify API',
    });
  });
}

// Centralized 404 handler for API routes
app.use(notFoundMiddleware);

// Centralized error handler
app.use(errorMiddleware);

export default app;
