/**
 * Multi-Tenant Authorization Middleware.
 *
 * Enforces strict tenant isolation and guards against tenant spoofing (IDOR, parameter tampering).
 *
 * Rules:
 * 1. Requires an authenticated session (req.user must be present; returns 401 if missing).
 * 2. SYSTEM_OWNER has platform-level privileges and can access cross-tenant routes when permitted.
 * 3. BUSINESS_ADMIN is strictly bounded to their assigned businessId (req.user.businessId):
 *    - Rejects if req.user.businessId is missing.
 *    - Rejects if route parameter (e.g. :businessId) differs from req.user.businessId.
 *    - Rejects if query parameter (?businessId=...) differs from req.user.businessId.
 *    - Rejects if request body (body.businessId) differs from req.user.businessId.
 *    - Never trusts client-supplied tenant identifiers as authoritative.
 *
 * @param {string} [paramName='businessId'] - Route parameter name identifying the target business
 * @returns {import('express').RequestHandler}
 */
export const requireBusinessAccess = (paramName = 'businessId') => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: 'Authentication required.',
      });
    }

    // SYSTEM_OWNER is a platform-wide role with cross-tenant administrative access
    if (req.user.role === 'SYSTEM_OWNER') {
      return next();
    }

    // BUSINESS_ADMIN must strictly operate within their own tenant boundary
    if (req.user.role === 'BUSINESS_ADMIN') {
      if (!req.user.businessId) {
        return res.status(403).json({
          success: false,
          message: 'User is not associated with any business.',
        });
      }

      // Check route parameter for cross-tenant target tampering
      const targetRouteParam = req.params?.[paramName] || req.params?.businessId;
      if (targetRouteParam && targetRouteParam.toString() !== req.user.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access resources belonging to another business.',
        });
      }

      // Check query parameter for tenant spoofing (?businessId=...)
      if (req.query?.businessId && req.query.businessId.toString() !== req.user.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access resources belonging to another business.',
        });
      }

      // Check request body for tenant spoofing ({ businessId: '...' })
      if (req.body?.businessId && req.body.businessId.toString() !== req.user.businessId.toString()) {
        return res.status(403).json({
          success: false,
          message: 'You do not have permission to access resources belonging to another business.',
        });
      }

      // Automatically bind/normalize authoritative tenant context on mutating requests
      if (req.body && typeof req.body === 'object' && !Array.isArray(req.body)) {
        req.body.businessId = req.user.businessId;
      }

      return next();
    }

    // Fallback: Deny any other or unhandled role
    return res.status(403).json({
      success: false,
      message: 'You do not have permission to perform this action.',
    });
  };
};
