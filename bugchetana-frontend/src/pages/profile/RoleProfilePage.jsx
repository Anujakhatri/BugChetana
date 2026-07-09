import React from "react";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/pages/roleHome";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, UserCircle, Shield } from "lucide-react";

// Read-only profile page. Shows the user their name, email, and role from
// the auth context. There is no edit form — the existing ProfileModel
// modal's "Edit Profile" button is non-functional, and the backend has no
// PUT /auth/profile/ endpoint. Adding a real edit flow is a separate task.
export default function RoleProfilePage() {
  const { user } = useAuth();

  return (
    <div className="space-y-6 max-w-2xl">
      <div>
        <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Profile</h1>
        <p className="text-slate-400 mt-1 text-sm">Your account details.</p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
        <div className="flex items-center gap-4">
          <div className="w-16 h-16 rounded-full bg-gradient-to-br from-blue-500 to-cyan-500 flex items-center justify-center text-white text-xl font-bold shadow-sm">
            {(user?.name || user?.email || "?").slice(0, 1).toUpperCase()}
          </div>
          <div>
            <h2 className="text-lg font-semibold text-slate-900">{user?.name || "Anonymous user"}</h2>
            <p className="text-sm text-slate-500">{user?.email || "No email on file"}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-4 border-t border-slate-100">
          <div className="flex items-start gap-3">
            <UserCircle className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Name</p>
              <p className="text-sm text-slate-800 mt-1">{user?.name || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3">
            <Mail className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Email</p>
              <p className="text-sm text-slate-800 mt-1">{user?.email || "—"}</p>
            </div>
          </div>
          <div className="flex items-start gap-3 sm:col-span-2">
            <Shield className="h-5 w-5 text-slate-400 mt-0.5 shrink-0" />
            <div>
              <p className="text-xs font-medium text-slate-400 uppercase tracking-wide">Role</p>
              <p className="text-sm text-slate-800 mt-1">
                <span className="inline-block bg-blue-100 text-blue-800 text-xs font-semibold px-2.5 py-0.5 rounded capitalize">
                  {user?.roleName?.replace(/_/g, ' ') || "—"}
                </span>
              </p>
            </div>
          </div>
        </div>
      </div>

      <div>
        <Link
          to={user ? homeFor(user.roleName) : "/login"}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
