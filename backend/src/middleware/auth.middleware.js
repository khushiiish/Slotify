import { env } from '../config/env.js';
import { verifyAccessToken } from '../utils/jwt.js';
import User from '../models/user.model.js';
import Business from '../models/business.model.js';

/**
 * Express middleware to authenticate requests via HTTP-only JWT cookie.
 * Attaches minimal user info to req.user = { id, role, businessId }.
 */
export const authenticate = async (req, res, next) => {
  try {
    const token = req.cookies?.[env.COOKIE_NAME];

    if (!token) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required. No token provided.',
      });
    }

    let decoded;
    try {
      decoded = verifyAccessToken(token);
    } catch (jwtError) {
      if (jwtError.name === 'TokenExpiredError') {
        return res.status(401).json({
          success: false,
          message: 'Authentication token expired. Please log in again.',
        });
      }
      return res.status(401).json({
        success: false,
        message: 'Invalid authentication token.',
      });
    }

    // Verify user still exists and remains active
    const user = await User.findById(decoded.userId);

    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'User account no longer exists.',
      });
    }

    if (user.status === 'DISABLED') {
      return res.status(403).json({
        success: false,
        message: 'User account is disabled.',
      });
    }

    // If Business Admin, verify associated business is active
    if (user.role === 'BUSINESS_ADMIN' && user.businessId) {
      const business = await Business.findById(user.businessId);
      if (!business || business.status === 'DISABLED') {
        return res.status(403).json({
          success: false,
          message: 'Business account is disabled.',
        });
      }
    }

    // Attach minimal safe authenticated user representation
    req.user = {
      id: user._id.toString(),
      role: user.role,
      businessId: user.businessId ? user.businessId.toString() : null,
    };

    next();
  } catch (error) {
    next(error);
  }
};
