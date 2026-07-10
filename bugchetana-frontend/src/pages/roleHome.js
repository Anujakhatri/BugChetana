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

// Maps a role name to its profile page URL. The profile route is mounted
// on the role layout (sibling of the dashboard), not under it, so this
// can't be derived from homeFor() by simple string concat.
export function profileFor(roleName) {
  switch (roleName) {
    case "Developer":
      return "/developer/profile";
    case "QA":
      return "/qa/profile";
    case "Release Manager":
      return "/release-manager/profile";
    default:
      return "/login";
  }
}
