import api from './axiosInstance';

export const createBug = async (projectId, bugData) => {
  const response = await api.post(`/projects/${projectId}/bugs/`, bugData);
  return response.data;
};

export const getBugs = (projectId) =>
  api.get(`/projects/${projectId}/bugs/`).then(res => res.data);

export const getBug = (bugId) =>
  api.get(`/bugs/${bugId}/`).then(res => res.data);

export const updateBug = (bugId, data) =>
  api.patch(`/bugs/${bugId}/`, data).then(res => res.data);

export const deleteBug = (bugId) =>
  api.delete(`/bugs/${bugId}/`).then(res => res.data);

export const getBugComments = (bugId) =>
  api.get(`/bugs/${bugId}/comments/`).then(res => res.data);

export const addBugComment = (bugId, text) =>
  api.post(`/bugs/${bugId}/comments/`, { comment_text: text }).then(res => res.data);

export const getBugHistory = (bugId) =>
  api.get(`/bugs/${bugId}/history/`).then(res => res.data);