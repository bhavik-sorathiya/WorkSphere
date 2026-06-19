import { useEffect, useState } from "react";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { useNavigate } from "react-router-dom";
import { useRefresh } from "../contexts/RefreshContext";
import { Building2, PlusCircle, ArrowRight, LayoutGrid, CheckCircle2, XCircle, Mail, Moon, Sun } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../contexts/ToastContext";
import { SkeletonCard } from "../components/Skeleton";
import logoUrl from "../assets/logo.png";

const API = import.meta.env.VITE_API_URL;

export default function Dashboard() {
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { refreshKey } = useRefresh();
  const queryClient = useQueryClient();
  const { showToast } = useToast();

  const [newOrgName, setNewOrgName] = useState("");
  const [allowMulti, setAllowMulti] = useState(true);
  const [creating, setCreating] = useState(false);
  const [inviteTab, setInviteTab] = useState("received");

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return document.documentElement.classList.contains('dark') ||
      localStorage.getItem('theme') === 'dark' || 
      (!('theme' in localStorage) && window.matchMedia('(prefers-color-scheme: dark)').matches);
  });

  useEffect(() => {
    if (isDarkMode) {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    } else {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    }
  }, [isDarkMode]);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['dashboard', refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [orgsRes, invitesRes] = await Promise.all([
        fetch(`${API}/api/organizations`, { headers }),
        fetch(`${API}/api/organizations/my-invites`, { headers })
      ]);

      const data = invitesRes.ok ? await invitesRes.json() : { invites: [], deniedRequests: [] };
      return {
        organizations: orgsRes.ok ? await orgsRes.json() : [],
        invites: Array.isArray(data) ? data : data.invites || [],
        deniedRequests: data.deniedRequests || []
      };
    },
    staleTime: 5 * 60 * 1000
  });

  const organizations = data?.organizations || [];
  const invites = data?.invites || [];
  const deniedRequests = data?.deniedRequests || [];

  const handleCreateOrg = async (e) => {
    e.preventDefault();
    if (!newOrgName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newOrgName, allowMultipleWorkspaces: allowMulti }),
      });
      if (res.ok) { setNewOrgName(""); setAllowMulti(true); queryClient.invalidateQueries(['dashboard']); }
      else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleRespond = async (inviteId, accept) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/invites/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accept }),
      });
      const data = await res.json();
      if (res.ok) {
        if (data.status === "PERMISSION_REQUIRED") {
          showToast(data.message, "info");
        }
        queryClient.invalidateQueries(['dashboard']);
      } else {
        showToast(data.error || "Failed to respond", "error");
      }
    } catch (err) { console.error(err); }
  };

  return (
    <div className="min-h-screen font-sans animate-fade-in" style={{ background: 'var(--surface)' }}>
      {/* Header */}
      <header className="flex items-center justify-between px-6 py-4 border-b sticky top-0 z-50 transition-colors" style={{
        background: 'var(--surface-container-lowest)',
        backdropFilter: 'blur(20px)',
        WebkitBackdropFilter: 'blur(20px)',
        borderColor: 'var(--outline-variant)',
      }}>
        <span className="font-display font-extrabold text-xl tracking-tight flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
          <img src={logoUrl} alt="WorkSphere" className="w-8 h-8 rounded-md" />
          WorkSphere
        </span>
        <div className="flex items-center gap-4">
          <button 
            onClick={() => setIsDarkMode(!isDarkMode)} 
            className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-container-high)]" 
            title="Toggle theme"
          >
            {isDarkMode ? (
              <Sun className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
            ) : (
              <Moon className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
            )}
          </button>
          <UserButton afterSignOutUrl="/" appearance={{ elements: { userButtonAvatarBox: "w-9 h-9 rounded-full" } }} />
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-6 py-12 animate-fade-in">
        {/* Greeting */}
        <header className="mb-10">
          <h1 className="text-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--on-surface)' }}>
            Welcome back.
          </h1>
          <p className="text-sm mt-2 font-medium" style={{ color: 'var(--on-surface-variant)' }}>
            Select a workspace to continue, or create a new one.
          </p>
        </header>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-10">
          {/* ─── LEFT: Workspaces ─── */}
          <div className="lg:col-span-2 space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-4" style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}>
              <LayoutGrid className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
              Your Workspaces
            </h2>

            {loading ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <SkeletonCard className="h-36" />
                <SkeletonCard className="h-36" />
              </div>
            ) : organizations.length === 0 ? (
              <div className="glass-card p-12 text-center flex flex-col items-center justify-center">
                <Building2 className="w-10 h-10 mb-3" style={{ color: 'var(--outline-variant)' }} />
                <p className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>No workspaces yet. Create one below!</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {organizations.map(org => (
                  <div
                    key={org.id}
                    onClick={() => navigate(`/${org.slug}/home`)}
                    className="glass-card p-6 cursor-pointer transition-all duration-200 hover:shadow-lg hover:-translate-y-1 group"
                  >
                    <div className="flex justify-between items-start mb-5">
                      <div className="w-12 h-12 rounded-xl flex items-center justify-center font-bold text-xl text-white" style={{ background: 'var(--primary-container)' }}>
                        {org.name.charAt(0)}
                      </div>
                      <span className="label-caps px-2 py-0.5 rounded" style={{
                        background: 'var(--surface-container-high)',
                        color: 'var(--on-surface-variant)',
                        fontSize: '0.625rem',
                      }}>
                        {org.myRole}
                      </span>
                    </div>
                    <h3 className="font-bold text-lg group-hover:text-[var(--secondary)] transition-colors flex items-center gap-2 mt-2" style={{ color: 'var(--on-surface)' }}>
                      {org.name}
                      <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" />
                    </h3>
                  </div>
                ))}
              </div>
            )}

            {/* Create New */}
            <div className="glass-card-elevated p-6 mt-4">
              <h3 className="font-bold text-sm mb-4 flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
                <PlusCircle className="w-4 h-4" style={{ color: 'var(--secondary)' }} /> Create New Organization
              </h3>
              <form onSubmit={handleCreateOrg} className="flex gap-3">
                <input
                  type="text"
                  placeholder="e.g. Stark Industries"
                  className="input-field flex-1"
                  value={newOrgName}
                  onChange={e => setNewOrgName(e.target.value)}
                  disabled={creating}
                />
                <button type="submit" disabled={creating || !newOrgName.trim()} className="btn-primary">
                  {creating ? "Creating..." : "Create"}
                </button>
              </form>
              <div className="mt-3 flex items-center gap-2">
                <input
                  type="checkbox"
                  id="allowMulti"
                  checked={allowMulti}
                  onChange={(e) => setAllowMulti(e.target.checked)}
                  className="w-4 h-4 rounded accent-[var(--primary)]"
                />
                <label htmlFor="allowMulti" className="text-xs" style={{ color: 'var(--on-surface-variant)' }}>
                  Allow members to work in multiple workspaces
                </label>
              </div>
            </div>
          </div>

          {/* ─── RIGHT: Invitations ─── */}
          <div className="space-y-6">
            <h2 className="text-lg font-bold flex items-center gap-2 border-b pb-4" style={{ color: 'var(--on-surface)', borderColor: 'var(--outline-variant)' }}>
              <Mail className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
              Invitations & Requests
            </h2>

            {/* Tabs */}
            <div className="flex gap-1 p-1 rounded-lg" style={{ background: 'var(--surface-container-high)' }}>
              <button
                onClick={() => setInviteTab("received")}
                className="flex-1 text-xs font-semibold py-2 rounded-md transition-all"
                style={{
                  background: inviteTab === "received" ? 'var(--surface-container-lowest)' : 'transparent',
                  color: inviteTab === "received" ? 'var(--on-surface)' : 'var(--outline)',
                  boxShadow: inviteTab === "received" ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Received ({invites.length})
              </button>
              <button
                onClick={() => setInviteTab("sent")}
                className="flex-1 text-xs font-semibold py-2 rounded-md transition-all"
                style={{
                  background: inviteTab === "sent" ? 'var(--surface-container-lowest)' : 'transparent',
                  color: inviteTab === "sent" ? 'var(--on-surface)' : 'var(--outline)',
                  boxShadow: inviteTab === "sent" ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
                }}
              >
                Sent
              </button>
            </div>

            {inviteTab === "received" ? (
              <div className="space-y-3">
                {loading ? (
                  <SkeletonCard className="h-32" />
                ) : invites.length === 0 ? (
                  <div className="glass-card p-8 text-center">
                    <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                    <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>No pending invitations.</p>
                  </div>
                ) : (
                  invites.map(invite => (
                    <div key={invite.id} className="glass-card-elevated p-5 relative overflow-hidden">
                      {invite.isPendingApproval && (
                        <div className="absolute top-0 right-0 bg-[var(--warning-container)] text-[var(--on-warning-container)] text-[0.6rem] font-bold px-2 py-1 rounded-bl-lg">
                          Pending Admin Approval
                        </div>
                      )}
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-9 h-9 rounded-lg flex items-center justify-center" style={{ background: 'var(--secondary-container)' }}>
                          <Building2 className="w-4 h-4" style={{ color: 'var(--on-secondary-container)' }} />
                        </div>
                        <div>
                          <p className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>{invite.organization?.name}</p>
                          <p className="text-xs" style={{ color: 'var(--outline)' }}>Invited as {invite.role}</p>
                        </div>
                      </div>
                      <div className="flex gap-2">
                        <button 
                          onClick={() => handleRespond(invite.id, true)} 
                          disabled={invite.isPendingApproval}
                          className="btn-primary flex-1 flex items-center justify-center gap-1.5 text-xs py-2 disabled:opacity-50"
                        >
                          <CheckCircle2 className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button onClick={() => handleRespond(invite.id, false)} className="btn-secondary flex-1 flex items-center justify-center gap-1.5 text-xs py-2">
                          <XCircle className="w-3.5 h-3.5" /> Decline
                        </button>
                      </div>
                    </div>
                  ))
                )}
                
                {deniedRequests.length > 0 && (
                  <div className="mt-6 pt-6 border-t border-[var(--outline-variant)]">
                    <h3 className="text-xs font-bold mb-3 uppercase tracking-wider text-[var(--error)]">Denied Requests</h3>
                    <div className="space-y-3">
                      {deniedRequests.map(req => (
                        <div key={req.id} className="glass-card p-4 border border-[var(--error-container)] bg-[var(--error-container)]/10">
                          <p className="text-sm font-semibold text-[var(--on-surface)]">Blocked from joining {req.targetOrgName}</p>
                          <p className="text-xs text-[var(--error)] mt-1">
                            Your admin at {req.organization.name} denied your request.
                          </p>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            ) : (
              <div className="glass-card p-8 text-center">
                <Mail className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>No sent invitations.</p>
              </div>
            )}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="text-center py-6 border-t" style={{ borderColor: 'var(--outline-variant)', color: 'var(--outline)' }}>
        <p className="text-xs font-medium">WorkSphere © 2026 &nbsp;•&nbsp; Help &nbsp;•&nbsp; Privacy</p>
      </footer>
    </div>
  );
}
