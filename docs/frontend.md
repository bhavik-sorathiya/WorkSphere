# 🎨 Frontend Architecture Deep Dive

The frontend of WorkSphere is an advanced Single Page Application (SPA) structured to handle complex states, real-time syncs, and large DOM manipulations without blocking the main thread.

## Context Wrapping Topology

To prevent prop-drilling and ensure strict separation of concerns, the `<App />` root wraps the router in a specific hierarchical order of Context Providers:

1.  **`<QueryClientProvider>`**: Outermost layer. Ensures the caching engine is available to all components immediately.
2.  **`<ToastProvider>`**: UI layer. Allows any deep component to trigger generic success/error toasts without relying on local state.
3.  **`<SocketProvider>`**: Infrastructure layer. Initializes the `socket.io-client` connection.
4.  **`<RefreshProvider>`**: Acts as a global bus to trigger manual refetches of queries when automated invalidation is insufficient.
5.  **`<Routes>`**: The React Router v7 configuration.

## TanStack Query Caching Strategy

WorkSphere abandons traditional global state stores (like Redux) in favor of treating the Backend as the single source of truth.

**Configuration (`src/App.jsx`):**
```javascript
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000, // 5 minutes
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});
```

**Why this matters:**
*   `staleTime: 5 * 60 * 1000`: We prevent the UI from spamming the backend with redundant `GET` requests if the user navigates between a Kanban board and the Settings page within a 5-minute window.
*   `refetchOnWindowFocus: false`: In a collaborative workspace, tab-switching is frequent. Disabling this prevents aggressive, unnecessary network traffic.
*   *Real-time override*: If a Socket.io event arrives (e.g., `TASK_UPDATED`), the frontend manually calls `queryClient.invalidateQueries({ queryKey: ['tasks'] })`, instantly overriding the `staleTime` and fetching fresh data only when mathematically proven necessary.

## Kanban Engine & Atomic UI Rendering

The Kanban board utilizes `@hello-pangea/dnd`. 

**The Rendering Flow:**
1.  **State Initialization:** The server provides the list of tasks.
2.  **Drag Operation:** When a user drags a card, the state updates *locally* first (Optimistic UI) to ensure 60fps animations.
3.  **Synchronization:** A `PATCH` request is dispatched to `/api/projects/:projectId/tasks/:taskId/status`.
4.  **Reconciliation:** If the request fails, the local state rolls back. If successful, the server emits a socket event to update all other connected clients seamlessly.

## Routing Abstractions

WorkSphere employs a Layout-based routing protection strategy.
*   The `<SidebarLayout />` wraps all routes starting with `/org/:orgId`.
*   This acts as an authorization boundary. If a user attempts to access `/org/123/boards` but the context cannot verify their membership in `org 123`, the layout immediately ejects them to the `<Dashboard />`, preventing rendering of unauthorized data.

---
👉 **Next:** Read about the [Backend Architecture](backend.md)

*Return to [Index](index.md)*
