import app from './app.js';
import { env } from './config/env.js';
import { connectDatabase, disconnectDatabase } from './config/db.js';
import { seedDatabase } from './config/seed.js';

let server;

const startServer = async () => {
  try {
    // 1. Connect to MongoDB
    await connectDatabase();

    // 2. Idempotently bootstrap database & dedicated evaluator accounts
    if (process.env.SEED_ON_START !== 'false') {
      await seedDatabase();
    }

    // 3. Start Express server listener (bind to 0.0.0.0 for Render compatibility)
    server = app.listen(env.PORT, '0.0.0.0', () => {
      console.log(`[Server] Slotify API is running on port ${env.PORT} in ${env.NODE_ENV} mode`);
    });
  } catch (error) {
    console.error('[Server] Failed to start server due to database connection error:', error.message);
    process.exit(1);
  }
};

startServer();

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.error('[Server] Unhandled Rejection:', err);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle uncaught exceptions
process.on('uncaughtException', (err) => {
  console.error('[Server] Uncaught Exception:', err);
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      process.exit(1);
    });
  } else {
    process.exit(1);
  }
});

// Handle termination signals
process.on('SIGTERM', () => {
  console.log('[Server] SIGTERM received. Shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      console.log('[Server] Process terminated.');
    });
  }
});

process.on('SIGINT', () => {
  console.log('[Server] SIGINT received. Shutting down gracefully...');
  if (server) {
    server.close(async () => {
      await disconnectDatabase();
      console.log('[Server] Process terminated.');
      process.exit(0);
    });
  } else {
    process.exit(0);
  }
});
