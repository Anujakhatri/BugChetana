import api from './axiosInstance';

export const getNotifications = () =>
  api.get('/notifications/').then(res => res.data);

export const markNotificationRead = (id) =>
  api.patch(`/notifications/${id}/read/`).then(res => res.data);

export const markAllNotificationsRead = () =>
  api.post('/notifications/mark-all-read/').then(res => res.data);
