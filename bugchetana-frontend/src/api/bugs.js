import api from './axiosInstance';
import { projectUrl } from './projects.js';

export const createBug = async (projectId, bugData) => {
  const response = await api.post(projectUrl(projectId, 'bugs/'), bugData);
  return response.data;
};

export const getBugs = (projectId) =>
  api.get(projectUrl(projectId, 'bugs/')).then(res => res.data);

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

export const submitQaResult = (bugId, data) =>
  api.post(`/bugs/${bugId}/qa-result/`, data).then(res => res.data);

export const assignBug = (bugId, developerId, options = {}) =>
  api.patch(`/bugs/${bugId}/assign/`, {
    assigned_to: developerId,
    ...options,
  }).then(res => res.data);

export const resubmitBug = (bugId, data) =>
  api.post(`/bugs/${bugId}/resubmit/`, data).then(res => res.data);

export const getMySubmittedBugs = (projectId) => {
  const params = projectId ? { project_id: projectId } : {};
  return api.get('/bugs/mine/', { params }).then(res => res.data);
};

export const getMyQaHistory = (projectId) => {
  const params = projectId ? { project_id: projectId } : {};
  return api.get('/qa-results/mine/', { params }).then(res => res.data);
};

export const getBugLists = (projectId) =>
  api.get(`/projects/${projectId}/bug-lists/`).then(res => res.data);

export const createBugList = (projectId, name) =>
  api.post(`/projects/${projectId}/bug-lists/`, { name }).then(res => res.data);

// Bulk-add one or more existing Bug IDs to a BugList.
// Backend accepts either {bug_id} or {bug_ids: [...]}; we always send the
// bulk form to keep the client path uniform.
export const addBugsToList = (projectId, bugListId, bugIds) =>
  api
    .post(`/projects/${projectId}/bug-lists/${bugListId}/items/`, { bug_ids: bugIds })
    .then(res => res.data);

export const verifyBug = (bugId) =>
  api.patch(`/bugs/${bugId}/verify/`).then(res => res.data);

export const listUsers = (params = {}) =>
  api.get('/auth/users/', { params }).then(res => res.data);

export const getReleaseManagerHistory = () =>
  api.get('/release-manager/history/').then(res => res.data);