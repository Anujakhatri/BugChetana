import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  getBug, updateBug, deleteBug, resubmitBug,
  getBugComments, addBugComment, getBugHistory,
  submitQaResult, assignBug, listUsers,
} from '@/api/bugs';
import { getRoast, getSuggestedFix } from '@/api/ai';
import PageContainer from '@/components/layout/PageContainer';
import {
  ArrowLeft, Loader2, Trash2, MessageSquare, Clock,
  Flame, Wrench, Sparkles, Save, Users,
  CheckCircle2, XCircle, RefreshCw,
} from 'lucide-react';

const SEVERITY_STYLES = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

const STATUS_STYLES = {
  open: 'bg-blue-50 text-blue-700 border-blue-200',
  in_progress: 'bg-purple-50 text-purple-700 border-purple-200',
  resolved: 'bg-teal-50 text-teal-700 border-teal-200',
  closed: 'bg-green-50 text-green-700 border-green-200',
  failed: 'bg-red-50 text-red-700 border-red-200',
  resubmitted: 'bg-amber-50 text-amber-700 border-amber-200',
};

export default function BugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // adjust if AuthContext exposes a different shape

  const [bug, setBug] = useState(null);
  const [comments, setComments] = useState([]);
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [commentText, setCommentText] = useState('');
  const [commentSubmitting, setCommentSubmitting] = useState(false);

  const [editForm, setEditForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [saveError, setSaveError] = useState(null);

  const [roast, setRoast] = useState(null);
  const [roastLoading, setRoastLoading] = useState(false);
  const [suggestion, setSuggestion] = useState(null);
  const [suggestLoading, setSuggestLoading] = useState(false);
  const [aiError, setAiError] = useState(null);

  const [deleting, setDeleting] = useState(false);
  const [resubmitLoading, setResubmitLoading] = useState(false);
  const [resubmitNotes, setResubmitNotes] = useState('');
  const [showResubmitPrompt, setShowResubmitPrompt] = useState(false);

  // Developers list (for QA / RM assignee picker)
  const [developers, setDevelopers] = useState([]);
  const [developersLoading, setDevelopersLoading] = useState(false);

  // Workflow action state
  const [resolveNotes, setResolveNotes] = useState('');
  const [showResolvePrompt, setShowResolvePrompt] = useState(false);
  const [markResolving, setMarkResolving] = useState(false);
  const [qaActionLoading, setQaActionLoading] = useState(null); // 'pass' | 'fail' | 'reassign' | null
  const [qaActionNotes, setQaActionNotes] = useState('');
  const [reassignDevId, setReassignDevId] = useState('');

  // Lightweight inline toast (matches the dashboard pattern)
  const [toast, setToast] = useState(null);
  const pushToast = (kind, message) => {
    setToast({ kind, message });
    setTimeout(() => setToast(null), 3500);
  };

  const role = user?.roleName;

  const loadAll = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [bugData, commentsData, historyData] = await Promise.all([
        getBug(id),
        getBugComments(id),
        getBugHistory(id),
      ]);
      setBug(bugData);
      setComments(commentsData);
      setHistory(historyData);
      setEditForm({
        status: bugData.status,
        description: bugData.description,
        assigned_to: bugData.assigned_to || '',
        title: bugData.title,
        severity: bugData.severity,
        priority: bugData.priority,
      });
      setRoast(bugData.roast_commentary || null);
      setSuggestion(bugData.solution_suggestion || null);
    } catch (err) {
      console.error(err);
      setError('Failed to load bug details.');
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    loadAll();
  }, [loadAll]);

  // Role / permission flags — declared up here because the effects below
  // need to read them.
  // Mirrors bugs/views.py BugDetailView.perform_update() exactly —
  // showing fields the backend would reject keeps the UI honest.
  const isReleaseManager = role === 'Release Manager';
  const isDeveloper = role === 'Developer' &&
    (user?.id === bug?.assigned_to || user?.id === bug?.created_by);
  const isQA = role === 'QA';
  // "Mark Resolved" is gated to the *currently assigned* developer only,
  // even though creators and other developers can view the bug.
  const isAssignedDeveloper = role === 'Developer' && user?.id === bug?.assigned_to;

  // Load developer roster once we know the bug (and thus the project).
  // Only QA / RM pick from it; Developer view doesn't need it.
  useEffect(() => {
    if (!bug) return;
    if (!(isQA || isReleaseManager)) return;
    setDevelopersLoading(true);
    listUsers({ role: 'Developer' })
      .then((data) => setDevelopers(Array.isArray(data) ? data : []))
      .catch((err) => {
        console.error('Failed to load developers', err);
        setDevelopers([]);
      })
      .finally(() => setDevelopersLoading(false));
    // isQA / isReleaseManager are derived from role + bug; recompute when either changes.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [bug?.id, role]);

  const canEdit = isReleaseManager || isDeveloper || isQA;
  const canDelete = isReleaseManager;

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    let payload = {};
    if (isReleaseManager) {
      payload = {
        title: editForm.title,
        description: editForm.description,
        severity: editForm.severity,
        priority: editForm.priority,
        status: editForm.status,
        assigned_to: editForm.assigned_to || null,
      };
    } else if (isDeveloper) {
      payload = { description: editForm.description };
      if (editForm.status !== 'closed') {
        payload.status = editForm.status;
      }
    } else if (isQA) {
      payload = { assigned_to: editForm.assigned_to || null };
    }

    try {
      const updated = await updateBug(id, payload);
      setBug(updated);
    } catch (err) {
      console.error(err);
      setSaveError(err.response?.data?.detail || 'Failed to save changes.');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!window.confirm('Delete this bug permanently? This cannot be undone.')) return;
    setDeleting(true);
    try {
      await deleteBug(id);
      navigate('/dashboard');
    } catch (err) {
      console.error(err);
      setError('Failed to delete bug.');
      setDeleting(false);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setCommentSubmitting(true);
    try {
      const newComment = await addBugComment(id, commentText);
      setComments([...comments, newComment]);
      setCommentText('');
    } catch (err) {
      console.error(err);
    } finally {
      setCommentSubmitting(false);
    }
  };

  const handleRoast = async () => {
    setRoastLoading(true);
    setAiError(null);
    try {
      const data = await getRoast(id);
      setRoast(data.roast_commentary);
    } catch (err) {
      console.error(err);
      setAiError('Roast unavailable right now.');
    } finally {
      setRoastLoading(false);
    }
  };

  const handleSuggestFix = async () => {
    setSuggestLoading(true);
    setAiError(null);
    try {
      const data = await getSuggestedFix(id);
      setSuggestion(data.solution_suggestion);
    } catch (err) {
      console.error(err);
      setAiError('Fix suggestion unavailable right now.');
    } finally {
      setSuggestLoading(false);
    }
  };

  const handleResubmit = async () => {
    const notes = resubmitNotes.trim();
    if (!notes) {
      setSaveError('Please describe what you fixed before resubmitting.');
      return;
    }
    setResubmitLoading(true);
    setSaveError(null);
    try {
      // Backend BugResubmitSerializer requires `notes` (validated non-empty) and
      // records it in BugHistory.notes + a BugComment, matching the Mark
      // Resolved audit trail. title/description edits are NOT sent here — if
      // the developer wants to amend them, they do that via the "Save Changes"
      // form above before resubmitting.
      const updated = await resubmitBug(id, { notes });
      setBug(updated);
      setEditForm({
        ...editForm,
        status: updated.status,
      });
      setResubmitNotes('');
      setShowResubmitPrompt(false);
    } catch (err) {
      setSaveError(err.response?.data?.detail || 'Failed to resubmit bug.');
    } finally {
      setResubmitLoading(false);
    }
  };

  const canResubmit = isDeveloper && bug?.status === 'failed';

  // ─── Workflow action handlers ─────────────────────────────
  // Developer: Mark Resolved. Only the currently-assigned developer is
  // allowed (mirrors backend BugDetailView.perform_update gating).
  const canMarkResolved =
    isAssignedDeveloper && (bug?.status === 'open' || bug?.status === 'in_progress');

  const handleMarkResolved = async () => {
    if (!resolveNotes.trim()) {
      pushToast('error', 'Please describe the fix before marking resolved.');
      return;
    }
    setMarkResolving(true);
    setSaveError(null);
    try {
      const updated = await updateBug(id, {
        status: 'resolved',
        notes: resolveNotes.trim(),
      });
      setBug(updated);
      setEditForm((f) => ({ ...f, status: updated.status }));
      setShowResolvePrompt(false);
      setResolveNotes('');
      pushToast('success', 'Marked as resolved. QA will pick it up.');
    } catch (err) {
      console.error(err);
      setSaveError(err.response?.data?.detail || 'Failed to mark resolved.');
      pushToast('error', 'Failed to mark resolved.');
    } finally {
      setMarkResolving(false);
    }
  };

  // QA: Pass / Fail / Reassign. Backend permission is CanSubmitQAResult
  // (QA + project member); the frontend mirrors it.
  const canQaAct = isQA && (bug?.status === 'resolved' || bug?.status === 'resubmitted');

  const handleQaAction = async (action) => {
    if (action === 'reassign') {
      if (!reassignDevId) {
        pushToast('error', 'Pick a developer to reassign to.');
        return;
      }
      if (!qaActionNotes.trim()) {
        pushToast('error', 'Please add a note when reassigning.');
        return;
      }
    } else {
      if (!qaActionNotes.trim()) {
        pushToast('error', `Please add a note for "${action}".`);
        return;
      }
    }

    setQaActionLoading(action);
    setSaveError(null);
    try {
      if (action === 'reassign') {
        await assignBug(id, Number(reassignDevId), {
          record_reassign: true,
          notes: qaActionNotes.trim(),
        });
      } else {
        // 'pass' or 'fail' → POST /bugs/<id>/qa-result/
        await submitQaResult(id, {
          result: action,
          notes: qaActionNotes.trim(),
        });
      }

      await loadAll();
      setQaActionNotes('');
      pushToast(
      'success',
      action === 'pass'
        ? 'Marked as passed. Release manager notified.'
        : action === 'fail'
          ? 'Marked as failed. Developer notified.'
          : 'Reassigned to developer.'
      );

    } catch (err) {
      console.error(err);
      setSaveError(err.response?.data?.detail || `Failed to ${action} bug.`);
      pushToast('error', `Failed to ${action} bug.`);
    } finally {
      setQaActionLoading(null);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  if (error && !bug) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-3">
        <p className="text-red-600">{error}</p>
        <Link to="/dashboard" className="text-blue-600 text-sm">Back to dashboard</Link>
      </div>
    );
  }

  return (
    <PageContainer maxWidth="6xl" innerClassName="space-y-4">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* ─── Header ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 flex items-start justify-between gap-4">
          <div>
            <h1 className="text-xl font-semibold text-gray-900">{bug.title}</h1>
            <p className="text-sm text-gray-500 mt-1">Bug #{bug.id}</p>
          </div>
          {canDelete && (
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 disabled:opacity-50 shrink-0"
            >
              <Trash2 className="h-4 w-4" />
              {deleting ? 'Deleting...' : 'Delete'}
            </button>
          )}
        </div>

        <form onSubmit={handleSave} className="grid grid-cols-1 md:grid-cols-3 gap-4 items-start">
          {/* ─── SIDEBAR: Status, Severity, Assignee, Predicted Severity ─── */}
          <div className="md:col-span-1 md:sticky md:top-4 space-y-4">
            <div className="bg-white rounded-xl border border-gray-200 p-5 space-y-4">
              <h2 className="text-sm font-semibold text-gray-500 uppercase tracking-wide">Details</h2>

              {/* Status */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Status</label>
                {(isReleaseManager || isDeveloper) ? (
                  <select
                    name="status" value={editForm.status} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="open">Open</option>
                    <option value="in_progress">In Progress</option>
                    {isReleaseManager && <option value="resolved">Resolved</option>}
                    {isReleaseManager && <option value="closed">Closed</option>}
                  </select>
                ) : (
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[bug.status]}`}>
                    {bug.status.replace('_', ' ')}
                  </span>
                )}
                {isDeveloper && (
                  <p className="text-xs text-gray-400 mt-1">
                    Use "Mark Resolved" below to resolve — requires a note on what was fixed.
                  </p>
                )}
                {isQA && canQaAct && (
                  <p className="text-xs text-teal-700 mt-1">
                    Ready for review!!
                  </p>
                )}
              </div>

              {/* Severity */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Severity</label>
                {isReleaseManager ? (
                  <select
                    name="severity" value={editForm.severity} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                ) : (
                  <span className={`inline-block text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${SEVERITY_STYLES[bug.severity]}`}>
                    {bug.severity}
                  </span>
                )}
              </div>

              {/* Priority — RM only, sits alongside severity */}
              {isReleaseManager && (
                <div>
                  <label className="block text-xs font-medium text-gray-500 mb-1">Priority</label>
                  <select
                    name="priority" value={editForm.priority} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                  >
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
              )}

              {/* Assignee */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">Assignee</label>
                {(isReleaseManager || isQA) ? (
                  developersLoading ? (
                    <p className="text-xs text-gray-400 flex items-center gap-1">
                      <Loader2 className="h-3 w-3 animate-spin" /> Loading developers…
                    </p>
                  ) : (
                    <select
                      name="assigned_to"
                      value={editForm.assigned_to || ''}
                      onChange={handleEditChange}
                      className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm bg-white"
                    >
                      <option value="">— Unassigned —</option>
                      {developers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                  )
                ) : (
                  <p className="text-sm text-gray-700 flex items-center gap-1.5">
                    <Users className="h-3.5 w-3.5 text-gray-400" />
                    {bug.assigned_to_name || 'Unassigned'}
                  </p>
                )}
              </div>

              {/* Predicted Severity */}
              <div>
                <label className="block text-xs font-medium text-gray-500 mb-1">AI Predicted Severity</label>
                {bug.ai_status && bug.predicted_severity ? (
                  <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 capitalize">
                    <Sparkles className="h-3 w-3" /> {bug.predicted_severity}
                  </span>
                ) : (
                  <p className="text-xs text-gray-400">Not available</p>
                )}
              </div>

              {canEdit && (
                <>
                  {saveError && <p className="text-xs text-red-600">{saveError}</p>}
                  <button
                    type="submit"
                    disabled={saving}
                    className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-70"
                  >
                    {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                    Save Changes
                  </button>
                </>
              )}
              {canResubmit && !showResubmitPrompt && (
                <button
                  type="button"
                  onClick={() => setShowResubmitPrompt(true)}
                  className="w-full flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <Save className="h-4 w-4" />
                  Resubmit for QA
                </button>
              )}
              {canResubmit && showResubmitPrompt && (
                <div className="space-y-2 border border-amber-200 rounded-lg p-3 bg-amber-50/40">
                  <label className="block text-xs font-medium text-gray-600">
                    What did you fix this time?
                  </label>
                  <textarea
                    value={resubmitNotes}
                    onChange={(e) => setResubmitNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe the fix before resubmitting to QA…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleResubmit}
                      disabled={resubmitLoading}
                      className="flex-1 flex items-center justify-center gap-2 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {resubmitLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                      Confirm Resubmit
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowResubmitPrompt(false); setResubmitNotes(''); }}
                      disabled={resubmitLoading}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ─── Developer: Mark Resolved ─── */}
              {canMarkResolved && !showResolvePrompt && (
                <button
                  type="button"
                  onClick={() => setShowResolvePrompt(true)}
                  className="w-full flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
                >
                  <CheckCircle2 className="h-4 w-4" />
                  Mark Resolved
                </button>
              )}
              {canMarkResolved && showResolvePrompt && (
                <div className="space-y-2 border border-teal-200 rounded-lg p-3 bg-teal-50/40">
                  <label className="block text-xs font-medium text-gray-600">
                    What did you fix?
                  </label>
                  <textarea
                    value={resolveNotes}
                    onChange={(e) => setResolveNotes(e.target.value)}
                    rows={3}
                    placeholder="Describe the fix before marking resolved…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                  />
                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={handleMarkResolved}
                      disabled={markResolving}
                      className="flex-1 flex items-center justify-center gap-2 bg-teal-600 hover:bg-teal-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-60"
                    >
                      {markResolving ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                      Confirm Resolved
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowResolvePrompt(false); setResolveNotes(''); }}
                      disabled={markResolving}
                      className="px-3 py-1.5 border border-gray-300 text-gray-700 rounded-lg text-sm hover:bg-gray-50"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* ─── QA: Pass / Fail / Reassign ─── */}
              {canQaAct && (
                <div className="space-y-2 border-t border-gray-100 pt-3">
                  <p className="text-xs font-medium text-gray-500 uppercase tracking-wide">
                    QA review
                  </p>
                  <textarea
                    value={qaActionNotes}
                    onChange={(e) => setQaActionNotes(e.target.value)}
                    rows={2}
                    placeholder="Notes for your decision (required)…"
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                  />

                  {/* Reassign needs a developer pick; the button is the last step. */}
                  <div className="flex items-center gap-2">
                    <select
                      value={reassignDevId}
                      onChange={(e) => setReassignDevId(e.target.value)}
                      disabled={developersLoading || qaActionLoading === 'reassign'}
                      className="flex-1 border border-gray-300 rounded-lg px-2 py-1.5 text-sm bg-white disabled:opacity-60"
                    >
                      <option value="">
                        {developersLoading ? 'Loading developers…' : '— Reassign to —'}
                      </option>
                      {developers.map((u) => (
                        <option key={u.id} value={u.id}>
                          {u.name || u.email}
                        </option>
                      ))}
                    </select>
                    <button
                      type="button"
                      onClick={() => handleQaAction('reassign')}
                      disabled={
                        !reassignDevId ||
                        !qaActionNotes.trim() ||
                        qaActionLoading !== null
                      }
                      className="flex items-center gap-1 bg-amber-600 hover:bg-amber-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {qaActionLoading === 'reassign'
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <RefreshCw className="h-4 w-4" />}
                      Reassign
                    </button>
                  </div>

                  <div className="flex gap-2">
                    <button
                      type="button"
                      onClick={() => handleQaAction('pass')}
                      disabled={!qaActionNotes.trim() || qaActionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {qaActionLoading === 'pass'
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <CheckCircle2 className="h-4 w-4" />}
                      Pass
                    </button>
                    <button
                      type="button"
                      onClick={() => handleQaAction('fail')}
                      disabled={!qaActionNotes.trim() || qaActionLoading !== null}
                      className="flex-1 flex items-center justify-center gap-2 bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-sm font-medium disabled:opacity-50"
                    >
                      {qaActionLoading === 'fail'
                        ? <Loader2 className="h-4 w-4 animate-spin" />
                        : <XCircle className="h-4 w-4" />}
                      Fail
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* ─── MAIN: Description, AI, Comments, History ─── */}
          <div className="md:col-span-2 space-y-4">
            {bug.qa_comment && (
              <div className="bg-red-50 border border-red-200 rounded-xl p-6">
                <h2 className="font-semibold text-red-800 mb-2">QA Review Comment</h2>
                <p className="text-sm text-red-900 whitespace-pre-wrap">{bug.qa_comment}</p>
                {bug.reviewed_by_name && (
                  <p className="text-xs text-red-700 mt-2">
                    Reviewed by {bug.reviewed_by_name}
                    {bug.reviewed_at && ` · ${new Date(bug.reviewed_at).toLocaleString()}`}
                  </p>
                )}
              </div>
            )}

            {/* Description */}
            <div className="bg-white rounded-xl border border-gray-200 p-6">
              <h2 className="font-semibold text-gray-900 mb-2">Description</h2>
              {/*
                Description is editable only by the Release Manager. The
                Developer updates progress through Comments and the
                Status/QA workflow — they must not rewrite the bug
                description. QA also sees it read-only (they review,
                not edit). Mirrors BugDetailView.DEVELOPER_ALLOWED_FIELDS
                in the backend.
              */}
              {isReleaseManager ? (
                <textarea
                  name="description" rows={5} value={editForm.description} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 text-sm resize-y"
                />
              ) : (
                <p className="text-gray-700 whitespace-pre-wrap">{bug.description}</p>
              )}
              {(isReleaseManager || (isDeveloper && canResubmit)) && (
                <div className="mt-3">
                  <label className="block text-xs font-medium text-gray-500 mb-1">Title</label>
                  <input
                    name="title" value={editForm.title} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                  />
                </div>
              )}
            </div>

            {/* AI Assist */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900">AI Assist</h2>
              {aiError && <p className="text-sm text-red-600">{aiError}</p>}

              <div className="flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={handleRoast}
                  disabled={roastLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {roastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
                  Roast
                </button>
                <button
                  type="button"
                  onClick={handleSuggestFix}
                  disabled={suggestLoading}
                  className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  {suggestLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Wrench className="h-4 w-4" />}
                  Suggest Fix
                </button>
              </div>

              {roast && (
                <div className="bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-gray-800">
                  <div className="flex items-center gap-2 mb-1 text-orange-700 font-medium">
                    <Flame className="h-4 w-4" /> Roast
                  </div>
                  {roast}
                </div>
              )}
              {suggestion && (
                <div className="bg-teal-50 border border-teal-200 rounded-lg p-4 text-sm text-gray-800">
                  <div className="flex items-center gap-2 mb-1 text-teal-700 font-medium">
                    <Wrench className="h-4 w-4" /> Suggested Fix
                  </div>
                  {suggestion}
                </div>
              )}
            </div>

            {/* Comments */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <MessageSquare className="h-4 w-4" /> Comments
              </h2>

              <div className="space-y-3">
                {comments.length === 0 && (
                  <p className="text-sm text-gray-400">No comments yet.</p>
                )}
                {comments.map((c) => (
                  <div key={c.id} className="border border-gray-100 rounded-lg p-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span className="font-medium text-gray-700">{c.user_name}</span>
                      <span>{new Date(c.created_at).toLocaleString()}</span>
                    </div>
                    <p className="text-sm text-gray-800">{c.comment_text}</p>
                  </div>
                ))}
              </div>

              <div className="flex gap-2 pt-2">
                <input
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  placeholder="Add a comment..."
                  className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
                />
                <button
                  type="button"
                  onClick={handleAddComment}
                  disabled={commentSubmitting}
                  className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-60"
                >
                  Post
                </button>
              </div>
            </div>

            {/* History */}
            {/* History */}
            <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
              <h2 className="font-semibold text-gray-900 flex items-center gap-2">
                <Clock className="h-4 w-4" /> History
              </h2>
              {history.length === 0 && (
                <p className="text-sm text-gray-400">No status changes yet.</p>
              )}
              {history.map((h) => {
                const isSameStatus = h.old_status === h.new_status;
                return (
                  <div key={h.id} className="text-sm text-gray-600 border-b border-gray-50 pb-2">
                    <div className="flex justify-between">
                      <span>
                        <span className="font-medium text-gray-800">{h.changed_by_name}</span>{' '}
                        {isSameStatus ? (
                          <>reassigned the bug</>
                        ) : (
                          <>
                            changed status from <span className="capitalize">{h.old_status}</span> →{' '}
                            <span className="capitalize font-medium">{h.new_status}</span>
                          </>
                        )}
                      </span>
                      <span className="text-gray-400">{new Date(h.changed_at).toLocaleString()}</span>
                    </div>
                    {h.notes && (
                      <p className="text-sm text-gray-700 mt-1 pl-0.5 italic">"{h.notes}"</p>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </form>

        {/* Inline toast for workflow actions */}
        {toast && (
          <div
            className={
              'fixed bottom-4 right-4 z-50 px-4 py-2 rounded-lg shadow-lg text-sm font-medium ' +
              (toast.kind === 'success'
                ? 'bg-emerald-600 text-white'
                : toast.kind === 'error'
                  ? 'bg-rose-600 text-white'
                  : 'bg-blue-600 text-white')
            }
          >
            {toast.message}
          </div>
        )}
    </PageContainer>
  );
}