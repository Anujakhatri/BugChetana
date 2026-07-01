import React, { useState, useEffect } from "react";
import api from "@/api/axiosInstance";
import InputField from "@/components/shared/InputField";

import { useProject } from "@/context/ProjectContext";

export default function ReleaseManagerDashboard() {
  const [summary, setSummary] = useState(null);
  const [releases, setReleases] = useState([]);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [newReleaseVersion, setNewReleaseVersion] = useState("");
  const [selectedBugId, setSelectedBugId] = useState("");

  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  useEffect(() => {
    if (projectId) {
      fetchDashboardData();
    }
  }, [projectId]);

  const fetchDashboardData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, releasesRes, bugsRes] = await Promise.all([
        api.get(`/projects/${projectId}/dashboard/`),
        api.get(`/projects/${projectId}/releases/`),
        api.get(`/projects/${projectId}/bugs/`)
      ]);
      setSummary(summaryRes.data);
      setReleases(releasesRes.data);
      setBugs(bugsRes.data);
    } catch (err) {
      setError("Failed to load Release Manager dashboard.");
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRelease = async (e) => {
    e.preventDefault();
    if (!newReleaseVersion) return;
    try {
      await api.post(`/projects/${projectId}/releases/`, { version: newReleaseVersion });
      setNewReleaseVersion("");
      fetchDashboardData();
    } catch (err) {
      alert("Failed to create release");
    }
  };

  const handleAddBugToRelease = async (releaseId, bugId) => {
    if (!bugId) return;
    try {
      await api.post(`/releases/${releaseId}/add-bug/`, { bug_id: bugId });
      setSelectedBugId("");
      fetchDashboardData();
    } catch (err) {
      alert("Failed to add bug to release");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading Release Management data...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-8">
      {/* Overview */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6">
        <h2 className="text-lg font-semibold text-gray-800 mb-4">Project Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
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
        </div>
      </div>

      {/* Releases Section */}
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
            releases.map(release => (
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
                    {bugs.filter(b => b.status === "closed").map(bug => (
                      <option key={bug.id} value={bug.id}>#{bug.id} - {bug.title}</option>
                    ))}
                  </select>
                  <button
                    onClick={() => handleAddBugToRelease(release.id, selectedBugId)}
                    className="px-4 py-2 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-50 text-sm font-medium transition-colors"
                  >
                    Add to Release
                  </button>
                </div>

                {release.bugs && release.bugs.length > 0 && (
                  <div className="bg-gray-50 rounded-md p-3 space-y-2">
                    {release.bugs.map(bug => (
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
