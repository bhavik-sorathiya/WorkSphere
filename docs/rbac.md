# 🔐 Role-Based Access Control (RBAC) & Multi-Workspace Architecture

WorkSphere employs a sophisticated dual-layer Role-Based Access Control (RBAC) system combined with specialized Multi-Workspace exception handling logic. This document outlines the architectural decisions and internal flows that guarantee strict data boundaries.

## 1. The Dual-Layer RBAC Topology

Access control is explicitly divided into two physical domains within the PostgreSQL schema: **Organization Level** and **Project Level**.

### 1.1 Organization Level (Global Boundaries)
The `UserOrganizationRole` model defines a user's macro-permissions inside a specific tenant (`Organization`). 
- **Roles:** `OWNER`, `ADMIN`, `MANAGER`, `MEMBER`, `VIEWER`.
- **Enforcement:** Governed by `requireRole(minimumRole)` in `rbac.middleware.js`.

### 1.2 Project Level (Micro Boundaries)
A user might be a basic `MEMBER` at the Organization level, but an `ADMIN` of a specific `Project` within that organization. The `ProjectMember` model explicitly dictates this micro-boundary.
- **Roles:** `MEMBER`, `EDITOR`, `VIEWER`, etc.
- **Enforcement:** Governed by `requireProjectRole(minimumRole)` in `rbac.middleware.js`.

> [!NOTE]
> **Implicit Inheritance:** If a user possesses the `OWNER` or `ADMIN` role at the *Organization Level*, the `requireProjectRole` middleware instantly bypasses the `ProjectMember` query and explicitly grants them `ADMIN` rights inside the project. This prevents database lookup overhead for Org Admins traversing projects.

---

## 2. JIT (Just-In-Time) Identity Synchronization

WorkSphere relies on **Clerk** for edge-based authentication (JWTs, session tokens, 2FA) to maintain world-class security without storing local passwords. However, PostgreSQL absolutely requires a strict foreign key mapping to assign tasks, comments, or projects to a specific user.

**The Solution: Synchronous JIT Cache**
Instead of relying entirely on asynchronous Webhooks (which can drop during server restarts or network failures), WorkSphere implements a Just-In-Time synchronization cache in `auth.middleware.js`.

1. **Token Extraction:** `@clerk/express` extracts the `userId` from the incoming JWT.
2. **In-Memory Cache Check:** The middleware checks a fast local Node `Set()` to see if this user has been synced during the lifetime of the server.
3. **Database Fallback:** If absent from memory, it queries PostgreSQL. If the user doesn't exist, it synchronously blocks the request, fetches the user's metadata directly from the Clerk API, and upserts them into PostgreSQL.
4. **Cache Hydration:** Once synced, the user is added to the in-memory `Set()`, guaranteeing that subsequent API requests over the lifetime of the Express server never hit PostgreSQL for identity verification.

---

## 3. Multi-Workspace Logic & Exceptions

In a B2B SaaS context, strict intellectual property and billing boundaries often require that a user works *exclusively* for a single tenant. However, contractors or consultants often need access to multiple tenants.

### 3.1 The Constraint Architecture
When an `Organization` is provisioned, the `WorkspaceSetting` model dictates whether users in that organization are allowed to join external organizations. 
- `allowMultipleWorkspaces: Boolean` (Defaults to `true`).

### 3.2 The Exception Override (`multiWorkspaceException`)
If an organization restricts multi-workspace access, a specific user can be granted an exception via the `multiWorkspaceException` boolean attached directly to their `UserOrganizationRole`. This is strictly controlled by `OWNER` / `ADMIN` roles.

### 3.3 The Join Request Workflow
The `org.controller.js` manages complex permutations of cross-tenant invites:
1. **The Invite:** Org A invites User X.
2. **The Validation:** The system queries all of User X's existing Organization boundaries.
3. **The Restriction Hit:** If User X belongs to Org B (which restricts multi-workspace) AND User X does not have an exception in Org B, the invite to Org A is temporarily stalled.
4. **The `WorkspaceJoinRequest`:** A formal `PENDING` request is logged in the DB, alerting the `ADMIN` of Org B that User X is requesting permission to join Org A.
5. **Approval / Denial:** If Org B's Admin approves the request, User X's invite to Org A is finalized. If denied, User X is barred from accepting Org A's invite.

> [!IMPORTANT]
> The `VIEWER` role fundamentally bypasses this logic. A user can always join external organizations strictly as a `VIEWER` (e.g. to read public documentation or observe a shared project) without violating their primary organization's multi-workspace constraint.

---

*Return to [Index](index.md)*
