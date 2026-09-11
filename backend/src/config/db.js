import dns from 'node:dns';
import mongoose from 'mongoose';
import { env } from './env.js';

// Configure reliable DNS servers to avoid SRV query refusal on local network routers
if (env.MONGO_URI.startsWith('mongodb+srv://')) {
  try {
    dns.setServers(['8.8.8.8', '1.1.1.1']);
  } catch {
    // Ignore if not permitted
  }
}

/**
 * Connect to MongoDB database using Mongoose.
 * Reads MONGO_URI from centralized environment configuration.
 * Sanitizes logs to prevent credential leakage.
 */
export const connectDatabase = async () => {
  try {
    const conn = await mongoose.connect(env.MONGO_URI);
    // Log safely without exposing user/password
    const host = conn.connection.host || 'unknown-host';
    const dbName = conn.connection.name || 'default';
    console.log(`[Database] MongoDB connected successfully to ${host}/${dbName}`);
    return conn;
  } catch (error) {
    console.error(`[Database] Connection failed: ${error.message}`);
    throw error;
  }
};

/**
 * Disconnect from MongoDB database gracefully.
 */
export const disconnectDatabase = async () => {
  try {
    await mongoose.disconnect();
    console.log('[Database] MongoDB connection closed.');
  } catch (error) {
    console.error(`[Database] Disconnect error: ${error.message}`);
  }
};
