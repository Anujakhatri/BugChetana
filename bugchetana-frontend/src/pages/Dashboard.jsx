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
    case "Developer":      return "bg-blue-50 text-blue-700 border-blue-100";
    case "QA":             return "bg-purple-50 text-purple-700 border-purple-100";
    case "Release Manager": return "bg-teal-50 text-teal-700 border-teal-100";
    default:               return "bg-slate-50 text-slate-700 border-slate-100";
  }
}

//Avatar gradient per role
function avatarGradientClass(roleName = "") {
  switch (roleName) {
    case "Developer":       return "from-blue-500 to-blue-600";
    case "QA":               return "from-purple-500 to-purple-600";
    case "Release Manager":  return "from-teal-500 to-teal-600";
    default:                 return "from-slate-600 to-slate-800";
  }
}

export default function Dashboard() {
  const { user } = useAuth();

  const renderDashboardContent = () => {
    switch (user?.roleName) {
      case "Developer":       return <DeveloperDashboard />;
      case "QA":              return <QaDashboard />;
      case "Release Manager": return <ReleaseManagerDashboard />;
      default:
        return (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-12 text-center">
            <h2 className="text-lg font-semibold text-slate-700">No Projects Assigned</h2>
            <p className="text-slate-400 mt-2 text-sm">
              You are not currently assigned to any projects. Please contact an administrator.
            </p>
          </div>
        );
    }
  };

  return (
    <PageContainer maxWidth="7xl">

      {/* ── Dashboard Header ── */}
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">

        {/* Left: title + welcome */}
        <div>
          <h1 className="text-3xl font-bold text-slate-900">Dashboard</h1>
          <p className="text-slate-400 mt-1">
            Welcome back, {user?.name?.split(' ')[0]} 👋
          </p>
        </div>

        {/* Right: Profile card*/}
        <div className="bg-white border border-slate-100 rounded-2xl shadow-sm p-4 flex items-center gap-4 w-full sm:w-80">

          {/* Initials avatar */}
          <div
            className={`w-12 h-12 rounded-full bg-gradient-to-br ${avatarGradientClass(user?.roleName)} flex items-center justify-center flex-shrink-0 shadow-md`}
          >
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
            {user?.roleName && (
                <div className="flex items-center justify-between mt-2">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border ${roleBadgeClass(user.roleName)}`}>
                    {formatRole(user.roleName)}
                </span>
              </div>
            )}
            {/*<div className="flex items-center justify-between mt-2">*/}
            {/*  /!*  {formatRole(user?.roleName)}*!/*/}
            {/*  /!*</span>*!/*/}
            </div>
          </div>

        </div>

      {/* ── Dashboard Content (role-based) ── */}
      {user?.roleName !== "Release Manager" && (
        <div className="flex justify-end mt-6">
          <ProjectSelector />
        </div>
      )}
      {renderDashboardContent()}

    </PageContainer>
  );
}