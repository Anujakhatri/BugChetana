import api from './axiosInstance';

export const predictSeverity = (payload) =>
  api.post('/ai/predict-severity/', payload).then(res => res.data);

export const guestAiReview = (payload) =>
  api.post('/ai/review-guest/', payload).then(res => res.data);

export const getRoast = (bugId) =>
  api.post(`/bugs/${bugId}/roast/`).then(res => res.data);

export const getSuggestedFix = (bugId) =>
  api.post(`/bugs/${bugId}/suggest/`).then(res => res.data);