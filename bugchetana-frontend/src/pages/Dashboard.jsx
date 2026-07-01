import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import DeveloperDashboard from "./dashboards/DeveloperDashboard";
import QaDashboard from "./dashboards/QaDashboard";
import ReleaseManagerDashboard from "./dashboards/ReleaseManager";

// Helper — "chetana shah" → "CS"
function getInitials(name = "") {
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

// Role display label
function formatRole(roleName = "") {
  return roleName
    .replace(/_/g, " ")
    .replace(/\b\w/g, (c) => c.toUpperCase()); // "release_manager" → "Release Manager"
}

// Role badge color
function roleBadgeClass(roleName = "") {
  switch (roleName) {
    case "developer":      return "bg-blue-100 text-blue-700";
    case "qa":             return "bg-purple-100 text-purple-700";
    case "release_manager": return "bg-teal-100 text-teal-700";
    default:               return "bg-gray-100 text-gray-700";
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  const renderDashboardContent = () => {
    switch (user?.roleName) {
      case "developer":       return <DeveloperDashboard />;
      case "qa":              return <QaDashboard />;
      case "release_manager": return <ReleaseManagerDashboard />;
      default:
        return (
          <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-12 text-center">
            <h2 className="text-lg font-semibold text-gray-700">No Projects Assigned</h2>
            <p className="text-gray-400 mt-2 text-sm">
              You are not currently assigned to any projects. Please contact an administrator.
            </p>
          </div>
        );
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-8 space-y-6">

      {/* ── Dashboard Header ── */}
      <div className="flex items-start justify-between">

        {/* Left: title + welcome */}
        <div>
          <h1 className="text-3xl font-bold text-gray-900">Dashboard</h1>
          <p className="text-gray-500 mt-1">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </p>
        </div>

        {/* Right: Profile card*/}
        <div className="bg-white border border-gray-200 rounded-xl shadow-sm p-4 flex items-center gap-4 w-72">

          {/* Initials avatar */}
          <div className="w-12 h-12 rounded-full bg-teal-600 flex items-center justify-center flex-shrink-0">
            <span className="text-white text-base font-bold tracking-wide">
              {getInitials(user?.name)}
            </span>
          </div>

          {/* Info */}
          <div className="flex-1 min-w-0">
            <p className="text-sm font-semibold text-gray-900 truncate">
              {user?.name}
            </p>
            <p className="text-xs text-gray-400 truncate mt-0.5">
              {user?.email}
            </p>
            <div className="flex items-center justify-between mt-2">
              {/*<span className={`text-xs font-medium px-2 py-0.5 rounded-full ${roleBadgeClass(user?.roleName)}`}>*/}
              {/*  {formatRole(user?.roleName)}*/}
              {/*</span>*/}
              <Link
                to="/profile"
                className="text-xs text-teal-600 hover:text-teal-800 hover:underline transition-colors"
              >
                Edit Profile
              </Link>
            </div>
          </div>

        </div>
      </div>

      {/* ── Dashboard Content (role-based) ── */}
      {renderDashboardContent()}

    </div>
  );
}