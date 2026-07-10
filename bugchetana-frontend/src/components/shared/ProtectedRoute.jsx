import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../../context/AuthContext";
import { homeFor } from '@/pages/roleHome';

export default function ProtectedRoute({ children, allowedRoles }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <div>Loading...</div>;

  if (!user) {
    // Send to /login (not /) and remember where the user was trying to go
    // so /login can bounce them back after a successful sign-in. `replace`
    // keeps the bounce itself from creating a back-button entry.
    const next = encodeURIComponent(location.pathname + location.search);
    return <Navigate to={`/login?next=${next}`} replace />;
  }

  if (allowedRoles && !allowedRoles.includes(user.roleName)) {
    // Logged in but wrong role — send to the role-aware dashboard.
    return <Navigate to={homeFor(user.roleName)} replace />;
  }
  return children;
}
