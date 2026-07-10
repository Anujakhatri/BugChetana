import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "./roleHome";

// Back-compat for the old /dashboard URL. New users should never see this —
// links should be role-specific now — but old bookmarks still work.
export default function DashboardRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to={homeFor(user.roleName)} replace />;
  return <Navigate to="/login" replace />;
}
