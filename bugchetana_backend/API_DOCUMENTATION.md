# BugChetana Backend — Complete API Documentation

This document explains **every URL** exposed by the BugChetana backend: what it does, how a request flows through it, which view/serializer/model handles it, how the database is touched, what comes back, and how auth/permissions are enforced. Use this as a reference for this project, and as a template for documenting future ones.

**Base URL (local dev):** `http://localhost:8000/api/`
**Authentication scheme:** JWT (via `djangorestframework-simplejwt`). Every protected endpoint expects:
```
Authorization: Bearer <access_token>
```
Access tokens live 30 minutes; refresh tokens live 7 days and rotate on use (old refresh token is blacklisted once a new one is issued).

**Roles in this system:** `Developer`, `QA`, `Release Manager` (stored in the `Role` table, referenced by `User.role`).

---

## Table of Contents

1. [Accounts App](#1-accounts-app)
2. [Projects App](#2-projects-app)
3. [Bugs App](#3-bugs-app)
4. [AI Integration App](#4-ai-integration-app)
5. [How Authentication Flows End-to-End](#5-how-authentication-flows-end-to-end)

---

## 1. Accounts App

Base path: `/api/auth/`

### 1.1 `POST /api/auth/register/`

| | |
|---|---|
| **Purpose** | Create a new user account. Every new user is auto-assigned the `Developer` role — nobody can self-assign a different role at signup. |
| **HTTP Method** | `POST` — because it creates a new resource (a `User` row) on the server. |
| **View** | `RegisterView` (`APIView`) |
| **Serializer** | `RegisterSerializer` |
| **Model(s)** | `User`, `Role` (read), `UserSession` (created as a side effect) |
| **Permission** | `AllowAny` — must be open, since nobody has an account yet to authenticate with |
| **Throttle** | `AnonRateThrottle` (100/hour, per `REST_FRAMEWORK` settings) — protects against automated mass-registration/spam |

**Request flow:**
1. `RegisterSerializer` validates the payload: `username`, `email`, `name`, `password`, `password2`.
2. `validate_email()` checks `User.objects.filter(email__iexact=value).exists()` — case-insensitive uniqueness check. If it exists, raises `"This email is already registered. Please log in or use a different email address."` (not DRF's generic default message).
3. `validate()` checks `password == password2`.
4. On `.save()`, `create()` looks up the `Developer` role from the `Role` table and creates the `User` via `User.objects.create_user(...)`, forcing `role=developer_role` — the client **cannot** pass a different role in the request body; the field isn't even accepted.
5. View then manually issues a `RefreshToken.for_user(user)` and creates a `UserSession` row, storing a **SHA-256 hash** of the refresh token (never the raw token) alongside a 7-day expiry.

**Database interaction:**
- `INSERT` into `users` table (new `User` row)
- `SELECT` on `roles` table (to find `Developer` role)
- `INSERT` into `user_sessions` table (session tracking)

**Response (201 Created):**
```json
{
  "message": "Registration successful",
  "user": {
    "username": "test123",
    "email": "test@example.com",
    "role": "Developer"
  },
  "tokens": {
    "access": "eyJhbGciOi...",
    "refresh": "eyJhbGciOi..."
  }
}
```

**Error example (duplicate email, 400):**
```json
{
  "email": ["This email is already registered. Please log in or use a different email address."]
}
```

**When this is used:** The very first step in a user's lifecycle — the Register form (`Register.jsx`) calling `registerUser()`. Real-world scenario: a new hire joins the QA team; they self-register (landing as `Developer` by default), and a Release Manager later promotes their role via `PATCH /api/auth/users/<id>/role/`.

---

### 1.2 `POST /api/auth/login/`

| | |
|---|---|
| **Purpose** | Authenticate a user with email + password, issue JWT access/refresh tokens, and enforce account-lockout security rules. |
| **HTTP Method** | `POST` — credentials are sent in the body, not embedded in a URL (which would leak into server logs/browser history). |
| **View** | `LoginView` (extends `TokenObtainPairView`) |
| **Serializer** | `LoginSerializer` (extends `TokenObtainPairSerializer`) |
| **Model(s)** | `User`, `UserSession` |
| **Permission** | None required (`AllowAny` implicitly, since you don't have a token yet) |

**Request flow (this is the most involved endpoint in the system):**
1. `LoginSerializer.validate()` first checks the email is a **valid format** via Django's `validate_email()` — rejects malformed addresses (e.g. `notanemail`) before touching the database at all.
2. Looks up `User.objects.get(email__iexact=email)`. If not found, raises a generic `"Invalid email or password."` — **deliberately vague**, so an attacker can't use this endpoint to enumerate which emails are registered.
3. Checks `user.locked_until` — if the account is currently in a lockout window (see requirement 4 below), the request is rejected immediately with a message stating how many minutes remain. This check happens **before** the password is even checked.
4. Checks the password via `user.check_password(password)`. If wrong:
   - Increments `user.failed_login_attempts`.
   - If this hits **5**, sets `user.locked_until = now + 30 minutes`, resets the counter, and returns a **lockout** message.
   - Otherwise, saves the incremented counter and returns `"Incorrect password. Please try again."` — specific, because at this point the email *is* confirmed to exist (this is the one deliberate exception to the "don't reveal if email exists" rule).
5. On success: resets `failed_login_attempts`/`locked_until` to clear any prior partial lockout state, then builds a JWT directly via `self.get_token(user)` (a custom override that embeds `email`, `username`, `role_id`, and `role` as extra claims inside the JWT payload).
6. Creates a `UserSession` row, storing the SHA-256 hash of the refresh token.
7. `LoginView.post()` decodes the refresh token to re-fetch the `User` object, then wraps everything into the final response shape.

**Database interaction:**
- `SELECT` on `users` (find by email, case-insensitive)
- `UPDATE` on `users` (failed-attempt counter and/or lockout timestamp, or clearing them on success)
- `INSERT` into `user_sessions`

**Response (200 OK, success):**
```json
{
  "message": "Login successful",
  "user": {
    "username": "test123",
    "email": "testing@example.com",
    "name": "Capstone KC",
    "role": "Developer"
  },
  "tokens": {
    "refresh": "eyJhbGciOi...",
    "access": "eyJhbGciOi..."
  }
}
```

**Error example (locked out, 401):**
```json
{
  "detail": "Account locked due to too many failed attempts. Try again in 30 minutes."
}
```

**Error example (wrong password, 401):**
```json
{
  "detail": "Incorrect password. Please try again."
}
```

**When this is used:** Every session start. Real-world scenario: a QA engineer mistypes their password 5 times in a row (maybe fat-fingering a similar old password) — the 6th attempt, even with the *correct* password, is blocked for 30 minutes, protecting against brute-force attacks.

---

### 1.3 `POST /api/auth/login/refresh/`

| | |
|---|---|
| **Purpose** | Exchange a still-valid refresh token for a brand new access token, without forcing the user to log in again. |
| **HTTP Method** | `POST` — a refresh token is sensitive data, sent in the body. |
| **View** | `TokenRefreshView` (stock, from `rest_framework_simplejwt` — not custom) |
| **Model(s)** | Internally validates against the blacklist tables (`OutstandingToken`, `BlacklistedToken`) from `rest_framework_simplejwt.token_blacklist` |
| **Permission** | None — the refresh token itself is the credential |

**Request flow:**
1. Client sends `{"refresh": "<refresh_token>"}`.
2. SimpleJWT verifies the token's signature and expiry, and checks it isn't blacklisted.
3. Because `ROTATE_REFRESH_TOKENS: True` and `BLACKLIST_AFTER_ROTATION: True` are set in `SIMPLE_JWT` settings, the **old refresh token is blacklisted** and a **new one is issued** alongside the new access token — a refresh token is single-use.

**Response (200 OK):**
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

**When this is used:** This is exactly what `axiosInstance.js`'s response interceptor calls automatically whenever any API request comes back `401` — the person never sees this happen; it's invisible token housekeeping that keeps them logged in across a 30-minute access token window without re-entering credentials, up to the 7-day refresh token lifetime.

---

### 1.4 `POST /api/auth/logout/`

| | |
|---|---|
| **Purpose** | Invalidate a user's refresh token (server-side), ending their session early — used for an explicit "Logout" click, not just letting tokens expire naturally. |
| **HTTP Method** | `POST` — an action with a side effect (destroying a session), not a data fetch. |
| **View** | `LogoutView` (`APIView`) |
| **Serializer** | `LogoutSerializer` |
| **Model(s)** | `UserSession` |
| **Permission** | `IsAuthenticated` — you must present a valid **access** token to log out (proves it's really you ending your own session) |

**Request flow:**
1. Client sends `{"refresh": "<refresh_token>"}` in the body, plus a valid access token in the `Authorization` header.
2. `LogoutSerializer.save()` hashes the refresh token and deletes the matching `UserSession` row.
3. Calls `RefreshToken(self.token).blacklist()` — adds the token to SimpleJWT's blacklist table, so even if someone captured that refresh token, it can never be exchanged for a new access token again.

**Database interaction:**
- `DELETE` from `user_sessions` (matching session)
- `INSERT` into `token_blacklist` tables (SimpleJWT's own tables)

**Response (200 OK):**
```json
{ "message": "Logout successful" }
```

**When this is used:** User clicks "Logout" in the Navbar. Real-world scenario: someone logs in on a shared/public computer and explicitly logs out afterward — this endpoint is what actually revokes that session server-side, versus just clearing `localStorage` client-side (which alone wouldn't stop a stolen token from still working).

---

### 1.5 `GET /api/auth/profile/`

| | |
|---|---|
| **Purpose** | Fetch the currently authenticated user's own profile info. |
| **HTTP Method** | `GET` — pure read, no side effects. |
| **View** | `ProfileView` (`APIView`) |
| **Serializer** | `ProfileSerializer` (all fields **read-only** — this endpoint cannot be used to edit anything) |
| **Model(s)** | `User` |
| **Permission** | `IsAuthenticated` |

**Request flow:**
1. `request.user` is already populated by JWT authentication middleware (decoded from the access token — no extra DB lookup for identity, though `ProfileSerializer` does read the full `User` row for the response fields).
2. Serializes `id`, `username`, `email`, `name`, `role`, `created_at`.

**Response (200 OK):**
```json
{
  "id": 4,
  "username": "test123",
  "email": "testing@example.com",
  "name": "capstone Kc",
  "role": "Developer",
  "created_at": "2026-06-28T09:15:00Z"
}
```

**When this is used:** Populating `AuthContext.jsx` on page load/refresh (so a reloaded page still knows who's logged in), and anywhere the Navbar/Dashboard displays the current user's name, email, or role badge.

---

### 1.6 `GET /api/auth/users/`

| | |
|---|---|
| **Purpose** | List all registered users in the system — used for the Role Management screen. |
| **HTTP Method** | `GET` |
| **View** | `UserListView` (`generics.ListAPIView`) |
| **Serializer** | `UserListSerializer` |
| **Model(s)** | `User` (with `select_related('role')` — a query optimization that fetches the related `Role` row in the *same* SQL query via a `JOIN`, avoiding one extra query per user in the list) |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` — allows Django admins (`is_staff=True`) **or** anyone with the `Release Manager` role |

**Request flow:**
1. Permission check first: rejects with `403` if the requester is neither staff nor Release Manager.
2. `get_queryset()` returns all users, ordered by `created_at`.

**Database interaction:**
- `SELECT ... JOIN roles` (single query, thanks to `select_related`)

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "username": "rm_priya",
    "email": "priya@example.com",
    "name": "Priya Sharma",
    "role": "Release Manager",
    "status": "active",
    "created_at": "2026-06-20T10:00:00Z"
  },
  {
    "id": 4,
    "username": "test123",
    "email": "test@example.com",
    "name": "Capstone Kc",
    "role": "Developer",
    "status": "active",
    "created_at": "2026-06-28T09:15:00Z"
  }
]
```

**When this is used:** `UserManagement.jsx` renders this list in a table, letting a Release Manager see everyone and change roles inline. Real-world scenario: onboarding week — five new hires register as Developers by default, and the RM reviews this list to promote two of them to QA.

---

### 1.7 `PATCH /api/auth/users/<int:pk>/role/`

| | |
|---|---|
| **Purpose** | Change a specific user's role (e.g., promote a Developer to QA). |
| **HTTP Method** | `PATCH` — a **partial** update to an existing resource (only the `role` changes, nothing else about the user). |
| **View** | `RoleUpdateView` (`APIView`) |
| **Serializer** | `RoleUpdateSerializer` |
| **Model(s)** | `User`, `Role` |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` |

**Request flow:**
1. `pk` in the URL identifies the **target** user whose role is being changed (not the requester).
2. View looks up the target user; 404s if not found.
3. `RoleUpdateSerializer.validate_role_id()` checks the given `role_id` actually exists in the `Role` table.
4. `.update()` swaps `instance.role`, saves, and returns both the updated user and the **old** role name (so the response can say what changed, not just the end state).

**Database interaction:**
- `SELECT` on `users` (find target by `pk`)
- `SELECT` on `roles` (validate `role_id`)
- `UPDATE` on `users` (new `role_id`)

**Request body:**
```json
{ "role_id": 2 }
```

**Response (200 OK):**
```json
{
  "message": "Capstone Kc's role updated from 'Developer' to 'QA'.",
  "user": {
    "id": 4,
    "username": "test123",
    "email": "test@example.com",
    "role": "QA"
  }
}
```

**When this is used:** `UserManagement.jsx`'s inline role dropdown. Real-world scenario: a Developer proves strong at manual testing and gets moved to the QA team — this is the one API call that changes their permissions system-wide, instantly affecting what they can do everywhere else (e.g. they can no longer create bugs directly, per `CanCreateBug`, but can now submit QA results).

---

### 1.8 `GET /api/auth/roles/`

| | |
|---|---|
| **Purpose** | List all available roles and their IDs — exists purely to support building the role-selection dropdown in `UserManagement.jsx`, since `RoleUpdateView` needs a numeric `role_id`, not a name. |
| **HTTP Method** | `GET` |
| **View** | `RoleListView` (`generics.ListAPIView`) |
| **Serializer** | `RoleSerializer` |
| **Model(s)** | `Role` |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` (same gate as the two views above, since this is only useful alongside them) |

**Response (200 OK):**
```json
[
  { "id": 1, "name": "Developer" },
  { "id": 2, "name": "QA" },
  { "id": 3, "name": "Release Manager" }
]
```

**When this is used:** Loaded once alongside the user list in `UserManagement.jsx`, so each row's role `<select>` has real IDs to submit against — without this, the frontend would have to hardcode role IDs, which breaks the moment roles are added/reordered in the database.

---

## 2. Projects App

Base path: `/api/projects/`

### 2.1 `GET|POST /api/projects/`

| | |
|---|---|
| **Purpose** | `GET`: list projects the current user can see. `POST`: create a new project. |
| **HTTP Methods** | `GET` (read) and `POST` (create) share one URL — REST convention: the same "collection" endpoint handles both listing and creating. |
| **View** | `ProjectListCreateView` (`generics.ListCreateAPIView`) |
| **Serializer** | `ProjectSerializer` |
| **Model(s)** | `Project`, `ProjectMember` (for the queryset filter) |
| **Permission** | `IsAuthenticated`, `IsReleaseManager` — this permission class **special-cases safe methods**: `GET` is open to any authenticated user, but `POST` is restricted to `Release Manager` only. |

**Request flow — GET:**
1. `get_queryset()` checks the requester's role.
2. If `Release Manager`: returns `Project.objects.filter(release_manager=user)` — projects **they manage**.
3. Otherwise (`Developer`/`QA`): returns `Project.objects.filter(members__user=user)` — projects they've been added to as a member.
4. This means a Developer sees zero projects until a Release Manager explicitly adds them via the member-management endpoint below.

**Request flow — POST:**
1. Permission check rejects non-RM users with `403` before the view logic even runs.
2. `perform_create()` forces `release_manager=self.request.user` — a Release Manager can only ever create a project **for themselves** as manager; they can't assign someone else as the manager at creation time via this endpoint.

**Database interaction:**
- `GET`: `SELECT` with a `JOIN` on `project_members` (for non-RM) or a direct filter (for RM)
- `POST`: `INSERT` into `projects`

**Response (GET, 200 OK):**
```json
[
  {
    "id": 3,
    "name": "BugChetana Core",
    "release_manager": 1,
    "release_manager_name": "Priya Sharma",
    "member_count": 4,
    "created_at": "2026-06-15T08:00:00Z"
  }
]
```

**Request body (POST):**
```json
{ "name": "New Mobile App Project" }
```

**When this is used:** `ProjectContext.jsx` loads this on app startup to populate the project switcher. Real-world scenario: a Release Manager kicking off a new initiative creates a fresh project shell, then immediately uses the member-management endpoint to staff it.

---

### 2.2 `GET|PATCH|DELETE /api/projects/<int:pk>/`

| | |
|---|---|
| **Purpose** | View, edit, or delete a single project. |
| **HTTP Methods** | `GET` (read one), `PATCH` (partial edit), `DELETE` (remove) |
| **View** | `ProjectDetailView` (`generics.RetrieveUpdateDestroyAPIView`) |
| **Serializer** | `ProjectSerializer` |
| **Model(s)** | `Project` |
| **Permission** | `IsAuthenticated`, `IsProjectMember` — object-level permission checked *per project instance*, not just per-request |

**Request flow:**
1. DRF fetches the `Project` by `pk` first, **then** runs `has_object_permission()` against that specific object — this is why the permission class needs `is_project_member()`/`is_project_release_manager()` helpers that take the actual project instance, not just the URL kwarg.
2. For `GET`: allowed if the requester is a member (Dev/QA) **or** the release manager of *this specific* project.
3. For `PATCH`/`DELETE`: only allowed if the requester is the Release Manager of *this specific* project — being RM of a *different* project doesn't grant access here.

**Database interaction:**
- `GET`: `SELECT` single row by `pk`
- `PATCH`: `UPDATE` on `projects`
- `DELETE`: `DELETE` from `projects` — cascades to related `ProjectMember`, `Bug` rows (via `on_delete=models.CASCADE` in those models), so deleting a project also deletes all its bugs and memberships.

**Response (GET, 200 OK):** same shape as one item from the list endpoint above.

**When this is used:** `ProjectManagement.jsx`'s inline rename/delete controls. Real-world scenario: a project gets renamed after a rebrand, or is deleted entirely once archived — the cascading delete is a real consideration here, since it silently removes all associated bugs too.

---

### 2.3 `GET|POST /api/projects/<int:project_id>/members/`

| | |
|---|---|
| **Purpose** | `GET`: list who's currently a member of a project. `POST`: add a new member. |
| **View** | `ProjectMemberListCreateView` (`generics.ListCreateAPIView`) |
| **Serializer** | `ProjectMemberSerializer` |
| **Model(s)** | `ProjectMember`, `Project` (looked up via `project_id`) |
| **Permission** | `CanManageProjectMembers` — `GET` open to any project member or the project's RM; `POST` restricted to the release manager of *this* project |

**Request flow — GET:**
1. `get_queryset()` filters `ProjectMember.objects.filter(project_id=self.kwargs['project_id'])`.
2. Returns each member's user info + their role (via `ProjectMemberSerializer`'s `source='user.role.name'`).

**Request flow — POST:**
1. Permission check confirms the requester is this project's RM.
2. `perform_create()` injects `project_id` from the URL, so the request body only needs `user_id`.
3. `unique_together = ('project', 'user')` on the model means adding the same user twice raises an `IntegrityError`-derived validation error, not a silent duplicate.

**Database interaction:**
- `GET`: `SELECT` filtered by `project_id`
- `POST`: `INSERT` into `project_members`

**Response (GET, 200 OK):**
```json
[
  {
    "id": 12,
    "project": 3,
    "user": 4,
    "user_email": "test@example.com",
    "user_name": "Capstone Kc",
    "role": "Developer",
    "joined_at": "2026-06-16T11:00:00Z"
  }
]
```

**Request body (POST):**
```json
{ "user_id": 4 }
```

**When this is used:** `ProjectManagement.jsx`'s expandable "members" panel per project. Real-world scenario: a new Developer joins the team and needs access to a specific project's bugs — the RM adds them here, which immediately makes `Project.objects.filter(members__user=user)` include this project for them everywhere else in the system (dashboard, bug list, etc.).

---

### 2.4 `DELETE /api/projects/<int:project_id>/members/<int:user_id>/`

| | |
|---|---|
| **Purpose** | Remove a specific user from a specific project. |
| **HTTP Method** | `DELETE` |
| **View** | `RemoveProjectMemberView` (`APIView`) |
| **Model(s)** | `ProjectMember` |
| **Permission** | `CanManageProjectMembers` (RM of this project only) |

**Request flow:**
1. Looks up the exact `ProjectMember` row matching both `project_id` and `user_id`.
2. Deletes it if found; returns a clean `404` message if not (rather than a raw Django `DoesNotExist` traceback).

**Database interaction:**
- `DELETE` from `project_members` (single row)

**Response (200 OK):**
```json
{ "message": "Member removed" }
```

**When this is used:** Offboarding, or moving someone off a project they're no longer working on. Real-world scenario: a Developer rotates to a different team's project — removing them here means they immediately lose visibility into this project's bugs on their next dashboard load.

---

## 3. Bugs App

Base path assumed: `/api/` (bug routes are not project-nested at the URL level except creation/listing)

### 3.1 `GET|POST /api/projects/<int:project_id>/bugs/`

| | |
|---|---|
| **Purpose** | `GET`: list bugs in a project (scoped by role). `POST`: file a new bug — **this is also where the ML severity prediction happens automatically.** |
| **View** | `BugListCreateView` (`generics.ListCreateAPIView`) |
| **Serializer** | `BugSerializer` (GET) / `BugCreateSerializer` (POST) — `get_serializer_class()` switches based on `request.method` |
| **Model(s)** | `Bug`, `Project` |
| **Permission** | `IsAuthenticated` + (`CanCreateBug` for POST, `HasProjectAccess` for GET) |

**Request flow — GET:**
1. `get_queryset()` starts with `Bug.objects.filter(project_id=project_id)`.
2. If the requester is a `Developer`: further filtered to `assigned_to=user` — Developers only see bugs assigned to them, not the whole project's bug list.
3. `QA`/`Release Manager`: see all bugs in the project, unfiltered.
4. Anyone else (unrecognized role): `qs.none()` — an empty list, not an error, is returned.

**Request flow — POST (the interesting one):**
1. `CanCreateBug` permission blocks `QA` role entirely (QA's job is *verifying* bugs, not filing them, per this system's design).
2. `BugCreateSerializer` validates `title`, `description`, `status`, `severity`, `priority`, `assigned_to`.
3. Inside `perform_create()`, **before saving**, the view calls `predict_severity(title, description)` from `ai_integration.ml_service`:
   - Text is cleaned (lowercased, punctuation stripped) via the shared `clean_text()` utility — the *exact* same cleaning function used when the model was trained, so there's no train/inference mismatch.
   - The cleaned text is vectorized with the saved `TfidfVectorizer`, then classified by the saved `XGBClassifier`, then decoded back to a human-readable label (`"high"`, `"critical"`, etc.) via the saved `LabelEncoder`.
   - If **anything** in this chain fails (missing model files, corrupted pickle, empty text) — the exception is caught, `ai_status` is set to `False`, and `predicted_severity` defaults to `"medium"`. Bug creation **never fails** because of an ML hiccup; the prediction is advisory, layered on top of the user's own `severity` field, never overwriting it.
4. Saves the `Bug` with `created_by`, `project_id`, `predicted_severity`, and `ai_status` all set server-side (not client-controlled).

**Database interaction:**
- `GET`: `SELECT` filtered by `project_id` (+ `assigned_to` for Developers)
- `POST`: `INSERT` into `bugs`. No DB write happens for the ML prediction itself — it's a pure computation against pre-trained files on disk, not a database lookup.

**Request body (POST):**
```json
{
  "title": "Login page crashes on Safari",
  "description": "Clicking submit on the login form throws a JS TypeError in Safari 17, works fine on Chrome.",
  "status": "open",
  "severity": "medium",
  "priority": "high",
  "assigned_to": 4
}
```

**Response (201 Created):**
```json
{
  "title": "Login page crashes on Safari",
  "description": "Clicking submit on the login form throws a JS TypeError in Safari 17, works fine on Chrome.",
  "status": "open",
  "severity": "medium",
  "priority": "high",
  "assigned_to": 4,
  "predicted_severity": "high",
  "ai_status": true
}
```

**When this is used:** `NewBug.jsx`'s submit handler. Real-world scenario: a Developer reports a crash; the human picks `"medium"` out of habit, but the ML model — trained on hundreds of past bug reports — flags it as `"high"` based on language patterns like "crashes". Both values are shown to the team: the human's judgment call *and* the model's independent read, letting a QA or RM weigh both rather than blindly trusting either.

---

### 3.2 `GET|PATCH|DELETE /api/bugs/<int:pk>/`

| | |
|---|---|
| **Purpose** | View, edit, or delete a single bug — with **role-specific field restrictions on edit** that mirror real team workflows. |
| **View** | `BugDetailView` (`generics.RetrieveUpdateDestroyAPIView`) |
| **Serializer** | `BugSerializer` |
| **Model(s)** | `Bug` |
| **Permission** | `IsAuthenticated`, `IsBugProjectMember`, `IsBugOwnerOrReleaseManager` |

**Request flow — PATCH (the complex one):**
1. Determines the requester's role and whether they're the Release Manager of *this bug's specific project*.
2. If they're that RM: full edit access, no field restrictions.
3. If `QA`: can **only** submit `assigned_to` in the request body — attempting to touch anything else raises `PermissionDenied` with a message pointing them to the dedicated QA-result endpoint instead (see 3.5) for pass/fail actions.
4. If `Developer` **and** they're either the bug's `assigned_to` or its `created_by`: can only submit `status` and `description` — and even then, cannot set `status` to `'closed'` directly (that's reserved for the automatic transition when QA passes the bug — see 3.5).
5. A Developer who is neither assigned to nor the creator of the bug: falls through with no field-editing rights at all under the role branches above (blocked earlier at the permission-class level in practice).
6. On save, `serializer.instance._changed_by = request.user` is set — this is read by a Django **signal** (from issue 8) that writes a `BugHistory` row whenever `status` changes, capturing who made the change.

**Database interaction:**
- `GET`: `SELECT` single row
- `PATCH`: `UPDATE` on `bugs`, plus an `INSERT` into `bug_history` if `status` changed (via signal)
- `DELETE`: `DELETE` from `bugs` — cascades to `BugComment`, `BugHistory`, `QAResult`, `ReleaseBug` rows

**When this is used:** `BugDetail.jsx`'s role-aware edit form. Real-world scenario: a Developer fixes a bug and flips its status to `"resolved"` — they *cannot* jump straight to `"closed"` even if they're confident it's fixed, because that final sign-off is reserved for QA verification, enforcing a two-person check before a bug is considered truly done.

---

### 3.3 `GET|POST /api/bugs/<int:bug_id>/comments/`

| | |
|---|---|
| **Purpose** | View or add comments on a bug — team discussion thread. |
| **View** | `BugCommentListCreateView` (`generics.ListCreateAPIView`) |
| **Serializer** | `BugCommentSerializer` |
| **Model(s)** | `BugComment` |
| **Permission** | `IsAuthenticated`, `HasBugAccess` |

**Request flow:**
1. `get_queryset()` filters by `bug_id`, ordered chronologically (`ordering = ['created_at']` on the model).
2. `perform_create()` injects `user=request.user` and `bug_id` from the URL — a comment is always attributed to whoever's actually authenticated, never spoofable via the request body.

**Response (GET, 200 OK):**
```json
[
  {
    "id": 8,
    "bug": 12,
    "user": 4,
    "user_name": "Capstone Kc",
    "comment_text": "Confirmed on my end too — only reproduces in Safari.",
    "created_at": "2026-07-02T14:22:00Z"
  }
]
```

**When this is used:** `BugDetail.jsx`'s comment thread. Real-world scenario: back-and-forth discussion between a Developer and QA about reproduction steps, without needing a separate chat tool.

---

### 3.4 `GET /api/bugs/<int:bug_id>/history/`

| | |
|---|---|
| **Purpose** | Audit trail of every status change a bug has gone through. |
| **View** | `BugHistoryListView` (`generics.ListAPIView`) |
| **Serializer** | `BugHistorySerializer` |
| **Model(s)** | `BugHistory` (populated entirely by a signal, never written to directly by any view) |
| **Permission** | `IsAuthenticated`, `HasBugAccess` |

**Response (200 OK):**
```json
[
  {
    "id": 5,
    "bug": 12,
    "changed_by": 4,
    "changed_by_name": "Capstone Kc",
    "old_status": "open",
    "new_status": "resolved",
    "changed_at": "2026-07-02T16:00:00Z"
  }
]
```

**When this is used:** `BugDetail.jsx`'s history panel. Real-world scenario: a bug got reopened three times — this trail shows exactly who changed its status when, useful during a retrospective on why a fix didn't stick the first two times.

---

### 3.5 `POST /api/bugs/<int:bug_id>/qa-result/`

| | |
|---|---|
| **Purpose** | QA formally passes or fails a bug that a Developer marked as resolved — and this single action **automatically drives the bug's status forward**. |
| **View** | `QAResultCreateView` (`generics.CreateAPIView`) |
| **Serializer** | `QAResultSerializer` |
| **Model(s)** | `QAResult`, `Bug` |
| **Permission** | `IsAuthenticated`, `CanSubmitQAResult` |

**Request flow:**
1. Guard clause: `if bug.status != 'resolved': raise ValidationError(...)` — QA can't test a bug that a Developer hasn't marked as fixed yet. Enforces the workflow order.
2. Saves the `QAResult` row with `qa=request.user`.
3. **Side effect on the `Bug` itself**, based on the result:
   - `'pass'` → `bug.status = 'closed'`, `bug.verified_by = request.user` — this is the *only* path that ever sets a bug to `'closed'`, matching the restriction we saw in 3.2 where Developers can't do this themselves.
   - `'fail'` → `bug.status = 'open'` — sends it back to square one for the Developer to try again.
4. `bug._changed_by = request.user` is set before saving, so the `BugHistory` signal correctly attributes this status change to the QA tester, not whoever originally reported the bug.

**Database interaction:**
- `SELECT` on `bugs` (fetch by id)
- `INSERT` into `qa_results`
- `UPDATE` on `bugs` (status + verified_by)
- `INSERT` into `bug_history` (via signal)

**Request body:**
```json
{ "result": "pass", "notes": "Verified fix on Safari 17 and 18. Works as expected." }
```

**When this is used:** `QaDashboard.jsx`'s pass/fail buttons. Real-world scenario: a Developer says "fixed", QA actually tries to reproduce it and confirms — this endpoint is the single source of truth for "is this bug *really* done", closing the loop between two different roles rather than trusting a self-report.

---

### 3.6 `GET|POST /api/projects/<int:project_id>/releases/`

| | |
|---|---|
| **Purpose** | List or create software releases for a project — bundling a set of fixed bugs into a version. |
| **View** | `ReleaseListCreateView` (`generics.ListCreateAPIView`) |
| **Serializer** | `ReleaseSerializer` |
| **Model(s)** | `Release` |
| **Permission** | `IsAuthenticated`, `CanManageRelease` |

**Request flow:**
1. `get_bugs()` (a `SerializerMethodField`) returns just the bug IDs in this release via `obj.release_bugs.values_list('bug_id', flat=True)` — a lightweight list rather than full nested bug objects, keeping the response small.
2. `perform_create()` sets `created_by` and `project_id` server-side.

**Response (GET, 200 OK):**
```json
[
  {
    "id": 2,
    "version": "1.4.0",
    "title": "July Bugfix Release",
    "project": 3,
    "created_by": 1,
    "created_by_name": "Priya Sharma",
    "bugs": [12, 15, 18],
    "released_at": "2026-07-01T00:00:00Z"
  }
]
```

**When this is used:** `ReleaseManager.jsx`'s release-creation form. Real-world scenario: end of a sprint, the RM bundles 6 fixed bugs into `v1.4.0` for a coordinated deploy, rather than shipping each fix piecemeal.

---

### 3.7 `POST /api/releases/<int:release_id>/add-bug/`

| | |
|---|---|
| **Purpose** | Attach a specific bug to a specific release. |
| **View** | `AddBugToReleaseView` (`APIView`) |
| **Model(s)** | `Release`, `Bug`, `ReleaseBug` |
| **Permission** | `IsAuthenticated`, `CanAddBugToRelease` |

**Request flow:**
1. Validates the bug actually belongs to the **same project** as the release — you can't accidentally bundle a bug from Project A into a release for Project B.
2. Checks `ReleaseBug.objects.filter(release=release, bug=bug).exists()` to prevent duplicate entries (belt-and-suspenders alongside the model's `unique_together` constraint).
3. Creates the join-table row.

**Request body:**
```json
{ "bug_id": 15 }
```

**Response (201 Created):**
```json
{ "message": "Bug#15 added to Release v1.4.0" }
```

**When this is used:** `ReleaseManager.jsx`, after creating a release, adding each qualifying bug to it one at a time.

---

### 3.8 `GET /api/projects/<int:project_id>/dashboard/`

| | |
|---|---|
| **Purpose** | Aggregate summary statistics for a project's bugs — the numbers behind each role's dashboard cards. |
| **View** | `DashboardSummaryView` (`APIView`) |
| **Permission** | `IsAuthenticated`, `HasProjectAccess` |

**Request flow:**
1. Starts from all bugs in the project, filtered down to `assigned_to=request.user` for Developers (same scoping logic as the bug list endpoint) — a Developer's dashboard reflects *their* workload, not the whole team's.
2. `bugs.values('severity').annotate(count=Count('severity'))` — a single aggregate SQL query (`GROUP BY severity`) rather than looping in Python, letting the database do the counting efficiently.

**Database interaction:**
- One `SELECT COUNT(*)` for total
- Two filtered counts (`open`, `resolved`)
- One `GROUP BY` aggregate query for severity breakdown

**Response (200 OK):**
```json
{
  "total_bugs": 24,
  "open_bugs": 9,
  "resolved_bugs": 6,
  "severity_breakdown": {
    "critical": 3,
    "high": 10,
    "medium": 9,
    "low": 2
  }
}
```

**When this is used:** Every dashboard (`DeveloperDashboard.jsx`, `QaDashboard.jsx`, `ReleaseManager.jsx`) on load, powering the summary cards at the top of each view.

---

## 4. AI Integration App

Base path: `/api/`

### 4.1 `POST /api/bugs/<int:bug_id>/roast/`

| | |
|---|---|
| **Purpose** | Generate a lighthearted, team-morale "roast" comment about a bug, using an LLM (Groq/Llama-family model). |
| **HTTP Method** | `POST` — this triggers a real external API call and a write to the database (the roast is cached on the `Bug` row), so it's an action, not a passive read. |
| **View** | `BugRoastView` (`APIView`) |
| **Model(s)** | `Bug` |
| **Permission** | `IsAuthenticated`, `HasBugAccess` (reused from the bugs app — ensures project scoping), `IsDevOrQA` |

**Request flow:**
1. Fetches the `Bug`.
2. Calls `groq_service.generate_roast(bug.description)`, which sends a system + user prompt to the Groq API (`openai/gpt-oss-20b` model) requesting a short, kind, non-mean-spirited joke about the bug.
3. If the Groq call fails for any reason (rate limit, network, missing API key) — caught broadly, logged, and the endpoint returns `503 Service Unavailable` with a friendly retry message, rather than crashing or returning a raw exception.
4. On success, saves the roast text into `bug.roast_commentary` (`update_fields=['roast_commentary']` — only that one column is written, avoiding accidental overwrites of concurrent edits to other fields).

**Database interaction:**
- `SELECT` on `bugs`
- `UPDATE` on `bugs` (one field)
- (No direct DB interaction with Groq itself — that's an external HTTPS call)

**Response (200 OK):**
```json
{
  "bug_id": 12,
  "roast_commentary": "Ah yes, the classic 'works on my machine, dies in Safari' bug — Safari really said 'not today' to your login form."
}
```

**Response (503, Groq failure):**
```json
{ "error": "Roast generation is temporarily unavailable. Try again shortly." }
```

**When this is used:** `BugDetail.jsx`'s "Roast" button, and `NewBug.jsx`'s post-creation success panel. Real-world scenario: purely a culture/morale feature — makes triaging bugs a little more fun for the team, with zero functional impact on the bug itself.

---

### 4.2 `POST /api/bugs/<int:bug_id>/suggest/`

| | |
|---|---|
| **Purpose** | Generate a practical, technical suggestion for how to approach fixing the bug, using the same LLM. |
| **HTTP Method** | `POST` |
| **View** | `BugSuggestFixView` (`APIView`) |
| **Model(s)** | `Bug` |
| **Permission** | `IsAuthenticated`, `HasBugAccess`, `IsDevOrQA` |

**Request flow:**
1. Nearly identical to the roast endpoint, but the prompt (`groq_service.suggest_fix(description, severity)`) asks for a concise, specific technical starting point instead of humor — and includes the bug's `severity` in the prompt, so the model can calibrate urgency/depth of its suggestion.
2. Saves to `bug.solution_suggestion` on success.

**Response (200 OK):**
```json
{
  "bug_id": 12,
  "solution_suggestion": "Since this only reproduces in Safari, check for WebKit-specific handling of form submission events — likely a missing polyfill or an event listener that Chrome tolerates but Safari's stricter engine rejects. Start by reproducing with Safari's Web Inspector open to catch the exact TypeError's stack trace."
}
```

**When this is used:** `BugDetail.jsx`'s "Suggest Fix" button. Real-world scenario: a Developer picking up an unfamiliar bug gets a starting point instantly, rather than starting investigation completely cold.

---

## 5. How Authentication Flows End-to-End

Putting the pieces together, here's the full lifecycle of a request in this system:

1. **Login** (`POST /api/auth/login/`) → returns `access` + `refresh` tokens. Frontend stores both in `localStorage`.
2. **Every subsequent request** → `axiosInstance.js`'s request interceptor automatically attaches `Authorization: Bearer <access>` to every outgoing call.
3. **Django receives the request** → `rest_framework_simplejwt.authentication.JWTAuthentication` (set globally in `REST_FRAMEWORK.DEFAULT_AUTHENTICATION_CLASSES`) decodes the JWT, verifies its signature, and populates `request.user` — this is the **authentication** layer: "who are you?"
4. **The view's `permission_classes`** then run — e.g. `IsReleaseManager`, `CanCreateBug`, `HasBugAccess` — this is the **authorization** layer: "given who you are, are you allowed to do *this specific thing*?" These two layers are intentionally separate: a valid JWT only proves identity, never grants blanket access.
5. **If the access token has expired** (after 30 minutes) → the API returns `401`. The response interceptor in `axiosInstance.js` catches this automatically, calls `POST /api/auth/login/refresh/` with the stored refresh token, gets a new access token, retries the original request transparently — the user never notices this happened.
6. **If the refresh token has also expired** (after 7 days) or was blacklisted (e.g. via logout) → the refresh call itself fails, `localStorage` is cleared, and the user is redirected to `/login`.

This two-token design (short-lived access, longer-lived refresh) balances security (a stolen access token is only useful for 30 minutes) against user convenience (no need to re-enter a password every half hour).
