import api from './api.js';

/**
 * Fetch all platform businesses (System Owner only).
 * GET /api/businesses
 */
export const getPlatformBusinesses = async () => {
  const response = await api.get('/businesses');
  return response.data;
};

/**
 * Fetch specific business details by ID.
 * GET /api/businesses/:id
 */
export const getPlatformBusinessById = async (businessId) => {
  const response = await api.get(`/businesses/${businessId}`);
  return response.data;
};

export const getBusinessById = async (businessId) => {
  const response = await api.get(`/businesses/${businessId}`);
  return response.data?.data?.business || response.data?.data;
};

/**
 * Onboard a new business and create initial admin.
 * POST /api/businesses
 */
export const onboardBusiness = async (payload) => {
  const response = await api.post('/businesses', payload);
  return response.data;
};

/**
 * Enable or disable a business.
 * PATCH /api/businesses/:id/status
 */
export const updateBusinessStatus = async (businessId, status) => {
  const response = await api.patch(`/businesses/${businessId}/status`, { status });
  return response.data;
};
