import dotenv from 'dotenv';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import { z } from 'zod';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const backendEnv = path.resolve(__dirname, '../../.env');
const rootEnv = path.resolve(__dirname, '../../../.env');

if (fs.existsSync(backendEnv)) {
  dotenv.config({ path: backendEnv });
} else if (fs.existsSync(rootEnv)) {
  dotenv.config({ path: rootEnv });
} else {
  dotenv.config();
}

const envSchema = z
  .object({
    PORT: z.coerce.number().default(5000),
    NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
    MONGO_URI: z
      .string()
      .default(process.env.MONGO_URI || process.env.MONGODB_URI || 'mongodb://localhost:27017/slotify'),
    JWT_SECRET: z.string().default('development_secret_key_change_in_production'),
    JWT_EXPIRES_IN: z.string().default('1d'),
    CLIENT_URL: z.string().default('http://localhost:5173'),
    COOKIE_NAME: z.string().default('slotify_token'),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === 'production') {
      if (!data.MONGO_URI || data.MONGO_URI.includes('localhost') || data.MONGO_URI.includes('127.0.0.1')) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production requires a valid external MONGO_URI (e.g. MongoDB Atlas cluster)',
          path: ['MONGO_URI'],
        });
      }
      if (
        !data.JWT_SECRET ||
        data.JWT_SECRET === 'development_secret_key_change_in_production' ||
        data.JWT_SECRET.length < 16
      ) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          message: 'Production requires a strong, non-default JWT_SECRET (minimum 16 characters)',
          path: ['JWT_SECRET'],
        });
      }
    }
  });

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('[Config] Invalid environment configuration:', parsed.error.format());
  process.exit(1);
}

export const env = Object.freeze(parsed.data);
