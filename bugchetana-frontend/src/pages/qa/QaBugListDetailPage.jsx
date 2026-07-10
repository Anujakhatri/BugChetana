import React, { useState, useEffect, useMemo, useCallback, useRef } from "react";
import {
  ArrowLeft,
  Clock,
  Users,
  CheckCircle2,
  AlertTriangle,
  Activity,
  ListPlus,
  Loader2,
  ShieldCheck,
  XCircle,
} from "lucide-react";
import { useNavigate, useParams, Link } from "react-router-dom";
import { useDashboardSummary } from "@/hooks/useDashboardSummary";
import {
  getBugLists,
  assignBug,
  verifyBug,
  listUsers,
} from "@/api/bugs";
import { SeverityBadge, StatusBadge, timeAgo } from "@/components/shared/DashboardBadges";
import AddBugsToListModal from "@/components/shared/AddBugsToListModal";

// ─── Lightweight inline toast ──────────────────────────────
// Mirrors the DeveloperDashboardPage / QaDashboardPage pattern. Stays inline
// (no external lib) to keep the visual language consistent across the app.
function useToasts() {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);
  const push = useCallback((kind, message) => {
    const id = ++idRef.current;
    setToasts((prev) => [...prev, { id, kind, message }]);
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 3500);
  }, []);
  return { toasts, push };
}

function ToastStack({ toasts }) {
  return (
    <div className="fixed top-4 right-4 z-[70] space-y-2 pointer-events-none">
      {toasts.map((t) => {
        const styles =
          t.kind === "success"
            ? "bg-emerald-50 border-emerald-200 text-emerald-800"
            : t.kind === "error"
            ? "bg-rose-50 border-rose-200 text-rose-800"
            : "bg-blue-50 border-blue-200 text-blue-800";
        const Icon = t.kind === "success" ? CheckCircle2 : t.kind === "error" ? AlertTriangle : Activity;
        return (
          <div
            key={t.id}
            className={`pointer-events-auto flex items-start gap-2 max-w-sm border rounded-xl px-4 py-3 shadow-sm ${styles}`}
            role="status"
          >
            <Icon className="h-4 w-4 mt-0.5 shrink-0" />
            <p className="text-sm font-medium leading-snug">{t.message}</p>
          </div>
        );
      })}
    </div>
  );
}

// Inline assignee dropdown. Looks up the developer by ID in the loaded users
// list and uses a short "— unassigned —" sentinel for null. Loading state is
// shown only on the very first fetch (cached lookups feel instant).
function AssignDropdown({ bug, developers, onAssign, disabled }) {
  const value = bug.assigned_to ?? "";
  return (
    <div className="flex items-center gap-1.5 min-w-0">
      <Users className="h-3.5 w-3.5 text-slate-400 shrink-0" />
      <select
        value={value}
        disabled={disabled}
        onChange={(e) => {
          const v = e.target.value;
          // Empty string = unassign (sentinel sent as null).
          onAssign(bug.id, v === "" ? null : Number(v));
        }}
        className="appearance-none border border-slate-200 rounded-lg pl-2 pr-6 py-1.5 text-xs font-medium text-slate-700 bg-white focus:outline-none focus:ring-2 focus:ring-blue-500 max-w-[160px] truncate disabled:opacity-50"
        title="Assign developer"
      >
        <option value="">— Unassigned —</option>
        {developers.map((u) => (
          <option key={u.id} value={u.id}>{u.name || u.email}</option>
        ))}
      </select>
    </div>
  );
}

export default function QaBugListDetailPage() {
  const { id: bugListId } = useParams();
  const navigate = useNavigate();

  // The shared dashboard hook gives us the project's bug list (and the active
  // project). We use `bugs` as the in-memory bug source (same data the rest
  // of the QA dashboard sees) and as the "addable" pool for the Add Bugs modal.
  const { projectId, bugs, refetch: refetchProjectBugs } = useDashboardSummary();

  // The bug-list shape (name, bug_ids, etc). Refetched when the project or
  // list id changes; reloads after Add Bugs so the row count stays current.
  const [bugList, setBugList] = useState(null);
  const [listLoading, setListLoading] = useState(true);
  const [listError, setListError] = useState(null);

  // Developers for the inline assign dropdown. Loaded once per project.
  const [developers, setDevelopers] = useState([]);
  const [developersLoading, setDevelopersLoading] = useState(false);

  const [addBugsOpen, setAddBugsOpen] = useState(false);
  // Per-bug in-flight states so the UI can show spinners on the right row only.
  const [assigningId, setAssigningId] = useState(null);
  const [verifyingId, setVerifyingId] = useState(null);

  const { toasts, push: pushToast } = useToasts();

  // Fetch the bug list (and the project's bugs) when the project or list id
  // changes. Re-runs when `bugs` refetches so the list rows stay live.
  const reloadBugList = useCallback(async () => {
    if (!projectId) {
      setBugList(null);
      setListLoading(false);
      return;
    }
    setListLoading(true);
    setListError(null);
    try {
      const all = await getBugLists(projectId);
      const found = all.find((bl) => String(bl.id) === String(bugListId));
      if (!found) {
        setListError("Bug list not found in this project.");
        setBugList(null);
      } else {
        setBugList(found);
      }
    } catch (err) {
      console.error(err);
      setListError("Failed to load bug list.");
      setBugList(null);
    } finally {
      setListLoading(false);
    }
  }, [projectId, bugListId]);

  useEffect(() => {
    reloadBugList();
  }, [reloadBugList]);

  // Pull the developer roster once per project. The dropdown is rendered for
  // every bug row, so we don't want to refetch per row.
  useEffect(() => {
    if (!projectId) {
      setDevelopers([]);
      return;
    }
    setDevelopersLoading(true);
    listUsers({ role: "Developer" })
      .then((data) => setDevelopers(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error("Failed to load developers", err);
        setDevelopers([]);
      })
      .finally(() => setDevelopersLoading(false));
  }, [projectId]);

  // Derived: the bugs in this list. Cross-reference the project's bug list
  // against the bug_ids array (the order matches the backend's list order).
  const listBugs = useMemo(() => {
    if (!bugList) return [];
    const byId = new Map();
    bugs.forEach((b) => byId.set(b.id, b));
    return (bugList.bug_ids || [])
      .map((id) => byId.get(id))
      .filter(Boolean);
  }, [bugList, bugs]);

  // ─── Handlers ─────────────────────────────────────────────
  const handleAssign = async (bugId, developerId) => {
    if (assigningId) return; // single-flight
    setAssigningId(bugId);
    try {
      await assignBug(bugId, developerId);
      pushToast(
        "success",
        developerId ? "Bug reassigned to developer." : "Bug unassigned."
      );
      // Refetch project bugs so the row reflects the new assignee immediately.
      await refetchProjectBugs();
    } catch (err) {
      console.error(err);
      pushToast("error", err?.response?.data?.detail || "Failed to assign bug.");
    } finally {
      setAssigningId(null);
    }
  };

  const handleVerify = async (bugId) => {
    if (verifyingId) return; // single-flight
    setVerifyingId(bugId);
    try {
      await verifyBug(bugId);
      pushToast("success", "Bug verified. Developer notified.");
      // The list itself didn't change, but the project's bug statuses/verifications
      // may have changed — refetch so the row reflects it.
      await refetchProjectBugs();
    } catch (err) {
      console.error(err);
      pushToast(
        "error",
        err?.response?.data?.status?.[0] || "Failed to verify bug."
      );
    } finally {
      setVerifyingId(null);
    }
  };

  const handleAddBugsSuccess = ({ added }) => {
    pushToast("success", `Added ${added} bug${added === 1 ? "" : "s"} to the list.`);
    reloadBugList();
  };

  // ─── Render gates ─────────────────────────────────────────
  if (!projectId) {
    return (
      <div className="p-10 text-center">
        <p className="text-sm text-slate-500">Select a project to view its bug lists.</p>
        <button
          type="button"
          onClick={() => navigate("/qa/dashboard")}
          className="mt-4 inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </button>
      </div>
    );
  }

  if (listLoading && !bugList) {
    return <div className="p-8 text-center text-slate-500 text-sm">Loading bug list...</div>;
  }
  if (listError) {
    return (
      <div className="p-10 text-center space-y-3">
        <XCircle className="h-8 w-8 text-rose-500 mx-auto" />
        <p className="text-sm text-rose-600">{listError}</p>
        <Link
          to="/qa/bug-list"
          className="inline-flex items-center gap-1.5 text-sm font-semibold text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to bug lists
        </Link>
      </div>
    );
  }
  if (!bugList) {
    return null;
  }

  const totalBugs = listBugs.length;
  const resolvedCount = listBugs.filter((b) => b.status === "resolved").length;
  const verifiedCount = listBugs.filter((b) => b.verified_by).length;
  const bugIdsSet = new Set(bugList.bug_ids || []);

  return (
    <div className="space-y-6">
      <ToastStack toasts={toasts} />

      <AddBugsToListModal
        open={addBugsOpen}
        onClose={() => setAddBugsOpen(false)}
        projectId={projectId}
        bugListId={bugList.id}
        bugs={bugs}
        existingBugIds={Array.from(bugIdsSet)}
        onSuccess={handleAddBugsSuccess}
      />

      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-start justify-between gap-4">
        <div className="space-y-2 min-w-0">
          <Link
            to="/qa/bug-list"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-blue-600 transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            Back to bug lists
          </Link>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">{bugList.name}</h1>
          <div className="flex items-center flex-wrap gap-3 text-xs text-slate-500">
            <span className="font-medium">
              {totalBugs} {totalBugs === 1 ? "bug" : "bugs"}
            </span>
            <span>·</span>
            <span>Created by {bugList.created_by_name}</span>
            <span className="flex items-center gap-1">
              <Clock className="h-3 w-3" />
              {timeAgo(bugList.created_at)}
            </span>
            {resolvedCount > 0 && (
              <>
                <span>·</span>
                <span className="text-purple-700 font-medium">
                  {resolvedCount} resolved
                </span>
              </>
            )}
            {verifiedCount > 0 && (
              <>
                <span>·</span>
                <span className="text-emerald-700 font-medium">
                  {verifiedCount} verified
                </span>
              </>
            )}
          </div>
        </div>
        <button
          type="button"
          onClick={() => setAddBugsOpen(true)}
          className="inline-flex items-center gap-2 px-3.5 py-2 bg-blue-600 text-white rounded-xl text-sm font-semibold hover:bg-blue-700 transition-colors shadow-sm shrink-0"
        >
          <ListPlus className="h-4 w-4" />
          Add Bugs
        </button>
      </div>

      {/* Bug rows */}
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
        <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-slate-800">Bugs in this list</h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Assign developers and verify resolved bugs inline.
            </p>
          </div>
          {developersLoading && (
            <span className="text-xs text-slate-400 inline-flex items-center gap-1.5">
              <Loader2 className="h-3 w-3 animate-spin" />
              Loading developers…
            </span>
          )}
        </div>

        {totalBugs === 0 ? (
          <div className="p-10 text-center">
            <p className="text-sm text-slate-500">No bugs in this list yet.</p>
            <p className="text-xs text-slate-400 mt-1">
              Click <span className="font-semibold text-slate-600">Add Bugs</span> to populate it.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100">
            {listBugs.map((bug) => {
              const isResolved = bug.status === "resolved";
              const isVerified = !!bug.verified_by;
              const isAssigning = assigningId === bug.id;
              const isVerifying = verifyingId === bug.id;
              return (
                <div
                  key={bug.id}
                  className={`p-5 transition-colors ${
                    isVerified ? "bg-emerald-50/30" : isResolved ? "bg-purple-50/20" : "hover:bg-slate-50"
                  }`}
                >
                  <div className="flex flex-col lg:flex-row lg:items-start justify-between gap-4">
                    <button
                      type="button"
                      onClick={() => navigate(`/bugs/${bug.id}`)}
                      className="text-left space-y-2 flex-1 min-w-0"
                    >
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="text-xs font-semibold text-slate-400 uppercase tracking-wide">
                          #{bug.id}
                        </span>
                        <h3 className="text-sm font-semibold text-slate-900 hover:text-blue-700 transition-colors">
                          {bug.title}
                        </h3>
                        {isVerified && (
                          <span className="inline-flex items-center gap-1 text-[10px] font-bold uppercase tracking-wide px-2 py-0.5 rounded-full bg-emerald-100 text-emerald-700 border border-emerald-200">
                            <ShieldCheck className="h-3 w-3" />
                            Verified
                          </span>
                        )}
                      </div>
                      <p className="text-sm text-slate-600 line-clamp-2">{bug.description}</p>
                      <div className="flex items-center flex-wrap gap-3 pt-1">
                        <StatusBadge status={bug.status} />
                        <SeverityBadge severity={bug.severity || bug.predicted_severity} />
                        {bug.assigned_to_name && (
                          <span className="text-xs font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-md">
                            Dev: {bug.assigned_to_name}
                          </span>
                        )}
                        {isVerified && bug.verified_by_name && (
                          <span className="text-xs font-medium text-emerald-700 bg-emerald-50 border border-emerald-200 px-2 py-0.5 rounded-md">
                            Verified by {bug.verified_by_name}
                          </span>
                        )}
                        <span className="text-xs text-slate-400 flex items-center gap-1">
                          <Clock className="h-3 w-3" />
                          {timeAgo(bug.updated_at || bug.created_at)}
                        </span>
                      </div>
                    </button>

                    <div className="flex flex-wrap items-center gap-2 shrink-0">
                      <AssignDropdown
                        bug={bug}
                        developers={developers}
                        disabled={isAssigning}
                        onAssign={handleAssign}
                      />
                      {isAssigning && (
                        <Loader2 className="h-4 w-4 text-blue-500 animate-spin" />
                      )}
                      {isResolved && !isVerified && (
                        <button
                          type="button"
                          onClick={() => handleVerify(bug.id)}
                          disabled={isVerifying}
                          className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-emerald-50 text-emerald-700 border border-emerald-200 rounded-xl text-xs font-semibold hover:bg-emerald-100 transition-colors disabled:opacity-50"
                        >
                          {isVerifying ? (
                            <Loader2 className="h-3.5 w-3.5 animate-spin" />
                          ) : (
                            <CheckCircle2 className="h-3.5 w-3.5" />
                          )}
                          {isVerifying ? "Verifying…" : "Verify"}
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
