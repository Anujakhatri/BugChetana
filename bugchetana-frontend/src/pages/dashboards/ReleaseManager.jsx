import React, { useState, useEffect } from "react";
import api from "@/api/axiosInstance";
import { projectUrl } from "@/api/projects.js";
import InputField from "@/components/shared/InputField";
import { getUsers } from "@/api/users";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import ProjectSelector from "@/components/shared/ProjectSelector";
import { Loader2 } from "lucide-react";

export default function ReleaseManagerDashboard() {
  const [releases, setReleases] = useState([]);
  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [selectedBugId, setSelectedBugId] = useState("");
  const [developers, setDevelopers] = useState([]);
  const [qaUsers, setQaUsers] = useState([]);
  const [teamLoading, setTeamLoading] = useState(true);

  const { summary, bugs, loading, error, refetch, projectId } = useDashboardSummary();

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

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Release Management data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      <ProjectSelector />

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">Developers</h2>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : developers.length === 0 ? (
            <p className="text-sm text-gray-500">No developers registered.</p>
          ) : (
            <div className="space-y-2">
              {developers.map((dev) => (
                <div key={dev.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{dev.name}</p>
                    <p className="text-xs text-gray-500">{dev.email}</p>
                  </div>
                  <span className="text-xs text-blue-700 bg-blue-50 px-2 py-1 rounded-full">
                    {dev.assigned_bug_count ?? 0} bugs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
          <h2 className="text-lg font-semibold text-gray-800 mb-4">QA Engineers</h2>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-gray-400" />
          ) : qaUsers.length === 0 ? (
            <p className="text-sm text-gray-500">No QA users registered.</p>
          ) : (
            <div className="space-y-2">
              {qaUsers.map((qa) => (
                <div key={qa.id} className="flex justify-between items-center p-3 bg-gray-50 rounded-lg">
                  <div>
                    <p className="text-sm font-medium text-gray-900">{qa.name}</p>
                    <p className="text-xs text-gray-500">{qa.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Project Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Critical</div>
            <div className="text-2xl font-bold text-red-600">{summary?.severity_breakdown?.critical || 0}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">High</div>
            <div className="text-2xl font-bold text-orange-500">{summary?.severity_breakdown?.high || 0}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Medium</div>
            <div className="text-2xl font-bold text-yellow-500">{summary?.severity_breakdown?.medium || 0}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Low</div>
            <div className="text-2xl font-bold text-green-500">{summary?.severity_breakdown?.low || 0}</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-sm text-gray-500">Failed</div>
            <div className="text-2xl font-bold text-red-600">{summary?.failed_bugs || 0}</div>
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <h2 className="text-lg font-semibold text-gray-800">Releases</h2>
          <form onSubmit={handleCreateRelease} className="flex gap-2">
            <div className="w-48">
              <InputField
                placeholder="Version (e.g. v1.0.0)"
                value={newReleaseVersion}
                onChange={(e) => setNewReleaseVersion(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 text-sm font-medium transition-colors">
              Create Release
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {releases.length === 0 ? (
            <p className="text-gray-500 text-center py-4">No releases found for this project.</p>
          ) : (
            releases.map((release) => (
              <div key={release.id} className="border border-gray-200 rounded-lg p-4">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-semibold text-lg text-gray-900">{release.version}</h3>
                  <span className="text-sm text-gray-500">{release.bugs?.length || 0} bugs attached</span>
                </div>

                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedBugId}
                    onChange={(e) => setSelectedBugId(e.target.value)}
                    className="border border-gray-200 rounded-lg px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">Select a bug to add...</option>
                    {bugs.filter((b) => b.status === "closed").map((bug) => (
                      <option key={bug.id} value={bug.id}>#{bug.id} - {bug.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddBugToRelease(release.id, selectedBugId)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    Add to Release
                  </button>
                </div>

                {release.bugs && release.bugs.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-3 space-y-2">
                    {release.bugs.map((bug) => (
                      <div key={bug.id} className="text-sm text-gray-700 bg-white p-2 rounded border border-gray-200">
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
