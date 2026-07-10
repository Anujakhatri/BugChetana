import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FolderPlus,
  ListChecks,
  ListFilter,
  Activity,
  PlusSquare,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosInstance";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { assignBug, submitQaResult, getBugLists } from "@/api/bugs";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";
import CreateBugListModal from "@/components/shared/CreateBugListModal";
import QaActionModal from "@/components/shared/QaActionModal";

// Status buckets shown in per-bug-list pills. Order matters: highest-signal first.
const LIST_STATUS_PILL_ORDER = ["open", "in_progress", "failed", "resubmitted", "resolved", "closed"];

// ─── Lightweight inline toast (matches the design system; no external lib) ─
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
    <div className="fixed top-4 right-4 z-[70] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : t.kind === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-blue-50 border-blue-200 text-blue-800";
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Activity;
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

// Returns the list of bug IDs that are still "open work" for QA: resolved (not
// yet verified) and resubmitted. Used both for the table and the empty state.
const PENDING_QA_STATUSES = new Set(["resolved", "resubmitted"]);

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
  const [actionModal, setActionModal] = useState({ open: false, type: null, bugId: null });
  // Optimistic Pass — show "Passing…" label while in flight.
  const [passingId, setPassingId] = useState(null);

  const { toasts, push: pushToast } = useToasts();

  // ─── Handlers ─────────────────────────────────────────────
  const handlePass = async (bugId) => {
    if (passingId) return; // single-flight
    setPassingId(bugId);
    try {
      await submitQaResult(bugId, { result: "pass", notes: "" });
      pushToast("success", "Bug approved and moved to release.");
      reload();
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to mark bug as passed.");
    } finally {
      setPassingId(null);
    }
  };

  const handleActionSubmit = async (notes) => {
    const { type, bugId } = actionModal;
    try {
      if (type === "fail") {
        await submitQaResult(bugId, { result: "fail", notes });
        pushToast("success", "Bug marked as failed. Developer notified.");
      } else if (type === "reassign") {
        const bug = bugs.find((b) => b.id === bugId);
        if (!bug?.assigned_to) {
          pushToast("error", "No developer is currently assigned to this bug.");
          setActionModal({ open: false, type: null, bugId: null });
          return;
        }
        await assignBug(bugId, bug.assigned_to, { record_reassign: true, notes });
        pushToast("success", "Bug reassigned to developer.");
      } else {
        setActionModal({ open: false, type: null, bugId: null });
        return;
      }
      setActionModal({ open: false, type: null, bugId: null });
      reload();
    } catch (err) {
      console.error(err);
      pushToast("error", err?.response?.data?.notes?.[0] || `Failed to ${type} bug.`);
    }
  };

  // ─── Derived data ─────────────────────────────────────────
  // Per-project pending review table. The dashboard endpoint's pending_review_count
  // is global; this table is the action list for the selected project.
  // Mirrors the backend's pending_review_count logic:
  //   status='resolved' AND verified_by__isnull=True
  const pendingReviewBugs = useMemo(
    () => bugs.filter((b) => b.status === "resolved" && !b.verified_by),
    [bugs]
  );

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
  const pendingReviewCount = qaDashboard?.pending_review_count ?? 0;
  const failedRecheckCount = qaDashboard?.failed_recheck_count ?? 0;
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
      <ToastStack toasts={toasts} />

      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setBugListModalOpen(false);
          reload();
        }}
      />
      <QaActionModal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, type: null, bugId: null })}
        actionType={actionModal.type}
        onSubmit={handleActionSubmit}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            You have {pendingReviewCount} bug{pendingReviewCount === 1 ? "" : "s"} awaiting review
            and {failedRecheckCount} needing recheck.
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

      {/* Summary cards — from GET /api/dashboard/qa/ */}
      <div className="space-y-6">
        <div>
          <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider mb-3 px-1">
            Review queue
          </p>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
            <SummaryCard
              label="Pending Review"
              value={pendingReviewCount}
              iconBg="from-amber-500 to-amber-600"
              icon={<AlertTriangle className="h-5 w-5 text-white" />}
              highlight={pendingReviewCount > 0}
              caption="Resolved bugs not yet verified"
            />
            <SummaryCard
              label="Needs Recheck"
              value={failedRecheckCount}
              iconBg="from-rose-500 to-rose-600"
              icon={<RotateCcw className="h-5 w-5 text-white" />}
              highlight={failedRecheckCount > 0}
              caption="Failed or resubmitted across your projects"
            />
          </div>
        </div>

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
            />
            <SummaryCard
              label="Failed"
              value={failedCount}
              iconBg="from-red-500 to-red-600"
              icon={<XCircle className="h-5 w-5 text-white" />}
              caption="Bugs you've marked as failing QA"
            />
            <SummaryCard
              label="Active Bug Lists"
              value={activeBugListsCount}
              iconBg="from-blue-500 to-blue-600"
              icon={<ListChecks className="h-5 w-5 text-white" />}
              caption="Bug lists in your member projects"
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

      {/* Pending review table — Pass / Fail / Reassign. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <ListFilter className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Pending Review</h2>
          <span className="ml-2 text-[11px] font-semibold text-blue-700 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full">
            {pendingReviewBugs.length} in this project
          </span>
        </div>
        <div className="divide-y divide-slate-100">
          {!projectId ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">Select a project to see bugs awaiting review.</p>
              <p className="text-xs text-slate-400 mt-1">The dropdown is at the top right of this page.</p>
            </div>
          ) : pendingReviewBugs.length === 0 ? (
            <div className="p-10 text-center">
              <p className="text-sm text-slate-500">No bugs in this project are awaiting review right now.</p>
              <p className="text-xs text-slate-400 mt-1">
                When a developer marks a bug as resolved, it will show up here for verification.
              </p>
            </div>
          ) : (
            pendingReviewBugs.map((bug) => {
              const isFailing = bug.status === "failed" || bug.status === "resubmitted";
              return (
                <div
                  key={bug.id}
                  className={`p-5 transition-colors ${
                    isFailing ? "bg-rose-50/30 border-l-4 border-l-rose-400 hover:bg-rose-50/60" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/bugs/${bug.id}`)}
                      className="text-left space-y-2 flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          #{bug.id}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                          {bug.title}
                        </h3>
                        {isFailing && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            {bug.status === "resubmitted" ? "Reassigned" : "Failed QA"}
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{bug.description}</p>

                      {isFailing && bug.qa_comment && (
                        <div className="bg-white border border-rose-100 rounded-lg px-3 py-2 mt-1">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 mb-0.5">
                            Latest QA Comment
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-3">{bug.qa_comment}</p>
                        </div>
                      )}

                      <div className="flex items-center flex-wrap gap-3 pt-1">
                        <StatusBadge status={bug.status} />
                        <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                        {bug.assigned_to && (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                            <Users className="h-3 w-3" />
                            Dev: {bug.assigned_to_name || "Assigned"}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(bug.updated_at || bug.created_at)}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handlePass(bug.id)}
                        disabled={passingId === bug.id}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                      >
                        <CheckCircle2 className="h-4 w-4" />
                        {passingId === bug.id ? "Passing…" : "Pass"}
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ open: true, type: "fail", bugId: bug.id })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
                      >
                        <XCircle className="h-4 w-4" />
                        Fail
                      </button>
                      <button
                        type="button"
                        onClick={() => setActionModal({ open: true, type: "reassign", bugId: bug.id })}
                        className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                      >
                        <RotateCcw className="h-4 w-4" />
                        Reassign
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent activity feed — moved to /qa/history. */}
    </div>
  );
}

function SummaryCard({ label, value, iconBg, icon, highlight, caption }) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between ${
        highlight ? "border-amber-200" : "border-slate-100"
      }`}
    >
      <div className="min-w-0">
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-2 ${highlight ? "text-amber-700" : "text-slate-800"}`}>
          {value}
        </p>
        {caption && (
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">{caption}</p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md shrink-0`}>
        {icon}
      </div>
    </div>
  );
}
