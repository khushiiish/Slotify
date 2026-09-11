import User from '../models/user.model.js';
import Business from '../models/business.model.js';
import { comparePassword } from '../utils/password.js';
import { generateAccessToken } from '../utils/jwt.js';

/**
 * Sanitize a user document into a safe user representation.
 * Explicitly removes passwordHash and internal properties.
 * @param {object} user - Mongoose User document or plain object
 * @returns {object} Safe sanitized user profile
 */
export const sanitizeUser = (user) => {
  return {
    id: user._id ? user._id.toString() : user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    businessId: user.businessId ? user.businessId.toString() : null,
    status: user.status,
  };
};

/**
 * Authenticate a user with email and password.
 * @param {object} credentials - User credentials
 * @param {string} credentials.email - User email address
 * @param {string} credentials.password - Plain text password
 * @returns {Promise<{ user: object, token: string }>} Sanitized user and signed JWT token
 */
export const loginUser = async ({ email, password }) => {
  const normalizedEmail = email.trim().toLowerCase();

  // Find user by normalized email, explicitly including passwordHash (select: false in schema)
  const user = await User.findOne({ email: normalizedEmail }).select('+passwordHash');

  if (!user) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Verify password with bcrypt
  const isMatch = await comparePassword(password, user.passwordHash);
  if (!isMatch) {
    const error = new Error('Invalid email or password.');
    error.statusCode = 401;
    throw error;
  }

  // Check user active status
  if (user.status === 'DISABLED') {
    const error = new Error('User account is disabled.');
    error.statusCode = 403;
    throw error;
  }

  // If Business Admin, verify associated business is active
  if (user.role === 'BUSINESS_ADMIN' && user.businessId) {
    const business = await Business.findById(user.businessId);
    if (!business || business.status === 'DISABLED') {
      const error = new Error('Business account is disabled.');
      error.statusCode = 403;
      throw error;
    }
  }

  // Generate JWT access token
  const token = generateAccessToken({
    userId: user._id.toString(),
    role: user.role,
    businessId: user.businessId ? user.businessId.toString() : null,
  });

  return {
    user: sanitizeUser(user),
    token,
  };
};

/**
 * Retrieve current user profile and verify active session.
 * @param {string} userId - User ID from authenticated token
 * @returns {Promise<object>} Sanitized user profile
 */
export const getCurrentUser = async (userId) => {
  const user = await User.findById(userId);

  if (!user) {
    const error = new Error('User no longer exists.');
    error.statusCode = 401;
    throw error;
  }

  if (user.status === 'DISABLED') {
    const error = new Error('User account is disabled.');
    error.statusCode = 403;
    throw error;
  }

  if (user.role === 'BUSINESS_ADMIN' && user.businessId) {
    const business = await Business.findById(user.businessId);
    if (!business || business.status === 'DISABLED') {
      const error = new Error('Business account is disabled.');
      error.statusCode = 403;
      throw error;
    }
  }

  return sanitizeUser(user);
};
