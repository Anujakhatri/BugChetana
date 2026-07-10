import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Bug, Sparkles, Loader2, Flame, Wrench, CheckCircle2 } from 'lucide-react';
import { predictSeverity, guestAiReview } from '@/api/ai';
import { createBug } from '@/api/bugs';
import { useAuth } from '@/context/AuthContext';
import { useProject } from '@/context/ProjectContext';
import { homeFor } from '@/pages/roleHome';
import bugchetanaIcon from '@/assets/bugchetana-icon.svg';

const SEVERITY_STYLES = {
  low: 'bg-green-50 text-green-700 border-green-200',
  medium: 'bg-yellow-50 text-yellow-700 border-yellow-200',
  high: 'bg-orange-50 text-orange-700 border-orange-200',
  critical: 'bg-red-50 text-red-700 border-red-200',
};

function extractApiError(err, fallback) {
  const data = err.response?.data;
  if (!data) return fallback;
  if (typeof data === 'string') return data;
  if (data.detail) return data.detail;
  if (data.error) return data.error;
  const firstKey = Object.keys(data)[0];
  if (!firstKey) return fallback;
  const val = data[firstKey];
  return Array.isArray(val) ? val[0] : String(val);
}

export default function SubmitBug({ severityOnly = false, isAuthenticated = false }) {
  const { user } = useAuth();
  const { currentProject, loadingProjects } = useProject();
  const navigate = useNavigate();

  const [formData, setFormData] = useState({ title: '', description: '' });
  const [prediction, setPrediction] = useState(null);
  const [predictLoading, setPredictLoading] = useState(false);
  const [predictError, setPredictError] = useState(null);
  const [review, setReview] = useState(null);
  const [reviewLoading, setReviewLoading] = useState(false);
  const [reviewError, setReviewError] = useState(null);

  // Authenticated path: state for actually persisting a Bug.
  const [submitLoading, setSubmitLoading] = useState(false);
  const [submitError, setSubmitError] = useState(null);
  const [createdBug, setCreatedBug] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
    setPrediction(null);
    setPredictError(null);
    setReview(null);
    setReviewError(null);
  };

  const handlePredict = async () => {
    if (!formData.title.trim() && !formData.description.trim()) {
      setPredictError('Enter a title or description to predict severity.');
      return;
    }

    setPredictLoading(true);
    setPredictError(null);
    setPrediction(null);
    setReview(null);
    setReviewError(null);

    try {
      const result = await predictSeverity(formData);
      setPrediction(result);
    } catch (err) {
      console.error(err);
      setPredictError(extractApiError(err, 'Failed to predict severity. Please try again.'));
    } finally {
      setPredictLoading(false);
    }
  };

  const handleAiReview = async () => {
    if (!prediction) return;

    setReviewLoading(true);
    setReviewError(null);
    setReview(null);

    try {
      const result = await guestAiReview({
        title: formData.title,
        description: formData.description,
        severity: prediction.severity,
      });
      setReview(result);
    } catch (err) {
      console.error(err);
      setReviewError(extractApiError(err, 'Failed to load AI review. Please try again.'));
    } finally {
      setReviewLoading(false);
    }
  };

  const handleSubmitBug = async () => {
    if (!currentProject) {
      setSubmitError('Select a project before submitting.');
      return;
    }
    if (!formData.title.trim() || !formData.description.trim()) {
      setSubmitError('Title and description are required.');
      return;
    }

    setSubmitLoading(true);
    setSubmitError(null);
    try {
      // The server runs predict_severity() in perform_create and stores
      // the authoritative predicted_severity on the Bug; we just pass
      // the user-chosen severity (defaulting to the AI hint when present).
      const payload = {
        title: formData.title,
        description: formData.description,
        severity: prediction?.severity || 'medium',
      };
      const bug = await createBug(currentProject.id, payload);
      setCreatedBug(bug);
    } catch (err) {
      console.error(err);
      setSubmitError(extractApiError(err, 'Failed to submit bug. Please try again.'));
    } finally {
      setSubmitLoading(false);
    }
  };

  const canReview = Boolean(prediction) && !predictLoading;
  const canSubmit = Boolean(currentProject) && !loadingProjects && !submitLoading;

  // ─── Success panel — shown after the bug is created (authenticated path) ──
  if (createdBug) {
    return (
      <div className="w-full max-w-2xl mx-auto bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center space-x-3">
          <div className="bg-green-100 p-2 rounded-lg">
            <CheckCircle2 className="h-5 w-5 text-green-600" />
          </div>
          <h2 className="text-xl font-semibold text-slate-900">Bug Submitted</h2>
        </div>
        <div className="p-6 space-y-4">
          <div>
            <p className="text-sm text-slate-500 mb-1">Title</p>
            <p className="font-medium text-slate-900">{createdBug.title}</p>
          </div>
          {createdBug.predicted_severity && (
            <div className="flex items-center gap-2 text-sm text-slate-600">
              <Sparkles className="h-4 w-4 text-blue-500" />
              <span>AI-predicted severity:</span>
              <span
                className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-semibold border capitalize ${
                  SEVERITY_STYLES[createdBug.predicted_severity] || SEVERITY_STYLES.medium
                }`}
              >
                {createdBug.predicted_severity}
              </span>
            </div>
          )}
          <div className="pt-4 flex gap-3">
            <button
              type="button"
              onClick={() => navigate(homeFor(user?.roleName || ''))}
              className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
            >
              Go to Dashboard
            </button>
            <button
              type="button"
              onClick={() => {
                setCreatedBug(null);
                setFormData({ title: '', description: '' });
                setPrediction(null);
                setPredictError(null);
                setReview(null);
                setReviewError(null);
                setSubmitError(null);
              }}
              className="px-6 py-2 border border-slate-200 text-slate-700 rounded-lg font-medium hover:bg-slate-50 transition-colors"
            >
              Submit Another
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      className={
        isAuthenticated
          ? 'space-y-6'
          : 'min-h-screen bg-slate-50 px-4 sm:px-6 lg:px-8 pt-24 pb-16'
      }
    >
      <div className="w-full max-w-2xl mx-auto space-y-6">
        {!isAuthenticated && (
          <div className="text-center mb-8">
            <div className="inline-flex items-center justify-center w-14 h-14 rounded-xl bg-blue-100 mb-4 overflow-hidden">
              <img src={bugchetanaIcon} alt="BugChetana" className="w-full h-full object-contain" />
            </div>
            <h1 className="text-3xl font-bold text-slate-900">Try Bug Prediction</h1>
            <p className="text-slate-600 mt-2">
              Test AI severity prediction without creating an account or saving a bug record.
            </p>
          </div>
        )}

        <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-6 space-y-5">
          <div>
            <label htmlFor="title" className="block text-sm font-medium text-slate-700 mb-1">
              Bug Title
            </label>
            <input
              id="title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              placeholder="e.g. Login button unresponsive on mobile"
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div>
            <label htmlFor="description" className="block text-sm font-medium text-slate-700 mb-1">
              Description
            </label>
            <textarea
              id="description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={5}
              placeholder="Describe steps to reproduce, expected vs actual behavior..."
              className="w-full border border-slate-300 rounded-lg px-4 py-2.5 focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y"
            />
          </div>

          {predictError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {predictError}
            </p>
          )}

          {prediction && (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 space-y-2">
              <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                <Sparkles className="h-4 w-4 text-blue-500" />
                AI Severity Prediction
              </div>
              <div className="flex items-center gap-3 flex-wrap">
                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-sm font-semibold border capitalize ${
                    SEVERITY_STYLES[prediction.severity] || SEVERITY_STYLES.medium
                  }`}
                >
                  {prediction.severity}
                </span>
                <p className="text-sm text-slate-700">
                  {prediction.display_message}
                </p>
              </div>
            </div>
          )}

          {reviewError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {reviewError}
            </p>
          )}

          {review && (
            <div className="space-y-3">
              <div className="bg-orange-50 border border-orange-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-orange-800 mb-2">
                  <Flame className="h-4 w-4" />
                  Roast
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{review.roast}</p>
              </div>
              <div className="bg-teal-50 border border-teal-200 rounded-xl p-4">
                <div className="flex items-center gap-2 text-sm font-medium text-teal-800 mb-2">
                  <Wrench className="h-4 w-4" />
                  Fix Suggestions
                </div>
                <p className="text-sm text-slate-800 whitespace-pre-wrap">{review.fix_suggestions}</p>
              </div>
            </div>
          )}

          {submitError && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              {submitError}
            </p>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            <button
              type="button"
              onClick={handlePredict}
              disabled={predictLoading}
              className={`flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:opacity-60 text-white px-6 py-2.5 rounded-lg font-medium transition-colors ${isAuthenticated ? 'flex-1' : 'w-full'}`}
            >
              {predictLoading ? (
                <Loader2 className="h-4 w-4 animate-spin" />
              ) : (
                <Sparkles className="h-4 w-4" />
              )}
              Predict Severity
            </button>
            {isAuthenticated ? (
              <button
                type="button"
                onClick={handleSubmitBug}
                disabled={!canSubmit}
                className="flex-1 flex items-center justify-center gap-2 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-50 disabled:cursor-not-allowed text-white px-6 py-2.5 rounded-lg font-medium transition-colors"
              >
                {submitLoading ? (
                  <Loader2 className="h-4 w-4 animate-spin" />
                ) : (
                  <CheckCircle2 className="h-4 w-4" />
                )}
                Submit Bug
              </button>
            ) : (
              !severityOnly && (
                <button
                  type="button"
                  onClick={handleAiReview}
                  disabled={!canReview || reviewLoading}
                  className="flex-1 flex items-center justify-center gap-2 border border-slate-300 text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed px-6 py-2.5 rounded-lg font-medium transition-colors"
                >
                  {reviewLoading ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <Flame className="h-4 w-4 text-orange-500" />
                  )}
                  AI Review
                </button>
              )
            )}
          </div>

          {isAuthenticated && !currentProject && !loadingProjects && (
            <p className="text-xs text-amber-600 text-center">
              Select a project from the sidebar to submit a bug.
            </p>
          )}

          {!isAuthenticated && prediction && !review && !reviewLoading && !severityOnly && (
            <p className="text-xs text-slate-500 text-center">
              AI Review is available after prediction — no login required.
            </p>
          )}
        </div>

        {!isAuthenticated && (
          <p className="text-center text-sm text-slate-500 mt-6">
            Want to track bugs in a project?{' '}
            <Link to="/register" className="text-blue-600 hover:text-blue-700 font-medium">
              Create an account
            </Link>{' '}
            or{' '}
            <Link to="/login" className="text-blue-600 hover:text-blue-700 font-medium">
              log in
            </Link>
            .
          </p>
        )}
      </div>
    </div>
  );
}
