import React, { useState, useEffect } from "react";
import { Clock, FolderPlus } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { getBugLists } from "@/api/bugs";
import CreateBugListModal from "@/components/shared/CreateBugListModal";

export default function QaBugListPage() {
  const { projectId } = useDashboardSummary();
  const [bugLists, setBugLists] = useState([]);
  const [bugListsLoading, setBugListsLoading] = useState(false);
  const [bugListModalOpen, setBugListModalOpen] = useState(false);

  useEffect(() => {
    if (projectId) {
      setBugListsLoading(true);
      getBugLists(projectId)
        .then(setBugLists)
        .catch(console.error)
        .finally(() => setBugListsLoading(false));
    }
  }, [projectId]);

  return (
    <div className="space-y-6">
      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setBugListModalOpen(false);
          if (projectId) {
            getBugLists(projectId).then(setBugLists).catch(console.error);
          }
        }}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Bug Lists</h1>
          <p className="text-slate-400 mt-1 text-sm">All bug lists created for this project.</p>
        </div>
        {projectId && (
          <button
            onClick={() => setBugListModalOpen(true)}
            className="inline-flex items-center gap-2 px-4 py-2.5 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
          >
            <FolderPlus className="h-4 w-4" />
            Create Bug List
          </button>
        )}
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Created Bug Lists</h2>
        </div>

        {bugListsLoading ? (
          <div className="p-8 text-center text-slate-500">Loading bug lists...</div>
        ) : bugLists.length === 0 ? (
          <div className="p-10 text-center text-slate-400 text-sm">No bug lists created yet for this project.</div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bugLists.map((bl) => (
              <div key={bl.id} className="p-5 hover:bg-slate-50 transition-colors">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div className="space-y-1">
                    <h3 className="text-sm font-semibold text-slate-900">{bl.name}</h3>
                    <div className="flex items-center flex-wrap gap-3">
                      <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                        {bl.bug_count} {bl.bug_count === 1 ? 'bug' : 'bugs'}
                      </span>
                      <span className="text-xs text-slate-400">
                        Created by {bl.created_by_name}
                      </span>
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {new Date(bl.created_at).toLocaleDateString()}
                      </span>
                    </div>
                  </div>
                  {bl.bug_ids && bl.bug_ids.length > 0 && (
                    <div className="text-xs text-slate-500">
                      Bug IDs: {bl.bug_ids.join(', ')}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
