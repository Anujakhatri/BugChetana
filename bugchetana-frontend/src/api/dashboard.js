import api from './axiosInstance.js';
import { projectUrl } from './projects.js';

export const getDashboardSummary = (projectId) =>
    api.get(projectUrl(projectId, 'dashboard/')).then(res => res.data);
