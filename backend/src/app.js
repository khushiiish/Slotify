import express from 'express';
import helmet from 'helmet';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import morgan from 'morgan';
import { env } from './config/env.js';
import { apiRateLimiter } from './middleware/rateLimit.middleware.js';
import { notFoundMiddleware } from './middleware/notFound.middleware.js';
import { errorMiddleware } from './middleware/error.middleware.js';
import apiRoutes from './routes/index.routes.js';

const app = express();

// Security HTTP headers
app.use(helmet());

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

// Root endpoint
app.get('/', (req, res) => {
  res.status(200).json({
    success: true,
    message: 'Welcome to Slotify API',
  });
});

// Centralized API routes
app.use('/api', apiRoutes);

// Centralized 404 handler
app.use(notFoundMiddleware);

// Centralized error handler
app.use(errorMiddleware);

export default app;
