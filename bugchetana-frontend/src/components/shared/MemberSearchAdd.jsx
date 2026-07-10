import React, { useState } from 'react';

// Search-and-add member control shared between the RM (ProjectManagement) and
// QA (ProjectDevelopersManager) flows.
//
// UX: a "Search by name or email…" input with a live-filtered dropdown of
// candidate users, plus an inline "Add" button. Behavior matches the inline
// implementation that previously lived in ProjectManagement.jsx.
//
// Role filtering is the CALLER's responsibility — the parent fetches the
// candidate list (e.g. `getUsers({ role: 'Developer' })` for the QA flow) and
// passes the result as `users`. This component does not look at user roles
// itself, so it stays reusable for the RM's dev+qa unfiltered list.
export default function MemberSearchAdd({
  users = [],
  existingMemberIds = [],
  onAdd,
  placeholder = 'Search by name or email…',
  addLabel = 'Add',
  emptyMessage,
}) {
  const [query, setQuery] = useState('');
  const [selectedUserId, setSelectedUserId] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const existingIds = new Set(existingMemberIds);
  const q = query.trim().toLowerCase();
  const available = users
    .filter((u) => !existingIds.has(u.id))
    .filter((u) => {
      if (!q) return true;
      return (
        u.name?.toLowerCase().includes(q) ||
        u.email?.toLowerCase().includes(q)
      );
    });

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd?.(selectedUserId);
    setSelectedUserId('');
    setQuery('');
  };

  return (
    <div className="space-y-2 pt-2">
      <label className="block text-xs font-medium text-gray-500">Add member</label>
      <div className="flex gap-2">
        <div className="relative flex-1">
          <input
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setSelectedUserId('');
              setIsOpen(true);
            }}
            onFocus={() => setIsOpen(true)}
            onBlur={() => setTimeout(() => setIsOpen(false), 200)}
            placeholder={placeholder}
            className="w-full border border-gray-300 rounded-lg px-3 py-1.5 text-sm"
          />
          {isOpen && available.length > 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto">
              {available.map((u) => (
                <button
                  key={u.id}
                  type="button"
                  onClick={() => {
                    setSelectedUserId(String(u.id));
                    setQuery(`${u.name} (${u.email})`);
                    setIsOpen(false);
                  }}
                  className="w-full text-left px-3 py-2 text-sm hover:bg-gray-50 focus:bg-gray-50 focus:outline-none"
                >
                  {u.name} <span className="text-gray-400">({u.email})</span>
                </button>
              ))}
            </div>
          )}
          {isOpen && available.length === 0 && (
            <div className="absolute z-10 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500">
              {emptyMessage || (query ? 'No matching users found.' : 'All users are already members.')}
            </div>
          )}
        </div>
        <button
          type="button"
          onClick={handleAdd}
          disabled={!selectedUserId}
          className="px-3 py-1.5 bg-gray-900 text-white rounded-lg text-sm font-medium whitespace-nowrap disabled:opacity-50"
        >
          {addLabel}
        </button>
      </div>
    </div>
  );
}
