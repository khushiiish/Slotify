import jwt from 'jsonwebtoken';
import { env } from '../config/env.js';

/**
 * Generate a signed JWT access token for an authenticated user.
 * @param {object} payload - Minimum user identification payload
 * @param {string} payload.userId - User ID string
 * @param {string} payload.role - User role (SYSTEM_OWNER | BUSINESS_ADMIN)
 * @param {string|null} [payload.businessId] - Business ID string or null
 * @returns {string} Signed JWT token
 */
export const generateAccessToken = (payload) => {
  return jwt.sign(
    {
      userId: payload.userId,
      role: payload.role,
      businessId: payload.businessId || null,
    },
    env.JWT_SECRET,
    {
      expiresIn: env.JWT_EXPIRES_IN,
    }
  );
};

/**
 * Verify and decode an access token.
 * Throws an error if expired or signature is invalid.
 * @param {string} token - JWT token string
 * @returns {object} Decoded token payload
 */
export const verifyAccessToken = (token) => {
  return jwt.verify(token, env.JWT_SECRET);
};
