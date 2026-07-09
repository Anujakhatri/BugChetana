import { useState, useEffect, useCallback } from 'react';
import api from '@/api/axiosInstance';
import { projectUrl } from '@/api/projects.js';
import { useProject } from '@/context/ProjectContext';

export function useDashboardSummary() {
  const [summary, setSummary] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentProject, setCurrentProject, availableProjects } = useProject();
  const projectId = currentProject?.id ?? null;

  const setProjectId = useCallback(
    (id) => {
      if (!id) {
        setCurrentProject(null);
        return;
      }
      const project = availableProjects.find((p) => String(p.id) === String(id));
      if (project) setCurrentProject(project);
    },
    [availableProjects, setCurrentProject],
  );

  const fetchDashboardData = useCallback(async () => {
    if (!projectId) {
      setSummary(null);
      setBugs([]);
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, bugsRes] = await Promise.all([
        api.get(projectUrl(projectId, 'dashboard/')),
        api.get(projectUrl(projectId, 'bugs/')),
      ]);
      setSummary(summaryRes.data);
      setBugs(bugsRes.data);
    } catch (err) {
      console.error('Dashboard fetch error', err);
      setError('Failed to load dashboard data.');
    } finally {
      setLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  return {
    summary,
    bugs,
    setBugs,
    loading,
    error,
    refetch: fetchDashboardData,
    projectId,
    setProjectId,
    projects: availableProjects,
  };
}
