import React, { useState } from "react";
import { useNavigate } from "react-router-dom";
import api from "@/api/axiosInstance";

import { useDashboardSummary } from "@/hooks/useDashboardSummary";

export default function QaDashboard() {
  const [activeTab, setActiveTab] = useState("pending");
  const navigate = useNavigate();
  const { bugs, loading, error, refetch: fetchBugs } = useDashboardSummary();



  const handleQaAction = async (bugId, result) => {
    try {
      await api.post(`/bugs/${bugId}/qa-result/`, { result });
      fetchBugs(); // Refresh to update lists
    } catch (err) {
      alert(`Failed to mark bug as ${result}`);
    }
  };

  const handleReassign = async (bugId, newAssigneeId) => {
    try {
      await api.patch(`/bugs/${bugId}/`, { assigned_to: newAssigneeId });
      fetchBugs();
    } catch (err) {
      alert("Failed to reassign bug");
    }
  };

  const pendingBugs = bugs.filter(b => b.status === "resolved");

  // Note: A failed QA result returns the bug to "open" status, so it cannot be separately tracked here.
  const completedBugs = bugs.filter(b => b.status === "closed");

  if (loading) return <div className="p-8 text-center text-gray-500">Loading QA dashboard...</div>;
  if (error) return <div className="p-8 text-center text-red-500">{error}</div>;

  const displayBugs = activeTab === "pending" ? pendingBugs : completedBugs;

  return (
    <div className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow">
          <h3 className="text-sm font-medium text-gray-500">Pending QA</h3>
          <p className="text-3xl font-bold text-yellow-600 mt-2">{pendingBugs.length}</p>
        </div>
        <div className="bg-white rounded-xl border border-gray-200 shadow-sm p-6 hover:shadow-md transition-shadow relative">
          <h3 className="text-sm font-medium text-gray-500">Passed (Closed)</h3>
          <p className="text-3xl font-bold text-green-600 mt-2">{completedBugs.length}</p>
          <div className="absolute top-6 right-6 text-xs text-gray-400 max-w-[150px] text-right">
            Note: QA failures revert to 'Open' status. See individual bug history for failed records.
          </div>
        </div>
      </div>

      <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
        <div className="border-b border-gray-200 flex">
          <button
            className={`flex-1 py-4 text-center font-medium ${activeTab === 'pending' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab("pending")}
          >
            Awaiting QA
          </button>
          <button
            className={`flex-1 py-4 text-center font-medium ${activeTab === 'completed' ? 'text-blue-600 border-b-2 border-blue-600' : 'text-gray-500 hover:bg-gray-50'}`}
            onClick={() => setActiveTab("completed")}
          >
            Completed (Passed)
          </button>
        </div>

        <div className="divide-y divide-gray-200">
          {displayBugs.length === 0 ? (
            <div className="p-6 text-center text-gray-500">No bugs in this category.</div>
          ) : (
            displayBugs.map(bug => (
              <div key={bug.id} className="p-6 flex items-center justify-between hover:bg-gray-50 transition-colors">
                <div className="cursor-pointer" onClick={() => navigate(`/bugs/${bug.id}`)}>
                  <h3 className="text-md font-medium text-gray-900">{bug.title}</h3>
                  <div className="text-sm text-gray-500 mt-1">ID: #{bug.id} • Assigned To: User {bug.assigned_to || "Unassigned"}</div>
                </div>

                {activeTab === "pending" && (
                  <div className="flex items-center space-x-3">
                    <button
                      onClick={() => handleQaAction(bug.id, 'pass')}
                      className="px-3 py-1.5 bg-green-100 text-green-700 rounded-lg hover:bg-green-200 text-sm font-medium transition-colors"
                    >
                      Pass
                    </button>
                    <button
                      onClick={() => handleQaAction(bug.id, 'fail')}
                      className="px-3 py-1.5 bg-red-100 text-red-700 rounded-lg hover:bg-red-200 text-sm font-medium transition-colors"
                    >
                      Fail
                    </button>
                    <button
                      onClick={() => handleReassign(bug.id, prompt("Enter new Assignee ID:", bug.assigned_to))}
                      className="px-3 py-1.5 border border-gray-200 text-gray-700 rounded-lg hover:bg-gray-100 text-sm font-medium transition-colors"
                    >
                      Reassign
                    </button>
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
