import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Assigned</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_bugs || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Bugs</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{summary?.open_bugs || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Resolved Bugs</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary?.resolved_bugs || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Failed by QA</h3>
          <p className="text-3xl font-bold text-red-600 mt-2">{failedBugs.length}</p>
        </div>
      </div>

      {failedBugs.length > 0 && (
        <div className="bg-red-50 border border-red-200 rounded-xl p-6 space-y-3">
          <h2 className="text-lg font-semibold text-red-800">Failed Bugs — Action Required</h2>
          {failedBugs.map((bug) => (
            <div key={bug.id} className="bg-white rounded-lg border border-red-100 p-4 space-y-2">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <h3 className="font-medium text-gray-900">{bug.title}</h3>
                  <p className="text-sm text-gray-500 mt-1">Bug #{bug.id}</p>
                </div>
                <button
                  type="button"
                  onClick={() => openResubmit(bug)}
                  className="px-3 py-1.5 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700"
                >
                  Resubmit
                </button>
              </div>
              {bug.qa_comment && (
                <div className="bg-red-50 border border-red-100 rounded-lg p-3 text-sm text-red-900">
                  <span className="font-medium">QA Comment: </span>
                  {bug.qa_comment}
                </div>
              )}
            </div>
          ))}
        </div>
      )}

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Open Bugs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {openBugs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No open bugs right now.</div>
          ) : (
            openBugs.map((bug) => (
              <div
                key={bug.id}
                className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group"
              >
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => navigate(`/bugs/${bug.id}`)}
                >
                  <h3 className="text-md font-medium text-gray-900 group-hover:text-blue-600 transition-colors">
                    {bug.title}
                  </h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="capitalize">
                      Severity: <span className="font-medium text-gray-700">{bug.severity}</span>
                    </span>
                    <span
                      className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
                        STATUS_STYLES[bug.status] || STATUS_STYLES.open
                      }`}
                    >
                      {BUG_STATUS_LABELS[bug.status] || bug.status}
                    </span>
                  </div>
                  {bug.qa_comment && bug.status === BUG_STATUS.FAILED && (
                    <p className="text-xs text-red-600 mt-2 line-clamp-2">QA: {bug.qa_comment}</p>
                  )}
                </div>
                <div className="flex items-center space-x-4">
                  {bug.status === BUG_STATUS.FAILED ? (
                    <button
                      type="button"
                      onClick={() => openResubmit(bug)}
                      className="px-3 py-1.5 bg-amber-100 text-amber-800 rounded-lg text-sm font-medium hover:bg-amber-200"
                    >
                      Resubmit
                    </button>
                  ) : (
                    <select
                      value={bug.status}
                      onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                      className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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

      {resubmitBugId && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-lg p-6 space-y-4">
            <h3 className="text-lg font-semibold text-gray-900">Resubmit Bug</h3>
            <input
              value={resubmitForm.title}
              onChange={(e) => setResubmitForm({ ...resubmitForm, title: e.target.value })}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Title"
            />
            <textarea
              value={resubmitForm.description}
              onChange={(e) => setResubmitForm({ ...resubmitForm, description: e.target.value })}
              rows={5}
              className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm"
              placeholder="Updated description"
            />
            {resubmitError && <p className="text-sm text-red-600">{resubmitError}</p>}
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setResubmitBugId(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleResubmit}
                disabled={resubmitLoading}
                className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm font-medium hover:bg-blue-700 disabled:opacity-60"
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
