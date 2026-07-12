import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { Bell } from 'lucide-react';
import { getNotifications, markNotificationRead, markAllNotificationsRead } from '@/api/notifications';
import { useAuth } from '@/context/AuthContext';

export default function NotificationBell() {
  const [open, setOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  // Gate the bell on auth readiness: don't fire /notifications/ until
  // AuthContext has confirmed a logged-in user. The axios interceptor
  // attaches the token from sessionStorage, so any request fired before
  // login completes — or after a forced logout that hasn't yet cleared
  // the bell — will hit 401. Wait for a real user + non-loading state.
  const { user, loading: authLoading } = useAuth();
  const authReady = !authLoading && !!user;

  const unreadCount = notifications.filter((n) => !n.is_read).length;

  const loadNotifications = useCallback(async () => {
    // Belt-and-braces guard: even though authReady checks AuthContext, a
    // forced logout can wipe sessionStorage while the bell is still
    // mounted (auth:logout is dispatched asynchronously, so there's a
    // small window where `user` is still set but the access token is
    // gone). Firing /notifications/ with no token produces a 401 that
    // then gets caught by the axios refresh interceptor — the refresh
    // also fails (token was cleared) and the user is logged out, but
    // the request still logs a 401 in the console on its way through.
    // Skip the call entirely if there's no access token to send.
    if (!sessionStorage.getItem('access')) {
      return;
    }
    setLoading(true);
    try {
      const data = await getNotifications();
      setNotifications(data);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (!authReady) return;
    loadNotifications();
    const interval = setInterval(loadNotifications, 30000);
    return () => clearInterval(interval);
  }, [loadNotifications, authReady]);

  const handleOpen = () => {
    setOpen((prev) => !prev);
    if (!open && authReady) loadNotifications();
  };

  const handleClick = async (notification) => {
    if (!notification.is_read) {
      try {
        await markNotificationRead(notification.id);
        setNotifications((prev) =>
          prev.map((n) => (n.id === notification.id ? { ...n, is_read: true } : n))
        );
      } catch (err) {
        console.error(err);
      }
    }
    if (notification.related_bug_id) {
      navigate(`/bugs/${notification.related_bug_id}`);
      setOpen(false);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      await markAllNotificationsRead();
      setNotifications((prev) => prev.map((n) => ({ ...n, is_read: true })));
    } catch (err) {
      console.error(err);
    }
  };

  return (
    <div className="relative">
      <button
        type="button"
        onClick={handleOpen}
        className="relative p-2 text-slate-600 hover:text-blue-600 rounded-lg hover:bg-slate-100 transition-colors"
        aria-label="Notifications"
      >
        <Bell className="h-5 w-5" />
        {unreadCount > 0 && (
          <span className="absolute -top-0.5 -right-0.5 min-w-[18px] h-[18px] px-1 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center">
            {unreadCount > 9 ? '9+' : unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-80 bg-white border border-slate-200 rounded-xl shadow-lg z-50 overflow-hidden">
          <div className="flex items-center justify-between px-4 py-3 border-b border-slate-100">
            <span className="text-sm font-semibold text-slate-800">Notifications</span>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={handleMarkAllRead}
                className="text-xs text-blue-600 hover:text-blue-700 font-medium"
              >
                Mark all read
              </button>
            )}
          </div>
          <div className="max-h-80 overflow-y-auto">
            {loading && notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">Loading...</p>
            ) : notifications.length === 0 ? (
              <p className="p-4 text-sm text-slate-500">No notifications yet.</p>
            ) : (
              notifications.map((n) => (
                <button
                  key={n.id}
                  type="button"
                  onClick={() => handleClick(n)}
                  className={`w-full text-left px-4 py-3 border-b border-slate-50 hover:bg-slate-50 transition-colors ${
                    !n.is_read ? 'bg-blue-50/50' : ''
                  }`}
                >
                  <p className="text-sm text-slate-800">{n.message}</p>
                  <p className="text-xs text-slate-400 mt-1">
                    {new Date(n.created_at).toLocaleString()}
                  </p>
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
