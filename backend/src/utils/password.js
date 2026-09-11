import bcryptjs from 'bcryptjs';

const SALT_ROUNDS = 10;

/**
 * Hash a plain text password using bcryptjs.
 * @param {string} password - Plain text password
 * @returns {Promise<string>} Hashed password string
 */
export const hashPassword = async (password) => {
  return await bcryptjs.hash(password, SALT_ROUNDS);
};

/**
 * Compare a plain text password against a stored bcrypt hash.
 * @param {string} password - Plain text password to check
 * @param {string} hash - Stored bcrypt password hash
 * @returns {Promise<boolean>} True if match, false otherwise
 */
export const comparePassword = async (password, hash) => {
  if (!password || !hash) return false;
  return await bcryptjs.compare(password, hash);
};
