import React, { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react';
import { createPortal } from 'react-dom';

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
//
// The suggestion list is rendered through a React portal into `document.body`
// and positioned with `getBoundingClientRect` so it escapes any
// `overflow: hidden` ancestor (e.g. the QA dashboard's rounded project
// cards) that would otherwise clip the dropdown. Visual design, search
// logic, keyboard behavior, and click-to-select behavior are unchanged.

const useIsoLayoutEffect =
  typeof window !== 'undefined' ? useLayoutEffect : useEffect;

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

  // Position of the dropdown, computed from the input's bounding rect. Lives
  // in state so the portaled <div> re-renders on every measurement. `top` is
  // the input's bottom edge plus a 4px gap (matches the old `mt-1`).
  const [dropdownPos, setDropdownPos] = useState({ top: 0, left: 0, width: 0 });

  const inputWrapRef = useRef(null);

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

  const measure = useCallback(() => {
    const el = inputWrapRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    setDropdownPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, []);

  // Recompute position synchronously after the dropdown mounts so the first
  // paint already shows it in the right place. Runs again whenever the
  // dependency set changes (query, open state).
  useIsoLayoutEffect(() => {
    if (isOpen) measure();
  }, [isOpen, q, available.length, measure]);

  // While the dropdown is open, keep its position in sync with the page:
  // viewport resize, page scroll, and scrolls on any ancestor (capture
  // phase) can all move the input without a React render. Cleanup removes
  // the listeners when the dropdown closes.
  useEffect(() => {
    if (!isOpen) return undefined;
    window.addEventListener('resize', measure);
    window.addEventListener('scroll', measure, { capture: true, passive: true });
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('scroll', measure, true);
    };
  }, [isOpen, measure]);

  const handleAdd = () => {
    if (!selectedUserId) return;
    onAdd?.(selectedUserId);
    setSelectedUserId('');
    setQuery('');
  };

  // Suggestion list — portaled to <body> so ancestor `overflow: hidden`
  // (e.g. the QA dashboard's rounded project cards) cannot clip it. All
  // visual classes and click handlers are unchanged from the previous
  // inline implementation.
  const renderSuggestions = () => {
    if (!isOpen) return null;
    if (available.length === 0) {
      return createPortal(
        <div
          style={{
            position: 'fixed',
            top: dropdownPos.top,
            left: dropdownPos.left,
            width: dropdownPos.width,
            zIndex: 50,
          }}
          className="bg-white border border-gray-200 rounded-lg shadow-lg px-3 py-2 text-sm text-gray-500"
        >
          {emptyMessage || (query ? 'No matching users found.' : 'All users are already members.')}
        </div>,
        document.body
      );
    }
    return createPortal(
      <div
        style={{
          position: 'fixed',
          top: dropdownPos.top,
          left: dropdownPos.left,
          width: dropdownPos.width,
          zIndex: 50,
        }}
        className="bg-white border border-gray-200 rounded-lg shadow-lg max-h-60 overflow-y-auto"
      >
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
      </div>,
      document.body
    );
  };

  return (
    <div className="space-y-2 pt-2">
      <label className="block text-xs font-medium text-gray-500">Add member</label>
      <div className="flex gap-2">
        <div ref={inputWrapRef} className="relative flex-1">
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
          {renderSuggestions()}
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
