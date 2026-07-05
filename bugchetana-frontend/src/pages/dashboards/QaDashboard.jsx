import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { Loader2, Users, X } from "lucide-react";
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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading QA dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <ProjectSelector />
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex items-center gap-2 mb-4">
          <Users className="h-5 w-5 text-blue-600" />
          <h2 className="text-lg font-semibold text-gray-800">My Projects — Assign Developers</h2>
        </div>
        {currentProject ? (
          <div className="space-y-4">
            <p className="text-sm text-gray-600">
              Project: <span className="font-medium text-gray-900">{currentProject.name}</span>
            </p>
            <div className="flex flex-col sm:flex-row gap-2">
              <select
                value={selectedDeveloperId}
                onChange={(e) => setSelectedDeveloperId(e.target.value)}
                className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium"
              >
                Add to Project
              </button>
            </div>
            {projectDevelopers.length > 0 && (
              <div className="flex flex-wrap gap-2">
                {projectDevelopers.map((m) => (
                  <span
                    key={m.id}
                    className="text-xs bg-slate-100 text-slate-700 px-3 py-1 rounded-full border border-slate-200"
                  >
                    {m.user_name}
                  </span>
                ))}
              </div>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-500">No project assigned yet.</p>
        )}
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending QA</h3>
          <p className="text-3xl font-bold text-amber-600 mt-2">{pendingBugs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Passed (Closed)</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{completedBugs.length}</p>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            type="button"
            className={`flex-1 py-4 text-center font-medium ${activeTab === "pending" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => setActiveTab("pending")}
          >
            Awaiting QA
          </button>
          <button
            type="button"
            className={`flex-1 py-4 text-center font-medium ${activeTab === "completed" ? "text-blue-600 border-b-2 border-blue-600" : "text-gray-500 hover:bg-gray-50"}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed (Passed)
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {displayBugs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No bugs in this category.</div>
          ) : (
            displayBugs.map((bug) => (
              <div key={bug.id} className="p-6 space-y-3 hover:bg-gray-50 transition-colors">
                <div className="flex items-start justify-between gap-4">
                  <div className="cursor-pointer flex-1" onClick={() => navigate(`/bugs/${bug.id}`)}>
                    <h3 className="text-md font-medium text-gray-900">{bug.title}</h3>
                    <div className="flex items-center gap-2 mt-1 text-sm text-gray-500">
                      <span>ID: #{bug.id}</span>
                      <span
                        className={`text-xs font-semibold px-2 py-0.5 rounded-full border capitalize ${
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
                        className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium"
                      >
                        Pass
                      </button>
                      <button
                        type="button"
                        onClick={() => openFailModal(bug)}
                        className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium"
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
                      className="flex-1 border border-gray-200 rounded-lg px-3 py-2 text-sm"
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
                      className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium"
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

      {failModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="bg-white rounded-xl border border-gray-200 shadow-lg w-full max-w-md p-6 space-y-4">
            <div className="flex items-start justify-between">
              <div>
                <h3 className="text-lg font-semibold text-gray-900">Mark as Failed</h3>
                <p className="text-sm text-gray-500 mt-1">{failModal.title}</p>
              </div>
              <button type="button" onClick={() => setFailModal(null)} className="text-gray-400 hover:text-gray-600">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">
                QA Comment <span className="text-red-500">*</span>
              </label>
              <textarea
                value={failComment}
                onChange={(e) => {
                  setFailComment(e.target.value);
                  setFailError(null);
                }}
                rows={4}
                placeholder="Explain why this bug failed QA review..."
                className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm focus:ring-2 focus:ring-blue-500"
              />
              {failError && <p className="text-xs text-red-600 mt-1">{failError}</p>}
            </div>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setFailModal(null)}
                className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleQaFail}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm font-medium hover:bg-red-700"
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
