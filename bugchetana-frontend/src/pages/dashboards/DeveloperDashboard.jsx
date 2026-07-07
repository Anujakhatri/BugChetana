import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import {Bug, CheckCircle2, Clock, AlertTriangle, X } from "lucide-react";
import api from "@/api/axiosInstance";
import { resubmitBug } from "@/api/bugs";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { BUG_STATUS, BUG_STATUS_LABELS, STATUS_STYLES } from "@/constants/status";

export default function DeveloperDashboard() {
  const navigate = useNavigate();
  const { summary, bugs, setBugs, loading, error, refetch } = useDashboardSummary();
  const [resubmitBugId, setResubmitBugId] = useState(null);
  const [resubmitForm, setResubmitForm] = useState({ title: "", description: "" });
  const [resubmitError, setResubmitError] = useState(null);
  const [resubmitLoading, setResubmitLoading] = useState(false);

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await api.patch(`/bugs/${bugId}/`, { status: newStatus });
      setBugs(bugs.map((b) => (b.id === bugId ? { ...b, status: newStatus } : b)));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  const openResubmit = (bug) => {
    setResubmitBugId(bug.id);
    setResubmitForm({ title: bug.title, description: bug.description });
    setResubmitError(null);
  };

  const handleResubmit = async () => {
    if (!resubmitForm.title.trim() || !resubmitForm.description.trim()) {
      setResubmitError("Title and description are required to resubmit.");
      return;
    }
    setResubmitLoading(true);
    setResubmitError(null);
    try {
      await resubmitBug(resubmitBugId, resubmitForm);
      setResubmitBugId(null);
      refetch();
    } catch (err) {
      setResubmitError(err.response?.data?.detail || "Failed to resubmit bug.");
    } finally {
      setResubmitLoading(false);
    }
  };

  const openBugs = bugs.filter(
    (b) => b.status !== BUG_STATUS.CLOSED
  );
  const failedBugs = bugs.filter((b) => b.status === BUG_STATUS.FAILED);

  if (loading) return <div className="p-8 text-center text-slate-400">Loading your dashboard...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">{error}</div>;

  const statCards = [
    {
      label: "Total Assigned",
      value: summary?.total_bugs || 0,
      icon: Bug,
      iconBg: "from-slate-700 to-slate-900",
    },
    {
      label: "Open Bugs",
      value: summary?.open_bugs || 0,
      icon: Clock,
      iconBg: "from-blue-500 to-blue-600",
    },
    {
      label: "Resolved Bugs",
      value: summary?.resolved_bugs || 0,
      icon: CheckCircle2,
      iconBg: "from-emerald-500 to-emerald-600",
    },
    {
      label: "Failed by QA",
      value: failedBugs.length,
      icon: AlertTriangle,
      iconBg: "from-rose-500 to-rose-600",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-5">
        {statCards.map(({ label, value, icon: Icon, iconBg }) => (
          <div
            key={label}
            className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between"
          >
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</p>
              <p className="text-2xl font-bold text-slate-800 mt-2">{value}</p>
            </div>
            <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${iconBg} flex items-center justify-center shadow-md shrink-0`}>
              <Icon className="h-5 w-5 text-white" />
            </div>
          </div>
        ))}
      </div>

      {/* Failed bugs — needs attention */}
      {failedBugs.length > 0 && (
        <div className="bg-white rounded-2xl border border-rose-100 shadow-sm overflow-hidden">
          <div className="px-6 py-4 bg-gradient-to-r from-rose-50 to-white border-b border-rose-100 flex items-center gap-2">
            <AlertTriangle className="h-4 w-4 text-rose-500" />
            <h2 className="text-sm font-semibold text-rose-700 tracking-wide uppercase">Action Required</h2>
          </div>
          <div className="divide-y divide-slate-100">
            {failedBugs.map((bug) => (
              <div key={bug.id} className="p-5 space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h3 className="font-semibold text-slate-800">{bug.title}</h3>
                    <p className="text-xs text-slate-400 mt-1">Bug #{bug.id}</p>
                  </div>
                  <button
                    type="button"
                    onClick={() => openResubmit(bug)}
                    className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 shadow-sm shadow-blue-200 transition-colors"
                  >
                    Resubmit
                  </button>
                </div>
                {bug.qa_comment && (
                  <div className="bg-rose-50 border border-rose-100 rounded-xl p-3 text-sm text-rose-800">
                    <span className="font-semibold">QA Comment: </span>
                    {bug.qa_comment}
                  </div>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Open bugs list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Open Bugs</h2>
        </div>
        <div className="divide-y divide-slate-100">
          {openBugs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No open bugs right now.</div>
          ) : (
            openBugs.map((bug) => (
              <div
                key={bug.id}
                className="p-5 flex items-center justify-between hover:bg-slate-50 transition-colors group"
              >
                <div
                  className="cursor-pointer flex-1 min-w-0"
                  onClick={() => navigate(`/bugs/${bug.id}`)}
                >
                  <h3 className="text-sm font-semibold text-slate-800 group-hover:text-blue-600 transition-colors truncate">
                    {bug.title}
                  </h3>
                  <div className="flex items-center flex-wrap gap-3 mt-1.5 text-xs text-slate-400">
                    <span className="capitalize">
                      Severity: <span className="font-medium text-slate-600">{bug.severity}</span>
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                        STATUS_STYLES[bug.status] || STATUS_STYLES.open
                      }`}
                    >
                      {BUG_STATUS_LABELS[bug.status] || bug.status}
                    </span>
                  </div>
                  {bug.qa_comment && bug.status === BUG_STATUS.FAILED && (
                    <p className="text-xs text-rose-500 mt-2 line-clamp-2">QA: {bug.qa_comment}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4 shrink-0 ml-4">
                  {bug.status === BUG_STATUS.FAILED ? (
                    <button
                      type="button"
                      onClick={() => openResubmit(bug)}
                      className="px-3 py-1.5 bg-amber-50 text-amber-700 border border-amber-200 rounded-xl text-xs font-semibold hover:bg-amber-100 transition-colors"
                    >
                      Resubmit
                    </button>
                  ) : (
                    <select
                      value={bug.status}
                      onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                      className="border border-slate-200 rounded-xl py-1.5 px-3 text-xs font-medium text-slate-600 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                      onClick={(e) => e.stopPropagation()}
                    >
                      <option value={BUG_STATUS.OPEN}>Open</option>
                      <option value={BUG_STATUS.IN_PROGRESS}>In Progress</option>
                      <option value={BUG_STATUS.RESOLVED}>Resolved</option>
                    </select>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Resubmit modal */}
      {resubmitBugId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-lg p-6 space-y-4">
            <div className="flex items-start justify-between">
              <h3 className="text-lg font-semibold text-slate-800">Resubmit Bug</h3>
              <button
                type="button"
                onClick={() => setResubmitBugId(null)}
                className="text-slate-400 hover:text-slate-600"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <input
              value={resubmitForm.title}
              onChange={(e) => setResubmitForm({ ...resubmitForm, title: e.target.value })}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Title"
            />
            <textarea
              value={resubmitForm.description}
              onChange={(e) => setResubmitForm({ ...resubmitForm, description: e.target.value })}
              rows={5}
              className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="Updated description"
            />
            {resubmitError && <p className="text-sm text-rose-600">{resubmitError}</p>}
            <div className="flex gap-2 justify-end pt-1">
              <button
                type="button"
                onClick={() => setResubmitBugId(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResubmit}
                disabled={resubmitLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-medium hover:bg-blue-700 disabled:opacity-60 shadow-sm shadow-blue-200"
              >
                {resubmitLoading ? "Submitting..." : "Resubmit for QA"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
