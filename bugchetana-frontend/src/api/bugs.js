import api from './axiosInstance';

export const createBug = async (projectId, bugData) => {
  const response = await api.post(`/projects/${projectId}/bugs/`, bugData);
  return response.data;
};
