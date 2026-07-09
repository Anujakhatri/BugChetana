import React, { useState, useEffect } from "react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { getMySubmittedBugs } from "@/api/bugs";
import { StatusBadge } from "@/components/shared/DashboardBadges";

export default function DeveloperHistoryPage() {
  const { projectId } = useDashboardSummary();
  const [historyBugs, setHistoryBugs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setHistoryLoading(true);
    getMySubmittedBugs(projectId)
      .then(setHistoryBugs)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [projectId]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bug History</h1>
        <p className="text-slate-400 mt-1 text-sm">All bugs you have submitted.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
          <h2 className="text-base font-semibold text-slate-800">Submission Log</h2>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : historyBugs.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No bugs submitted yet.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyBugs.map((bug) => (
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
    </div>
  );
}
