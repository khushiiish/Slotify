import api from './api.js';

export const getStaffList = async () => {
  const response = await api.get('/staff');
  return response.data?.data?.staff || [];
};

export const getStaff = async (staffId) => {
  const response = await api.get(`/staff/${staffId}`);
  return response.data?.data?.staff;
};

export const createStaff = async (staffData) => {
  const response = await api.post('/staff', staffData);
  return response.data?.data?.staff;
};

export const updateStaff = async (staffId, updateData) => {
  const response = await api.patch(`/staff/${staffId}`, updateData);
  return response.data?.data?.staff;
};

export const deleteStaff = async (staffId) => {
  const response = await api.delete(`/staff/${staffId}`);
  return response.data;
};
