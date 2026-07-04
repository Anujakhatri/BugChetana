import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logoutUser } from "../api/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUserRaw] = useState(null);
  const [loading, setLoading] = useState(true);

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
    const token = localStorage.getItem("access");
    if (token) {
      getProfile()
        .then((res) => setUser(res.data))
        .catch(() => localStorage.clear())
        .finally(() => setLoading(false));
    } else {
      setLoading(false);
    }
  }, []);

  const logout = async () => {
    const refresh = localStorage.getItem("refresh");
    await logoutUser(refresh).catch(() => {});   //server ma token blacklist huncha
    localStorage.clear();
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, setUser, logout, loading }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);