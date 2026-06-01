import { Routes, Route, Navigate } from "react-router-dom";
import { SignedIn, SignedOut, SignIn, SignUp } from "@clerk/clerk-react";
import { RefreshProvider } from "./contexts/RefreshContext";
import { ToastProvider } from "./contexts/ToastContext";
import { ConfirmProvider } from "./contexts/ConfirmContext";
import { SocketProvider } from "./contexts/SocketContext";
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';

// Layouts
import SidebarLayout from "./components/SidebarLayout";
import AuthLayout from "./components/AuthLayout";

// Public / Auth pages
import LandingPage from "./pages/LandingPage";
import Dashboard from "./pages/Dashboard";

// Org-scoped pages (inside SidebarLayout)
import OrgDashboard from "./pages/OrgDashboard";
import BoardsPage from "./pages/BoardsPage";
import ChatPage from "./pages/ChatPage";
import DocsPage from "./pages/DocsPage";
import SettingsPage from "./pages/SettingsPage";
import ProjectView from "./pages/ProjectView";
import HelpPage from "./pages/HelpPage";
import AdminPanel from "./pages/AdminPanel";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 5 * 60 * 1000,
      retry: 1,
      refetchOnWindowFocus: false,
    },
  },
});

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <ToastProvider>
        <ConfirmProvider>
          <SocketProvider>
            <RefreshProvider>
              <Routes>
                {/* ─── PUBLIC ─── */}
              <Route path="/" element={
                <>
                  <SignedOut><LandingPage /></SignedOut>
                  <SignedIn><Dashboard /></SignedIn>
                </>
              } />

              {/* ─── AUTH GATEWAY ─── */}
              <Route path="/sign-in/*" element={
                <AuthLayout>
                  <SignIn routing="path" path="/sign-in" />
                </AuthLayout>
              } />
              <Route path="/sign-up/*" element={
                <AuthLayout>
                  <SignUp routing="path" path="/sign-up" />
                </AuthLayout>
              } />

              {/* ─── ORG-SCOPED (behind sidebar layout) ─── */}
              <Route path="/:orgSlug" element={
                <SignedIn><SidebarLayout /></SignedIn>
              }>
                <Route index element={<Navigate to="home" replace />} />
                <Route path="home" element={<OrgDashboard />} />
                <Route path="boards" element={<BoardsPage />} />
                <Route path="chat" element={<ChatPage />} />
                <Route path="docs" element={<DocsPage />} />
                <Route path="directory" element={<SettingsPage />} />
                <Route path="admin" element={<AdminPanel />} />
                <Route path="help" element={<HelpPage />} />
                <Route path="p/:projectSlug" element={<ProjectView />} />
              </Route>
            </Routes>
            </RefreshProvider>
          </SocketProvider>
        </ConfirmProvider>
      </ToastProvider>
    </QueryClientProvider>
  );
}

export default App;
