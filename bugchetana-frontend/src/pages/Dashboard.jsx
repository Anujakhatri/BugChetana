import { useAuth } from "@/context/AuthContext";
import { Link } from "react-router-dom";
import PageContainer from "@/components/layout/PageContainer";
import DeveloperDashboard from "./dashboards/DeveloperDashboard";
import QaDashboard from "./dashboards/QaDashboard";
import ReleaseManagerDashboard from "./dashboards/ReleaseManager";
import ProjectSelector from "@/components/shared/ProjectSelector";

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
    case "Developer":      return "bg-blue-100 text-blue-700";
    case "QA":             return "bg-purple-100 text-purple-700";
    case "Release Manager": return "bg-teal-100 text-teal-700";
    default:               return "bg-gray-100 text-gray-700";
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  const renderDashboardContent = () => {
    switch (user?.role) {
      case "Developer":       return <DeveloperDashboard />;
      case "QA":              return <QaDashboard />;
      case "Release Manager": return <ReleaseManagerDashboard />;
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
    <PageContainer maxWidth="7xl">

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
              {/*  {formatRole(user?.roleName)}*/}
              {/*</span>*/}
            </div>
          </div>

        </div>
      </div>

      {/* ── Dashboard Content (role-based) ── */}
      {user?.roleName !== "Release Manager" && (
        <div className="flex justify-end">
          <ProjectSelector />
        </div>
      )}
      {renderDashboardContent()}

    </PageContainer>
  );
}