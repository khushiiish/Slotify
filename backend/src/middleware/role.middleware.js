/**
 * Role-Based Access Control (RBAC) middleware.
 *
 * Verifies that the authenticated user possesses one of the allowed roles.
 * Must be executed AFTER the `authenticate` middleware in the request pipeline.
 *
 * Behavior:
 * - If req.user is absent -> returns 401 Unauthorized
 * - If req.user.role is not in allowedRoles -> returns 403 Forbidden
 * - If role matches -> passes execution to next middleware
 *
 * @param  {...string} allowedRoles - Permitted roles (e.g. 'SYSTEM_OWNER', 'BUSINESS_ADMIN')
 * @returns {import('express').RequestHandler}
 */
export const requireRole = (...allowedRoles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    if (!allowedRoles.includes(req.user.role)) {
      return res.status(403).json({
        success: false,
        message: 'You do not have permission to perform this action.',
      });
    }

    next();
  };
};
