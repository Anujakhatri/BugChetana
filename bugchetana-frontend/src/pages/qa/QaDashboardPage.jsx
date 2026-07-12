import React, { useState, useEffect, useMemo, useCallback } from "react";
import {
  Users,
  Clock,
  AlertTriangle,
  CheckCircle2,
  FolderPlus,
  ListChecks,
  PlusSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosInstance";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { getBugLists } from "@/api/bugs";
import { useProject } from "@/context/ProjectContext";
import { timeAgo } from "@/components/shared/DashboardBadges";
import CreateBugListModal from "@/components/shared/CreateBugListModal";
import ProjectDevelopersManager from "@/components/qa/ProjectDevelopersManager";

// Status buckets shown in per-bug-list pills. Order matters: highest-signal first.
const LIST_STATUS_PILL_ORDER = ["open", "in_progress", "failed", "resubmitted", "resolved", "closed"];

// Compact inline status count pill, e.g. "3 failed".
function StatusPill({ status, count }) {
  if (!count) return null;
  return (
    <span
      className={`text-[10px] font-semibold px-1.5 py-0.5 rounded-md border ${STATUS_STYLES[status] || STATUS_STYLES.open}`}
      title={`${count} ${status.replace("_", " ")}`}
    >
      {count} {status.replace("_", " ")}
    </span>
  );
}

const STATUS_STYLES = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  resubmitted: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

export default function QaDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    bugs, loading, error, refetch,
    projectId, setProjectId, projects,
  } = useDashboardSummary();

  // New role-specific dashboard endpoint (global across QA's member projects).
  const [qaDashboard, setQaDashboard] = useState(null);
  const [qaDashboardLoading, setQaDashboardLoading] = useState(true);
  const [qaDashboardError, setQaDashboardError] = useState(null);

  // QA's full project list (read-only). Comes from ProjectContext, which calls
  // GET /api/projects/ — server-side filtered to member projects for non-RM roles.
  const { availableProjects: myProjects, loadingProjects: projectsLoading } = useProject();
  // Tracks which project's developer-management panel is expanded. Null = all collapsed.
  const [expandedProjectId, setExpandedProjectId] = useState(null);

  const fetchQaDashboard = useCallback(async () => {
    setQaDashboardLoading(true);
    setQaDashboardError(null);
    try {
      const { data } = await api.get("/dashboard/qa/");
      setQaDashboard(data);
    } catch (err) {
      console.error("QA dashboard fetch error.txt", err);
      setQaDashboardError("Failed to load dashboard summary.");
    } finally {
      setQaDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchQaDashboard();
  }, [fetchQaDashboard]);

  // Bug lists for the current project (per-project view; backend list endpoint).
  const [bugLists, setBugLists] = useState([]);
  const [bugListsLoading, setBugListsLoading] = useState(false);

  const reloadBugLists = useCallback(async () => {
    if (!projectId) {
      setBugLists([]);
      return;
    }
    setBugListsLoading(true);
    try {
      const data = await getBugLists(projectId);
      setBugLists(data);
    } catch (err) {
      console.error("Bug lists fetch error.txt", err);
    } finally {
      setBugListsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    reloadBugLists();
  }, [reloadBugLists]);

  const reload = useCallback(() => {
    refetch();
    fetchQaDashboard();
    reloadBugLists();
  }, [refetch, fetchQaDashboard, reloadBugLists]);

  // ─── UI state ──────────────────────────────────────────────
  const [bugListModalOpen, setBugListModalOpen] = useState(false);

  // ─── Derived data ─────────────────────────────────────────
  // Per-bug-list status counts, derived client-side by cross-referencing each
  // list's bug_ids against the in-memory bug list. The /bug-lists/ endpoint
  // exposes bug_ids (flat list) but not per-status counts, so we group here.
  const bugListsWithCounts = useMemo(() => {
    const statusByBugId = new Map();
    bugs.forEach((b) => statusByBugId.set(b.id, b.status));
    return bugLists.map((bl) => {
      const counts = {};
      bl.bug_ids?.forEach((id) => {
        const status = statusByBugId.get(id);
        if (status) counts[status] = (counts[status] || 0) + 1;
      });
      return { ...bl, status_counts: counts };
    });
  }, [bugLists, bugs]);

  // Top cards pull from the new endpoint.
  const passedCount = qaDashboard?.passed_count ?? 0;
  const failedCount = qaDashboard?.failed_count ?? 0;
  const activeBugListsCount = qaDashboard?.active_bug_lists_count ?? 0;

  if (loading && qaDashboardLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  }
  if (qaDashboardError) {
    return <div className="p-8 text-center text-red-500">{qaDashboardError}</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setBugListModalOpen(false);
          reload();
        }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            Manage your assigned projects and their developer teams below.
          </p>
        </div>
        <div className="w-full lg:w-64">
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Select Project</option>
            {projects && projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Projects — read-only list with developer team management per project.
          `myProjects` comes from ProjectContext (GET /api/projects/), which the
          server already filters to the QA's member projects. Team add/remove
          reuses the existing AddProjectMemberView / RemoveProjectMemberView and
          reuses create_notification on the backend — no parallel membership or
          notification models. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Projects</h2>
          <p className="text-xs text-slate-400 mt-0.5">
            Projects you're assigned to. Manage developer teams for each project.
          </p>
        </div>

        {projectsLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading projects...</div>
        ) : myProjects.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">You have no projects assigned to you yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              A Release Manager will assign you to a project, after which you can manage its developer team here.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {myProjects.map((p) => (
              <div key={p.id} className="p-5">
                <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                  <div className="space-y-1 min-w-0">
                    <h3 className="text-sm font-semibold text-slate-900">{p.name}</h3>
                    <p className="text-xs text-slate-400">
                      {p.member_count ?? 0} member{p.member_count === 1 ? "" : "s"} ·
                      {" "}RM: {p.release_manager_name || "Unassigned"}
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() =>
                      setExpandedProjectId(expandedProjectId === p.id ? null : p.id)
                    }
                    className="inline-flex items-center gap-1.5 px-3 py-1.5 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0"
                  >
                    <Users className="h-3.5 w-3.5" />
                    {expandedProjectId === p.id ? "Hide team" : "Manage team"}
                  </button>
                </div>

                {expandedProjectId === p.id && (
                  <div className="mt-4 pt-4 border-t border-slate-100">
                    <ProjectDevelopersManager projectId={p.id} />
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Summary cards — from GET /api/dashboard/qa/ */}
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            QA outcomes
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <SummaryCard
              label="Passed"
              value={passedCount}
              iconBg="from-emerald-500 to-emerald-600"
              icon={<CheckCircle2 className="h-5 w-5 text-white" />}
              caption="Bugs you've approved and closed"
              to="/qa/bug-list?status=closed"
            />
            <SummaryCard
              label="Failed"
              value={failedCount}
              iconBg="from-red-500 to-red-600"
              icon={<AlertTriangle className="h-5 w-5 text-white" />}
              caption="Bugs you've marked as failing QA"
              to="/qa/bug-list?status=failed"
            />
            <SummaryCard
              label="Active Bug Lists"
              value={activeBugListsCount}
              iconBg="from-blue-500 to-blue-600"
              icon={<ListChecks className="h-5 w-5 text-white" />}
              caption="Bug lists in your member projects"
              to="/qa/bug-list"
            />
          </div>
        </div>
      </div>

      {/* Bug lists overview — per-list live status counts (client-derived). */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Bug Lists</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Per-list status counts are derived live from the project bug list.
            </p>
          </div>
          {projectId && (
            <button
              type="button"
              onClick={() => setBugListModalOpen(true)}
              className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
            >
              <FolderPlus className="h-4 w-4" />
              New Bug List
            </button>
          )}
        </div>

        {bugListsLoading ? (
          <div className="p-8 text-center text-slate-500 text-sm">Loading bug lists...</div>
        ) : !projectId ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">Select a project to see its bug lists.</p>
            <p className="text-xs text-slate-400 mt-1">Pick one from the dropdown above to get started.</p>
          </div>
        ) : bugListsWithCounts.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No bug lists for this project yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click <span className="font-semibold text-slate-600">New Bug List</span> to create one
              — resolved and resubmitted bugs will be added automatically.
            </p>
            <button
              type="button"
              onClick={() => navigate("/qa/submit-bug")}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <PlusSquare className="h-3.5 w-3.5" />
              Or report a new bug first
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bugListsWithCounts.map((bl) => {
              const totalInList = bl.bug_count || bl.bug_ids?.length || 0;
              const hasAny = totalInList > 0;
              return (
                <div key={bl.id} className="p-5 hover:bg-slate-50 transition-colors">
                  <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
                    <div className="space-y-1.5 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <h3 className="text-sm font-semibold text-slate-900">{bl.name}</h3>
                        <span className="text-[11px] font-medium text-slate-500 bg-slate-100 px-2 py-0.5 rounded-md">
                          {totalInList} {totalInList === 1 ? "bug" : "bugs"}
                        </span>
                      </div>
                      <div className="flex items-center flex-wrap gap-3 text-xs text-slate-400">
                        <span>Created by {bl.created_by_name}</span>
                        <span className="flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(bl.created_at)}
                        </span>
                      </div>
                    </div>

                    {/* Live status pills (client-derived) */}
                    <div className="flex items-center flex-wrap gap-1.5 md:max-w-[55%] md:justify-end">
                      {hasAny ? (
                        LIST_STATUS_PILL_ORDER.map((s) => (
                          <StatusPill key={s} status={s} count={bl.status_counts[s] || 0} />
                        ))
                      ) : (
                        <span className="text-xs text-slate-400 italic">
                          No bugs added yet — use Add Bugs to get started.
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent activity feed — moved to /qa/history. */}
    </div>
  );
}

function SummaryCard({ label, value, iconBg, icon, highlight, caption, to }) {
  // When a `to` prop is provided the card is rendered as a clickable button
  // with React Router navigation, a pointer cursor, and a subtle hover lift
  // (existing cards without `to` render unchanged). Visual treatment is
  // intentionally aligned with the developer-side SummaryCard and the RM
  // severity tiles — a soft tinted icon swatch + top accent bar, no
  // saturated gradient squares.
  const navigate = useNavigate();
  const isClickable = Boolean(to);
  const handleClick = () => {
    console.log('SummaryCard clicked', { to, isClickable });
    if (to) navigate(to);
  };

  // Map the legacy saturated `iconBg="from-X-500 to-X-600"` prop onto the
  // new soft-swatch palette so existing call sites don't need to be
  // rewritten. The accent-bar tint matches the swatch.
  const SWATCH_BY_GRADIENT = {
    "from-emerald-500 to-emerald-600": { swatch: "bg-emerald-50 ring-emerald-200/70", icon: "text-emerald-600", bar: "bg-emerald-500" },
    "from-red-500 to-red-600":         { swatch: "bg-rose-50 ring-rose-200/70",       icon: "text-rose-600",    bar: "bg-rose-500"    },
    "from-blue-500 to-blue-600":       { swatch: "bg-blue-50 ring-blue-200/70",       icon: "text-blue-600",    bar: "bg-blue-500"    },
    "from-rose-500 to-rose-600":       { swatch: "bg-rose-50 ring-rose-200/70",       icon: "text-rose-600",    bar: "bg-rose-500"    },
    "from-purple-500 to-purple-600":   { swatch: "bg-slate-100 ring-slate-200",       icon: "text-slate-600",   bar: "bg-slate-400"   },
  };
  const c = SWATCH_BY_GRADIENT[iconBg] || { swatch: "bg-slate-100 ring-slate-200", icon: "text-slate-600", bar: "bg-slate-400" };

  // "highlight" stays semantically the same (amber accent) but now
  // matches the system-wide tone rather than the old rose-vs-amber split.
  const ringClass = highlight
    ? "border-amber-200"
    : "border-slate-200/70";
  const numberClass = highlight ? "text-amber-700" : "text-slate-900";

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={!isClickable}
      className={`text-left w-full relative bg-white rounded-2xl border shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] p-5 flex items-center justify-between overflow-hidden transition-all ${ringClass} ${
        isClickable
          ? "cursor-pointer hover:shadow-[0_2px_4px_rgba(15,23,42,0.06),0_8px_20px_rgba(15,23,42,0.06)] hover:border-slate-300 hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
          : "cursor-default"
      }`}
    >
      <span aria-hidden className={`absolute top-0 left-5 right-5 h-1 rounded-full ${c.bar}`} />
      <div className="min-w-0 pt-1">
        <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
          {label}
        </p>
        <p className={`text-3xl font-semibold tabular-nums mt-2 ${numberClass}`}>
          {value}
        </p>
        {caption && (
          <p className="text-[10px] text-slate-400 mt-1.5 leading-snug">{caption}</p>
        )}
      </div>
      <div className={`w-11 h-11 rounded-xl ring-1 ring-inset flex items-center justify-center shrink-0 ${c.swatch}`}>
        {/* `icon` is a JSX element with its own color (e.g. text-white from
            the old gradient). Re-tint it to the swatch color so the icon
            reads against the soft background, not the saturated one. */}
        {React.isValidElement(icon)
          ? React.cloneElement(icon, { className: `h-5 w-5 ${c.icon}` })
          : icon}
      </div>
    </button>
  );
}
