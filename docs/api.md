# 📡 API & WebSockets Documentation

WorkSphere bridges standard RESTful HTTP protocols for state mutation with real-time WebSockets for UI hydration.

## 1. RESTful API Structure

All routes are mounted under `/api` in `server/index.js`. 

### Middleware Interceptors
Every route requiring authentication traverses:
1. `requireAuth()`: Extracts Clerk JWT and ensures the user exists in PostgreSQL.
2. `requireRole('...')` OR `requireProjectRole('...')`: Validates multi-tenant boundaries and RBAC permissions.

### Common Route Prefixes
*   **`/api/org`**: `POST /`, `GET /:orgId`, `POST /:orgId/invites`, `GET /my-invites`
*   **`/api/projects`**: `POST /:orgId`, `GET /:orgId/:projectId`, `DELETE /:orgId/:projectId`
*   **`/api/tasks`**: `POST /:orgId/:projectId`, `PATCH /:orgId/:projectId/:taskId/status`
*   **`/api/chat`**: `POST /:orgId/:projectId/channels`, `GET /:orgId/:projectId/:channelId/messages`
*   **`/api/documents`**: `POST /:orgId/:projectId`, `GET /:orgId/:projectId/:documentId`
*   **`/api/search`**: `GET /:orgId`

> [!NOTE]
> Almost every operational route requires *both* `orgId` and `projectId` in the URL parameters. This guarantees that the `requireProjectRole` middleware has enough context to validate authorization against the correct boundary.

---

## 2. WebSocket Event Dictionary

The Socket.io server is attached to the main Express HTTP server. We use specialized rooms to emit events securely.

### Rooms
*   `project_${projectId}`: Receives events relating to tasks, comments, and channels in a specific project.
*   `org_${orgId}`: Receives events relating to global org notices.
*   `user_${userId}`: Receives private alerts (e.g. invite notifications, permission requests).

### Emit Dictionary

| Event Name | Room | Triggered When... | Client Action |
| :--- | :--- | :--- | :--- |
| `TASK_CREATED` | `project_X` | A new task is added. | Invalidate `["project", "X"]` |
| `TASK_UPDATED` | `project_X` | A task changes status/assignee. | Invalidate `["project", "X"]` |
| `TASK_DELETED` | `project_X` | A task is removed. | Invalidate `["project", "X"]` |
| `NEW_MESSAGE` | `project_X` | A chat message is sent. | Prepend to chat state or refetch. |
| `CHANNEL_CREATED` | `project_X` | A new chat channel is opened. | Refetch project channels. |
| `DOCUMENT_UPDATED`| `project_X` | A blocknote doc is saved. | Refetch document data. |
| `NOTICE_CREATED` | `org_Y` | A global notice is published. | Refetch org notices. |
| `notification` | `user_Z` | A user is invited or requested. | Display UI Toast. |

> [!TIP]
> Do NOT store the WebSocket payload directly into the React state unless it is high-velocity (like chat). For standard entities (like Tasks), simply use the WebSocket event as a trigger to execute `queryClient.invalidateQueries()`, forcing the frontend to securely re-fetch the exact PostgreSQL state.

---

*Return to [Index](index.md)*
