/**
 * Multi-tenant helper utilities for database queries and mutations.
 * Enforces zero-trust tenant boundaries and prevents horizontal privilege escalation (IDOR).
 */

/**
 * Derives a Mongoose query filter scoped strictly to the authenticated tenant.
 *
 * For BUSINESS_ADMIN: Always attaches { businessId: user.businessId }, overriding any user-supplied filter.
 * For SYSTEM_OWNER: Retains the base filter without injecting a tenant constraint.
 *
 * @param {object} user - Authenticated user context from req.user
 * @param {object} [baseFilter={}] - Existing query filter
 * @returns {object} Tenant-safe Mongoose filter
 */
export const getTenantFilter = (user, baseFilter = {}) => {
  if (user?.role === 'BUSINESS_ADMIN') {
    return {
      ...baseFilter,
      businessId: user.businessId,
    };
  }
  return { ...baseFilter };
};

/**
 * Enforces authoritative tenant ownership on request payloads for creation and updates.
 *
 * For BUSINESS_ADMIN:
 * - If payload attempts to set a different businessId -> throws 403 Forbidden.
 * - Injects user.businessId as the authoritative tenant context.
 *
 * @param {object} payload - Incoming request body
 * @param {object} user - Authenticated user context from req.user
 * @returns {object} Sanitized payload bound to authoritative tenant ID
 */
export const enforceTenantContext = (payload = {}, user) => {
  if (user?.role === 'BUSINESS_ADMIN') {
    if (payload?.businessId && payload.businessId.toString() !== user.businessId.toString()) {
      const error = new Error('You do not have permission to access resources belonging to another business.');
      error.statusCode = 403;
      throw error;
    }
    return {
      ...payload,
      businessId: user.businessId,
    };
  }
  return { ...payload };
};

/**
 * Asserts that a retrieved Mongoose resource belongs to the authenticated user's tenant.
 * Prevents IDOR attacks when fetching resources by direct ID.
 *
 * @param {object} resource - Database resource document containing a businessId field
 * @param {object} user - Authenticated user context from req.user
 * @throws {Error} 403 Forbidden error if tenant mismatch is detected
 */
export const assertTenantOwnership = (resource, user) => {
  if (!resource) return;

  if (user?.role === 'BUSINESS_ADMIN') {
    const resourceBusinessId = resource.businessId ? resource.businessId.toString() : null;
    const userBusinessId = user.businessId ? user.businessId.toString() : null;

    if (!resourceBusinessId || resourceBusinessId !== userBusinessId) {
      const error = new Error('You do not have permission to access resources belonging to another business.');
      error.statusCode = 403;
      throw error;
    }
  }
};
