import React, { useEffect, useState } from 'react';
import { Users, Trash2 } from 'lucide-react';
import { getProjectMembers, addProjectMember, removeProjectMember } from '@/api/projects';
import { getUsers } from '@/api/users';
import MemberSearchAdd from '@/components/shared/MemberSearchAdd';
import { useAuth } from '@/context/AuthContext';

export default function ProjectDevelopersManager({ projectId }) {
  const { user } = useAuth();
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(false);
  // Candidate pool is fetched with a server-side role filter — the QA flow
  // can only ever add Developer-role users, regardless of what they type in
  // the search box. (See UserListView in accounts/views.py — `?role=` filter.)
  const [devs, setDevs] = useState([]);

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
    try {
      const res = await addProjectMember(projectId, userId);
      setMembers((prev) => [...prev, res.member || res]);
    } catch (err) {
      console.error(err);
      alert('Failed to add developer.');
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
              members.map((m) => {
                // The backend already filters /api/projects/<id>/members/ to
                // Developer-role users, but we also guard here so the
                // logged-in user never sees a Remove button on their own
                // row. The backend independently rejects self-removal in
                // RemoveProjectMemberView — this is purely a UX layer.
                const isSelf = user != null && String(m.user) === String(user.id);
                return (
                  <div key={m.user} className="flex items-center justify-between gap-3">
                    <div className="text-sm text-slate-700">{m.user_name || m.name || m.email}</div>
                    <div className="flex items-center gap-2">
                      {isSelf ? (
                        <span
                          className="text-xs text-slate-400 italic"
                          title="You can't remove yourself from this project."
                        >
                          (you)
                        </span>
                      ) : (
                        <button onClick={() => handleRemove(m.user)} className="text-rose-600 hover:text-rose-700 text-sm font-medium flex items-center gap-2">
                          <Trash2 className="h-4 w-4" /> Remove
                        </button>
                      )}
                    </div>
                  </div>
                );
              })
            )}

            <MemberSearchAdd
              users={devs}
              existingMemberIds={members.map((m) => m.user)}
              onAdd={handleAdd}
            />
          </div>
        )}
      </div>
    </div>
  );
}
