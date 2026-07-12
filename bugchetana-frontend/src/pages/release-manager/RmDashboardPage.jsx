import React, { useState, useEffect, useCallback, useRef } from "react";
import {
  FolderPlus,
  Rocket,
  RotateCcw,
  Loader2,
  CheckCircle2,
  AlertTriangle,
  Activity,
  Flame,
  BarChart3,
  Minus,
  XCircle,
} from "lucide-react";
import api from "@/api/axiosInstance";
import { projectUrl } from "@/api/projects";
import { getUsers } from "@/api/users";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import InputField from "@/components/shared/InputField";
import ProjectSelector from "@/components/shared/ProjectSelector";
import ProjectManagement from "@/pages/ProjectManagement";

// ─── Lightweight inline toast ──────────────────────────────
// Same pattern used in QaBugListDetailPage and DeveloperDashboardPage —
// multi-toast stack in the top-right, 3.5s auto-dismiss. Centralizing it
// here would be nice but the codebase keeps this duplicated per-page, so
// this page follows the same convention rather than introducing a new one.
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((kind, message) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-50 space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : t.kind === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-blue-50 border-blue-800 text-blue-800";
        const Icon =
          t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Activity;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 max-w-sm border rounded-xl px-4 py-3 shadow-sm ${styles}`}
            role="status"
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm font-medium leading-snug">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

// Tile used in the Release Manager "Project overview" severity row.
// Mirrors the visual system used by the QA/Developer SummaryCard tiles:
// soft tinted swatch for the icon, top accent bar, refined typography.
// Pure JSX/style — receives the count and color/icon mapping from the
// parent; does not call any hooks or read state.
const TILE_COLOR_CLASSES = {
  rose:   { swatch: "bg-rose-50 ring-rose-200/70",     icon: "text-rose-600",   bar: "bg-rose-500"   },
  amber:  { swatch: "bg-amber-50 ring-amber-200/70",   icon: "text-amber-600",  bar: "bg-amber-500"  },
  blue:   { swatch: "bg-blue-50 ring-blue-200/70",     icon: "text-blue-600",   bar: "bg-blue-500"   },
  emerald:{ swatch: "bg-emerald-50 ring-emerald-200/70", icon: "text-emerald-600", bar: "bg-emerald-500" },
  slate:  { swatch: "bg-slate-100 ring-slate-200",     icon: "text-slate-600",  bar: "bg-slate-400"  },
};

function SeverityTile({ label, value, color, Icon }) {
  const c = TILE_COLOR_CLASSES[color] || TILE_COLOR_CLASSES.slate;
  return (
    <div className="relative bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] p-5 overflow-hidden">
      <span aria-hidden className={`absolute top-0 left-5 right-5 h-1 rounded-full ${c.bar}`} />
      <div className="flex items-start justify-between gap-3 pt-1">
        <div className="min-w-0">
          <p className="text-[10px] font-semibold text-slate-500 uppercase tracking-[0.08em]">
            {label}
          </p>
          <p className={`text-3xl font-semibold tabular-nums mt-2 ${c.icon}`}>
            {value}
          </p>
        </div>
        <div className={`w-11 h-11 rounded-xl ring-1 ring-inset flex items-center justify-center shrink-0 ${c.swatch}`}>
          <Icon className="h-5 w-5" />
        </div>
      </div>
    </div>
  );
}

// Merged dashboard for the Release Manager role.
//
// Per the spec this route is "the merged Dashboard+Projects page", so it
// shows the severity/breakdown overview AND project creation + Dev/QA
// assignment (delegated to ProjectManagement via its existing `embedded`
// prop) AND releases.
export default function RmDashboardPage() {
  const { user } = useAuth();
  const { summary, bugs, loading, error, refetch, projectId } = useDashboardSummary();
  const { toasts, push: pushToast } = useToasts();

  const [releases, setReleases] = useState([]);
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [newReleaseTitle, setNewReleaseTitle] = useState("");
  // Per-release selection so each release's "Add to release" dropdown
  // remembers its own pick and each dropdown's attached-bug filter is
  // scoped to its own release.
  const [selectedBugIdByRelease, setSelectedBugIdByRelease] = useState({});
  const [developers, setDevelopers] = useState([]);
  const [qaUsers, setQaUsers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  useEffect(() => {
    if (projectId) {
      fetchReleases();
    }
  }, [projectId]);

  useEffect(() => {
    Promise.all([
      getUsers({ role: "Developer" }),
      getUsers({ role: "QA" }),
    ])
      .then(([devs, qas]) => {
        setDevelopers(devs);
        setQaUsers(qas);
      })
      .catch(console.error)
      .finally(() => setTeamLoading(false));
  }, []);

  const fetchReleases = async () => {
    if (!projectId) return;
    try {
      const releasesRes = await api.get(projectUrl(projectId, "releases/"));
      setReleases(releasesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!projectId || !newReleaseVersion.trim() || !newReleaseTitle.trim()) return;
    try {
      await api.post(projectUrl(projectId, "releases/"), {
        version: newReleaseVersion.trim(),
        title: newReleaseTitle.trim(),
      });
      setNewReleaseVersion("");
      setNewReleaseTitle("");
      pushToast("success", "Release created.");
      fetchReleases();
    } catch (err) {
      console.error(err);
      pushToast("error", err?.response?.data?.error || "Failed to create release");
    }
  };

  const handleAddBugToRelease = async (releaseId, bugId) => {
    if (!bugId) return;
    try {
      await api.post(`/releases/${releaseId}/add-bug/`, { bug_id: bugId });
      // Clear this release's pick; leave the others alone.
      setSelectedBugIdByRelease((prev) => ({ ...prev, [releaseId]: "" }));
      pushToast("success", "Bug added to release.");
      fetchReleases();
    } catch (err) {
      console.error(err);
      // Backend returns 400 with {"error": "..."} for duplicates and
      // cross-project bugs (see AddBugToReleaseView in bugs/views.py).
      // Surface that text verbatim so the RM understands why nothing happened.
      pushToast("error", err?.response?.data?.error || "Failed to add bug to release");
    }
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Project overview, project management, and releases — all in one place.
        </p>
      </div>

      <ProjectSelector />

      {/* Project overview */}
      <div className="bg-white rounded-2xl border border-slate-200/70 shadow-[0_1px_2px_rgba(15,23,42,0.04),0_4px_12px_rgba(15,23,42,0.04)] p-6">
        <div className="flex items-baseline justify-between mb-5">
          <h2 className="text-base font-semibold text-slate-900">Project overview</h2>
          <p className="text-[11px] font-medium text-slate-400 uppercase tracking-wider">
            Severity breakdown
          </p>
        </div>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-4">
            {[
              { key: "critical", label: "Critical", value: summary?.severity_breakdown?.critical || 0, color: "rose",    icon: AlertTriangle },
              { key: "high",     label: "High",     value: summary?.severity_breakdown?.high     || 0, color: "amber",   icon: Flame },
              { key: "medium",   label: "Medium",   value: summary?.severity_breakdown?.medium   || 0, color: "blue",    icon: BarChart3 },
              { key: "low",      label: "Low",      value: summary?.severity_breakdown?.low      || 0, color: "slate",   icon: Minus },
              { key: "failed",   label: "Failed",   value: summary?.failed_bugs                  || 0, color: "rose",    icon: XCircle },
            ].map(({ key, label, value, color, icon: Icon }) => (
              <SeverityTile key={key} label={label} value={value} color={color} Icon={Icon} />
            ))}
          </div>
        )}
      </div>

      {/* Projects (create, rename, members) — uses the existing
          ProjectManagement component in embedded mode. */}
      <ProjectManagement embedded />

      {/* Team (developers + QA) */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">Developers</h2>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : developers.length === 0 ? (
            <p className="text-sm text-slate-400">No developers registered.</p>
          ) : (
            <div className="space-y-2">
              {developers.map((dev) => (
                <div key={dev.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{dev.name}</p>
                    <p className="text-xs text-slate-400">{dev.email}</p>
                  </div>
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                    {dev.assigned_bug_count ?? 0} bugs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <h2 className="text-base font-semibold text-slate-800 mb-4">QA engineers</h2>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
          ) : qaUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No QA users registered.</p>
          ) : (
            <div className="space-y-2">
              {qaUsers.map((qa) => (
                <div key={qa.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-medium text-slate-800">{qa.name}</p>
                    <p className="text-xs text-slate-400">{qa.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Releases */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-base font-semibold text-slate-800">Releases</h2>
            <form onSubmit={handleCreateRelease} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <InputField
                  placeholder="Version (e.g. v1.0.0)"
                  value={newReleaseVersion}
                  onChange={(e) => setNewReleaseVersion(e.target.value)}
                  required
                />
              </div>
              <div className="w-full sm:w-72">
                <InputField
                  placeholder="Release title"
                  value={newReleaseTitle}
                  onChange={(e) => setNewReleaseTitle(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-colors disabled:opacity-60"
                disabled={!newReleaseVersion.trim() || !newReleaseTitle.trim()}
              >
                Create release
              </button>
          </form>
        </div>

        <div className="space-y-4">
          {releases.length === 0 ? (
            <p className="text-slate-400 text-center py-4 text-sm">No releases found for this project.</p>
          ) : (
            releases.map((release) => {
              // The dropdown lists every closed bug in the project, but
              // we exclude any bug already attached to THIS release so the
              // RM can't pick a duplicate. (Backend's
              // AddBugToReleaseView rejects duplicates with 400 — see
              // bugs/views.py — so this is a UX-layer guard, not a
              // correctness fix.)
              const attachedIds = new Set(release.bugs || []);
              const availableBugs = bugs.filter(
                (b) => b.status === "closed" && !attachedIds.has(b.id)
              );
              return (
              <div key={release.id} className="border border-slate-100 rounded-xl p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-slate-900">{release.version}</h3>
                  <span className="text-sm text-slate-400">{release.bugs?.length || 0} bugs attached</span>
                </div>

                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedBugIdByRelease[release.id] || ""}
                    onChange={(e) =>
                      setSelectedBugIdByRelease((prev) => ({
                        ...prev,
                        [release.id]: e.target.value,
                      }))
                    }
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                  >
                    <option value="">Select a bug to add...</option>
                    {availableBugs.map((bug) => (
                      <option key={bug.id} value={bug.id}>#{bug.id} - {bug.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddBugToRelease(release.id, selectedBugIdByRelease[release.id] || "")}
                    className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                  >
                    Add to release
                  </button>
                </div>

                {release.bug_details && release.bug_details.length > 0 && (
                  <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                    {/* bug_details comes from ReleaseSerializer.get_bug_details
                        and has shape {id, title}. Render with the same
                        "#<id> - <title>" format the dropdown uses for
                        visual consistency. */}
                    {release.bug_details.map((bug) => (
                      <div key={bug.id} className="text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                        #{bug.id} - {bug.title}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              );
            })
          )}
        </div>
      </div>

      <ToastStack toasts={toasts} />
    </div>
  );
}
