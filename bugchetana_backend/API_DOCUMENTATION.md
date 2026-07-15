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
3. [AI Integration App](#3-ai-integration-app)
4. [Notifications App](#4-notifications-app)
5. [Bugs App](#5-bugs-app)
6. [How Authentication Flows End-to-End](#6-how-authentication-flows-end-to-end)

---

## 1. Accounts App

Base path: `/api/auth/`

### 1.1 `POST /api/auth/register/`

| | |
|---|---|
| **Purpose** | Create a new user account. Every new user is auto-assigned the `Developer` role. |
| **HTTP Method** | `POST` |
| **View** | `RegisterView` |
| **Permission** | `AllowAny` |
| **Request Body** | `username`, `email`, `name`, `password`, `password2` (all required) |

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

### 1.2 `POST /api/auth/login/`

| | |
|---|---|
| **Purpose** | Authenticate a user with email + password, issue JWT access/refresh tokens. |
| **HTTP Method** | `POST` |
| **View** | `LoginView` |
| **Permission** | `AllowAny` |
| **Request Body** | `email`, `password` |

**Response (200 OK):**
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

### 1.3 `POST /api/auth/login/refresh/`

| | |
|---|---|
| **Purpose** | Exchange a valid refresh token for a brand new access and refresh token. |
| **HTTP Method** | `POST` |
| **View** | `TokenRefreshView` |
| **Permission** | None |
| **Request Body** | `refresh` (the old refresh token) |

**Response (200 OK):**
```json
{
  "access": "eyJhbGciOi...",
  "refresh": "eyJhbGciOi..."
}
```

### 1.4 `POST /api/auth/logout/`

| | |
|---|---|
| **Purpose** | Invalidate a user's refresh token (server-side), ending their session. |
| **HTTP Method** | `POST` |
| **View** | `LogoutView` |
| **Permission** | `IsAuthenticated` |
| **Request Body** | `refresh` (the refresh token to blacklist) |

**Response (200 OK):**
```json
{ "message": "Logout successful" }
```

### 1.5 `GET /api/auth/profile/`

| | |
|---|---|
| **Purpose** | Fetch the currently authenticated user's own profile info. |
| **HTTP Method** | `GET` |
| **View** | `ProfileView` |
| **Permission** | `IsAuthenticated` |

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

### 1.6 `PATCH /api/auth/profile/`

| | |
|---|---|
| **Purpose** | Let the currently authenticated user update their own `name` and `email`. |
| **HTTP Method** | `PATCH` |
| **View** | `ProfileView.patch` |
| **Permission** | `IsAuthenticated` |
| **Request Body** | `name` (optional), `email` (optional) |

**Response (200 OK):** Same shape as GET.

### 1.7 `GET /api/auth/users/`

| | |
|---|---|
| **Purpose** | List all registered users in the system. |
| **HTTP Method** | `GET` |
| **View** | `UserListView` |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` |

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
  }
]
```

### 1.8 `PATCH /api/auth/users/<int:pk>/role/`

| | |
|---|---|
| **Purpose** | Change a specific user's role. |
| **HTTP Method** | `PATCH` |
| **View** | `RoleUpdateView` |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` |
| **Request Body** | `role_id` (integer) |

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

### 1.9 `GET /api/auth/roles/`

| | |
|---|---|
| **Purpose** | List all available roles and their IDs. |
| **HTTP Method** | `GET` |
| **View** | `RoleListView` |
| **Permission** | `IsAuthenticated`, `IsAdminOrReleaseManager` |

**Response (200 OK):**
```json
[
  { "id": 1, "name": "Developer" },
  { "id": 2, "name": "QA" },
  { "id": 3, "name": "Release Manager" }
]
```

---

## 2. Projects App

Base path: `/api/projects/`

### 2.1 `GET|POST /api/projects/`

| | |
|---|---|
| **Purpose** | `GET`: list projects the current user can see. `POST`: create a new project. |
| **HTTP Methods** | `GET`, `POST` |
| **View** | `ProjectListCreateView` |
| **Permission** | `IsAuthenticated`. `POST` requires `IsReleaseManager`. |
| **Request Body (POST)** | `name` |

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

### 2.2 `GET|PATCH|DELETE /api/projects/<int:pk>/`

| | |
|---|---|
| **Purpose** | View, edit, or delete a single project. |
| **HTTP Methods** | `GET`, `PATCH`, `DELETE` |
| **View** | `ProjectDetailView` |
| **Permission** | `IsAuthenticated`, `IsProjectMember` (GET) or Release Manager (PATCH/DELETE). |

### 2.3 `GET /api/projects/<int:project_id>/members/`

| | |
|---|---|
| **Purpose** | List who's currently a member of a project. |
| **HTTP Method** | `GET` |
| **View** | `ProjectMemberListView` |
| **Permission** | `CanManageProjectMembers` (Members and RM) |

**Response (200 OK):**
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

### 2.4 `POST /api/projects/<int:project_id>/members/add/`

| | |
|---|---|
| **Purpose** | Add a new member to a project. |
| **HTTP Method** | `POST` |
| **View** | `AddProjectMemberView` |
| **Permission** | `CanManageProjectMembers` (Project RM only) |
| **Request Body** | `user_id` |

**Response (201 Created):**
```json
{
  "id": 12,
  "project": 3,
  "user": 4,
  ...
}
```

### 2.5 `DELETE /api/projects/<int:project_id>/members/<int:user_id>/`

| | |
|---|---|
| **Purpose** | Remove a specific user from a specific project. |
| **HTTP Method** | `DELETE` |
| **View** | `RemoveProjectMemberView` |
| **Permission** | `CanManageProjectMembers` (Project RM only) |

**Response (200 OK):**
```json
{ "message": "Member removed" }
```

---

## 3. AI Integration App

Base path: `/api/ai/` and `/api/bugs/`

### 3.1 `POST /api/ai/predict-severity/`

| | |
|---|---|
| **Purpose** | Stateless severity prediction based on title and description. |
| **HTTP Method** | `POST` |
| **View** | `PredictSeverityView` |
| **Permission** | `AllowAny` |
| **Request Body** | `title`, `description` |

**Response (200 OK):**
```json
{
  "severity": "high",
  "confidence": 85.5
}
```

### 3.2 `POST /api/ai/review-guest/`

| | |
|---|---|
| **Purpose** | Stateless roast and fix suggestions for the public bug-report flow. |
| **HTTP Method** | `POST` |
| **View** | `GuestAIReviewView` |
| **Permission** | `AllowAny` (Throttled via `AnonRateThrottle`) |
| **Request Body** | `title`, `description`, `severity` (optional) |

**Response (200 OK):**
```json
{
  "roast": "This bug is so obvious it hurts...",
  "fix_suggestions": "Check for null references on line 42."
}
```

### 3.3 `POST /api/bugs/<int:bug_id>/roast/`

| | |
|---|---|
| **Purpose** | Generate a roast for a specific bug, saving it to `roast_commentary`. |
| **HTTP Method** | `POST` |
| **View** | `BugRoastView` |
| **Permission** | `IsAuthenticated`, `IsDevOrQA` |

**Response (200 OK):**
```json
{
  "bug_id": 12,
  "roast_commentary": "..."
}
```

### 3.4 `POST /api/bugs/<int:bug_id>/suggest/`

| | |
|---|---|
| **Purpose** | Generate a fix suggestion for a bug, saving it to `solution_suggestion`. |
| **HTTP Method** | `POST` |
| **View** | `BugSuggestFixView` |
| **Permission** | `IsAuthenticated`, `HasBugAccess`, `IsDevOrQA` |

**Response (200 OK):**
```json
{
  "bug_id": 12,
  "solution_suggestion": "..."
}
```

---

## 4. Notifications App

Base path: `/api/notifications/`

### 4.1 `GET /api/notifications/`

| | |
|---|---|
| **Purpose** | List all notifications for the authenticated user. |
| **HTTP Method** | `GET` |
| **View** | `NotificationListView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
[
  {
    "id": 1,
    "recipient": 4,
    "message": "Bug #12 has been assigned to you.",
    "is_read": false,
    "related_bug_id": 12,
    "related_project_id": 3,
    "created_at": "2026-07-10T12:00:00Z"
  }
]
```

### 4.2 `PATCH /api/notifications/<int:pk>/read/`

| | |
|---|---|
| **Purpose** | Mark a specific notification as read. |
| **HTTP Method** | `PATCH` |
| **View** | `NotificationMarkReadView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
{
  "id": 1,
  "is_read": true,
  ...
}
```

### 4.3 `POST /api/notifications/mark-all-read/`

| | |
|---|---|
| **Purpose** | Mark all unread notifications for the user as read. |
| **HTTP Method** | `POST` |
| **View** | `NotificationMarkAllReadView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
{
  "marked_read": 5
}
```

---


## 5. Bugs App

Base path: `/api/` (bug routes are mostly not project-nested except creation/listing)

### 5.1 Dashboards

#### 5.1.1 `GET /api/projects/<int:project_id>/dashboard/`
| | |
|---|---|
| **Purpose** | Aggregate summary statistics for a project's bugs. |
| **HTTP Method** | `GET` |
| **View** | `DashboardSummaryView` |
| **Permission** | `IsAuthenticated`, `HasProjectAccess` |

**Response (200 OK):**
```json
{
  "total_bugs": 42,
  "open_bugs": 10,
  "resolved_bugs": 5,
  "failed_bugs": 2,
  "severity_breakdown": { "high": 5, "medium": 30, "low": 7 },
  "status_breakdown": { "open": 10, "resolved": 5, ... }
}
```

#### 5.1.2 `GET /api/dashboard/qa/`
| | |
|---|---|
| **Purpose** | Summary statistics for the logged-in QA user across their projects. |
| **HTTP Method** | `GET` |
| **View** | `QaDashboardSummaryView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
{
  "pending_review_count": 5,
  "failed_recheck_count": 2,
  "passed_count": 10,
  "failed_count": 4,
  "active_bug_lists_count": 3,
  "recent_activity": []
}
```

#### 5.1.3 `GET /api/dashboard/developer/`
| | |
|---|---|
| **Purpose** | Summary statistics for the logged-in Developer. |
| **HTTP Method** | `GET` |
| **View** | `DeveloperDashboardSummaryView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
{
  "assigned_by_status": { "open": 3, "in_progress": 2, "resolved": 0, "failed": 1, "resubmitted": 0, "closed": 5 },
  "needs_attention_count": 1,
  "recent_activity": []
}
```

---

### 5.2 Bug Management

#### 5.2.1 `GET|POST /api/projects/<int:project_id>/bugs/`
| | |
|---|---|
| **Purpose** | `GET`: list bugs in a project. `POST`: file a new bug. ML severity prediction happens automatically on POST. |
| **HTTP Methods** | `GET`, `POST` |
| **View** | `BugListCreateView` |
| **Permission** | `IsAuthenticated` + (`CanCreateBug` for POST, `HasProjectAccess` for GET) |
| **Request Body (POST)** | `title`, `description`, `status`, `severity`, `priority`, `assigned_to` |

**Response (201 Created):**
```json
{
  "id": 12,
  "title": "Login page crashes on Safari",
  "description": "...",
  "status": "open",
  "severity": "medium",
  "priority": "high",
  "assigned_to": 4,
  "predicted_severity": "high",
  "ai_status": true
}
```

#### 5.2.2 `GET /api/bugs/mine/`
| | |
|---|---|
| **Purpose** | Bugs created by the authenticated user. |
| **HTTP Method** | `GET` |
| **View** | `DeveloperSubmittedBugsView` |
| **Permission** | `IsAuthenticated` |

**Response (200 OK):**
```json
[
  {
    "id": 12,
    "title": "Login page crashes",
    "status": "open",
    "submitted_at": "2026-07-02T16:00:00Z"
  }
]
```

#### 5.2.3 `GET|PATCH|DELETE /api/bugs/<int:pk>/`
| | |
|---|---|
| **Purpose** | View, edit, or delete a single bug with role-specific field restrictions on edit. |
| **HTTP Methods** | `GET`, `PATCH`, `DELETE` |
| **View** | `BugDetailView` |
| **Permission** | `IsAuthenticated`, `IsBugProjectMember`, `IsBugOwnerOrReleaseManager` |
| **Request Body (PATCH)** | `status`, `description`, `title`, `notes` (Developers); `assigned_to` (QA) |

**Notes:** Developers cannot set status to `closed`. If setting to `resolved`, `notes` are required.

#### 5.2.4 `PATCH /api/bugs/<int:pk>/assign/`
| | |
|---|---|
| **Purpose** | Assign a developer to a bug. Can optionally record this as a reassignment by QA. |
| **HTTP Method** | `PATCH` |
| **View** | `BugAssignView` |
| **Permission** | `IsAuthenticated`, `CanSubmitQAResult` |
| **Request Body** | `assigned_to` (integer, required), `notes` (optional unless recording reassign), `record_reassign` (boolean) |

**Response (200 OK):** Returns the updated `Bug` object.

#### 5.2.5 `PATCH /api/bugs/<int:pk>/resubmit/`
| | |
|---|---|
| **Purpose** | Developer resubmits a failed bug for QA review. |
| **HTTP Method** | `PATCH` |
| **View** | `BugResubmitView` |
| **Permission** | `IsAuthenticated`, `HasBugAccess` (only assigned developer can resubmit) |
| **Request Body** | `notes` (required), `title` (optional), `description` (optional) |

**Response (200 OK):** Returns the updated `Bug` object with status `resubmitted`.

#### 5.2.6 `PATCH /api/bugs/<int:pk>/verify/`
| | |
|---|---|
| **Purpose** | QA marks a resolved bug as verified without changing its status to closed yet. |
| **HTTP Method** | `PATCH` |
| **View** | `BugVerifyView` |
| **Permission** | `IsAuthenticated`, `CanSubmitQAResult` |
| **Request Body** | `notes` (optional) |

---

### 5.3 Comments & History

#### 5.3.1 `GET|POST /api/bugs/<int:bug_id>/comments/`
| | |
|---|---|
| **Purpose** | View or add comments on a bug. |
| **HTTP Methods** | `GET`, `POST` |
| **View** | `BugCommentListCreateView` |
| **Permission** | `IsAuthenticated`, `HasBugAccess` |
| **Request Body (POST)** | `comment_text` |

#### 5.3.2 `GET /api/bugs/<int:bug_id>/history/`
| | |
|---|---|
| **Purpose** | Audit trail of status changes for a bug. |
| **HTTP Method** | `GET` |
| **View** | `BugHistoryListView` |
| **Permission** | `IsAuthenticated`, `HasBugAccess` |

---

### 5.4 QA Workflows & Results

#### 5.4.1 `POST /api/bugs/<int:bug_id>/qa-result/`
| | |
|---|---|
| **Purpose** | QA formally passes, fails, or reassigns a bug. Drives status automatically. |
| **HTTP Method** | `POST` |
| **View** | `QAResultCreateView` |
| **Permission** | `IsAuthenticated`, `CanSubmitQAResult` |
| **Request Body** | `result` ('pass', 'fail', 'reassign'), `notes` (required on fail/reassign) |

**Side Effects:** 'pass' -> status='closed'; 'fail' -> status='failed'; 'reassign' -> status='resubmitted'.

#### 5.4.2 `GET /api/qa-results/mine/`
| | |
|---|---|
| **Purpose** | QA review history for the authenticated QA user. |
| **HTTP Method** | `GET` |
| **View** | `QAResultHistoryView` |
| **Permission** | `IsAuthenticated` |

---

### 5.5 Bug Lists

#### 5.5.1 `GET|POST /api/projects/<int:project_id>/bug-lists/`
| | |
|---|---|
| **Purpose** | List or create Bug Lists for QA. |
| **HTTP Methods** | `GET`, `POST` |
| **View** | `BugListCreateViewForProject` |
| **Permission** | `IsAuthenticated`, `CanCreateBugList` (POST), `HasProjectAccess` (GET) |

#### 5.5.2 `POST /api/projects/<int:project_id>/bug-lists/<int:bug_list_id>/items/`
| | |
|---|---|
| **Purpose** | Bulk-add existing bugs to a BugList. |
| **HTTP Method** | `POST` |
| **View** | `BugListItemAddView` |
| **Permission** | `IsAuthenticated`, `CanCreateBugList` |
| **Request Body** | `bug_id` (single) OR `bug_ids` (array) |

#### 5.5.3 `DELETE /api/projects/<int:project_id>/bug-lists/<int:bug_list_id>/items/<int:bug_id>/`
| | |
|---|---|
| **Purpose** | Remove a single Bug from a BugList. |
| **HTTP Method** | `DELETE` |
| **View** | `BugListItemDeleteView` |
| **Permission** | `IsAuthenticated`, `CanCreateBugList` |

---

### 5.6 Releases & RM

#### 5.6.1 `GET /api/release-manager/history/`
| | |
|---|---|
| **Purpose** | History of actions performed by a Release Manager. |
| **HTTP Method** | `GET` |
| **View** | `ReleaseManagerHistoryView` |
| **Permission** | `IsAuthenticated` |

#### 5.6.2 `GET|POST /api/projects/<int:project_id>/releases/`
| | |
|---|---|
| **Purpose** | List or create software releases. |
| **HTTP Methods** | `GET`, `POST` |
| **View** | `ReleaseListCreateView` |
| **Permission** | `IsAuthenticated`, `CanManageRelease` |
| **Request Body (POST)** | `version`, `title` |

#### 5.6.3 `POST /api/releases/<int:release_id>/add-bug/`
| | |
|---|---|
| **Purpose** | Attach a bug to a release. |
| **HTTP Method** | `POST` |
| **View** | `AddBugToReleaseView` |
| **Permission** | `IsAuthenticated`, `CanAddBugToRelease` |
| **Request Body** | `bug_id` |

---

## 6. How Authentication Flows End-to-End

1. **Login**: User POSTs credentials to `/api/auth/login/`. Server returns `access` and `refresh` tokens.
2. **Storage**: Frontend stores tokens in memory/sessionStorage (access) and local storage (refresh).
3. **API Requests**: Every request attaches `Authorization: Bearer <access>`.
4. **Token Expiry**: The access token lasts 30 minutes. If a request returns `401 Unauthorized`, the frontend `axios` interceptor automatically pauses the request, POSTs the `refresh` token to `/api/auth/login/refresh/`, gets a new access/refresh pair, saves them, and retries the original request.
5. **Logout**: User clicks logout, which POSTs to `/api/auth/logout/` to blacklist the refresh token on the server so it cannot be used again, and clears local state.
