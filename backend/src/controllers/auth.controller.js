import { loginUser, getCurrentUser } from '../services/auth.service.js';
import { setAuthCookie, clearAuthCookie } from '../utils/cookie.js';

/**
 * Handle user login request.
 * POST /api/auth/login
 */
export const login = async (req, res, next) => {
  try {
    const { user, token } = await loginUser(req.body);

    // Set secure HTTP-only authentication cookie
    setAuthCookie(res, token);

    return res.status(200).json({
      success: true,
      message: 'Login successful',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Retrieve current authenticated user profile.
 * GET /api/auth/me
 */
export const me = async (req, res, next) => {
  try {
    const user = await getCurrentUser(req.user.id);

    return res.status(200).json({
      success: true,
      message: 'Authenticated user',
      data: {
        user,
      },
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Handle user logout by clearing the authentication cookie.
 * POST /api/auth/logout
 */
export const logout = (req, res) => {
  clearAuthCookie(res);

  return res.status(200).json({
    success: true,
    message: 'Logout successful',
  });
};
