# 🎨 Frontend Architecture

The frontend is a React 19 Single Page Application built with Vite, Tailwind CSS, and TanStack React Query.

## 1. Context Wrapping Topology

The `main.jsx` and `App.jsx` entry points are structured as a series of context providers, ensuring global state and utilities are seamlessly injected throughout the component tree.

**Provider Order:**
1. `<ClerkProvider>`: Outermost wrapper injecting global authentication state.
2. `<BrowserRouter>`: Injects client-side routing.
3. `<QueryClientProvider>`: Mounts the TanStack cache globally.
4. `<ToastProvider>` / `<ConfirmProvider>`: Mounts global UI overlays.
5. `<SocketProvider>`: Establishes the real-time WebSocket connection to the backend.
6. `<RefreshProvider>`: Exposes a global utility to force UI refreshes for edge-case desyncs.

## 2. Server State vs. Local State (React Query)

WorkSphere strictly delineates **Server State** (data living in Postgres/Mongo) from **Local UI State** (dropdowns, tabs, drag-and-drop shadows).

### Caching Strategy (`@tanstack/react-query`)
*   Data is fetched via `useQuery` hooks.
*   **Stale Time Strategy:** We explicitly prevent local components from caching API payloads into `useState`. Instead, we rely entirely on the Query Cache. Stale times vary depending on data velocity.
*   **Mutation Invalidation:** When a user creates a task, the `onSuccess` callback of the `useMutation` hook automatically invalidates the query key (e.g., `["project", projectId]`). This triggers an automatic background refetch, replacing the DOM seamlessly without "cascading renders".

## 3. Real-Time UI Hydration

The `SocketProvider` acts as the bridge between the backend Socket.io server and the frontend Query Cache.

**The Workflow:**
1. User A modifies a task in Project X.
2. The Backend commits to Postgres and emits `TASK_UPDATED` to the `project_X` room.
3. User B's `SocketProvider` receives the event.
4. User B's client executes `queryClient.invalidateQueries(["project", "X"])`.
5. User B's Kanban board seamlessly repaints with the latest Postgres state.

> [!TIP]
> This "Event -> Invalidation" pattern is far superior to manually patching the React Query cache via socket payloads, as it guarantees the client always converges on the absolute truth of the database.

## 4. Atomic UI and Layout Abstractions

*   **Routing Layouts:** Complex authenticated pages (like the Kanban board, Chat, and Docs) are wrapped inside a `<SidebarLayout>` component, which manages the navigation shell while passing `children` into the main viewport.
*   **Kanban Engine:** We utilize `@hello-pangea/dnd` for fluid Drag-and-Drop functionality in the `ProjectView.jsx`. Optimistic UI updates handle the immediate visual drag, while the `useMutation` syncs the status to the backend.

---

*Return to [Index](index.md)*
