import axios from "axios"
 const api = axios.create({
     baseURL: "http://localhost:8000/api",
 });

//attach access token to every request automatically
api.interceptors.request.use((config) =>{
    const token = localStorage.getItem("access")
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

      const refresh = localStorage.getItem("refresh");
      if (refresh) {
        try {
          const { data } = await axios.post(
            "http://localhost:8000/api/auth/login/refresh/",
            { refresh }
          );
          localStorage.setItem("access", data.access);
          original.headers.Authorization = `Bearer ${data.access}`;
          return api(original);
        } catch {
          localStorage.clear();
          window.location.href = "/login";
        }
      }
    }
    return Promise.reject(error);
  }
);

export default api;