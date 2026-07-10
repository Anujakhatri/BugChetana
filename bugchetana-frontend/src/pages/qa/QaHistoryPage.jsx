import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Activity } from "lucide-react";
import api from "@/api/axiosInstance";
import { timeAgo } from "@/components/shared/DashboardBadges";

export default function QaHistoryPage() {
  const navigate = useNavigate();
  // Source: GET /api/dashboard/qa/ — same feed that lived on the QA Dashboard
  // "Recent Activity" widget. Capped server-side at 15 items
  // (RECENT_ACTIVITY_LIMIT in bugs/views.py); not bumped in this pass.
  const [recentActivity, setRecentActivity] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    Promise.all([
      api.get("/dashboard/qa/"),
      api.get("/bugs/").catch(() => ({ data: [] })),
    ])
      .then(([dashRes, bugsRes]) => {
        if (!alive) return;
        setRecentActivity(dashRes.data?.recent_activity || []);
        setBugs(bugsRes.data || []);
      })
      .catch((err) => {
        console.error(err);
        if (!alive) return;
        setRecentActivity([]);
      })
      .finally(() => {
        if (alive) setLoading(false);
      });
    return () => {
      alive = false;
    };
  }, []);

  // Build a quick bug-by-id map for activity cross-referencing.
  const bugById = new Map();
  bugs.forEach((b) => bugById.set(b.id, b));

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">QA History</h1>
        <p className="text-slate-400 mt-1 text-sm">Your past testing activity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center gap-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <h2 className="text-base font-semibold text-slate-800">Activity Log</h2>
        </div>

        {loading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : recentActivity.length === 0 ? (
          <div className="p-8 text-center">
            <p className="text-sm text-slate-500">No QA activity found.</p>
            <p className="text-xs text-slate-400 mt-1">
              Pass/fail decisions and status changes will appear here as they happen.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {recentActivity.map((item) => {
              const bug = bugById.get(item.bug_id);
              const bugLabel = bug ? `#${bug.id} · ${bug.title}` : `Bug #${item.bug_id}`;
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
