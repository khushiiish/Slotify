import api from './api.js';

/**
 * Retrieve tenant-scoped analytics overview for Business Admin.
 *
 * @param {object} params - Query parameters { range, startDate, endDate }
 * @returns {Promise<object>} Analytics payload
 */
export const getAnalyticsOverview = async (params = {}) => {
  const response = await api.get('/analytics/overview', { params });
  return response.data;
};

/**
 * Retrieve high-level platform analytics for System Owner.
 *
 * @returns {Promise<object>} Platform metrics
 */
export const getPlatformAnalytics = async () => {
  const response = await api.get('/analytics/platform');
  return response.data;
};
