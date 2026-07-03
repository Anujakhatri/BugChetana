import React, { useState, useEffect, useCallback } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { useAuth } from '@/context/AuthContext';
import {
  getBug, updateBug, deleteBug,
  getBugComments, addBugComment, getBugHistory,
} from '@/api/bugs';
import { getRoast, getSuggestedFix } from '@/api/ai';
import {
  ArrowLeft, Loader2, Trash2, MessageSquare, Clock,
  Flame, Wrench, Sparkles, Save,
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
  closed: 'bg-gray-100 text-gray-600 border-gray-200',
};

export default function BugDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth(); // adjust if your AuthContext exposes a different shape

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

  // ─── Role-aware editable fields ─────────────────────────────
  // Mirrors bugs/views.py BugDetailView.perform_update() exactly —
  // showing fields the backend would reject keeps the UI honest.
  const isReleaseManager = role === 'Release Manager';
  const isDeveloper = role === 'Developer' &&
    (user?.id === bug?.assigned_to || user?.id === bug?.created_by);
  const isQA = role === 'QA';

  const canEdit = isReleaseManager || isDeveloper || isQA;
  const canDelete = isReleaseManager;

  const handleEditChange = (e) => {
    setEditForm({ ...editForm, [e.target.name]: e.target.value });
  };

  const handleSave = async (e) => {
    e.preventDefault();
    setSaving(true);
    setSaveError(null);

    // Only send the fields this role is actually allowed to change
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
      // Developers can change status, but never to 'closed' (backend-enforced too)
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
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-4xl mx-auto space-y-6">
        <button
          onClick={() => navigate(-1)}
          className="flex items-center gap-1 text-sm text-gray-500 hover:text-gray-800"
        >
          <ArrowLeft className="h-4 w-4" /> Back
        </button>

        {/* ─── Header ─────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h1 className="text-xl font-semibold text-gray-900">{bug.title}</h1>
              <p className="text-sm text-gray-500 mt-1">Bug #{bug.id}</p>
            </div>
            {canDelete && (
              <button
                onClick={handleDelete}
                disabled={deleting}
                className="flex items-center gap-1 text-sm text-red-600 hover:bg-red-50 px-3 py-1.5 rounded-lg border border-red-200 disabled:opacity-50"
              >
                <Trash2 className="h-4 w-4" />
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            )}
          </div>

          <div className="flex flex-wrap gap-2 mt-4">
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${STATUS_STYLES[bug.status]}`}>
              {bug.status.replace('_', ' ')}
            </span>
            <span className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${SEVERITY_STYLES[bug.severity]}`}>
              {bug.severity} severity
            </span>
            {bug.ai_status && bug.predicted_severity && (
              <span className="text-xs font-semibold px-2.5 py-1 rounded-full border bg-blue-50 text-blue-700 border-blue-200 flex items-center gap-1">
                <Sparkles className="h-3 w-3" /> AI predicted: {bug.predicted_severity}
              </span>
            )}
          </div>

          <p className="text-gray-700 mt-4 whitespace-pre-wrap">{bug.description}</p>
        </div>

        {/* ─── AI Actions ─────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="font-semibold text-gray-900">AI Assist</h2>
          {aiError && <p className="text-sm text-red-600">{aiError}</p>}

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleRoast}
              disabled={roastLoading}
              className="flex items-center gap-2 px-4 py-2 border border-gray-200 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {roastLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Flame className="h-4 w-4" />}
              Roast
            </button>
            <button
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

        {/* ─── Edit Form (role-aware) ─────────────── */}
        {canEdit && (
          <form onSubmit={handleSave} className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
            <h2 className="font-semibold text-gray-900">Edit</h2>
            {saveError && <p className="text-sm text-red-600">{saveError}</p>}

            {isReleaseManager && (
              <>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Title</label>
                  <input
                    name="title" value={editForm.title} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Severity</label>
                  <select name="severity" value={editForm.severity} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                    <option value="critical">Critical</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Priority</label>
                  <select name="priority" value={editForm.priority} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                    <option value="low">Low</option>
                    <option value="medium">Medium</option>
                    <option value="high">High</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm text-gray-700 mb-1">Assigned To (User ID)</label>
                  <input
                    name="assigned_to" value={editForm.assigned_to} onChange={handleEditChange}
                    className="w-full border border-gray-300 rounded-lg px-3 py-2"
                  />
                </div>
              </>
            )}

            {isQA && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Reassign To (User ID)</label>
                <input
                  name="assigned_to" value={editForm.assigned_to} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
                <p className="text-xs text-gray-400 mt-1">
                  QA can only reassign here — use the QA result endpoint to pass/fail.
                </p>
              </div>
            )}

            {isDeveloper && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Description</label>
                <textarea
                  name="description" rows={4} value={editForm.description} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2"
                />
              </div>
            )}

            {(isReleaseManager || isDeveloper) && (
              <div>
                <label className="block text-sm text-gray-700 mb-1">Status</label>
                <select name="status" value={editForm.status} onChange={handleEditChange}
                  className="w-full border border-gray-300 rounded-lg px-3 py-2 bg-white">
                  <option value="open">Open</option>
                  <option value="in_progress">In Progress</option>
                  <option value="resolved">Resolved</option>
                  {isReleaseManager && <option value="closed">Closed</option>}
                </select>
                {isDeveloper && (
                  <p className="text-xs text-gray-400 mt-1">
                    Developers can't set status to "Closed" — that happens automatically when QA passes the bug.
                  </p>
                )}
              </div>
            )}

            <button
              type="submit"
              disabled={saving}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-5 py-2 rounded-lg font-medium disabled:opacity-70"
            >
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
              Save Changes
            </button>
          </form>
        )}

        {/* ─── Comments ───────────────────────────── */}
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

          <form onSubmit={handleAddComment} className="flex gap-2 pt-2">
            <input
              value={commentText}
              onChange={(e) => setCommentText(e.target.value)}
              placeholder="Add a comment..."
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={commentSubmitting}
              className="px-4 py-2 bg-gray-900 text-white rounded-lg text-sm font-medium disabled:opacity-60"
            >
              Post
            </button>
          </form>
        </div>

        {/* ─── History ────────────────────────────── */}
        <div className="bg-white rounded-xl border border-gray-200 p-6 space-y-3">
          <h2 className="font-semibold text-gray-900 flex items-center gap-2">
            <Clock className="h-4 w-4" /> History
          </h2>
          {history.length === 0 && (
            <p className="text-sm text-gray-400">No status changes yet.</p>
          )}
          {history.map((h) => (
            <div key={h.id} className="text-sm text-gray-600 flex justify-between border-b border-gray-50 pb-2">
              <span>
                <span className="font-medium text-gray-800">{h.changed_by_name}</span>{' '}
                changed status from <span className="capitalize">{h.old_status}</span> →{' '}
                <span className="capitalize font-medium">{h.new_status}</span>
              </span>
              <span className="text-gray-400">{new Date(h.changed_at).toLocaleString()}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}