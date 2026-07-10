import React from "react";
import UserManagement from "@/pages/UserManagement";

// Release Manager user management. The existing UserManagement component
// already supports an `embedded` flag — when embedded=true it returns
// just the table content (no PageContainer header). We render our own
// header here so the page has a consistent title, then mount the
// component in non-embedded mode (which uses PageContainer) for the
// full form behaviour.
export default function RmUsersPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Users</h1>
        <p className="text-slate-400 mt-1 text-sm">Manage system users and their roles.</p>
      </div>
      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6">
        <UserManagement embedded />
      </div>
    </div>
  );
}
