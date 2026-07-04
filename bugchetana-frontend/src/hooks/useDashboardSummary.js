import { useState, useEffect } from 'react';
import api from '@/api/axiosInstance';
import { useProject } from '@/context/ProjectContext';

export function useDashboardSummary() {
  const [summary, setSummary] = useState(null);
  const [bugs, setBugs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const { currentProject } = useProject();
  const projectId = currentProject?.id;

  const fetchDashboardData = async () => {
    if (!projectId) return;
    setLoading(true);
    setError(null);
    try {
      const [summaryRes, bugsRes] = await Promise.all([
        api.get(`/projects/${projectId}/dashboard/`),
        api.get(`/projects/${projectId}/bugs/`)
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
