import api from './api.js';

export const getBlockedDates = async () => {
  const response = await api.get('/blocked-dates');
  return response.data?.data?.blockedDates || [];
};

export const createBlockedDate = async (data) => {
  const response = await api.post('/blocked-dates', data);
  return response.data?.data?.blockedDate;
};

export const updateBlockedDate = async (id, data) => {
  const response = await api.patch(`/blocked-dates/${id}`, data);
  return response.data?.data?.blockedDate;
};

export const deleteBlockedDate = async (id) => {
  const response = await api.delete(`/blocked-dates/${id}`);
  return response.data;
};
