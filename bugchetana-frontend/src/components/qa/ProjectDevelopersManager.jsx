import React, { useEffect, useState } from 'react';
import { Users, Plus, Trash2 } from 'lucide-react';
import { getProjectMembers, addProjectMember, removeProjectMember } from '@/api/projects';
import { getUsers } from '@/api/users';

export default function ProjectDevelopersManager({ projectId }) {
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [devs, setDevs] = useState([]);
  const [search, setSearch] = useState('');
  const [adding, setAdding] = useState(false);

  useEffect(() => {
    if (!projectId) return;
    setLoading(true);
    Promise.all([getProjectMembers(projectId), getUsers({ role: 'Developer' })])
      .then(([m, users]) => {
        setMembers(m);
        setDevs(users || []);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [projectId]);

  const handleAdd = async (userId) => {
    setAdding(true);
    try {
      const res = await addProjectMember(projectId, userId);
      setMembers((prev) => [...prev, res.member || res]);
      setSearch('');
    } catch (err) {
      console.error(err);
      alert('Failed to add developer.');
    } finally {
      setAdding(false);
    }
  };

  const handleRemove = async (userId) => {
    try {
      await removeProjectMember(projectId, userId);
      setMembers((prev) => prev.filter((m) => m.user !== userId));
    } catch (err) {
      console.error(err);
      alert('Failed to remove developer.');
    }
  };

  const existingIds = new Set(members.map((m) => m.user));

  const candidates = devs.filter((d) => !existingIds.has(d.id) && (!search || d.name.toLowerCase().includes(search.toLowerCase()) || d.email.toLowerCase().includes(search.toLowerCase())));

  return (
    <div className="bg-white rounded-2xl border border-slate-100 shadow-sm overflow-hidden">
      <div className="px-6 py-5 border-b border-slate-100 flex items-center justify-between">
        <h3 className="text-base font-semibold text-slate-800 flex items-center gap-2"><Users className="h-4 w-4" /> Project Developers</h3>
      </div>
      <div className="p-5 space-y-4">
        {loading ? (
          <p className="text-sm text-slate-500">Loading developers...</p>
        ) : (
          <div className="space-y-3">
            {members.length === 0 ? (
              <p className="text-sm text-slate-400">No developers assigned to this project.</p>
            ) : (
              members.map((m) => (
                <div key={m.user} className="flex items-center justify-between gap-3">
                  <div className="text-sm text-slate-700">{m.user_name || m.name || m.email}</div>
                  <div className="flex items-center gap-2">
                    <button onClick={() => handleRemove(m.user)} className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center gap-2">
                      <Trash2 className="h-4 w-4" /> Remove
                    </button>
                  </div>
                </div>
              ))
            )}

            <div className="pt-3">
              <label className="block text-xs font-medium text-slate-600 mb-1">Add developer</label>
              <div className="flex gap-2">
                <input value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Search developers by name or email" className="flex-1 border border-slate-200 rounded-xl px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500" />
                <div className="w-40">
                  <select value="" onChange={(e) => handleAdd(Number(e.target.value))} className="w-full border border-slate-200 rounded-xl px-3 py-2 text-sm">
                    <option value="">Select developer</option>
                    {candidates.map((c) => (
                      <option key={c.id} value={c.id}>{c.name} ({c.email})</option>
                    ))}
                  </select>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
