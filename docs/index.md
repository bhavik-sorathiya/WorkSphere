# WorkSphere Technical Documentation

Welcome to the internal engineering documentation for **WorkSphere**. This documentation is specifically designed for software engineers, systems architects, and technical recruiters. It explores the low-level data flows, complex infrastructural decisions, and exact implementation details of the application.

---

## 🛠️ Tech Stack Overview

WorkSphere is built on a highly decoupled, modern JavaScript ecosystem designed for scalability and real-time performance.

*   **Frontend**: React 19, Vite, Tailwind CSS, TanStack React Query, and Socket.io-client.
*   **Backend**: Node.js, Express 5, and Socket.io.
*   **Databases**: PostgreSQL (via Prisma ORM) for strict relational data, and MongoDB (via Mongoose) for unstructured, high-velocity data.
*   **Authentication**: Clerk (with Svix Webhooks for internal database synchronization).

---

### Table of Contents

1. 🏛️ **[Core System Architecture](architecture.md)**
   * Polyglot Persistence: Why PostgreSQL and MongoDB run simultaneously.
   * Event-Driven Socket Topology & Data Leaks Prevention.
   * Identity Synchronization via Svix Webhooks.

2. 🎨 **[Frontend Architecture](frontend.md)**
   * Context Wrapping Topology (`QueryClientProvider`, `SocketProvider`, etc.).
   * Query Caching Strategy & Stale Time configurations.
   * Atomic UI Rendering and Kanban Engine (`@hello-pangea/dnd`).
   * Routing Abstractions (`<SidebarLayout />`).

3. ⚙️ **[Backend Architecture](backend.md)**
   * Express Middleware Pipeline & Security lifecycle.
   * ACID Compliance via Prisma Transactions.
   * Fire-and-Forget MongoDB Audit Service (`ActivityLog`).
   * Centralized Error Handling architecture.

4. 🔐 **[RBAC & Multi-Workspace Logic](rbac.md)**
   * Dual-Layer Topology (Org vs. Project roles).
   * Just-In-Time (JIT) Clerk Identity Synchronization.
   * Multi-Workspace Exception overrides & Approval flows.

5. 💾 **[Database Architecture](database.md)**
   * PostgreSQL relational schema layouts.
   * MongoDB unstructured collections.

6. 📡 **[API & WebSockets](api.md)**
   * REST endpoints breakdown.
   * WebSocket Event Dictionary.

---

*Return to the [Main Project README](../README.md)*
