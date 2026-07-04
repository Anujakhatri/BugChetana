import api from './axiosInstance.js';

export const getProjects = () => api.get('/projects/').then(res => res.data);
export const getProject = (id) => api.get(`/projects/${id}/`).then(res => res.data);
export const createProject = (data) => api.post('/projects/', data).then(res => res.data);
export const updateProject = (id, data) => api.patch(`/projects/${id}/`, data).then(res => res.data);
export const deleteProject = (id) => api.delete(`/projects/${id}/`).then(res => res.data);

export const getProjectMembers = (projectId) =>
  api.get(`/projects/${projectId}/members/`).then(res => res.data);

export const addProjectMember = (projectId, userId) => 
  api.post(`/projects/${projectId}/members/`, { user_id: userId }).then(res => res.data);

export const removeProjectMember = (projectId, userId) => 
  api.delete(`/projects/${projectId}/members/${userId}/`).then(res => res.data);