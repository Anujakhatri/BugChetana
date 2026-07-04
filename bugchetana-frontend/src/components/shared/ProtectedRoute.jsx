import { Navigate } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (!user) return <Navigate to="/" />;

  if (allowedRoles && !allowedRoles.includes(user.roleName)) {
    //logged in but wrong role -> send to dashboard instead of home,
    //since they are authenticated, just not authorized for this page
    return <Navigate to="/dashboard" />
  }
  return children;
}