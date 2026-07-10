import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import api from "@/api/axiosInstance";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import { getMySubmittedBugs } from "@/api/bugs";
import { StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";

export default function DeveloperHistoryPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { projectId } = useDashboardSummary();

  // Submission Log source: GET /api/bugs/mine/ — bugs the developer created.
  const [historyBugs, setHistoryBugs] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Recent Activity source: GET /api/dashboard/developer/ — same feed that
  // previously lived on /developer/dashboard before migration. Capped
  // server-side at 15 items (RECENT_ACTIVITY_LIMIT in bugs/views.py).
  const [recentActivity, setRecentActivity] = useState([]);
  const [recentBugs, setRecentBugs] = useState([]);
  const [activityLoading, setActivityLoading] = useState(true);

  useEffect(() => {
    setHistoryLoading(true);
    getMySubmittedBugs(projectId)
      .then(setHistoryBugs)
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, [projectId]);

  useEffect(() => {
    let alive = true;
    setActivityLoading(true);
    // Recent Activity cross-references bug titles. /api/bugs/ is NOT a
    // valid endpoint (bugs are project-scoped), so we reuse
    // /api/bugs/mine/ via getMySubmittedBugs() when no project is active
    // and /api/projects/<id>/bugs/ when one is. Both already exist in
    // bugs/urls.py — no backend change needed.
    const bugsPromise = projectId
      ? api.get(`/projects/${projectId}/bugs/`)
      : getMySubmittedBugs().then((data) => ({ data }));

    Promise.all([api.get("/dashboard/developer/"), bugsPromise])
      .then(([dashRes, bugsRes]) => {
        if (!alive) return;
        setRecentActivity(dashRes.data?.recent_activity || []);
        setRecentBugs(bugsRes.data || []);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setRecentActivity([]);
      })
      .finally(() => {
        if (alive) setActivityLoading(false);
      });
    return () => {
      alive = false;
    };
  }, [user?.id, projectId]);

  // Build a quick bug-by-id map for activity cross-referencing. Restricted to
  // the developer's own submitted bugs since recent_activity is scoped to
  // assigned_to=user.
  const bugById = new Map();
  historyBugs.forEach((b) => bugById.set(b.id, b));
  recentBugs.forEach((b) => bugById.set(b.id, b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bug History</h1>
        <p className="text-slate-400 mt-1 text-sm">All bugs you have submitted.</p>
      </div>

      {/* Submission Log — existing. */}
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

      {/* Recent Activity — migrated from /developer/dashboard. */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Recent Activity</h2>
        </div>

        {activityLoading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : recentActivity.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No recent activity yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Status changes and QA results on your assigned bugs will appear here.
            </p>
          </div>
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
