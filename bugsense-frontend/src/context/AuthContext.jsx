import { createContext, useContext, useState, useEffect } from "react";
import { getProfile, logoutUser } from "../api/authService";

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [user, setUser]       = useState(null);
  const [loading, setLoading] = useState(true);

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