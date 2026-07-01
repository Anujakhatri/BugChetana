import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useProject } from '@/context/ProjectContext';
import { createBug } from '@/api/bugs';
import { Bug, Sparkles, Flame, Loader2 } from 'lucide-react';

export default function NewBug() {
  const navigate = useNavigate();
  const { currentProject } = useProject();

  const [formData, setFormData] = useState({
    title: '',
    description: '',
    severity: 'medium',
  });

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const handleChange = (e) => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!currentProject) {
      setError("No project selected.");
      return;
    }

    if (!formData.title.trim() || !formData.description.trim()) {
      setError("Title and description are required.");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      await createBug(currentProject.id, formData);
      navigate('/dashboard'); // Optionally, you could pass a success state or use a toast here
    } catch (err) {
      console.error(err);
      setError(err.response?.data?.detail || "Failed to submit bug. Please try again.");
    } finally {
      setLoading(false);
    }
  };

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
            </div>
          </div>

          <div className="pt-4 border-t border-gray-100 flex flex-wrap gap-4 items-center justify-between">
            <div className="flex gap-3">
              <button
                type="button"
                disabled
                title="backend AI endpoint not yet available"
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 text-gray-400 bg-gray-50 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Sparkles className="h-4 w-4" />
                <span>AI Review</span>
              </button>

              <button
                type="button"
                disabled
                title="backend AI endpoint not yet available"
                className="flex items-center space-x-2 px-4 py-2 border border-gray-200 text-gray-400 bg-gray-50 rounded-lg text-sm font-medium cursor-not-allowed"
              >
                <Flame className="h-4 w-4" />
                <span>Roast Mode</span>
              </button>
            </div>

            <button
              type="submit"
              disabled={loading}
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
