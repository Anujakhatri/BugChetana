import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, X, ClipboardCheck, CheckCircle2 } from "lucide-react";
import { useProject } from "@/context/ProjectContext";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { getUsers } from "@/api/users";
import { getProjectMembers, addProjectMember } from "@/api/projects";
import { submitQaResult, assignBug } from "@/api/bugs";
import ProjectSelector from "@/components/shared/ProjectSelector";
import { BUG_STATUS, STATUS_STYLES } from "@/constants/status";

export default function QaDashboard() {
  const [activeTab, setActiveTab] = useState("pending");
  const [developers, setDevelopers] = useState([]);
  const [projectMembers, setProjectMembers] = useState([]);
  const [selectedDeveloperId, setSelectedDeveloperId] = useState("");
  const [failModal, setFailModal] = useState(null);
  const [failComment, setFailComment] = useState("");
  const [failError, setFailError] = useState(null);
  const [assignSelections, setAssignSelections] = useState({});
  const navigate = useNavigate();
  const { currentProject } = useProject();
  const { bugs, loading, error, refetch: fetchBugs } = useDashboardSummary();

  useEffect(() => {
    getUsers({ role: "Developer" })
      .then(setDevelopers)
      .catch(console.error);
  }, []);

  useEffect(() => {
    if (!currentProject?.id) {
      setProjectMembers([]);
      return;
    }
    getProjectMembers(currentProject.id)
      .then(setProjectMembers)
      .catch(console.error);
  }, [currentProject?.id]);

  const projectDevelopers = projectMembers.filter((m) => m.role === "Developer");

  const handleQaPass = async (bugId) => {
    try {
      await submitQaResult(bugId, { result: "pass" });
      fetchBugs();
    } catch (err) {
      alert(err.response?.data?.notes?.[0] || "Failed to mark bug as passed");
    }
  };

  const openFailModal = (bug) => {
    setFailModal(bug);
    setFailComment("");
    setFailError(null);
  };

  const handleQaFail = async () => {
    if (!failComment.trim()) {
      setFailError("A comment is required when marking a bug as failed.");
      return;
    }
    try {
      await submitQaResult(failModal.id, { result: "fail", notes: failComment.trim() });
      setFailModal(null);
      fetchBugs();
    } catch (err) {
      setFailError(
        err.response?.data?.notes?.[0] ||
        err.response?.data?.detail ||
        "Failed to submit QA review"
      );
    }
  };

  const handleAssignBug = async (bugId) => {
    const developerId = assignSelections[bugId];
    if (!developerId) return;
    try {
      await assignBug(bugId, Number(developerId));
      fetchBugs();
    } catch (err) {
      alert(err.response?.data?.assigned_to?.[0] || "Failed to assign bug");
    }
  };

  const handleAddDeveloperToProject = async () => {
    if (!currentProject?.id || !selectedDeveloperId) return;
    try {
      await addProjectMember(currentProject.id, selectedDeveloperId);
      const members = await getProjectMembers(currentProject.id);
      setProjectMembers(members);
      setSelectedDeveloperId("");
    } catch (err) {
      alert(err.response?.data?.error || "Failed to add developer to project");
    }
  };

  const pendingBugs = bugs.filter(
    (b) => b.status === BUG_STATUS.RESOLVED || b.status === BUG_STATUS.RESUBMITTED
  );
  const completedBugs = bugs.filter((b) => b.status === BUG_STATUS.CLOSED);
  const displayBugs = activeTab === "pending" ? pendingBugs : completedBugs;

  if (loading) return <div className="p-8 text-center text-slate-400">Loading QA dashboard...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ProjectSelector />
      </div>

      {/* Assign developers panel */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
            <Users className="h-4 w-4 text-white" />
          </div>
          <h2 className="text-base font-semibold text-slate-800">My Projects — Assign Developers</h2>
        </div>
        {currentProject ? (
          <div className="space-y-4">
            <p className="text-sm text-slate-500">
              Project: <span className="font-semibold text-slate-800">{currentProject.name}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedDeveloperId}
                onChange={(e) => setSelectedDeveloperId(e.target.value)}
                className="flex-1 border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
              >
                <option value="">Select a developer to add...</option>
                {developers
                  .filter((d) => !projectDevelopers.some((m) => m.user === d.id))
                  .map((d) => (
                    <option key={d.id} value={d.id}>
                      {d.name} ({d.email})
                    </option>
                  ))}
              </select>
              <button
                type="button"
                onClick={handleAddDeveloperToProject}
                className="px-4 py-2.5 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm shadow-blue-200 transition-colors"
              >
                Add to Project
              </button>
            </div>
            {projectDevelopers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {projectDevelopers.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs font-medium bg-slate-50 text-slate-600 px-3 py-1.5 rounded-full border border-slate-200"
                  >
                    {m.user_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-slate-400">No project assigned yet.</p>
        )}
      </div>

      {/* Stat cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-5">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Pending QA</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{pendingBugs.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-amber-400 to-amber-500 flex items-center justify-center shadow-md shrink-0">
            <ClipboardCheck className="h-5 w-5 text-white" />
          </div>
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm hover:shadow-md transition-shadow p-5 flex items-center justify-between">
          <div>
            <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Passed (Closed)</p>
            <p className="text-2xl font-bold text-slate-800 mt-2">{completedBugs.length}</p>
          </div>
          <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-emerald-600 flex items-center justify-center shadow-md shrink-0">
            <CheckCircle2 className="h-5 w-5 text-white" />
          </div>
        </div>
      </div>

      {/* Bug review list */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="border-b border-slate-100 flex px-2 pt-2">
          <button
            type="button"
            className={`flex-1 py-3.5 text-center text-sm font-semibold rounded-t-xl transition-colors ${
              activeTab === "pending"
                ? "text-blue-600 bg-blue-50"
                : "text-slate-400 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("pending")}
          >
            Awaiting QA
          </button>
          <button
            type="button"
            className={`flex-1 py-3.5 text-center text-sm font-semibold rounded-t-xl transition-colors ${
              activeTab === "completed"
                ? "text-blue-600 bg-blue-50"
                : "text-slate-400 hover:bg-slate-50"
            }`}
            onClick={() => setActiveTab("completed")}
          >
            Completed (Passed)
          </button>
        </div>

        <div className="divide-y divide-slate-100">
          {displayBugs.length === 0 ? (
            <div className="p-10 text-center text-slate-400 text-sm">No bugs in this category.</div>
          ) : (
            displayBugs.map((bug) => (
              <div key={bug.id} className="p-5 space-y-3 hover:bg-slate-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="cursor-pointer flex-1 min-w-0" onClick={() => navigate(`/bugs/${bug.id}`)}>
                    <h3 className="text-sm font-semibold text-slate-800 truncate">{bug.title}</h3>
                    <div className="flex items-center gap-2 mt-1.5 text-xs text-slate-400">
                      <span>ID: #{bug.id}</span>
                      <span
                        className={`text-[11px] font-semibold px-2.5 py-0.5 rounded-full border capitalize ${
                          STATUS_STYLES[bug.status] || STATUS_STYLES.open
                        }`}
                      >
                        {bug.status.replace("_", " ")}
                      </span>
                    </div>
                  </div>

                  {activeTab === "pending" && (
                    <div className="flex items-center gap-2 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleQaPass(bug.id)}
                        className="px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl hover:bg-emerald-100 text-xs font-semibold transition-colors"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => openFailModal(bug)}
                        className="px-3 py-1.5 bg-rose-50 text-rose-700 border border-rose-200 rounded-xl hover:bg-rose-100 text-xs font-semibold transition-colors"
                      >
                        Fail
                      </button>
                    </div>
                  )}
                </div>

                {activeTab === "pending" && (
                  <div className="flex flex-col sm:flex-row gap-2">
                    <select
                      value={assignSelections[bug.id] || bug.assigned_to || ""}
                      onChange={(e) =>
                        setAssignSelections({ ...assignSelections, [bug.id]: e.target.value })
                      }
                      className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm bg-white"
                    >
                      <option value="">Assign developer...</option>
                      {developers.map((d) => (
                        <option key={d.id} value={d.id}>
                          {d.name}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleAssignBug(bug.id)}
                      className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                    >
                      Assign
                    </button>
                  </div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Fail review modal */}
      {failModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
          <div className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-slate-800">Mark as Failed</h3>
                <p className="text-sm text-slate-400 mt-1">{failModal.title}</p>
              </div>
              <button type="button" onClick={() => setFailModal(null)} className="text-slate-400 hover:text-slate-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-slate-700 mb-1">
                QA Comment <span className="text-rose-500">*</span>
              </label>
              <textarea
                value={failComment}
                onChange={(e) => {
                  setFailComment(e.target.value);
                  setFailError(null);
                }}
                rows={4}
                placeholder="Explain why this bug failed QA review..."
                className="w-full border border-slate-200 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
              {failError && <p className="text-xs text-rose-600 mt-1">{failError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setFailModal(null)}
                className="px-4 py-2 border border-slate-200 rounded-xl text-sm font-medium text-slate-600 hover:bg-slate-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQaFail}
                className="px-4 py-2 bg-rose-600 text-white rounded-xl text-sm font-medium hover:bg-rose-700 shadow-sm shadow-rose-200"
              >
                Submit Failed Review
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}