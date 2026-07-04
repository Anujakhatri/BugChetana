import api from './axiosInstance.js';

export const getDashboardSummary = (projectId) =>
    api.get(`/projects/${projectId}/dashboard/`).then(res => res.data);
