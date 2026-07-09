import React, { useState, useEffect } from "react";
import api from "@/api/axiosInstance";

export default function QaHistoryPage() {
  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    setHistoryLoading(true);
    api.get("/qa-results/mine/")
      .then((res) => setHistoryData(res.data))
      .catch(console.error)
      .finally(() => setHistoryLoading(false));
  }, []);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">QA History</h1>
        <p className="text-slate-400 mt-1 text-sm">Your past testing activity.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Activity Log</h2>
        </div>

        {historyLoading ? (
          <div className="p-8 text-center text-slate-500">Loading history...</div>
        ) : historyData.length === 0 ? (
          <div className="p-8 text-center text-slate-500">No QA activity found.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {historyData.map((record) => (
              <div key={record.id} className="p-5 flex flex-col sm:flex-row sm:items-start justify-between gap-4 hover:bg-slate-50 transition-colors">
                <div className="space-y-2">
                  <h3 className="text-sm font-semibold text-slate-800">
                    {record.bug?.title || `Bug #${record.bug?.id}`}
                  </h3>
                  {record.notes && (
                    <p className="text-sm text-slate-600 bg-white border border-slate-200 p-3 rounded-lg shadow-sm">
                      <span className="font-semibold text-slate-800 mr-2">Notes:</span>
                      {record.notes}
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-3 shrink-0">
                  <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                    record.result === "pass" ? "bg-emerald-50 text-emerald-700 border-emerald-200" :
                    record.result === "fail" ? "bg-rose-50 text-rose-700 border-rose-200" :
                    "bg-indigo-50 text-indigo-700 border-indigo-200"
                  }`}>
                    {record.result}
                  </span>
                  <span className="text-xs text-slate-400">
                    {new Date(record.tested_at).toLocaleString()}
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
