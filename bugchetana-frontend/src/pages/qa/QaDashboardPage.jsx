import React, { useState } from "react";
import {
  Users,
  Clock,
  CheckCircle,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  RotateCcw,
  FolderPlus,
} from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import ProjectDevelopersManager from '@/components/qa/ProjectDevelopersManager';
import { useAuth } from "@/context/AuthContext";
import { assignBug, submitQaResult } from "@/api/bugs";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";
import CreateBugListModal from "@/components/shared/CreateBugListModal";
import QaActionModal from "@/components/shared/QaActionModal";

export default function QaDashboardPage() {
  const { user } = useAuth();
  const { summary, bugs, loading, error, refetch, projectId, setProjectId, projects } = useDashboardSummary();

  const [bugListModalOpen, setBugListModalOpen] = useState(false);
  const [actionModal, setActionModal] = useState({ open: false, type: null, bugId: null });

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
      try {
        await assignBug(bugId, bug.assigned_to, { record_reassign: true, notes });
      } catch (err) {
        console.error(err);
        alert('Failed to reassign bug.');
        setActionModal({ open: false, type: null, bugId: null });
        return;
      }
    }
    setActionModal({ open: false, type: null, bugId: null });
    refetch();
  };

  if (loading) return <div className="p-8 text-center text-slate-500">Loading your dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setBugListModalOpen(false);
          refetch();
        }}
      />
      <QaActionModal
        open={actionModal.open}
        onClose={() => setActionModal({ open: false, type: null, bugId: null })}
        actionType={actionModal.type}
        onSubmit={handleActionSubmit}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            Welcome back, {user?.name?.split(" ")[0]} 👋
          </h1>
          <p className="text-slate-400 mt-1 text-sm">You have {pendingQaBugs.length} bugs awaiting review.</p>
        </div>
        <div className="w-full lg:w-64">
          <select
            value={projectId || ""}
            onChange={(e) => setProjectId(e.target.value)}
            className="w-full appearance-none border border-slate-200 rounded-xl px-4 py-2.5 text-sm font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 shadow-sm"
          >
            <option value="">Select Project</option>
            {projects && projects.map((p) => (
              <option key={p.id} value={p.id}>{p.name}</option>
            ))}
          </select>
        </div>
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

      {/* Project developers manager */}
      <div>
        {projectId ? (
          <ProjectDevelopersManager projectId={projectId} />
        ) : (
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-sm text-slate-500">Select a project to manage developers for that project.</div>
        )}
      </div>
    </div>
  );
}
