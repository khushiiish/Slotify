import { env } from '../config/env.js';

const ONE_DAY_MS = 24 * 60 * 60 * 1000;

/**
 * Get standardized cookie options based on the current environment.
 * @returns {object} Express cookie options
 */
export const getAuthCookieOptions = () => {
  const isProduction = env.NODE_ENV === 'production';

  return {
    httpOnly: true,
    secure: isProduction,
    // In production with cross-origin frontend/backend (e.g., Vercel + Render), 'none' is required.
    // In local development over HTTP, 'lax' is required for browsers to accept the cookie.
    sameSite: isProduction ? 'none' : 'lax',
    path: '/',
    maxAge: ONE_DAY_MS,
  };
};

/**
 * Set the authentication token in an HTTP-only cookie on the response.
 * @param {import('express').Response} res - Express response object
 * @param {string} token - Signed JWT access token
 */
export const setAuthCookie = (res, token) => {
  res.cookie(env.COOKIE_NAME, token, getAuthCookieOptions());
};

/**
 * Clear the authentication cookie upon logout.
 * @param {import('express').Response} res - Express response object
 */
export const clearAuthCookie = (res) => {
  const options = getAuthCookieOptions();
  delete options.maxAge;
  res.clearCookie(env.COOKIE_NAME, options);
};
