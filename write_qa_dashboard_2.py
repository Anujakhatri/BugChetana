import re

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/pages/dashboards/QaDashboard.jsx", "r") as f:
    content = f.read()

# Replace the prompt-based handleFail and handleReassign
# with a state-based approach using QaActionModal.

new_content = """import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  Users,
  History,
  CheckCircle2,
  XCircle,
  RotateCcw,
  MessageSquare,
  Clock,
  CheckCircle,
  AlertTriangle,
  FolderPlus
} from "lucide-react";
import api from "@/api/axiosInstance";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/context/AuthContext";
import { assignBug, submitQaResult } from "@/api/bugs";
import CreateBugListModal from "@/components/shared/CreateBugListModal";
import QaActionModal from "@/components/shared/QaActionModal";

const SEVERITY_STYLES = {
  critical: "bg-rose-50 text-rose-700 border-rose-200",
  high: "bg-orange-50 text-orange-700 border-orange-200",
  medium: "bg-amber-50 text-amber-700 border-amber-200",
  low: "bg-emerald-50 text-emerald-700 border-emerald-200",
};

const STATUS_STYLES = {
  open: "bg-blue-50 text-blue-700 border-blue-200",
  in_progress: "bg-amber-50 text-amber-700 border-amber-200",
  resolved: "bg-purple-50 text-purple-700 border-purple-200",
  closed: "bg-emerald-50 text-emerald-700 border-emerald-200",
  failed: "bg-rose-50 text-rose-700 border-rose-200",
  resubmitted: "bg-indigo-50 text-indigo-700 border-indigo-200",
};

function SeverityBadge({ severity }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${SEVERITY_STYLES[severity] || SEVERITY_STYLES.medium}`}>
      {severity}
    </span>
  );
}

function StatusBadge({ status }) {
  return (
    <span className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${STATUS_STYLES[status] || STATUS_STYLES.open}`}>
      {status.replace("_", " ")}
    </span>
  );
}

function timeAgo(iso) {
  const diffMs = Date.now() - new Date(iso).getTime();
  const hrs = Math.floor(diffMs / 3600000);
  if (hrs < 1) return "just now";
  if (hrs < 24) return `${hrs}h ago`;
  const days = Math.floor(hrs / 24);
  return `${days}d ago`;
}

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "developers", label: "Developers", icon: Users },
  { key: "history", label: "History", icon: History },
];

export default function QaDashboard() {
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState("dashboard");

  const { summary, bugs, loading, error.txt, refetch, projectId } = useDashboardSummary();

  const [historyData, setHistoryData] = useState([]);
  const [historyLoading, setHistoryLoading] = useState(false);
  const [bugListModalOpen, setBugListModalOpen] = useState(false);
  
  // QA Action Modal State
  const [actionModal, setActionModal] = useState({ open: false, type: null, bugId: null });

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    }
  }, [activeTab]);

  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/qa-results/mine/");
      setHistoryData(res.data);
    } catch (err) {
      console.error.txt(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const pendingQaBugs = bugs.filter((b) => ["resolved", "resubmitted"].includes(b.status));

  const handlePass = async (bugId) => {
    try {
      await submitQaResult(bugId, { result: "pass", notes: "" });
      refetch();
    } catch (err) {
      alert("Failed to mark pass");
    }
  };

  const handleActionSubmit = async (notes) => {
    const { type, bugId } = actionModal;
    if (type === 'fail') {
      await submitQaResult(bugId, { result: "fail", notes });
    } else if (type === 'reassign') {
      const bug = bugs.find((b) => b.id === bugId);
      if (!bug?.assigned_to) {
        alert("No developer is currently assigned to this bug.");
        setActionModal({ open: false, type: null, bugId: null });
        return;
      }
      await assignBug(bugId, { assigned_to: bug.assigned_to, record_reassign: true, notes });
    }
    setActionModal({ open: false, type: null, bugId: null });
    refetch();
  };

  const handleCreateBugListSuccess = () => {
    setBugListModalOpen(false);
    refetch(); 
  };

  return (
    <DashboardShell navItems={NAV_ITEMS} activeTab={activeTab} onTabChange={setActiveTab}>
      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={handleCreateBugListSuccess}
      />
      <QaActionModal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, type: null, bugId: null })}
        actionType={actionModal.type}
        onSubmit={handleActionSubmit}
      />

      {loading && <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>}
      {error.txt && <div className="p-8 text-center text-red-500">{error.txt}</div>}

      {!loading && !error.txt && activeTab === "dashboard" && (
        <div className="space-y-6">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
                Welcome back, {user?.name?.split(" ")[0]} 👋
              </h1>
              <p className="text-slate-400 mt-1 text-sm">You have {pendingQaBugs.length} bugs awaiting review.</p>
            </div>
            {projectId && (
              <button
                onClick={() => setBugListModalOpen(true)}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
              >
                <FolderPlus className="h-4 w-4" />
                Create Bug List
              </button>
            )}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-5">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pending Review</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">{pendingQaBugs.length}</p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-500 to-amber-600 flex items-center justify-center shadow-md">
                <AlertTriangle className="h-5 w-5 text-white" />
              </div>
            </div>
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-5 flex items-center justify-between">
              <div>
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Approved</p>
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
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Failed</p>
                <p className="text-2xl font-bold text-slate-800 mt-2">
                  {summary?.status_breakdown?.failed || 0}
                </p>
              </div>
              <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-rose-500 to-rose-600 flex items-center justify-center shadow-md">
                <RotateCcw className="h-5 w-5 text-white" />
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error.txt && activeTab === "developers" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">QA Queue</h1>
            <p className="text-slate-400 mt-1 text-sm">Review resolved bugs submitted by developers.</p>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
            <div className="px-6 py-5 border-b border-slate-100">
              <h2 className="text-base font-semibold text-slate-800">Pending QA Review</h2>
            </div>
            <div className="divide-y divide-slate-100">
              {pendingQaBugs.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">No bugs currently pending QA review. 🎉</div>
              ) : (
                pendingQaBugs.map((bug) => (
                  <div key={bug.id} className="p-5 hover:bg-slate-50 transition-colors">
                    <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                      <div className="space-y-3 flex-1 min-w-0">
                        <div>
                          <div className="flex items-center gap-2 mb-1">
                            <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">#{bug.id}</span>
                            <h3 className="text-sm font-semibold text-slate-900">{bug.title}</h3>
                          </div>
                          <p className="text-sm text-slate-600">{bug.description}</p>
                        </div>
                        
                        <div className="flex items-center flex-wrap gap-3 pt-1">
                          <StatusBadge status={bug.status} />
                          <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                          {bug.assigned_to && (
                            <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md flex items-center gap-1.5">
                              <Users className="h-3 w-3" />
                              Dev: {bug.assigned_to_name || "Assigned"}
                            </span>
                          )}
                          <span className="text-xs text-slate-400 flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {timeAgo(bug.updated_at || bug.created_at)}
                          </span>
                        </div>
                      </div>

                      <div className="flex flex-wrap items-center gap-2 shrink-0">
                        <button
                          onClick={() => handlePass(bug.id)}
                          className="flex items-center gap-1.5 px-3 py-2 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-sm font-semibold hover:bg-emerald-100 transition-colors"
                        >
                          <CheckCircle2 className="h-4 w-4" />
                          Pass
                        </button>
                        <button
                          onClick={() => setActionModal({ open: true, type: 'fail', bugId: bug.id })}
                          className="flex items-center gap-1.5 px-3 py-2 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl text-sm font-semibold hover:bg-rose-100 transition-colors"
                        >
                          <XCircle className="h-4 w-4" />
                          Fail
                        </button>
                        <button
                          onClick={() => setActionModal({ open: true, type: 'reassign', bugId: bug.id })}
                          className="flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-600 rounded-xl text-sm font-semibold hover:bg-slate-50 transition-colors"
                        >
                          <RotateCcw className="h-4 w-4" />
                          Reassign
                        </button>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !error.txt && activeTab === "history" && (
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
      )}
    </DashboardShell>
  );
}
"""

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/pages/dashboards/QaDashboard.jsx", "w") as f:
    f.write(new_content)

