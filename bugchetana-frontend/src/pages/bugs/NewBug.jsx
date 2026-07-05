import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/context/ProjectContext';
import { createBug } from '@/api/bugs';
import { getRoast } from '@/api/ai';
import { Bug, Flame, Loader2, CheckCircle2, Sparkles } from 'lucide-react';

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

export default function NewBug() {
  const navigate = useNavigate();
  const { currentProject, loadingProjects } = useProject();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // Set once the bug is successfully created — switches the UI to the success panel
  const [createdBug, setCreatedBug] = useState(null);

  // Roast Mode state — only usable after the bug exists
  const [roast, setRoast] = useState(null);
  const [roastLoading, setRoastLoading] = useState(false);
  const [roastError, setRoastError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProject) {
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const bug = await createBug(currentProject.id, formData);
      setCreatedBug(bug);
    } catch (err) {
      console.error(err);
      setError(extractApiError(err, "Failed to submit bug. Please try again."));
    } finally {
      setLoading(false);
    }
  };

  const canSubmit = Boolean(currentProject) && !loadingProjects;

  const handleRoast = async () => {
    if (!createdBug) return;
    setRoastLoading(true);
    setRoastError(null);
    try {
      const data = await getRoast(createdBug.id);
      setRoast(data.roast_commentary);
    } catch (err) {
      console.error(err);
      setRoastError("Roast unavailable right now — try again shortly.");
    } finally {
      setRoastLoading(false);
    }
  };

  // ─── Success panel — shown after the bug is created ───────────────
  if (createdBug) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
        <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
          <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-lg">
              <CheckCircle2 className="h-5 w-5 text-green-600" />
            </div>
            <h2 className="text-xl font-semibold text-gray-900">Bug Submitted</h2>
          </div>

          <div className="p-6 space-y-5">
            <div>
              <p className="text-sm text-gray-500 mb-1">Title</p>
              <p className="font-medium text-gray-900">{createdBug.title}</p>
            </div>

            <div className="flex items-center gap-3">
              {createdBug.ai_status ? (
                <div className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4 text-blue-500" />
                  <span className="text-sm text-gray-600">AI-predicted severity:</span>
                  <span
                    className={`text-xs font-semibold px-2.5 py-1 rounded-full border capitalize ${
                      SEVERITY_STYLES[createdBug.predicted_severity] || SEVERITY_STYLES.medium
                    }`}
                  >
                    {createdBug.predicted_severity}
                  </span>
                </div>
              ) : (
                <p className="text-xs text-gray-400">
                  AI severity prediction wasn't available for this bug — using default.
                </p>
              )}
            </div>

            <div className="pt-2 border-t border-gray-100">
              {!roast && (
                <button
                  type="button"
                  onClick={handleRoast}
                  disabled={roastLoading}
                  className="flex items-center space-x-2 px-4 py-2 border border-gray-200 text-gray-700 bg-gray-50 hover:bg-gray-100 rounded-lg text-sm font-medium transition-colors disabled:opacity-60"
                >
                  {roastLoading ? (
                    <>
                      <Loader2 className="h-4 w-4 animate-spin" />
                      <span>Roasting...</span>
                    </>
                  ) : (
                    <>
                      <Flame className="h-4 w-4" />
                      <span>Roast Mode</span>
                    </>
                  )}
                </button>
              )}

              {roastError && (
                <p className="text-sm text-red-600 mt-2">{roastError}</p>
              )}

              {roast && (
                <div className="mt-3 bg-orange-50 border border-orange-200 rounded-lg p-4 text-sm text-gray-800">
                  <div className="flex items-center gap-2 mb-1 text-orange-700 font-medium">
                    <Flame className="h-4 w-4" />
                    <span>Roast</span>
                  </div>
                  {roast}
                </div>
              )}
            </div>

            <div className="pt-4 flex gap-3">
              <button
                type="button"
                onClick={() => navigate('/dashboard')}
                className="flex-1 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors"
              >
                Go to Dashboard
              </button>
              <button
                type="button"
                onClick={() => {
                  setCreatedBug(null);
                  setRoast(null);
                  setFormData({ title: '', description: '', severity: 'medium' });
                }}
                className="px-6 py-2 border border-gray-200 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors"
              >
                Submit Another
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ─── Form ───────────────────────────────────────────────────────
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center p-4">
      <div className="w-full max-w-2xl bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
        <div className="p-6 border-b border-gray-100 flex items-center space-x-3">
          <div className="bg-blue-100 p-2 rounded-lg">
            <Bug className="h-5 w-5 text-blue-600" />
          </div>
          <h2 className="text-xl font-semibold text-gray-900">Submit New Bug</h2>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          {loadingProjects && (
            <p className="text-sm text-gray-500">Loading projects...</p>
          )}
          {!loadingProjects && !currentProject && (
            <p className="text-sm text-amber-600 font-medium">No project selected.</p>
          )}
          {error && (
            <div className="bg-red-50 text-red-600 p-3 rounded-lg text-sm font-medium">
              {error}
            </div>
          )}

          <div className="space-y-4">
            <div>
              <label htmlFor="title" className="block text-sm font-medium text-gray-700 mb-1">
                Bug Title <span className="text-red-500">*</span>
              </label>
              <input
                type="text"
                id="title"
                name="title"
                required
                value={formData.title}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow"
                placeholder="Brief description of the issue"
              />
            </div>

            <div>
              <label htmlFor="description" className="block text-sm font-medium text-gray-700 mb-1">
                Description <span className="text-red-500">*</span>
              </label>
              <textarea
                id="description"
                name="description"
                required
                rows={5}
                value={formData.description}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-shadow resize-y"
                placeholder="Steps to reproduce, expected behavior, actual behavior..."
              />
            </div>

            <div>
              <label htmlFor="severity" className="block text-sm font-medium text-gray-700 mb-1">
                Severity <span className="text-red-500">*</span>
              </label>
              <select
                id="severity"
                name="severity"
                value={formData.severity}
                onChange={handleChange}
                className="w-full border border-gray-300 rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white transition-shadow"
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
                <option value="critical">Critical</option>
              </select>
              <p className="text-xs text-gray-400 mt-1">
                AI will also suggest a severity automatically once submitted.
              </p>
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex justify-end">
            <button
              type="submit"
              disabled={loading || !canSubmit}
              className="flex items-center justify-center space-x-2 bg-blue-600 hover:bg-blue-700 text-white px-6 py-2 rounded-lg font-medium transition-colors shadow-sm disabled:opacity-70 disabled:cursor-not-allowed"
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  <span>Submitting...</span>
                </>
              ) : (
                <span>Submit Bug</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}