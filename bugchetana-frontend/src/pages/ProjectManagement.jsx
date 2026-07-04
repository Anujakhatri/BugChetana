import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/context/AuthContext';
import {
  getProjects, createProject, updateProject, deleteProject,
  getProjectMembers, addProjectMember, removeProjectMember,
} from '@/api/projects';
import { Plus, Trash2, Users, Loader2, X, Pencil } from 'lucide-react';

export default function ProjectManagement() {
  const { user } = useAuth();
  const isRM = user?.roleName === 'Release Manager';

  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // create form
  const [newName, setNewName] = useState('');
  const [creating, setCreating] = useState(false);

  // inline rename
  const [editingId, setEditingId] = useState(null);
  const [editName, setEditName] = useState('');

  // member panel — which project is expanded
  const [expandedId, setExpandedId] = useState(null);
  const [members, setMembers] = useState([]);
  const [membersLoading, setMembersLoading] = useState(false);
  const [newMemberUserId, setNewMemberUserId] = useState('');
  const [memberError, setMemberError] = useState(null);

  const loadProjects = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const data = await getProjects();
      setProjects(data);
    } catch (err) {
      console.error(err);
      setError('Failed to load projects.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    loadProjects();
  }, [loadProjects]);

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newName.trim()) return;
    setCreating(true);
    try {
      const project = await createProject({ name: newName.trim() });
      setProjects([...projects, project]);
      setNewName('');
    } catch (err) {
      console.error(err);
      setError('Failed to create project.');
    } finally {
      setCreating(false);
    }
  };

  const startEdit = (project) => {
    setEditingId(project.id);
    setEditName(project.name);
  };

  const saveEdit = async (projectId) => {
    try {
      const updated = await updateProject(projectId, { name: editName.trim() });
      setProjects(projects.map(p => p.id === projectId ? updated : p));
      setEditingId(null);
    } catch (err) {
      console.error(err);
      setError('Failed to rename project.');
    }
  };

  const handleDelete = async (projectId) => {
    if (!window.confirm('Delete this project? This cannot be undone.')) return;
    try {
      await deleteProject(projectId);
      setProjects(projects.filter(p => p.id !== projectId));
    } catch (err) {
      console.error(err);
      setError('Failed to delete project.');
    }
  };

  const toggleMembers = async (projectId) => {
    if (expandedId === projectId) {
      setExpandedId(null);
      return;
    }
    setExpandedId(projectId);
    setMembersLoading(true);
    setMemberError(null);
    try {
      const data = await getProjectMembers(projectId);
      setMembers(data);
    } catch (err) {
      console.error(err);
      setMemberError('Failed to load members.');
    } finally {
      setMembersLoading(false);
    }
  };

  const handleAddMember = async (projectId) => {
    if (!newMemberUserId.trim()) return;
    setMemberError(null);
    try {
      const newMember = await addProjectMember(projectId, newMemberUserId.trim());
      setMembers([...members, newMember.member || newMember]);
      setNewMemberUserId('');
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, member_count: p.member_count + 1 } : p
      ));
    } catch (err) {
      console.error(err);
      setMemberError(err.response?.data?.error || 'Failed to add member — check the User ID.');
    }
  };

  const handleRemoveMember = async (projectId, userId) => {
    try {
      await removeProjectMember(projectId, userId);
      setMembers(members.filter(m => m.user !== userId));
      setProjects(projects.map(p =>
        p.id === projectId ? { ...p, member_count: p.member_count - 1 } : p
      ));
    } catch (err) {
      console.error(err);
      setMemberError('Failed to remove member.');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 p-4 md:p-8">
      <div className="max-w-3xl mx-auto space-y-6">
        <h1 className="text-xl font-semibold text-gray-900">Projects</h1>

        {error && <p className="text-sm text-red-600">{error}</p>}

        {/* Create — RM only (backend also enforces this via IsReleaseManager on POST) */}
        {isRM && (
          <form onSubmit={handleCreate} className="bg-white rounded-xl border border-gray-200 p-4 flex gap-2">
            <input
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="New project name"
              className="flex-1 border border-gray-300 rounded-lg px-3 py-2 text-sm"
            />
            <button
              type="submit"
              disabled={creating}
              className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg text-sm font-medium disabled:opacity-60"
            >
              {creating ? <Loader2 className="h-4 w-4 animate-spin" /> : <Plus className="h-4 w-4" />}
              Create
            </button>
          </form>
        )}

        {/* Project list */}
        <div className="space-y-3">
          {projects.length === 0 && (
            <p className="text-sm text-gray-400">No projects yet.</p>
          )}
          {projects.map((project) => {
            const isOwnProject = project.release_manager === user?.id;
            const canManage = isRM && isOwnProject;

            return (
              <div key={project.id} className="bg-white rounded-xl border border-gray-200 overflow-hidden">
                <div className="p-4 flex items-center justify-between gap-3">
                  {editingId === project.id ? (
                    <input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onBlur={() => saveEdit(project.id)}
                      onKeyDown={(e) => e.key === 'Enter' && saveEdit(project.id)}
                      autoFocus
                      className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                    />
                  ) : (
                    <div>
                      <p className="font-medium text-gray-900">{project.name}</p>
                      <p className="text-xs text-gray-500">
                        RM: {project.release_manager_name || 'Unassigned'} · {project.member_count} members
                      </p>
                    </div>
                  )}

                  <div className="flex items-center gap-1 shrink-0">
                    <button
                      onClick={() => toggleMembers(project.id)}
                      className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                      title="Manage members"
                    >
                      <Users className="h-4 w-4" />
                    </button>
                    {canManage && (
                      <>
                        <button
                          onClick={() => startEdit(project)}
                          className="p-2 text-gray-500 hover:bg-gray-100 rounded-lg"
                          title="Rename"
                        >
                          <Pencil className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleDelete(project.id)}
                          className="p-2 text-red-500 hover:bg-red-50 rounded-lg"
                          title="Delete"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      </>
                    )}
                  </div>
                </div>

                {/* Members panel */}
                {expandedId === project.id && (
                  <div className="border-t border-gray-100 p-4 bg-gray-50 space-y-3">
                    {membersLoading ? (
                      <Loader2 className="h-4 w-4 animate-spin text-gray-400" />
                    ) : (
                      <>
                        {memberError && <p className="text-xs text-red-600">{memberError}</p>}
                        {members.length === 0 && (
                          <p className="text-xs text-gray-400">No members yet.</p>
                        )}
                        {members.map((m) => (
                          <div key={m.id} className="flex items-center justify-between text-sm bg-white rounded-lg border border-gray-100 px-3 py-2">
                            <div>
                              <span className="font-medium text-gray-800">{m.user_name}</span>
                              <span className="text-gray-400 ml-2">{m.user_email}</span>
                              <span className="ml-2 text-xs bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full">{m.role}</span>
                            </div>
                            {canManage && (
                              <button
                                onClick={() => handleRemoveMember(project.id, m.user)}
                                className="text-gray-400 hover:text-red-600"
                              >
                                <X className="h-4 w-4" />
                              </button>
                            )}
                          </div>
                        ))}

                        {canManage && (
                          <div className="flex gap-2 pt-2">
                            <input
                              value={newMemberUserId}
                              onChange={(e) => setNewMemberUserId(e.target.value)}
                              placeholder="User ID to add"
                              className="flex-1 border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
                            />
                            <button
                              onClick={() => handleAddMember(project.id)}
                              className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium"
                            >
                              Add
                            </button>
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}