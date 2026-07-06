import api from './axiosInstance.js';

export const projectUrl = (projectId, subpath = '') => {
  if (projectId == null || projectId === '') {
    throw new Error('Project ID is required');
  }
  const normalized = subpath.replace(/^\//, '');
  return normalized ? `/projects/${projectId}/${normalized}` : `/projects/${projectId}/`;
};

export const getProjects = () => api.get('/projects/').then(res => res.data);
export const getProject = (id) => api.get(projectUrl(id)).then(res => res.data);
export const createProject = (data) => api.post('/projects/', data).then(res => res.data);
export const updateProject = (id, data) => api.patch(projectUrl(id), data).then(res => res.data);
export const deleteProject = (id) => api.delete(projectUrl(id)).then(res => res.data);

export const getProjectMembers = (projectId) =>
  api.get(projectUrl(projectId, 'members/')).then(res => res.data);

export const addProjectMember = (projectId, userId) =>
  api.post(projectUrl(projectId, 'members/add/'), { user_id: userId }).then(res => res.data);

export const removeProjectMember = (projectId, userId) =>
  api.delete(projectUrl(projectId, `members/${userId}/`)).then(res => res.data);