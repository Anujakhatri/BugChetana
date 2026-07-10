import { Outlet } from 'react-router-dom';
import { LayoutDashboard, List, History, FolderKanban, Users, FileText, PlusSquare, UserCircle } from 'lucide-react';
import DashboardShell from './DashboardShell';

// Nav config for the three roles. `to` is the URL the sidebar item links to.
// `match` is the pathname prefix that activates it (so /developer/history/123
// still highlights "Bug History"). `end` is passed to NavLink — true means
// the item is only active on exact path match.
const NAV_BY_ROLE = {
  Developer: [
    { to: '/developer/dashboard', match: '/developer/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/developer/submit-bug', match: '/developer/submit-bug', end: true, label: 'Submit Bug', icon: PlusSquare },
    { to: '/developer/history', match: '/developer/history', end: true, label: 'Bug History', icon: History },
    { to: '/developer/profile', match: '/developer/profile', end: true, label: 'Profile', icon: UserCircle },
  ],
  QA: [
    { to: '/qa/dashboard', match: '/qa/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/qa/submit-bug', match: '/qa/submit-bug', end: true, label: 'Report Bug', icon: PlusSquare },
    { to: '/qa/bug-list', match: '/qa/bug-list', end: true, label: 'Bug Lists', icon: List },
    { to: '/qa/history', match: '/qa/history', end: true, label: 'History', icon: History },
    { to: '/qa/profile', match: '/qa/profile', end: true, label: 'Profile', icon: UserCircle },
  ],
  'Release Manager': [
    { to: '/release-manager/dashboard', match: '/release-manager/dashboard', end: true, label: 'Dashboard', icon: LayoutDashboard },
    { to: '/release-manager/users', match: '/release-manager/users', end: true, label: 'Users', icon: Users },
    // { to: '/release-manager/reports', match: '/release-manager/reports', end: true, label: 'Reports', icon: FileText },
    { to: '/release-manager/submit-bug', match: '/release-manager/submit-bug', end: true, label: 'Submit Bug', icon: PlusSquare },
    { to: '/release-manager/history', match: '/release-manager/history', end: true, label: 'History', icon: History },
    { to: '/release-manager/profile', match: '/release-manager/profile', end: true, label: 'Profile', icon: UserCircle },
  ],
};

// Layout route used by App.jsx for role-scoped URLs. Wraps each per-role
// page in the shared sidebar (DashboardShell) and renders the matching
// child via <Outlet />. The role is passed in explicitly (not read from
// auth state) because each role gets its own protected route group in
// App.jsx — by the time we render here, the role check has already passed.
export default function RoleLayout({ role }) {
  const navItems = NAV_BY_ROLE[role] ?? [];
  return (
    <DashboardShell navItems={navItems}>
      <Outlet />
    </DashboardShell>
  );
}
