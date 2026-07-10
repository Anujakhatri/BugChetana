import React, { useEffect, useMemo, useState } from "react";
import { X, Loader2, Search, Filter, ListChecks } from "lucide-react";
import { SeverityBadge, StatusBadge } from "@/components/shared/DashboardBadges";
import { addBugsToList } from "@/api/bugs";

const SEVERITY_FILTERS = [
  { value: "all", label: "All severities" },
  { value: "critical", label: "Critical" },
  { value: "high", label: "High" },
  { value: "medium", label: "Medium" },
  { value: "low", label: "Low" },
];

const STATUS_FILTERS = [
  { value: "all", label: "All statuses" },
  { value: "open", label: "Open" },
  { value: "in_progress", label: "In progress" },
  { value: "resolved", label: "Resolved" },
  { value: "failed", label: "Failed" },
  { value: "resubmitted", label: "Resubmitted" },
  { value: "closed", label: "Closed" },
];

// AddBugsToListModal
// ---------------------------------------------------------------------------
// Multi-select picker for adding existing project bugs to a BugList.
// - Searches by title (case-insensitive substring).
// - Filters by severity and status.
// - Excludes bugs that are already in the list (`existingBugIds`).
// - Submits via POST /api/projects/{projectId}/bug-lists/{listId}/items/
//   with {bug_ids: [...]}. Duplicates are skipped server-side.
// - `initialSelectedIds` (optional) pre-checks a set of bug IDs when the
//   modal opens — used by the QaBugListPage "Add to list" affordance so a
//   newly reported bug lands in a list in one click.
// ---------------------------------------------------------------------------
export default function AddBugsToListModal({
  open,
  onClose,
  projectId,
  bugListId,
  bugs = [],
  existingBugIds = [],
  initialSelectedIds = [],
  onSuccess,
}) {
  const [search, setSearch] = useState("");
  const [severityFilter, setSeverityFilter] = useState("all");
  const [statusFilter, setStatusFilter] = useState("all");
  const [selected, setSelected] = useState(new Set());
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState(null);

  // Reset state every time the modal is reopened so the user always starts
  // with a clean slate (no stale selections, filters, or error). When the
  // caller passes `initialSelectedIds`, seed the selection with those bugs
  // — pre-selecting is what powers the "Add to list" one-click flow.
  const initialSelectedKey = initialSelectedIds.join(",");

  useEffect(() => {
    if (open) {
      setSearch("");
      setSeverityFilter("all");
      setStatusFilter("all");
      setSelected(new Set(initialSelectedIds));
      setError(null);
      setSubmitting(false);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, initialSelectedKey]);

  // Project bugs that are NOT already on this list. The "addable" pool.
  const addableBugs = useMemo(() => {
    const existing = new Set(existingBugIds);
    return bugs.filter((b) => !existing.has(b.id));
  }, [bugs, existingBugIds]);

  // Apply search + filters. Search is case-insensitive substring on title.
  const filteredBugs = useMemo(() => {
    const q = search.trim().toLowerCase();
    return addableBugs.filter((b) => {
      if (q && !(b.title || "").toLowerCase().includes(q)) return false;
      if (severityFilter !== "all") {
        const sev = b.severity || b.predicted_severity;
        if (sev !== severityFilter) return false;
      }
      if (statusFilter !== "all" && b.status !== statusFilter) return false;
      return true;
    });
  }, [addableBugs, search, severityFilter, statusFilter]);

  const toggleBug = (bugId) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(bugId)) next.delete(bugId);
      else next.add(bugId);
      return next;
    });
  };

  const toggleAllVisible = () => {
    setSelected((prev) => {
      const next = new Set(prev);
      const allSelected = filteredBugs.every((b) => next.has(b.id));
      if (allSelected) {
        filteredBugs.forEach((b) => next.delete(b.id));
      } else {
        filteredBugs.forEach((b) => next.add(b.id));
      }
      return next;
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (selected.size === 0 || submitting) return;
    setSubmitting(true);
    setError(null);
    try {
      const ids = Array.from(selected);
      const result = await addBugsToList(projectId, bugListId, ids);
      const added = result?.added_count ?? ids.length;
      onSuccess?.({ added, result });
      onClose();
    } catch (err) {
      console.error(err);
      setError(
        err?.response?.data?.bug_ids?.[0] ||
          err?.response?.data?.detail ||
          "Failed to add bugs to list. Please try again."
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (!open) return null;

  const allVisibleSelected =
    filteredBugs.length > 0 && filteredBugs.every((b) => selected.has(b.id));

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-2xl max-h-[85vh] flex flex-col"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between px-6 py-5 border-b border-slate-100 shrink-0">
          <div>
            <h3 className="text-lg font-semibold text-slate-800 flex items-center gap-2">
              <ListChecks className="h-5 w-5 text-blue-600" />
              Add Bugs to List
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Select bugs from this project to add to the list. Search and filter to narrow down.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="text-slate-400 hover:text-slate-600"
            aria-label="Close"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex flex-col flex-1 min-h-0">
          {/* Search + filters */}
          <div className="px-6 py-4 border-b border-slate-100 space-y-3 shrink-0">
            <div className="relative">
              <Search className="h-4 w-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search by bug title…"
                className="w-full pl-9 pr-3 py-2.5 border border-slate-200 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
              <div className="relative">
                <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={severityFilter}
                  onChange={(e) => setSeverityFilter(e.target.value)}
                  className="w-full appearance-none pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {SEVERITY_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
              <div className="relative">
                <Filter className="h-3.5 w-3.5 text-slate-400 absolute left-2.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                <select
                  value={statusFilter}
                  onChange={(e) => setStatusFilter(e.target.value)}
                  className="w-full appearance-none pl-7 pr-3 py-2 border border-slate-200 rounded-lg text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {STATUS_FILTERS.map((f) => (
                    <option key={f.value} value={f.value}>{f.label}</option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* Bug list */}
          <div className="flex-1 overflow-y-auto min-h-0">
            {addableBugs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500">All bugs in this project are already in the list.</p>
                <p className="text-xs text-slate-400 mt-1">Nothing left to add. 🎉</p>
              </div>
            ) : filteredBugs.length === 0 ? (
              <div className="p-10 text-center">
                <p className="text-sm text-slate-500">No bugs match your search/filters.</p>
                <p className="text-xs text-slate-400 mt-1">Try clearing the filters above.</p>
              </div>
            ) : (
              <>
                <div className="px-6 py-2 border-b border-slate-100 bg-slate-50/50 flex items-center gap-2 text-xs text-slate-500">
                  <input
                    type="checkbox"
                    checked={allVisibleSelected}
                    onChange={toggleAllVisible}
                    className="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-500"
                    aria-label="Select all visible"
                  />
                  <span>
                    {selected.size > 0
                      ? `${selected.size} selected`
                      : `${filteredBugs.length} ${filteredBugs.length === 1 ? "bug" : "bugs"}`}
                  </span>
                </div>
                <ul className="divide-y divide-slate-100">
                  {filteredBugs.map((bug) => {
                    const isSelected = selected.has(bug.id);
                    return (
                      <li key={bug.id}>
                        <label
                          className={`flex items-start gap-3 px-6 py-3 cursor-pointer hover:bg-slate-50 transition-colors ${
                            isSelected ? "bg-blue-50/40" : ""
                          }`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleBug(bug.id)}
                            className="h-4 w-4 mt-1 rounded border-slate-300 text-blue-600 focus:ring-blue-500 shrink-0"
                            aria-label={`Select bug #${bug.id}`}
                          />
                          <div className="min-w-0 flex-1">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-xs font-semibold text-slate-400">
                                #{bug.id}
                              </span>
                              <span className="text-sm font-medium text-slate-900 truncate">
                                {bug.title}
                              </span>
                            </div>
                            <div className="flex items-center flex-wrap gap-1.5 mt-1.5">
                              <StatusBadge status={bug.status} />
                              <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                            </div>
                          </div>
                        </label>
                      </li>
                    );
                  })}
                </ul>
              </>
            )}
          </div>

          {error && (
            <p className="px-6 py-2 text-sm text-rose-600 border-t border-slate-100 shrink-0">
              {error}
            </p>
          )}

          <div className="px-6 py-4 border-t border-slate-100 flex items-center justify-between gap-3 shrink-0">
            <span className="text-xs text-slate-500">
              {selected.size > 0
                ? `${selected.size} bug${selected.size === 1 ? "" : "s"} selected`
                : "Select at least one bug to add."}
            </span>
            <div className="flex gap-2">
              <button
                type="button"
                onClick={onClose}
                disabled={submitting}
                className="px-4 py-2 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={selected.size === 0 || submitting}
                className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors disabled:opacity-50"
              >
                {submitting && <Loader2 className="h-4 w-4 animate-spin" />}
                {submitting ? "Adding…" : `Add ${selected.size || ""} Bug${selected.size === 1 ? "" : "s"}`.trim()}
              </button>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
