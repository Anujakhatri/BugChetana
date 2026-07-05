import api from './axiosInstance.js';

export const getUsers = (params = {}) =>
  api.get('/auth/users/', { params }).then(res => res.data);
export const updateUserRole = (userId, roleId) => 
  api.patch(`/auth/users/${userId}/role/`, { role_id: roleId }).then(res => res.data);

// Hardcoded fallback since there is no getRoles endpoint
export const getRoles = async () => {
  return [
    { id: 1, name: 'Developer' },
    { id: 2, name: 'QA' },
    { id: 3, name: 'Release Manager' }
  ];
};