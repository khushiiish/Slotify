import dotenv from 'dotenv';
import { z } from 'zod';

dotenv.config();

const envSchema = z.object({
  PORT: z.coerce.number().default(5000),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  MONGO_URI: z
    .string()
    .default(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/slotify'),
  JWT_SECRET: z.string().optional().default('development_secret_key_change_in_production'),
  JWT_EXPIRES_IN: z.string().default('1d'),
  CLIENT_URL: z.string().default('http://localhost:5173'),
  COOKIE_NAME: z.string().default('slotify_token'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
