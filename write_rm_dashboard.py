import re

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/pages/dashboards/ReleaseManager.jsx", "r") as f:
    content = f.read()

new_content = """import React, { useState, useEffect } from "react";
import {
  FolderKanban,
  History,
  FolderPlus,
  Rocket,
  RotateCcw,
  Loader2,
  LayoutDashboard,
  Users,
  PlusSquare
} from "lucide-react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosInstance";
import { projectUrl } from "@/api/projects.js";
import InputField from "@/components/shared/InputField";
import { getUsers } from "@/api/users";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import ProjectSelector from "@/components/shared/ProjectSelector";
import DashboardShell from "@/components/layout/DashboardShell";
import { useAuth } from "@/context/AuthContext";

const NAV_ITEMS = [
  { key: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { key: "projects", label: "Projects", icon: FolderKanban },
  { key: "users", label: "Users", icon: Users },
  { key: "submit-bug", label: "Submit Bug", icon: PlusSquare },
  { key: "history", label: "History", icon: History },
];

export default function ReleaseManagerDashboard() {
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const [activeTab, setActiveTab] = useState("dashboard");

  const { summary, bugs, loading, error.txt, refetch, projectId } = useDashboardSummary();
  const [releases, setReleases] = useState([]);
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [selectedBugId, setSelectedBugId] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [qaUsers, setQaUsers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  // History state
  const [historyData, setHistoryData] = useState({
    total_projects_created: 0,
    total_projects_released: 0,
    total_bugs_reassigned: 0,
    activity: []
  });
  const [historyLoading, setHistoryLoading] = useState(false);

  useEffect(() => {
    if (activeTab === "history") {
      fetchHistory();
    } else if (activeTab === "submit-bug") {
      navigate("/submit-bug");
    }
  }, [activeTab, navigate]);

  useEffect(() => {
    if (projectId) {
      fetchReleases();
    }
  }, [projectId]);

  useEffect(() => {
    Promise.all([
      getUsers({ role: "Developer" }),
      getUsers({ role: "QA" }),
    ])
      .then(([devs, qas]) => {
        setDevelopers(devs);
        setQaUsers(qas);
      })
      .catch(console.error.txt)
      .finally(() => setTeamLoading(false));
  }, []);

  const fetchReleases = async () => {
    if (!projectId) return;
    try {
      const releasesRes = await api.get(projectUrl(projectId, "releases/"));
      setReleases(releasesRes.data);
    } catch (err) {
      console.error.txt(err);
    }
  };
  
  const fetchHistory = async () => {
    setHistoryLoading(true);
    try {
      const res = await api.get("/release-manager/history/");
      setHistoryData(res.data);
    } catch (err) {
      console.error.txt(err);
    } finally {
      setHistoryLoading(false);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!projectId || !newReleaseVersion) return;
    try {
      await api.post(projectUrl(projectId, "releases/"), { version: newReleaseVersion });
      setNewReleaseVersion("");
      fetchReleases();
    } catch (err) {
      alert("Failed to create release");
    }
  };

  const handleAddBugToRelease = async (releaseId, bugId) => {
    if (!bugId) return;
    try {
      await api.post(`/releases/${releaseId}/add-bug/`, { bug_id: bugId });
      setSelectedBugId("");
      fetchReleases();
    } catch (err) {
      alert("Failed to add bug to release");
    }
  };

  return (
    <DashboardShell navItems={NAV_ITEMS} activeTab={activeTab} onTabChange={setActiveTab}>
      {loading && (
        <div className="p-8 text-center text-slate-400 text-sm">Loading Release Management data...</div>
      )}
      {error.txt && (
        <div className="p-8 text-center text-red-500 text-sm">{error.txt}</div>
      )}

      {!loading && !error.txt && activeTab === "dashboard" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
              Welcome back, {user?.name?.split(" ")[0]} 👋
            </h1>
          </div>

          <ProjectSelector />

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <h2 className="text-base font-semibold text-slate-800 mb-4">Project overview</h2>
            <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Critical</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{summary?.severity_breakdown?.critical || 0}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-400 uppercase tracking-wide">High</div>
                <div className="text-2xl font-bold text-orange-500 mt-1">{summary?.severity_breakdown?.high || 0}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Medium</div>
                <div className="text-2xl font-bold text-yellow-500 mt-1">{summary?.severity_breakdown?.medium || 0}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Low</div>
                <div className="text-2xl font-bold text-green-500 mt-1">{summary?.severity_breakdown?.low || 0}</div>
              </div>
              <div className="p-4 bg-slate-50 rounded-xl">
                <div className="text-xs text-slate-400 uppercase tracking-wide">Failed</div>
                <div className="text-2xl font-bold text-red-600 mt-1">{summary?.failed_bugs || 0}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {!loading && !error.txt && activeTab === "projects" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Projects</h1>
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">Developers</h2>
              {teamLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : developers.length === 0 ? (
                <p className="text-sm text-slate-400">No developers registered.</p>
              ) : (
                <div className="space-y-2">
                  {developers.map((dev) => (
                    <div key={dev.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{dev.name}</p>
                        <p className="text-xs text-slate-400">{dev.email}</p>
                      </div>
                      <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                        {dev.assigned_bug_count ?? 0} bugs
                      </span>
                    </div>
                  ))}
                </div>
              )}
            </div>

            <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
              <h2 className="text-base font-semibold text-slate-800 mb-4">QA engineers</h2>
              {teamLoading ? (
                <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
              ) : qaUsers.length === 0 ? (
                <p className="text-sm text-slate-400">No QA users registered.</p>
              ) : (
                <div className="space-y-2">
                  {qaUsers.map((qa) => (
                    <div key={qa.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                      <div>
                        <p className="text-sm font-medium text-slate-800">{qa.name}</p>
                        <p className="text-xs text-slate-400">{qa.email}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
              <h2 className="text-base font-semibold text-slate-800">Releases</h2>
              <form onSubmit={handleCreateRelease} className="flex gap-2">
                <div className="w-48">
                  <InputField
                    placeholder="Version (e.g. v1.0.0)"
                    value={newReleaseVersion}
                    onChange={(e) => setNewReleaseVersion(e.target.value)}
                    required
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-colors"
                >
                  Create release
                </button>
              </form>
            </div>

            <div className="space-y-4">
              {releases.length === 0 ? (
                <p className="text-slate-400 text-center py-4 text-sm">No releases found for this project.</p>
              ) : (
                releases.map((release) => (
                  <div key={release.id} className="border border-slate-100 rounded-xl p-4">
                    <div className="flex items-center justify-between mb-4">
                      <h3 className="font-semibold text-slate-900">{release.version}</h3>
                      <span className="text-sm text-slate-400">{release.bugs?.length || 0} bugs attached</span>
                    </div>

                    <div className="flex gap-2 mb-4">
                      <select
                        value={selectedBugId}
                        onChange={(e) => setSelectedBugId(e.target.value)}
                        className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-400"
                      >
                        <option value="">Select a bug to add...</option>
                        {bugs.filter((b) => b.status === "closed").map((bug) => (
                          <option key={bug.id} value={bug.id}>#{bug.id} - {bug.title}</option>
                        ))}
                      </select>
                      <button
                        type="button"
                        onClick={() => handleAddBugToRelease(release.id, selectedBugId)}
                        className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                      >
                        Add to release
                      </button>
                    </div>

                    {release.bugs && release.bugs.length > 0 && (
                      <div className="bg-slate-50 rounded-lg p-3 space-y-2">
                        {release.bugs.map((bug) => (
                          <div key={bug.id} className="text-sm text-slate-700 bg-white p-2 rounded-lg border border-slate-100">
                            #{bug.id} - {bug.title}
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      )}

      {!loading && !error.txt && activeTab === "users" && (
        <div className="space-y-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Users</h1>
            <p className="text-slate-400 mt-1 text-sm">Manage system users.</p>
          </div>
          <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 text-center text-slate-500">
            User management UI goes here.
          </div>
        </div>
      )}

      {!loading && !error.txt && activeTab === "history" && (
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
      )}
    </DashboardShell>
  );
}
"""

with open("/Users/anujakhatri/Desktop/capstone/BugChetana/bugchetana-frontend/src/pages/dashboards/ReleaseManager.jsx", "w") as f:
    f.write(new_content)

