import React, { useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { Menu, X, LogOut } from 'lucide-react';
import { useAuth } from '@/context/AuthContext';
import Footer from '@/components/shared/Footer';

// Sidebar + main content area for role-scoped pages. Navigation is driven
// by real routes: each nav item is a <NavLink> that points to a URL. The
// "active" highlight is computed from the current pathname (via
// `item.match` — a path prefix), so e.g. /developer/history/123 still
// highlights "History" in the sidebar.
//
// The shell itself no longer owns the active-tab state — the URL does.
export default function DashboardShell({ navItems, children, activeLabel }) {
  const { logout } = useAuth();
  const location = useLocation();
  const [sidebarOpen, setSidebarOpen] = useState(false);

  const headerLabel =
    activeLabel ?? navItems.find((i) => location.pathname.startsWith(i.match))?.label ?? '';

  const closeSidebar = () => setSidebarOpen(false);

  const SidebarContent = (
    <div className="flex flex-col">
      <div className="overflow-y-auto px-4 py-5 max-h-[calc(100vh-4rem)]">
        <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider px-3 mb-2">
          Navigation
        </p>
        <div className="space-y-1.5">
          {navItems.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              end={item.end}
              onClick={closeSidebar}
              className={({ isActive }) =>
                `w-full flex items-center gap-3 px-3 py-2.5 rounded-xl transition-colors ${
                  isActive ? 'bg-blue-50' : 'hover:bg-slate-50'
                }`
              }
            >
              {({ isActive }) => (
                <>
                  <span
                    className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
                      isActive ? 'bg-blue-100 text-blue-600' : 'bg-slate-100 text-slate-400'
                    }`}
                  >
                    <item.icon className="h-4 w-4" />
                  </span>
                  <span
                    className={`text-sm flex-1 text-left ${
                      isActive ? 'text-blue-700 font-semibold' : 'text-slate-600 font-medium'
                    }`}
                  >
                    {item.label}
                  </span>
                </>
              )}
            </NavLink>
          ))}
        </div>
      </div>

      <div className="mt-2 border-t border-slate-100 p-4">
        <button
          type="button"
          onClick={logout}
          className="w-full flex items-center gap-2 px-3 py-2.5 rounded-xl text-sm font-medium text-rose-600 hover:bg-rose-50 transition-colors"
        >
          <LogOut className="h-4 w-4" />
          Logout
        </button>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <div className="md:flex">
        <aside className="hidden md:flex md:flex-col md:w-64 md:sticky md:top-16 bg-white border-r border-slate-100 z-20">
          {SidebarContent}
        </aside>

        {sidebarOpen && (
          <div className="md:hidden fixed inset-0 z-50 flex">
            <div
              className="absolute inset-0 bg-slate-900/40 backdrop-blur-sm"
              onClick={closeSidebar}
              aria-hidden="true"
            />
            <aside className="relative w-72 bg-white h-full shadow-xl pt-16 flex flex-col">
              <button
                type="button"
                onClick={closeSidebar}
                className="absolute top-[4.5rem] right-4 p-1.5 text-slate-400 hover:text-slate-600"
                aria-label="Close menu"
              >
                <X className="h-5 w-5" />
              </button>
              {SidebarContent}
            </aside>
          </div>
        )}

        <div className="flex-1 min-w-0">
          <div className="md:hidden sticky top-16 z-20 bg-white/90 backdrop-blur-md border-b border-slate-200">
            <div className="flex items-center gap-3 h-12 px-4">
              <button
                type="button"
                onClick={() => setSidebarOpen(true)}
                className="p-2 -ml-2 text-slate-600 hover:text-slate-900"
                aria-label="Open menu"
              >
                <Menu className="h-6 w-6" />
              </button>
              <h1 className="text-sm font-semibold text-slate-500 capitalize">{headerLabel}</h1>
            </div>
          </div>

          <main className="px-4 sm:px-6 lg:px-8 py-8 space-y-6">{children}</main>
        </div>
      </div>

      <div className="mt-auto">
        <Footer />
      </div>
    </div>
  );
}
