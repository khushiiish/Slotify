import api from './api.js';

export const getAvailabilityList = async (params = {}) => {
  const response = await api.get('/availability', { params });
  return response.data?.data?.availability || [];
};

export const createAvailability = async (data) => {
  const response = await api.post('/availability', data);
  return response.data?.data?.availability;
};

export const updateAvailability = async (id, data) => {
  const response = await api.patch(`/availability/${id}`, data);
  return response.data?.data?.availability;
};

export const deleteAvailability = async (id) => {
  const response = await api.delete(`/availability/${id}`);
  return response.data;
};

export const getAvailableSlots = async ({ serviceId, date, staffId }) => {
  const params = { serviceId, date };
  if (staffId) params.staffId = staffId;
  const response = await api.get('/availability/slots', { params });
  return response.data?.data;
};
