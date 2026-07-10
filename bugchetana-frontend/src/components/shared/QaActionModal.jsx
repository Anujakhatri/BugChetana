import React, { useState } from 'react';
import { X, Loader2 } from 'lucide-react';

export default function QaActionModal({ open, onClose, actionType, onSubmit }) {
  const [notes, setNotes] = useState('');
  const [loading, setLoading] = useState(false);

  if (!open) return null;

  const isFail = actionType === 'fail';
  const title = isFail ? 'Fail Bug' : 'Reassign Bug';
  const label = isFail ? 'Reason for failure' : 'Reason for reassignment';
  const submitText = isFail ? 'Submit Failure' : 'Reassign';
  const buttonColor = isFail ? 'bg-rose-600 hover:bg-rose-700' : 'bg-blue-600 hover:bg-blue-700';

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!notes.trim()) return;

    setLoading(true);
    try {
      await onSubmit(notes.trim());
      setNotes('');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-2xl border border-slate-100 shadow-xl w-full max-w-sm p-6"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-start justify-between mb-4">
          <h3 className="text-lg font-semibold text-slate-800">{title}</h3>
          <button type="button" onClick={onClose} className="text-slate-400 hover:text-slate-600">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label htmlFor="notes" className="block text-sm font-medium text-slate-700 mb-1">
              {label} <span className="text-rose-500">*</span>
            </label>
            <textarea
              id="notes"
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Please provide details..."
              rows={3}
              className="w-full border border-slate-200 rounded-xl px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 resize-none"
              disabled={loading}
              autoFocus
            />
          </div>

          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              disabled={loading}
              className="flex-1 px-4 py-2.5 border border-slate-200 text-slate-700 rounded-xl text-sm font-medium hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={!notes.trim() || loading}
              className={`flex-1 flex items-center justify-center gap-2 px-4 py-2.5 text-white rounded-xl text-sm font-semibold transition-colors disabled:opacity-50 ${buttonColor}`}
            >
              {loading && <Loader2 className="h-4 w-4 animate-spin" />}
              {submitText}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
