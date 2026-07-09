import React, { useState, useEffect } from "react";
import {
  Bug, Clock, CheckCircle2,
  AlertTriangle, MessageSquare, Send, CheckCircle, RotateCcw,
} from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { getBugComments, addBugComment, updateBug, resubmitBug } from "@/api/bugs";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";

export default function DeveloperDashboardPage() {
  const { user } = useAuth();
  const { summary, bugs, loading, error, refetch, projectId, setProjectId, projects } = useDashboardSummary();

  const [expandedBugId, setExpandedBugId] = useState(null);
  const [commentsMap, setCommentsMap] = useState({});
  const [newComment, setNewComment] = useState("");
  const [commentLoading, setCommentLoading] = useState(false);

  const [fixNotes, setFixNotes] = useState("");
  const [resubmittingId, setResubmittingId] = useState(null);
  const [resolvingId, setResolvingId] = useState(null);
  const [resolveNotes, setResolveNotes] = useState("");
  const [resolvingLoading, setResolvingLoading] = useState(false);

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
      alert("Failed to add comment.");
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
      alert("Please provide a comment describing the fix.");
      return;
    }
    setResolvingLoading(true);
    try {
      await updateBug(bugId, { status: "resolved", notes: resolveNotes.trim() });
      setResolvingId(null);
      setResolveNotes("");
      refetch();
    } catch (err) {
      console.error(err);
      alert("Failed to mark as resolved.");
    } finally {
      setResolvingLoading(false);
    }
  };

  const handleResubmit = async (bugId) => {
    if (!fixNotes.trim()) {
      alert("Please provide notes on how you fixed the issue.");
      return;
    }
    try {
      await resubmitBug(bugId, { notes: fixNotes.trim() });
      setFixNotes("");
      setResubmittingId(null);
      refetch();
    } catch (err) {
      alert("Failed to resubmit bug.");
    }
  };

  const openBugs = bugs.filter((b) => ["open", "in_progress"].includes(b.status));
  const failedBugs = bugs.filter((b) => b.status === "failed");
  const assignedBugs = bugs.filter((b) => b.assigned_to === user?.id);

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">You have {openBugs.length} open bugs and {failedBugs.length} failed bugs.</p>
        </div>

        <div className="w-full lg:w-64">
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">All Projects</option>
            {projects && projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Open Bugs</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{openBugs.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Failed QA</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{failedBugs.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md">
            <AlertTriangle className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Pass</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">
              {summary?.status_breakdown?.closed || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <CheckCircle className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Fail</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">
              {summary?.status_breakdown?.failed || 0}
            </p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {failedBugs.length > 0 && (
        <div className="bg-rose-50/50 rounded-2xl border border-rose-100 overflow-hidden">
          <div className="px-6 py-5 border-b border-rose-100 flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-rose-600" />
            <h2 className="text-base font-semibold text-rose-900">Requires Attention (Failed QA)</h2>
          </div>
          <div className="divide-y divide-rose-100">
            {failedBugs.map((bug) => (
              <div key={bug.id} className="p-6 space-y-4">
                <div>
                  <h3 className="text-sm font-semibold text-slate-900">{bug.title}</h3>
                  <p className="text-sm text-slate-600 mt-1.5">{bug.description}</p>
                </div>
                <div className="bg-white rounded-xl border border-rose-100 p-4">
                  <p className="text-xs font-semibold text-rose-800 uppercase tracking-wide mb-1">QA Feedback</p>
                  <p className="text-sm text-slate-700">{bug.qa_comment || "No feedback provided."}</p>
                </div>
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
            ))}
          </div>
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Assigned To You</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {assignedBugs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 text-sm">No bugs are currently assigned to you.</div>
          ) : (
            assignedBugs.map((bug) => (
              <div key={bug.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800">{bug.title}</h3>
                    <p className="text-sm text-slate-600">{bug.description}</p>
                    <div className="flex items-center flex-wrap gap-3 pt-1">
                      <StatusBadge status={bug.status} />
                      <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(bug.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComments(bug.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Comments"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    {resolvingId === bug.id ? (
                      <div className="w-full sm:w-auto flex gap-2 items-center">
                        <textarea
                          value={resolveNotes}
                          onChange={(e) => setResolveNotes(e.target.value)}
                          placeholder="Describe your fix..."
                          rows={2}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmResolve(bug.id)}
                            disabled={resolvingLoading}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartResolve(bug.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Open Bugs</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {openBugs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">You have no open bugs. 🎉</div>
          ) : (
            openBugs.map((bug) => (
              <div key={bug.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
                  <div className="space-y-2">
                    <h3 className="text-sm font-semibold text-slate-800">{bug.title}</h3>
                    <p className="text-sm text-slate-600">{bug.description}</p>
                    <div className="flex items-center flex-wrap gap-3 pt-1">
                      <StatusBadge status={bug.status} />
                      <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(bug.created_at)}
                      </span>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    <button
                      type="button"
                      onClick={() => handleToggleComments(bug.id)}
                      className="p-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                      title="Comments"
                    >
                      <MessageSquare className="h-4 w-4" />
                    </button>
                    {resolvingId === bug.id ? (
                      <div className="w-full sm:w-auto flex gap-2 items-center">
                        <textarea
                          value={resolveNotes}
                          onChange={(e) => setResolveNotes(e.target.value)}
                          placeholder="Describe your fix..."
                          rows={2}
                          className="border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
                        />
                        <div className="flex gap-2">
                          <button
                            onClick={() => handleConfirmResolve(bug.id)}
                            disabled={resolvingLoading}
                            className="px-3 py-1.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
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
                    ) : (
                      <button
                        type="button"
                        onClick={() => handleStartResolve(bug.id)}
                        className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-50 text-blue-700 rounded-lg text-xs font-semibold hover:bg-blue-100 transition-colors border border-blue-100"
                      >
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Mark Resolved
                      </button>
                    )}
                  </div>
                </div>

                {expandedBugId === bug.id && (
                  <div className="mt-4 pl-4 border-l-2 border-slate-100 space-y-4">
                    <div className="space-y-3">
                      {(commentsMap[bug.id] || []).length === 0 ? (
                        <p className="text-xs text-slate-400 italic">No comments yet.</p>
                      ) : (
                        (commentsMap[bug.id] || []).map((c) => (
                          <div key={c.id} className="bg-slate-50 rounded-lg p-3">
                            <div className="flex justify-between items-start mb-1">
                              <span className="text-xs font-semibold text-slate-700">{c.user_name}</span>
                              <span className="text-[10px] text-slate-400">{new Date(c.created_at).toLocaleString()}</span>
                            </div>
                            <p className="text-sm text-slate-600">{c.comment_text}</p>
                          </div>
                        ))
                      )}
                    </div>
                    <div className="flex gap-2 pt-2">
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
            ))
          )}
        </div>
      </div>
    </div>
  );
}
