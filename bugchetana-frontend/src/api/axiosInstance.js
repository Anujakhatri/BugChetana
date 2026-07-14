import axios from "axios"
const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

const api = axios.create({
     baseURL: `${API_URL}/api` ,
});

//attach access token to every request automatically
api.interceptors.request.use((config) =>{
  const token = sessionStorage.getItem("access")
    if (token) config.headers.Authorization = `Bearer ${token}`;
    return config;
});

//token expire vayo vani, auto refresh
api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    if (error.response?.status === 401 && !original._retry) {
      original._retry = true;

      const refresh = sessionStorage.getItem("refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(
            `${API_URL}/api/auth/login/refresh/`,
            { refresh }
          );
          sessionStorage.setItem("access", data.access);
          if (data.refresh) {
            sessionStorage.setItem("refresh", data.refresh);
          }
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          sessionStorage.clear();
          // Don't do a full-page reload — that wipes the React Router history
          // and the browser Back button ends up at the marketing homepage.
          // Let AuthContext handle the navigation so the history stack survives.
          window.dispatchEvent(
            new CustomEvent("auth:logout", { detail: { reason: "refresh-failed" } })
          );
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;