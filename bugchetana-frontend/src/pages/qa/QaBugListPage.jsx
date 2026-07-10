import React, { useState, useEffect, useMemo, useCallback } from "react";
import { useNavigate, useSearchParams } from "react-router-dom";
import { Clock, FolderPlus, ChevronRight, PlusSquare, ListChecks, ChevronDown, X } from "lucide-react";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import { getBugLists, getMySubmittedBugs } from "@/api/bugs";
import CreateBugListModal from "@/components/shared/CreateBugListModal";
import AddBugsToListModal from "@/components/shared/AddBugsToListModal";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";

export default function QaBugListPage() {
  const navigate = useNavigate();
  // Optional `?status=` filter from the QA Dashboard summary cards.
  // The card uses /qa/bug-list?status=closed|failed to deep-link into this
  // page with a status filter applied. Unrecognized values are ignored so
  // a stray query string never breaks the page.
  const [searchParams] = useSearchParams();
  const statusFilter = useMemo(() => {
    const raw = (searchParams.get("status") || "").toLowerCase();
    return ["open", "in_progress", "resolved", "closed", "failed", "resubmitted"].includes(raw)
      ? raw
      : null;
  }, [searchParams]);
  // `bugs` is the full project bug list (the pool the AddBugsToListModal can
  // pick from); `refetch` lets us refresh it after a successful add.
  const { projectId, bugs: projectBugs, refetch: refetchProjectBugs } = useDashboardSummary();
  const [bugLists, setBugLists] = useState([]);
  const [bugListsLoading, setBugListsLoading] = useState(false);
  const [bugListModalOpen, setBugListModalOpen] = useState(false);

  // Stage 3: "Recently reported, not yet in a list" panel.
  // We pull every bug the QA has reported in this project, then cross-reference
  // each list's bug_ids to surface the ones that are still uncategorized.
  const [myBugs, setMyBugs] = useState([]);
  const [myBugsLoading, setMyBugsLoading] = useState(false);

  // "Add to list" affordance. Tracks which bug is in the dropdown and which
  // list is currently selected, then opens the shared AddBugsToListModal
  // pre-selected with that single bug id.
  const [addPicker, setAddPicker] = useState({ bugId: null, listId: null });

  // The single bug we're about to add (drives AddBugsToListModal's pre-select).
  const addPickerBug = useMemo(
    () => (addPicker.bugId ? myBugs.find((b) => b.id === addPicker.bugId) : null),
    [addPicker.bugId, myBugs]
  );

  const initialSelectedIds = useMemo(
    () => (addPickerBug ? [addPickerBug.id] : []),
    [addPickerBug]
  );

  const reloadBugLists = useCallback(() => {
    if (!projectId) {
      setBugLists([]);
      return Promise.resolve();
    }
    setBugListsLoading(true);
    return getBugLists(projectId)
      .then(setBugLists)
      .catch(console.error)
      .finally(() => setBugListsLoading(false));
  }, [projectId]);

  const reloadMyBugs = useCallback(() => {
    if (!projectId) {
      setMyBugs([]);
      return Promise.resolve();
    }
    setMyBugsLoading(true);
    return getMySubmittedBugs(projectId)
      .then((data) => setMyBugs(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error(err);
        setMyBugs([]);
      })
      .finally(() => setMyBugsLoading(false));
  }, [projectId]);

  useEffect(() => {
    reloadBugLists();
    reloadMyBugs();
  }, [reloadBugLists, reloadMyBugs]);

  // Bugs I've reported that don't appear in any existing list. Order is
  // most-recently-updated first so the freshly reported bug surfaces on top.
  const uncategorizedBugs = useMemo(() => {
    const inAnyList = new Set();
    bugLists.forEach((bl) => {
      (bl.bug_ids || []).forEach((id) => inAnyList.add(id));
    });
    return myBugs
      .filter((b) => !inAnyList.has(b.id))
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at).getTime();
        const tb = new Date(b.updated_at || b.created_at).getTime();
        return tb - ta;
      });
  }, [myBugs, bugLists]);

  // When a ?status= filter is active, the existing "Recently reported" panel
  // reuses its bug-row UI to show every bug the QA has reported with that
  // status (not just the uncategorized subset). Sorted most-recent first.
  const statusFilteredBugs = useMemo(() => {
    if (!statusFilter) return null;
    return myBugs
      .filter((b) => b.status === statusFilter)
      .sort((a, b) => {
        const ta = new Date(a.updated_at || a.created_at).getTime();
        const tb = new Date(b.updated_at || b.created_at).getTime();
        return tb - ta;
      });
  }, [myBugs, statusFilter]);

  const handleAddSuccess = (_added) => {
    // Refresh lists, my-bugs, and the project bug pool so the row reflects
    // the new assignment immediately.
    reloadBugLists();
    reloadMyBugs();
    refetchProjectBugs();
    setAddPicker({ bugId: null, listId: null });
  };

  // The bug list the picker is targeting — its existing bug_ids become the
  // modal's exclusion list, so already-grouped bugs don't show as addable.
  const addPickerList = useMemo(
    () => (addPicker.listId ? bugLists.find((bl) => bl.id === addPicker.listId) : null),
    [addPicker.listId, bugLists]
  );

  // The bug list rendered in the existing "Recently reported" panel.
  // Defaults to uncategorized bugs; when ?status= is set, switches to the
  // status-filtered subset so the existing UI is reused without adding a
  // new section.
  const displayedBugs = statusFilter ? statusFilteredBugs : uncategorizedBugs;
  const isStatusFilterActive = Boolean(statusFilter);

  return (
    <div className="space-y-6">
      <CreateBugListModal
        open={bugListModalOpen}
        onClose={() => setBugListModalOpen(false)}
        projectId={projectId}
        onSuccess={() => {
          setBugListModalOpen(false);
          reloadBugLists();
        }}
      />

      <AddBugsToListModal
        open={Boolean(addPicker.listId && addPickerBug)}
        onClose={() => setAddPicker({ bugId: null, listId: null })}
        projectId={projectId}
        bugListId={addPicker.listId}
        bugs={projectBugs}
        existingBugIds={addPickerList?.bug_ids || []}
        initialSelectedIds={initialSelectedIds}
        onSuccess={handleAddSuccess}
      />

      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">
            {isStatusFilterActive ? "Bug Lists — filtered" : "Bug Lists"}
          </h1>
          <p className="text-slate-400 mt-1 text-sm">
            {isStatusFilterActive
              ? `Showing bugs you've reported with status "${statusFilter}".`
              : "All bug lists created for this project."}
          </p>
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

      {/* Stage 3: Recently reported, not yet in a list. When ?status= is set,
          the same panel is reused to show every bug the QA has reported with
          that status. The UI (row layout, badges, links) is unchanged — only
          the source list and the header text differ. */}
      {projectId && (
        <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
          <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold text-slate-800 flex items-center gap-2">
                <ListChecks className="h-4 w-4 text-blue-600" />
                {isStatusFilterActive
                  ? `Bugs with status "${statusFilter}"`
                  : "Recently reported, not yet in a list"}
              </h2>
              <p className="text-xs text-slate-400 mt-0.5">
                {isStatusFilterActive
                  ? "Bugs you've reported that match the selected status."
                  : "Bugs you reported that haven't been grouped into a list yet."}
              </p>
            </div>
            <div className="flex items-center gap-2">
              {isStatusFilterActive && (
                <button
                  type="button"
                  onClick={() => navigate("/qa/bug-list")}
                  className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 bg-slate-100 hover:bg-slate-200 border border-slate-200 px-2 py-0.5 rounded-full transition-colors"
                  aria-label="Clear status filter"
                >
                  <X className="h-3 w-3" />
                  Clear filter
                </button>
              )}
              {!isStatusFilterActive && uncategorizedBugs.length > 0 && bugLists.length > 0 && (
                <span className="text-[11px] font-semibold text-amber-700 bg-amber-50 border border-amber-200 px-2 py-0.5 rounded-full">
                  {uncategorizedBugs.length} uncategorized
                </span>
              )}
            </div>
          </div>

          {myBugsLoading ? (
            <div className="p-8 text-center text-slate-500 text-sm">Loading your reported bugs…</div>
          ) : displayedBugs.length === 0 ? (
            <div className="p-8 text-center">
              <p className="text-sm text-slate-500">
                {isStatusFilterActive
                  ? `No bugs you've reported are currently "${statusFilter}".`
                  : myBugs.length === 0
                  ? "You haven't reported any bugs in this project yet."
                  : "All bugs you've reported are already in a list. 🎉"}
              </p>
              {myBugs.length === 0 && !isStatusFilterActive && (
                <button
                  type="button"
                  onClick={() => navigate("/qa/submit-bug")}
                  className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
                >
                  <PlusSquare className="h-3.5 w-3.5" />
                  Report your first bug
                </button>
              )}
            </div>
          ) : (
            <div className="divide-y divide-slate-100">
              {displayedBugs.slice(0, 10).map((bug) => (
                <div
                  key={bug.id}
                  className="p-5 hover:bg-slate-50 transition-colors flex flex-col md:flex-row md:items-center justify-between gap-3"
                >
                  <button
                    type="button"
                    onClick={() => navigate(`/bugs/${bug.id}`)}
                    className="text-left space-y-1.5 min-w-0 flex-1"
                  >
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                        #{bug.id}
                      </span>
                      <h3 className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                        {bug.title}
                      </h3>
                    </div>
                    <div className="flex items-center flex-wrap gap-2">
                      <StatusBadge status={bug.status} />
                      <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Clock className="h-3 w-3" />
                        {timeAgo(bug.updated_at || bug.created_at)}
                      </span>
                    </div>
                  </button>

                  {/* Add-to-list affordance is hidden under the status filter:
                      the filter is a read view of a status outcome, not a
                      grouping task. */}
                  {!isStatusFilterActive && bugLists.length > 0 ? (
                    <div className="relative shrink-0">
                      <select
                        value=""
                        onChange={(e) => {
                          const v = e.target.value;
                          if (!v) return;
                          setAddPicker({ bugId: bug.id, listId: Number(v) });
                        }}
                        className="appearance-none pl-3 pr-9 py-2 border border-slate-200 rounded-xl text-xs font-semibold text-slate-700 bg-white hover:bg-slate-50 focus:outline-none focus:ring-2 focus:ring-blue-500 transition-colors cursor-pointer"
                        aria-label={`Add bug #${bug.id} to a list`}
                      >
                        <option value="">Add to list…</option>
                        {bugLists.map((bl) => (
                          <option key={bl.id} value={bl.id}>{bl.name}</option>
                        ))}
                      </select>
                      <ChevronDown className="h-3.5 w-3.5 text-slate-400 absolute right-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                    </div>
                  ) : !isStatusFilterActive ? (
                    <button
                      type="button"
                      onClick={() => setBugListModalOpen(true)}
                      className="inline-flex items-center gap-1.5 px-3 py-2 border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold hover:bg-slate-50 transition-colors shrink-0"
                    >
                      <FolderPlus className="h-3.5 w-3.5" />
                      Create a list first
                    </button>
                  ) : null}
                </div>
              ))}
              {displayedBugs.length > 10 && (
                <div className="p-4 text-center text-xs text-slate-400">
                  Showing the 10 most recent — use the dashboard for the full list.
                </div>
              )}
            </div>
          )}
        </div>
      )}

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100">
          <h2 className="text-base font-semibold text-slate-800">Created Bug Lists</h2>
        </div>

        {bugListsLoading ? (
          <div className="p-8 text-center text-slate-500">Loading bug lists...</div>
        ) : bugLists.length === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No bug lists for this project yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click <span className="font-semibold text-slate-600">Create Bug List</span> to start grouping bugs.
            </p>
            <button
              type="button"
              onClick={() => navigate("/qa/submit-bug")}
              className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-blue-600 hover:text-blue-700 transition-colors"
            >
              <PlusSquare className="h-3.5 w-3.5" />
              Or report a new bug first
            </button>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {bugLists.map((bl) => (
              <button
                key={bl.id}
                type="button"
                onClick={() => navigate(`/qa/bug-lists/${bl.id}`)}
                className="w-full text-left p-5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-3"
              >
                <div className="space-y-1 min-w-0">
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
                <ChevronRight className="h-4 w-4 text-slate-400 shrink-0" />
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
