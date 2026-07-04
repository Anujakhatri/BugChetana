import api from './axiosInstance';

export const getRoast = (bugId) =>
  api.post(`/bugs/${bugId}/roast/`).then(res => res.data);

export const getSuggestedFix = (bugId) =>
  api.post(`/bugs/${bugId}/suggest/`).then(res => res.data);