import React, { useState, useEffect } from "react";
import {
  FolderPlus,
  Rocket,
  RotateCcw,
  Loader2,
} from "lucide-react";
import api from "@/api/axiosInstance";
import { projectUrl } from "@/api/projects";
import { getUsers } from "@/api/users";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { useAuth } from "@/context/AuthContext";
import InputField from "@/components/shared/InputField";
import ProjectSelector from "@/components/shared/ProjectSelector";
import ProjectManagement from "@/pages/ProjectManagement";

// Merged dashboard for the Release Manager role.
//
// Per the spec this route is "the merged Dashboard+Projects page", so it
// shows the severity/breakdown overview AND project creation + Dev/QA
// assignment (delegated to ProjectManagement via its existing `embedded`
// prop) AND releases.
export default function RmDashboardPage() {
  const { user } = useAuth();
  const { summary, bugs, loading, error, refetch, projectId } = useDashboardSummary();

  const [releases, setReleases] = useState([]);
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [newReleaseTitle, setNewReleaseTitle] = useState("");
  const [selectedBugId, setSelectedBugId] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [qaUsers, setQaUsers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

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
      .catch(console.error)
      .finally(() => setTeamLoading(false));
  }, []);

  const fetchReleases = async () => {
    if (!projectId) return;
    try {
      const releasesRes = await api.get(projectUrl(projectId, "releases/"));
      setReleases(releasesRes.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!projectId || !newReleaseVersion.trim() || !newReleaseTitle.trim()) return;
    try {
      await api.post(projectUrl(projectId, "releases/"), {
        version: newReleaseVersion.trim(),
        title: newReleaseTitle.trim(),
      });
      setNewReleaseVersion("");
      setNewReleaseTitle("");
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
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
          Welcome back, {user?.name?.split(" ")[0]} 👋
        </h1>
        <p className="text-slate-400 mt-1 text-sm">
          Project overview, project management, and releases — all in one place.
        </p>
      </div>

      <ProjectSelector />

      {/* Project overview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Project overview</h2>
        {loading ? (
          <p className="text-sm text-slate-400 text-center py-4">Loading...</p>
        ) : error ? (
          <p className="text-sm text-red-500 text-center py-4">{error}</p>
        ) : (
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
        )}
      </div>

      {/* Projects (create, rename, members) — uses the existing
          ProjectManagement component in embedded mode. */}
      <ProjectManagement embedded />

      {/* Team (developers + QA) */}
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

      {/* Releases */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-base font-semibold text-slate-800">Releases</h2>
            <form onSubmit={handleCreateRelease} className="flex flex-col sm:flex-row gap-2 w-full sm:w-auto">
              <div className="w-full sm:w-48">
                <InputField
                  placeholder="Version (e.g. v1.0.0)"
                  value={newReleaseVersion}
                  onChange={(e) => setNewReleaseVersion(e.target.value)}
                  required
                />
              </div>
              <div className="w-full sm:w-72">
                <InputField
                  placeholder="Release title"
                  value={newReleaseTitle}
                  onChange={(e) => setNewReleaseTitle(e.target.value)}
                  required
                />
              </div>
              <button
                type="submit"
                className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-semibold transition-colors disabled:opacity-60"
                disabled={!newReleaseVersion.trim() || !newReleaseTitle.trim()}
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
  );
}
