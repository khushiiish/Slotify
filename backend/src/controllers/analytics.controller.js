import { getTenantAnalytics, getPlatformAnalytics } from '../services/analytics.service.js';

/**
 * Get tenant-scoped analytics overview for Business Admin.
 * GET /api/analytics/overview
 */
export const getTenantOverview = async (req, res, next) => {
  try {
    const businessId = req.user.businessId;
    if (!businessId) {
      return res.status(403).json({
        success: false,
        message: 'User is not associated with any business.',
      });
    }

    const query = req.validatedQuery || req.query;
    const analytics = await getTenantAnalytics(businessId, query);

    return res.status(200).json({
      success: true,
      message: 'Analytics overview retrieved successfully.',
      data: analytics,
    });
  } catch (error) {
    next(error);
  }
};

/**
 * Get high-level platform analytics for System Owner.
 * GET /api/analytics/platform
 */
export const getPlatformOverview = async (req, res, next) => {
  try {
    const metrics = await getPlatformAnalytics();

    return res.status(200).json({
      success: true,
      message: 'Platform analytics retrieved successfully.',
      data: metrics,
    });
  } catch (error) {
    next(error);
  }
};
