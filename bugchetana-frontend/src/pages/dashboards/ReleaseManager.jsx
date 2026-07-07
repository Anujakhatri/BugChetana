import React, { useState, useEffect } from "react";
import api from "@/api/axiosInstance";
import { projectUrl } from "@/api/projects.js";
import InputField from "@/components/shared/InputField";
import { getUsers } from "@/api/users";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import ProjectSelector from "@/components/shared/ProjectSelector";
import { Loader2, Rocket, Code2, ShieldCheck, PackagePlus } from "lucide-react";

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

  if (loading) return <div className="p-8 text-center text-slate-400">Loading Release Management data...</div>;
  if (error) return <div className="p-8 text-center text-rose-500">{error}</div>;

  const severityCards = [
    { label: "Critical", value: summary?.severity_breakdown?.critical || 0, color: "text-rose-600" },
    { label: "High", value: summary?.severity_breakdown?.high || 0, color: "text-orange-500" },
    { label: "Medium", value: summary?.severity_breakdown?.medium || 0, color: "text-amber-500" },
    { label: "Low", value: summary?.severity_breakdown?.low || 0, color: "text-emerald-500" },
    { label: "Failed", value: summary?.failed_bugs || 0, color: "text-rose-600" },
  ];

  return (
    <div className="space-y-6">
      <ProjectSelector />

      {/* Hero / intro banner in the spirit of the Soft UI "Build by developers" panel */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
        <div className="lg:col-span-2 bg-gradient-to-br from-slate-800 to-slate-900 rounded-2xl p-6 flex items-center gap-6 overflow-hidden relative">
          <div className="relative z-10">
            <p className="text-slate-300 text-sm">Release Management</p>
            <h2 className="text-white text-xl font-bold mt-1">Ship with confidence</h2>
            <p className="text-slate-400 text-sm mt-2 max-w-md">
              Track your team, monitor severity, and bundle closed bugs into versioned releases.
            </p>
          </div>
          <Rocket className="h-24 w-24 text-blue-400/30 absolute right-6 top-1/2 -translate-y-1/2" />
        </div>
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 flex flex-col justify-center">
          <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Total Releases</p>
          <p className="text-3xl font-bold text-slate-800 mt-2">{releases.length}</p>
        </div>
      </div>

      {/* Team panels */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center">
              <Code2 className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Developers</h2>
          </div>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          ) : developers.length === 0 ? (
            <p className="text-sm text-slate-400">No developers registered.</p>
          ) : (
            <div className="space-y-2">
              {developers.map((dev) => (
                <div key={dev.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{dev.name}</p>
                    <p className="text-xs text-slate-400">{dev.email}</p>
                  </div>
                  <span className="text-xs font-semibold text-blue-700 bg-blue-50 px-2.5 py-1 rounded-full">
                    {dev.assigned_bug_count ?? 0} bugs
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
          <div className="flex items-center gap-2 mb-4">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-purple-500 to-purple-600 flex items-center justify-center">
              <ShieldCheck className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">QA Engineers</h2>
          </div>
          {teamLoading ? (
            <Loader2 className="h-5 w-5 animate-spin text-slate-300" />
          ) : qaUsers.length === 0 ? (
            <p className="text-sm text-slate-400">No QA users registered.</p>
          ) : (
            <div className="space-y-2">
              {qaUsers.map((qa) => (
                <div key={qa.id} className="flex justify-between items-center p-3 bg-slate-50 rounded-xl">
                  <div>
                    <p className="text-sm font-semibold text-slate-800">{qa.name}</p>
                    <p className="text-xs text-slate-400">{qa.email}</p>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Severity overview */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <h2 className="text-base font-semibold text-slate-800 mb-4">Project Overview</h2>
        <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
          {severityCards.map(({ label, value, color }) => (
            <div key={label} className="p-4 bg-slate-50 rounded-xl">
              <div className="text-xs font-medium text-slate-400 uppercase tracking-wide">{label}</div>
              <div className={`text-2xl font-bold mt-1 ${color}`}>{value}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Releases */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <div className="flex flex-col md:flex-row md:items-center justify-between mb-6 gap-4">
          <div className="flex items-center gap-2">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-teal-500 to-teal-600 flex items-center justify-center">
              <PackagePlus className="h-4 w-4 text-white" />
            </div>
            <h2 className="text-base font-semibold text-slate-800">Releases</h2>
          </div>
          <form onSubmit={handleCreateRelease} className="flex gap-2">
            <div className="w-48">
              <InputField
                placeholder="Version (e.g. v1.0.0)"
                value={newReleaseVersion}
                onChange={(e) => setNewReleaseVersion(e.target.value)}
                required
              />
            </div>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-xl hover:bg-blue-700 text-sm font-medium shadow-sm shadow-blue-200 transition-colors">
              Create Release
            </button>
          </form>
        </div>

        <div className="space-y-4">
          {releases.length === 0 ? (
            <p className="text-slate-400 text-sm text-center py-8">No releases found for this project.</p>
          ) : (
            releases.map((release) => (
              <div key={release.id} className="border border-slate-100 rounded-2xl p-5 hover:shadow-sm transition-shadow">
                <div className="flex items-center justify-between mb-4">
                  <h3 className="font-bold text-lg text-slate-800">{release.version}</h3>
                  <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-3 py-1 rounded-full">
                    {release.bugs?.length || 0} bugs attached
                  </span>
                </div>

                <div className="flex gap-2 mb-4">
                  <select
                    value={selectedBugId}
                    onChange={(e) => setSelectedBugId(e.target.value)}
                    className="border border-slate-200 rounded-xl px-3 py-2 text-sm flex-1 focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white"
                  >
                    <option value="">Select a bug to add...</option>
                    {bugs.filter((b) => b.status === "closed").map((bug) => (
                      <option key={bug.id} value={bug.id}>#{bug.id} - {bug.title}</option>
                    ))}
                  </select>
                  <button
                    type="button"
                    onClick={() => handleAddBugToRelease(release.id, selectedBugId)}
                    className="px-4 py-2 border border-slate-200 text-slate-600 rounded-xl hover:bg-slate-50 text-sm font-medium transition-colors"
                  >
                    Add to Release
                  </button>
                </div>

                {release.bugs && release.bugs.length > 0 && (
                  <div className="bg-slate-50 rounded-xl p-3 space-y-2">
                    {release.bugs.map((bug) => (
                      <div key={bug.id} className="text-sm text-slate-600 bg-white p-2.5 rounded-lg border border-slate-100">
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