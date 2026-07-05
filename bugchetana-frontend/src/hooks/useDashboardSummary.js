import { useState, useEffect } from 'react';
import api from '@/api/axiosInstance';
import { projectUrl } from '@/api/projects.js';
import { useProject } from '@/context/ProjectContext';

export function useDashboardSummary() {
  const [summary, setSummary] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const fetchDashboardData = async () => {
    if (!projectId) {
      setLoading(false);
      return;
    }
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, bugsRes] = await Promise.all([
        api.get(projectUrl(projectId, 'dashboard/')),
        api.get(projectUrl(projectId, 'bugs/'))
      ]);
      setSummary(summaryRes.data);
      setBugs(bugsRes.data);
    } catch (err) {
      console.error("Dashboard fetch error", err);
      setError("Failed to load dashboard data.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboardData();
  }, [projectId]);

  return { summary, bugs, setBugs, loading, error, refetch: fetchDashboardData, projectId };
}
