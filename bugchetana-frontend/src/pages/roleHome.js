// Maps a role name to that role's dashboard URL. Used by the public-route
// guard on `/` (bounce logged-in users to their role home) and by
// the auth-expiry listener in AuthContext.
export function homeFor(roleName) {
  switch (roleName) {
    case "Developer":
      return "/developer/dashboard";
    case "QA":
      return "/qa/dashboard";
    case "Release Manager":
      return "/release-manager/dashboard";
    default:
      return "/login";
  }
}
