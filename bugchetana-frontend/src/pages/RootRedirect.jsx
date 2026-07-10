import { Navigate } from "react-router-dom";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "./roleHome";
import HomePage from "./HomePage";

// Public-route guard for the marketing homepage.
// - Unauthenticated visitors see HomePage unchanged.
// - Authenticated visitors are sent to their role dashboard.
//
// The HomePage component itself is auth-agnostic; the guard lives here so
// the page stays a pure marketing view.
export default function RootRedirect() {
  const { user, loading } = useAuth();

  if (loading) return <div>Loading...</div>;
  if (user) return <Navigate to={homeFor(user.roleName)} replace />;
  return <HomePage />;
}
