import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  Bug, Clock, CheckCircle2,
  AlertTriangle, MessageSquare, Send, CheckCircle, RotateCcw,
  ListFilter, X, PartyPopper, Activity,
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { getBugComments, addBugComment, updateBug, resubmitBug } from "@/api/bugs";
import api from "@/api/axiosInstance";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";

// Statuses the developer acts on (the others — closed — are out of their hands).
const RESOLVABLE_STATUSES = new Set(["open", "in_progress"]);
const ATTENTION_STATUSES = new Set(["failed", "resubmitted"]);
const STATUS_FILTER_OPTIONS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "failed", label: "Failed" },
  { value: "resubmitted", label: "Resubmitted" },
  { value: "closed", label: "Closed" },
];

// ─── Lightweight inline toast ──────────────────────────────
// No external toast lib is installed; this stays consistent with the
// design system (blue/rose/emerald pills, matches NotificationBell's badge styles).
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

function getInlineQaComment(bug) {
  // Prefer the dedicated qa_comment field; fall back to the latest_qa_result notes
  // (computed by BugSerializer) so the inline highlight still works on older rows.
  return bug.qa_comment || bug.latest_qa_result?.notes || null;
}

export default function DeveloperDashboardPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const {
    summary, bugs, loading, error, refetch,
    projectId, setProjectId, projects,
  } = useDashboardSummary();

  // New role-specific dashboard endpoint (global across the dev's projects).
  const [devDashboard, setDevDashboard] = useState(null);
  const [devDashboardLoading, setDevDashboardLoading] = useState(true);
  const [devDashboardError, setDevDashboardError] = useState(null);

  const fetchDevDashboard = useCallback(async () => {
    setDevDashboardLoading(true);
    setDevDashboardError(null);
    try {
      const { data } = await api.get("/dashboard/developer/");
      setDevDashboard(data);
    } catch (err) {
      console.error("Developer dashboard fetch error", err);
      setDevDashboardError("Failed to load dashboard summary.");
    } finally {
      setDevDashboardLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchDevDashboard();
  }, [fetchDevDashboard]);

  const reload = useCallback(() => {
    refetch();
    fetchDevDashboard();
  }, [refetch, fetchDevDashboard]);

  // ─── Local UI state ────────────────────────────────────────
  const [expandedBugId, setExpandedBugId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [fixNotes, setFixNotes] = useState("");
  const [resubmittingId, setResubmittingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);
  // Optimistic in-flight resolves; the row is disabled while pending.
  const [optimisticResolvingId, setOptimisticResolvingId] = useState(null);

  // Status / severity filters for the "Assigned to you" table.
  const [statusFilter, setStatusFilter] = useState("all");
  const [severityFilter, setSeverityFilter] = useState("all");

  const { toasts, push: pushToast } = useToasts();

  // ─── Handlers ─────────────────────────────────────────────
  const handleToggleComments = async (bugId) => {
    if (expandedBugId === bugId) {
      setExpandedBugId(null);
      return;
    }
    setExpandedBugId(bugId);
    if (!commentsMap[bugId]) {
      try {
        const res = await getBugComments(bugId);
        setCommentsMap((prev) => ({ ...prev, [bugId]: res }));
      } catch (err) {
        console.error("Failed to fetch comments", err);
        pushToast("error", "Failed to load comments.");
      }
    }
  };

  const handleAddComment = async (bugId) => {
    if (!newComment.trim()) return;
    setCommentLoading(true);
    try {
      const added = await addBugComment(bugId, newComment.trim());
      setCommentsMap((prev) => ({
        ...prev,
        [bugId]: [...(prev[bugId] || []), added],
      }));
      setNewComment("");
    } catch (err) {
      pushToast("error", "Failed to add comment.");
    } finally {
      setCommentLoading(false);
    }
  };

  const handleStartResolve = (bugId) => {
    setResolvingId(bugId);
    setResolveNotes("");
  };

  const handleCancelResolve = () => {
    setResolvingId(null);
    setResolveNotes("");
  };

  const handleConfirmResolve = async (bugId) => {
    if (!resolveNotes.trim()) {
      pushToast("error", "Please describe the fix before marking resolved.");
      return;
    }
    setResolvingLoading(true);
    setOptimisticResolvingId(bugId);
    try {
      await updateBug(bugId, { status: "resolved", notes: resolveNotes.trim() });
      setResolvingId(null);
      setResolveNotes("");
      pushToast("success", "Marked as resolved. QA will pick it up.");
      reload();
    } catch (err) {
      console.error(err);
      pushToast("error", "Failed to mark as resolved.");
    } finally {
      setResolvingLoading(false);
      setOptimisticResolvingId(null);
    }
  };

  const handleResubmit = async (bugId) => {
    if (!fixNotes.trim()) {
      pushToast("error", "Please describe how you fixed the issue.");
      return;
    }
    setResubmittingId(bugId);
    try {
      await resubmitBug(bugId, { notes: fixNotes.trim() });
      setFixNotes("");
      setResubmittingId(null);
      pushToast("success", "Resubmitted to QA.");
      reload();
    } catch (err) {
      pushToast("error", "Failed to resubmit bug.");
    } finally {
      setResubmittingId(null);
    }
  };

  // ─── Derived data ─────────────────────────────────────────
  // The "Assigned to you" table is scoped by the project selector (per-project view),
  // but the summary cards at the top come from the new global endpoint.
  const assignedBugs = useMemo(
    () => bugs.filter((b) => b.assigned_to === user?.id),
    [bugs, user]
  );

  const filteredAssignedBugs = useMemo(() => {
    return assignedBugs.filter((b) => {
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      const sev = b.severity || b.predicted_severity;
      if (severityFilter !== "all" && sev !== severityFilter) return false;
      return true;
    });
  }, [assignedBugs, statusFilter, severityFilter]);

  const failedBugs = useMemo(
    () => assignedBugs.filter((b) => ATTENTION_STATUSES.has(b.status)),
    [assignedBugs]
  );

  const attentionBugIds = useMemo(
    () => new Set(failedBugs.map((b) => b.id)),
    [failedBugs]
  );

  // Severity options are derived from the bugs actually assigned to the user
  // (no point showing severities they don't have any bugs in).
  const severityOptions = useMemo(() => {
    const set = new Set();
    assignedBugs.forEach((b) => {
      const sev = b.severity || b.predicted_severity;
      if (sev) set.add(sev);
    });
    return ["all", ...Array.from(set).sort()];
  }, [assignedBugs]);

  // Recent activity comes from the new dashboard endpoint. Cross-reference bug_id
  // against the loaded bug list to render titles; fall back to "Bug #<id>".
  const bugById = useMemo(() => {
    const m = new Map();
    assignedBugs.forEach((b) => m.set(b.id, b));
    return m;
  }, [assignedBugs]);

  // "Resolved this week" — recent_activity only carries {id,type,bug_id,project_id,timestamp},
  // no old_status/new_status, so it cannot be derived precisely. The spec explicitly
  // allows the fallback: use assigned_by_status.resolved as an all-time "Resolved" card.
  // (Documented inline so the label matches reality.)
  const assignedByStatus = devDashboard?.assigned_by_status || {};
  const resolvedTotal = assignedByStatus.resolved || 0;
  const openAssignedTotal = (assignedByStatus.open || 0) + (assignedByStatus.in_progress || 0);
  const needsAttentionCount = devDashboard?.needs_attention_count ?? 0;
  const recentActivity = devDashboard?.recent_activity || [];

  if (loading && devDashboardLoading) {
    return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  }
  if (error && devDashboardError) {
    return <div className="p-8 text-center text-red-500">{devDashboardError}</div>;
  }
  if (error) {
    return <div className="p-8 text-center text-red-500">{error}</div>;
  }

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} />

      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {openAssignedTotal} open bug{openAssignedTotal === 1 ? "" : "s"} and{" "}
            {needsAttentionCount} needing attention.
          </p>
        </div>

        <div className="w-full lg:w-64">
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">All Projects</option>
            {projects && projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
      </div>

      {/* Summary cards — pulled from GET /api/dashboard/developer/ */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <SummaryCard
          label="Open (assigned to you)"
          value={openAssignedTotal}
          iconBg="from-blue-500 to-blue-600"
          icon={<ListFilter className="h-5 w-5 text-white" />}
        />
        <SummaryCard
          label="Needs Attention"
          value={needsAttentionCount}
          iconBg="from-rose-500 to-rose-600"
          icon={<AlertTriangle className="h-5 w-5 text-white" />}
          highlight={needsAttentionCount > 0}
        />
        <SummaryCard
          label="Resolved"
          value={resolvedTotal}
          iconBg="from-emerald-500 to-emerald-600"
          icon={<CheckCircle className="h-5 w-5 text-white" />}
          caption="All-time (resolved-this-week is not derivable from recent_activity)"
        />
        <SummaryCard
          label="Closed"
          value={assignedByStatus.closed || 0}
          iconBg="from-purple-500 to-purple-600"
          icon={<PartyPopper className="h-5 w-5 text-white" />}
        />
      </div>

      {/* "Requires Attention (Failed QA)" — existing inline Resubmit form,
          wired to the new data source via assignedBugs (filtered to failed/resubmitted). */}
      {failedBugs.length > 0 && (
        <div className="bg-rose-50/50 rounded-2xl border border-rose-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-rose-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-semibold text-rose-900">
              Requires Attention (Failed QA)
            </h2>
            <span className="ml-auto text-xs font-semibold text-rose-700 bg-rose-100 border border-rose-200 px-2 py-0.5 rounded-full">
              {failedBugs.length}
            </span>
          </div>
          <div className="divide-y divide-rose-100">
            {failedBugs.map((bug) => {
              const qaComment = getInlineQaComment(bug);
              return (
                <div key={bug.id} className="p-6 space-y-4">
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-3">
                    <div className="space-y-1">
                      <button
                        type="button"
                        onClick={() => navigate(`/bugs/${bug.id}`)}
                        className="text-left text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors"
                      >
                        {bug.title}
                      </button>
                      <p className="text-sm text-slate-600">{bug.description}</p>
                      <div className="flex items-center flex-wrap gap-2 pt-1">
                        <StatusBadge status={bug.status} />
                        <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                        <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full border bg-rose-50 text-rose-700 border-rose-200">
                          QA {bug.latest_qa_result?.result || "rejected"}
                        </span>
                      </div>
                    </div>
                  </div>

                  {qaComment && (
                    <div className="bg-white rounded-xl border border-rose-100 p-4">
                      <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide mb-1">
                        Latest QA Comment
                      </p>
                      <p className="text-sm text-slate-700">{qaComment}</p>
                      {bug.latest_qa_result?.tested_at && (
                        <p className="text-[11px] text-slate-400 mt-2">
                          {timeAgo(bug.latest_qa_result.tested_at)} ·{" "}
                          {bug.latest_qa_result.qa_name || "QA"}
                        </p>
                      )}
                    </div>
                  )}

                  {resubmittingId === bug.id ? (
                    <div className="space-y-3">
                      <textarea
                        value={fixNotes}
                        onChange={(e) => setFixNotes(e.target.value)}
                        placeholder="Describe how you fixed this issue..."
                        rows={2}
                        className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                      />
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleResubmit(bug.id)}
                          className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors"
                        >
                          Submit Fix
                        </button>
                        <button
                          onClick={() => {
                            setResubmittingId(null);
                            setFixNotes("");
                          }}
                          className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                          Cancel
                        </button>
                      </div>
                    </div>
                  ) : (
                    <button
                      onClick={() => setResubmittingId(bug.id)}
                      className="inline-flex items-center gap-1.5 px-4 py-2 bg-indigo-50 text-indigo-700 border border-indigo-200 rounded-xl text-sm font-semibold hover:bg-indigo-100 transition-colors"
                    >
                      <RotateCcw className="h-4 w-4" />
                      Resubmit for QA
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* "Assigned to you" — filterable table with optimistic Mark Resolved. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex flex-col sm:flex-row sm:items-center gap-3">
          <h2 className="text-base font-semibold text-slate-800">Assigned To You</h2>
          <div className="sm:ml-auto flex items-center gap-2 flex-wrap">
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by status"
            >
              {STATUS_FILTER_OPTIONS.map((opt) => (
                <option key={opt.value} value={opt.value}>{opt.label}</option>
              ))}
            </select>
            <select
              value={severityFilter}
              onChange={(e) => setSeverityFilter(e.target.value)}
              className="appearance-none border border-slate-200 rounded-lg px-3 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              aria-label="Filter by severity"
            >
              <option value="all">All severities</option>
              {severityOptions.filter((s) => s !== "all").map((s) => (
                <option key={s} value={s}>{s}</option>
              ))}
            </select>
            {(statusFilter !== "all" || severityFilter !== "all") && (
              <button
                type="button"
                onClick={() => { setStatusFilter("all"); setSeverityFilter("all"); }}
                className="inline-flex items-center gap-1 text-xs font-medium text-slate-500 hover:text-slate-700 px-2 py-1"
              >
                <X className="h-3 w-3" /> Clear
              </button>
            )}
          </div>
        </div>

        <div className="divide-y divide-slate-100">
          {filteredAssignedBugs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">
              {assignedBugs.length === 0
                ? "No bugs are currently assigned to you."
                : "No bugs match the current filters."}
            </div>
          ) : (
            filteredAssignedBugs.map((bug) => {
              const isAttention = attentionBugIds.has(bug.id);
              const qaComment = getInlineQaComment(bug);
              const canResolve = RESOLVABLE_STATUSES.has(bug.status);
              return (
                <div
                  key={bug.id}
                  className={`p-5 transition-colors ${
                    isAttention
                      ? "bg-rose-50/30 border-l-4 border-l-rose-400 hover:bg-rose-50/60"
                      : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/bugs/${bug.id}`)}
                      className="text-left space-y-2 flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        {isAttention && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-rose-100 text-rose-700 border border-rose-200">
                            <AlertTriangle className="h-3 w-3" />
                            {bug.status === "resubmitted" ? "Reassigned" : "Failed QA"}
                          </span>
                        )}
                        <h3 className="text-sm font-semibold text-slate-800 hover:text-blue-700 transition-colors">
                          {bug.title}
                        </h3>
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{bug.description}</p>
                      <div className="flex items-center flex-wrap gap-3 pt-1">
                        <StatusBadge status={bug.status} />
                        <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(bug.created_at)}
                        </span>
                      </div>

                      {isAttention && qaComment && (
                        <div className="mt-2 bg-white border border-rose-100 rounded-lg px-3 py-2">
                          <p className="text-[10px] font-bold uppercase tracking-wide text-rose-700 mb-0.5">
                            Latest QA Comment
                          </p>
                          <p className="text-xs text-slate-700 line-clamp-3">{qaComment}</p>
                        </div>
                      )}
                    </button>

                    <div className="flex items-center gap-2 shrink-0 sm:flex-col sm:items-end">
                      <button
                        type="button"
                        onClick={(e) => { e.stopPropagation(); handleToggleComments(bug.id); }}
                        className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Comments"
                      >
                        <MessageSquare className="h-4 w-4" />
                      </button>

                      {resolvingId === bug.id ? (
                        <div className="w-full sm:w-64 space-y-2">
                          <textarea
                            value={resolveNotes}
                            onChange={(e) => setResolveNotes(e.target.value)}
                            placeholder="Describe your fix..."
                            rows={2}
                            className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => handleConfirmResolve(bug.id)}
                              disabled={resolvingLoading}
                              className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
                            >
                              Confirm
                            </button>
                            <button
                              onClick={handleCancelResolve}
                              className="px-3 py-1.5 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                            >
                              Cancel
                            </button>
                          </div>
                        </div>
                      ) : canResolve ? (
                        <button
                          type="button"
                          onClick={() => handleStartResolve(bug.id)}
                          disabled={optimisticResolvingId === bug.id}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-100 disabled:opacity-50"
                        >
                          <CheckCircle2 className="h-3.5 w-3.5" />
                          {optimisticResolvingId === bug.id ? "Resolving…" : "Mark Resolved"}
                        </button>
                      ) : (
                        <span
                          className="text-[11px] text-slate-400 italic"
                          title="This status is set by QA or the workflow; open the bug for details."
                        >
                          Awaiting next step
                        </span>
                      )}
                    </div>
                  </div>

                  {expandedBugId === bug.id && (
                    <div className="mt-4 pl-4 border-l-2 border-slate-100 space-y-3">
                      <div className="space-y-2">
                        {(commentsMap[bug.id] || []).length === 0 ? (
                          <p className="text-xs text-slate-400 italic">No comments yet.</p>
                        ) : (
                          (commentsMap[bug.id] || []).map((c) => (
                            <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                              <div className="flex justify-between items-start mb-1">
                                <span className="text-xs font-semibold text-slate-700">{c.user_name}</span>
                                <span className="text-[10px] text-slate-400">
                                  {new Date(c.created_at).toLocaleString()}
                                </span>
                              </div>
                              <p className="text-sm text-slate-600">{c.comment_text}</p>
                            </div>
                          ))
                        )}
                      </div>
                      <div className="flex gap-2 pt-1">
                        <input
                          type="text"
                          value={newComment}
                          onChange={(e) => setNewComment(e.target.value)}
                          placeholder="Add a comment..."
                          className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                          onKeyDown={(e) => {
                            if (e.key === "Enter") handleAddComment(bug.id);
                          }}
                        />
                        <button
                          type="button"
                          onClick={() => handleAddComment(bug.id)}
                          disabled={commentLoading || !newComment.trim()}
                          className="p-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors shrink-0 flex items-center justify-center"
                        >
                          <Send className="h-4 w-4" />
                        </button>
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Recent activity feed — from the new dashboard endpoint. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
        </div>
        {recentActivity.length === 0 ? (
          <div className="p-8 text-center text-slate-400 text-sm">No recent activity yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((item) => {
              const bug = bugById.get(item.bug_id);
              const bugLabel = bug ? bug.title : `Bug #${item.bug_id}`;
              const isQa = item.type === "qa_result";
              return (
                <button
                  key={`${item.type}-${item.id}`}
                  type="button"
                  onClick={() => navigate(`/bugs/${item.bug_id}`)}
                  className="w-full text-left px-6 py-3.5 hover:bg-slate-50 transition-colors flex items-center gap-3"
                >
                  <span
                    className={`text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full border ${
                      isQa
                        ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                        : "bg-blue-50 text-blue-700 border-blue-200"
                    }`}
                  >
                    {isQa ? "QA" : "History"}
                  </span>
                  <span className="text-sm text-slate-700 flex-1 min-w-0 truncate">
                    {isQa ? "QA result" : "Status change"} ·{" "}
                    <span className="font-medium text-slate-900">{bugLabel}</span>
                  </span>
                  <span className="text-xs text-slate-400 shrink-0">
                    {timeAgo(item.timestamp)}
                  </span>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

function SummaryCard({ label, value, iconBg, icon, highlight, caption }) {
  return (
    <div
      className={`bg-white rounded-2xl border shadow-sm p-5 flex items-center justify-between ${
        highlight ? "border-rose-200" : "border-slate-100"
      }`}
    >
      <div>
        <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
        <p className={`text-2xl font-bold mt-2 ${highlight ? "text-rose-700" : "text-slate-800"}`}>
          {value}
        </p>
        {caption && (
          <p className="text-[10px] text-slate-400 mt-1 leading-snug">{caption}</p>
        )}
      </div>
      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md`}>
        {icon}
      </div>
    </div>
  );
}
