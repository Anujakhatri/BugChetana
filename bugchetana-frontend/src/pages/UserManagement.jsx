import React, { useState, useEffect, useCallback } from 'react';
import { getUsers, getRoles, updateUserRole } from '@/api/users';
import PageContainer from '@/components/layout/PageContainer';
import { Loader2, Check } from 'lucide-react';
import {useAuth} from "@/context/AuthContext.jsx";

export default function UserManagement({ embedded = false }) {
  const { user: currentUser } = useAuth();

  const [users, setUsers] = useState([]);
  const [roles, setRoles] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const [savingUserId, setSavingUserId] = useState(null);
  const [savedUserId, setSavedUserId] = useState(null);
  const [roleErrors, setRoleErrors] = useState({});

  const load = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const [usersData, rolesData] = await Promise.all([getUsers(), getRoles()]);
      setUsers(usersData);
      setRoles(rolesData);
    } catch (err) {
      console.error(err);
      setError('Failed to load users or roles.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    load();
  }, [load]);

  const handleRoleChange = async (userId, roleId) => {
    setSavingUserId(userId);
    setSavedUserId(null);
    setRoleErrors({ ...roleErrors, [userId]: null });

    try {
      await updateUserRole(userId, Number(roleId));
      const roleName = roles.find(r => r.id === Number(roleId))?.name;
      setUsers(users.map(u => u.id === userId ? { ...u, role: roleName } : u));
      setSavedUserId(userId);
      setTimeout(() => setSavedUserId(null), 1500);
    } catch (err) {
      console.error(err);
      setRoleErrors({
        ...roleErrors,
        [userId]: err.response?.data?.message || 'Failed to update role.',
      });
    } finally {
      setSavingUserId(null);
    }
  };
  // Release Managers can only assign Developer / QA
  const isReleaseManager = currentUser?.roleName === 'Release Manager';
  const assignableRoles = isReleaseManager
    ? roles.filter(r => r.name !== 'Release Manager')
    : roles;
  // Admin manages everything; don't render Admin users as editable rows.
  const visibleUsers = users.filter(u => u.role !== 'Admin');

  if (loading) {
    return embedded ? (
      <div className="flex justify-center py-8">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    ) : (
      <div className="min-h-screen flex items-center justify-center">
        <Loader2 className="h-6 w-6 animate-spin text-gray-400" />
      </div>
    );
  }

  const content = (
    <>
        <h1 className="text-xl font-semibold text-gray-900">User Role Management</h1>
        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <table className="w-full text-sm">
            <thead className="bg-gray-50 border-b border-gray-200">
              <tr>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Name</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Email</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Role</th>
                <th className="text-left px-4 py-3 font-medium text-gray-500">Status</th>
              </tr>
            </thead>
            <tbody>
              {visibleUsers.map((u) => {
                const currentRole = roles.find(r => r.name === u.role);
                // If this user is already a Release Manager but the logged-in
                // Release Manager can't grant that role, keep it selectable
                // for THIS row only so the current value still displays correctly,
                // without letting them re-assign it to someone else.
                const optionsForRow =
                  isReleaseManager && currentRole?.name === 'Release Manager'
                    ? roles // show all so the existing "Release Manager" value renders
                    : assignableRoles;

                const rowDisabled =
                  savingUserId === u.id ||
                  (isReleaseManager && currentRole?.name === 'Release Manager');
                return (
                  <tr key={u.id} className="border-b border-gray-100 last:border-0">
                    <td className="px-4 py-3 text-gray-900">{u.name}</td>
                    <td className="px-4 py-3 text-gray-500">{u.email}</td>
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-2">
                        <select
                          value={currentRole?.id || ''}
                          onChange={(e) => handleRoleChange(u.id, e.target.value)}
                          disabled={rowDisabled}
                          className="border border-gray-300 rounded-lg px-2 py-1 text-sm bg-white disabled:opacity-60"
                        >
                          {optionsForRow.map((r) => (
                            <option key={r.id} value={r.id}>{r.name}</option>
                          ))}
                        </select>
                        {savingUserId === u.id && <Loader2 className="h-3.5 w-3.5 animate-spin text-gray-400" />}
                        {savedUserId === u.id && <Check className="h-3.5 w-3.5 text-green-600" />}
                      </div>
                      {roleErrors[u.id] && (
                        <p className="text-xs text-red-600 mt-1">{roleErrors[u.id]}</p>
                      )}
                    </td>
                    <td className="px-4 py-3">
                      <span className="text-xs bg-gray-100 text-gray-600 px-2 py-0.5 rounded-full capitalize">
                        {u.status || 'active'}
                      </span>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
    </>
  );

  if (embedded) {
    return <div className="space-y-4">{content}</div>;
  }

  return (
    <PageContainer maxWidth="3xl" innerClassName="space-y-4">
      {content}
    </PageContainer>
  );
}