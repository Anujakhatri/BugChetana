import axios from "axios"

const API_URL = import.meta.env.VITE_API_URL || "http://localhost:8000";

// Dev-only guardrail: if VITE_API_URL isn't set and we're in production,
// requests will silently hit the static frontend origin instead of the
// real backend (causing 401s, missing data, "AI Review" sections that
// vanish, etc.). Surface this loudly in dev so it gets caught before
// a deploy.
if (import.meta.env.DEV && !import.meta.env.VITE_API_URL) {
  // eslint-disable-next-line no-console
  console.warn(
    "[BugChetana] VITE_API_URL is not defined. " +
    "API requests will fall back to http://localhost:8000. " +
    "Set VITE_API_URL in your .env (e.g. https://your-railway-backend.up.railway.app) " +
    "and in your Vercel project environment variables for production."
  );
}

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