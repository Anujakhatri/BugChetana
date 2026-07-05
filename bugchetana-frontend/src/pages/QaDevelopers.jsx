import React, { useState, useEffect } from 'react';
import { Loader2 } from 'lucide-react';
import { getUsers } from '@/api/users';
import PageContainer from '@/components/layout/PageContainer';

export default function QaDevelopers() {
  const [developers, setDevelopers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    getUsers({ role: 'Developer' })
      .then(setDevelopers)
      .catch(() => setError('Failed to load developers.'))
      .finally(() => setLoading(false));
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <PageContainer maxWidth="3xl">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Developers</h1>
          <p className="text-sm text-gray-500 mt-1">
            Developers available for bug and project assignment.
          </p>
        </div>

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden">
          {developers.length === 0 ? (
            <p className="p-6 text-center text-gray-500 text-sm">No developers found.</p>
          ) : (
            <div className="divide-y divide-gray-100">
              {developers.map((dev) => (
                <div key={dev.id} className="p-4 flex items-center justify-between">
                  <div>
                    <p className="font-medium text-gray-900">{dev.name}</p>
                    <p className="text-sm text-gray-500">{dev.email}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs bg-blue-50 text-blue-700 px-2 py-1 rounded-full">
                      {dev.assigned_bug_count ?? 0} assigned bugs
                    </span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
    </PageContainer>
  );
}
