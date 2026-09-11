import api from './api.js';

export const getServices = async () => {
  const response = await api.get('/services');
  return response.data?.data?.services || [];
};

export const getService = async (serviceId) => {
  const response = await api.get(`/services/${serviceId}`);
  return response.data?.data?.service;
};

export const createService = async (serviceData) => {
  const response = await api.post('/services', serviceData);
  return response.data?.data?.service;
};

export const updateService = async (serviceId, updateData) => {
  const response = await api.patch(`/services/${serviceId}`, updateData);
  return response.data?.data?.service;
};

export const deleteService = async (serviceId) => {
  const response = await api.delete(`/services/${serviceId}`);
  return response.data;
};
