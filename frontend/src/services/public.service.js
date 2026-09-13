import api from './api.js';

/**
 * Fetch list of public active businesses for discovery.
 * Optionally accepts { search } query parameter.
 */
export const getPublicBusinesses = async (params = {}) => {
  const response = await api.get('/public/businesses', { params });
  return response.data;
};

/**
 * Fetch public business profile and active services by slug.
 */
export const getPublicBusiness = async (slug) => {
  const response = await api.get(`/public/businesses/${slug}`);
  return response.data;
};

/**
 * Fetch calculated 15-minute slots for a business, service, and date.
 */
export const getPublicSlots = async (slug, params) => {
  const response = await api.get(`/public/businesses/${slug}/slots`, { params });
  return response.data;
};

/**
 * Submit an appointment booking through the Phase 7 booking engine.
 */
export const createPublicAppointment = async (slug, bookingData) => {
  const response = await api.post(`/public/businesses/${slug}/appointments`, bookingData);
  return response.data;
};

/**
 * Fetch public appointment details using a customer access token.
 */
export const getPublicAppointment = async (id, token) => {
  const response = await api.get(`/public/appointments/${id}`, {
    params: { token },
  });
  return response.data;
};

/**
 * Cancel an appointment using a customer access token.
 */
export const cancelPublicAppointment = async (id, token) => {
  const response = await api.patch(`/public/appointments/${id}/cancel`, { token });
  return response.data;
};
