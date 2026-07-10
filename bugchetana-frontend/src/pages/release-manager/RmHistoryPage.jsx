import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Rocket,
  RotateCcw,
  Activity,
} from "lucide-react";
import api from "@/api/axiosInstance";
import { getMySubmittedBugs } from "@/api/bugs";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { StatusBadge } from "@/components/shared/DashboardBadges";

export default function RmHistoryPage() {
  const { projectId } = useDashboardSummary();
  const [historyData, setHistoryData] = useState({
    total_projects_created: 0,
    total_projects_released: 0,
    total_bugs_reassigned: 0,
    activity: [],
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  // Submission log: bugs this RM user has submitted. (RMs can submit bugs via
  // /release-manager/submit-bug; the existing /bugs/mine/ endpoint scopes by
  // created_by=self, so it works for any role that has reported bugs.)
  const [submissionBugs, setSubmissionBugs] = useState([]);
  const [submissionLoading, setSubmissionLoading] = useState(false);

  useEffect(() => {
    setHistoryLoading(true);
    api.get("/release-manager/history/")
      .then((res) => setHistoryData(res.data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  useEffect(() => {
    setSubmissionLoading(true);
    getMySubmittedBugs(projectId)
      .then(setSubmissionBugs)
      .catch(console.error)
      .finally(() => setSubmissionLoading(false));
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">History</h1>
        <p className="text-slate-400 mt-1 text-sm">
          Complete view — tracking projects, releases, and reassigned bugs.
        </p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total projects created</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{historyData.total_projects_created}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center shadow-md">
            <FolderPlus className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total releases created</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{historyData.total_projects_released}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md">
            <Rocket className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total bugs reassigned</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{historyData.total_bugs_reassigned}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
            <RotateCcw className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Submission Log — bugs this RM user has submitted. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Submission Log</h2>
        </div>

        {submissionLoading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : submissionBugs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bugs submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {submissionBugs.map((bug) => (
              <div key={bug.id} className="p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div>
                  <h3 className="text-sm font-semibold text-slate-800">{bug.title}</h3>
                  <p className="text-sm text-slate-600 mt-1 truncate max-w-xl">{bug.description}</p>
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <StatusBadge status={bug.status} />
                  <span className="text-xs text-slate-400">
                    {new Date(bug.created_at).toLocaleDateString()}
                  </span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Recent Activity — RM's own project / release / reassignment events
          (existing /release-manager/history/ aggregate). */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
        </div>
        {historyLoading ? (
          <p className="p-6 text-sm text-slate-400 text-center">Loading history...</p>
        ) : historyData.activity.length === 0 ? (
          <p className="p-6 text-sm text-slate-400 text-center">No activity found.</p>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyData.activity.map((item, idx) => (
              <div key={idx} className="px-6 py-4 flex items-center justify-between">
                <div>
                  <span className="font-medium text-slate-800">{item.action} {item.bug_title ? `- ${item.bug_title}` : ''}</span>
                  <p className="text-xs text-slate-400 mt-0.5">{item.project}</p>
                </div>
                <span className="text-sm text-slate-400">{new Date(item.date).toLocaleString()}</span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
