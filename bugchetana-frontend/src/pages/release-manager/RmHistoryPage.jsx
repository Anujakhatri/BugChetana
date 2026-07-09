import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Rocket,
  RotateCcw,
} from "lucide-react";
import api from "@/api/axiosInstance";

export default function RmHistoryPage() {
  const [historyData, setHistoryData] = useState({
    total_projects_created: 0,
    total_projects_released: 0,
    total_bugs_reassigned: 0,
    activity: [],
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setHistoryLoading(true);
    api.get("/release-manager/history/")
      .then((res) => setHistoryData(res.data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

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

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Activity Log</h2>
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
