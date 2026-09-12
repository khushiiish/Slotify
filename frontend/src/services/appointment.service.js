import api from './api.js';

export const getAppointments = async (params = {}) => {
  const response = await api.get('/appointments', { params });
  return response.data;
};

export const getAppointment = async (id) => {
  const response = await api.get(`/appointments/${id}`);
  return response.data;
};

export const createAppointment = async (appointmentData) => {
  const response = await api.post('/appointments', appointmentData);
  return response.data;
};

export const cancelAppointment = async (id) => {
  const response = await api.patch(`/appointments/${id}/cancel`);
  return response.data;
};

export const updateAppointmentStatus = async (id, status) => {
  const response = await api.patch(`/appointments/${id}/status`, { status });
  return response.data;
};

