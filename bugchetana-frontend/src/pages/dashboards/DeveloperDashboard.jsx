import React, { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosInstance";

import { useProject } from "@/context/ProjectContext";

export default function DeveloperDashboard() {
  const [summary, setSummary] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const navigate = useNavigate();

  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  useEffect(() => {
    const fetchData = async () => {
      if (!projectId) return;
      setLoading(true);
      setError(null);
      try {
        const [summaryRes, bugsRes] = await Promise.all([
          api.get(`/projects/${projectId}/dashboard/`),
          api.get(`/projects/${projectId}/bugs/`)
        ]);
        setSummary(summaryRes.data);
        setBugs(bugsRes.data);
      } catch (err) {
        setError("Failed to load dashboard data.");
        console.error(err);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [projectId]);

  const handleStatusChange = async (bugId, newStatus) => {
    try {
      await api.patch(`/bugs/${bugId}/`, { status: newStatus });
      setBugs(bugs.map(b => b.id === bugId ? { ...b, status: newStatus } : b));
    } catch (err) {
      alert("Failed to update status");
    }
  };

  if (loading) return <div className="p-8 text-center text-gray-500">Loading your dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  return (
    <div className="space-y-6">
      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Total Assigned</h3>
          <p className="text-3xl font-bold text-gray-900 mt-2">{summary?.total_bugs || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Open Bugs</h3>
          <p className="text-3xl font-bold text-blue-600 mt-2">{summary?.open_bugs || 0}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Resolved Bugs</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{summary?.resolved_bugs || 0}</p>
        </div>
      </div>

      {/* Bug List */}
      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-gray-200">
          <h2 className="text-lg font-semibold text-gray-800">Your Assigned Bugs</h2>
        </div>
        <div className="divide-y divide-gray-200">
          {bugs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No bugs assigned to you right now.</div>
          ) : (
            bugs.map(bug => (
              <div key={bug.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors group">
                <div
                  className="cursor-pointer flex-1"
                  onClick={() => navigate(`/bugs/${bug.id}`)}
                >
                  <h3 className="text-md font-medium text-gray-900 group-hover:text-blue-600 transition-colors">{bug.title}</h3>
                  <div className="flex items-center space-x-4 mt-1 text-sm text-gray-500">
                    <span className="capitalize">Severity: <span className="font-medium text-gray-700">{bug.severity}</span></span>
                    <span>Project ID: {bug.project}</span>
                  </div>
                </div>
                <div className="flex items-center space-x-4">
                  <select
                    value={bug.status}
                    onChange={(e) => handleStatusChange(bug.id, e.target.value)}
                    className="border border-gray-200 rounded-lg py-1.5 px-3 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <option value="open">Open</option>
                    <option value="resolved">Resolved</option>
                    {/* "closed" explicitly omitted as per requirements */}
                  </select>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}
