import api from './api.js';

/**
 * Log in with email and password.
 * Backend sets an HTTP-only cookie containing the JWT.
 * @param {object} credentials - { email, password }
 * @returns {Promise<object>} API response containing { user }
 */
export const loginApi = async (credentials) => {
  const response = await api.post('/auth/login', credentials);
  return response.data;
};

/**
 * Retrieve current authenticated user session from HTTP-only cookie.
 * @returns {Promise<object>} API response containing { user }
 */
export const getMeApi = async () => {
  const response = await api.get('/auth/me');
  return response.data;
};

/**
 * Log out and clear the HTTP-only cookie.
 * @returns {Promise<object>} API response confirmation
 */
export const logoutApi = async () => {
  const response = await api.post('/auth/logout');
  return response.data;
};
