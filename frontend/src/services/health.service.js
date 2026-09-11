import api from './api.js';

export const getHealthStatus = async () => {
  const response = await api.get('/health');
  return response.data;
};
