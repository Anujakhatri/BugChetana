import React, { useState } from "react";
import { useAuth } from "@/context/AuthContext";
import { homeFor } from "@/pages/roleHome";
import { Link } from "react-router-dom";
import { ArrowLeft, Mail, UserCircle, Shield, Pencil, Check, X } from "lucide-react";
import InputField from "@/components/shared/InputField";
import { updateProfile } from "@/api/authService";

export default function RoleProfilePage() {
  const { user, setUser } = useAuth();

  const [editing, setEditing] = useState(false);
  const [name, setName] = useState(user?.name ?? "");
  const [email, setEmail] = useState(user?.email ?? "");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);

  // If the user changes (e.g., after a hard refresh that re-fetches the
  // profile from the server) while we're sitting in view mode, the
  // editable draft should still reflect whatever the server has. The
  // draft is only committed back to the form when the user re-enters
  // edit mode via "Edit".
  const enterEdit = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setError(null);
    setEditing(true);
  };

  const cancelEdit = () => {
    setName(user?.name ?? "");
    setEmail(user?.email ?? "");
    setError(null);
    setEditing(false);
  };

  const onSave = async (e) => {
    e?.preventDefault?.();
    if (!name.trim() || !email.trim()) {
      setError("Name and email are required.");
      return;
    }
    setSaving(true);
    setError(null);
    try {
      const res = await updateProfile({ name: name.trim(), email: email.trim() });
      // AuthContext.setUser normalizes the role object → roleName.
      setUser(res.data);
      setEditing(false);
    } catch (err) {
      const data = err.response?.data;
      setError(
        data?.email?.[0] ??
          data?.name?.[0] ??
          data?.detail ??
          "Could not save profile. Please try again."
      );
    } finally {
      setSaving(false);
    }
  };

  const backHref = user ? homeFor(user.roleName) : "/login";

  return (
    <div className="space-y-6 max-w-2xl">
      <div className="flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-slate-900">Profile</h1>
          <p className="text-slate-400 mt-1 text-sm">Your account details.</p>
        </div>
        {!editing && (
          <button
            type="button"
            onClick={enterEdit}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
          >
            <Pencil className="h-3.5 w-3.5" />
            Edit
          </button>
        )}
      </div>

      <form onSubmit={onSave} className="bg-white rounded-2xl border border-slate-100 shadow-sm p-6 space-y-5">
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
          {editing ? (
            <div className="sm:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
              <InputField
                label="Name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                required
              />
              <InputField
                label="Email"
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>
          ) : (
            <>
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
            </>
          )}

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

        {error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-100 rounded-lg px-3 py-2">
            {error}
          </p>
        )}

        {editing && (
          <div className="flex items-center justify-end gap-2 pt-2 border-t border-slate-100">
            <button
              type="button"
              onClick={cancelEdit}
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-slate-200 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors disabled:opacity-50"
            >
              <X className="h-3.5 w-3.5" />
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-blue-600 text-white text-sm font-medium hover:bg-blue-700 transition-colors disabled:opacity-50"
            >
              <Check className="h-3.5 w-3.5" />
              {saving ? "Saving..." : "Save changes"}
            </button>
          </div>
        )}
      </form>

      <div>
        <Link
          to={backHref}
          className="inline-flex items-center gap-2 text-sm font-medium text-blue-600 hover:text-blue-700"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to dashboard
        </Link>
      </div>
    </div>
  );
}
