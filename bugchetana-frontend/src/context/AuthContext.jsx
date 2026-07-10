import { createContext, useContext, useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
import { getProfile, logoutUser } from "../api/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserRaw] = useState(null);
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();
  const location = useLocation();

  const setUser = (userData) => {
    if (!userData) {
      setUserRaw(null);
      return;
    }
    // The backend sends user.role as a nested object (e.g., { id: 1, name: "Developer" }). We normalize it to a flat string roleName.
    const rawRole = typeof userData.role === 'object' && userData.role !== null ? userData.role.name : userData.role;
    const roleName = (rawRole || "");
    setUserRaw({ ...userData, roleName });
  };

  // on refresh, re-fetch user if token exists
  useEffect(() => {
    const token = sessionStorage.getItem("access");
    if (token) {
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => sessionStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  // Listen for forced logouts dispatched by the axios interceptor
  // (e.g. refresh-token failure). Navigate via React Router so the
  // history stack is preserved and the browser Back button works
  // sensibly. The `next` query param lets /login bounce the user
  // back to where they were after a successful sign-in.
  useEffect(() => {
    const onForcedLogout = () => {
      setUser(null);
      if (location.pathname.startsWith("/login")) return;
      const next = encodeURIComponent(location.pathname + location.search);
      navigate(`/login?next=${next}`, { replace: true });
    };
    window.addEventListener("auth:logout", onForcedLogout);
    return () => window.removeEventListener("auth:logout", onForcedLogout);
  }, [navigate, location]);

  const logout = async () => {
    const refresh = sessionStorage.getItem("refresh");
    await logoutUser(refresh).catch(() => { });   //server ma token blacklist huncha
    sessionStorage.clear();
    setUser(null);
    navigate("/login", { replace: true });
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
