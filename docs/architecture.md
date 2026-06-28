# 🏛️ Core System Architecture

WorkSphere fundamentally operates on a polyglot persistence architecture, decoupling structured entity data from high-velocity unstructured data.

## 1. Polyglot Persistence Boundary

### 1.1 PostgreSQL (ACID & Referential Integrity)
All multi-tenant boundaries (Organizations), RBAC configurations, and structured Project entities are stored in PostgreSQL using Prisma.

**Why PostgreSQL?** 
*   **Foreign Key Constraints:** In a collaborative system, if an `Organization` is deleted, all associated `Projects`, `Tasks`, and `Channels` must be cascade-deleted instantly to prevent orphaned data. We heavily utilize `onDelete: Cascade` at the Prisma schema level.
*   **Compound Uniqueness:** We enforce strict data integrity at the database layer, such as preventing a user from joining a project twice via compound indexes: `@@unique([projectId, userId])`.

### 1.2 MongoDB (High-Velocity & Schema-Less Data)
We utilize MongoDB (via Mongoose) to handle data that grows exponentially and does not require complex relational joins:
*   **Activity Logs (`ActivityLog.js`):** Every action (task creation, status change) triggers a fire-and-forget log to MongoDB.
*   **Real-time Chat (`Message.js`):** Messages are stored as semi-structured documents.
*   **Documents (`Document.js`):** Collaborative documents stored as BlockNote JSON structures.

**Why MongoDB?** 
*   Writing thousands of chat messages and audit logs to PostgreSQL would drastically bloat the B-Trees, severely degrading read performance for core operations like fetching Kanban tasks. By shunting these to MongoDB, PostgreSQL remains highly performant for core business logic.

---

## 2. Identity Synchronization via Webhooks

WorkSphere leverages Clerk for authentication, but requires an internal representation of the `User` in PostgreSQL for relational mappings (e.g., assigning a `User` to a `Task`).

**The Synchronization Flow:**
1. A user signs up on the Clerk frontend.
2. Clerk fires a `user.created` Webhook to the WorkSphere backend (`/api/webhooks/clerk`).
3. The Express route uses the `svix` library to cryptographically verify the `svix-signature` header, ensuring the request genuinely originated from Clerk.
4. The controller executes a `prisma.user.upsert()`, injecting the Clerk `user_id` directly as the Primary Key in the PostgreSQL `User` table.
*   *Result:* We maintain total relational mapping without having to securely salt/hash or manage passwords locally.

*Note: For edge-cases where webhooks drop, WorkSphere implements a JIT synchronization cache in the Auth middleware (detailed in the [RBAC documentation](rbac.md)).*

---

## 3. Event-Driven Socket Topology

Real-time state synchronization is managed via a singleton `io` instance injected into the Express `req.app` context.

**Data Leak Prevention Strategy:**
Instead of broadcasting to all connected clients, Socket.io utilizes isolated "rooms" mapping strictly to PostgreSQL UUIDs:
*   `io.to('project_${projectId}').emit('TASK_UPDATED', ...)`
*   `io.to('org_${organizationId}').emit('NOTICE_CREATED', ...)`
*   `io.to('user_${userId}').emit('notification', ...)`

This ensures that a user sitting in Project A receives zero network traffic (and zero unauthorized data) about state changes occurring in Project B, drastically reducing client-side memory leaks and securing multi-tenant boundaries.

---

👉 **Next:** Read about the [Frontend Architecture](frontend.md)

*Return to [Index](index.md)*
