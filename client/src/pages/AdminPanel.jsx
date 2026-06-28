import { useState, useEffect } from "react";
import { useOutletContext, useNavigate, useSearchParams } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useRefresh } from "../contexts/RefreshContext";
import { useToast } from "../contexts/ToastContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { Settings, Users, Mail, Activity, Shield, Trash2, Send, Check, X } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Skeleton, { SkeletonCard } from "../components/Skeleton";

const API = import.meta.env.VITE_API_URL;

export default function AdminPanel() {
  const { orgId } = useOutletContext();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { refreshKey } = useRefresh();
  const queryClient = useQueryClient();
  const { showToast } = useToast();
  const confirm = useConfirm();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get('tab') || 'general';

  const [activeTab, setActiveTab] = useState(initialTab);

  // General tab states
  // General tab states
  const [orgName, setOrgName] = useState("");
  const [allowGuestInvites, setAllowGuestInvites] = useState(false);
  const [allowMultipleWorkspaces, setAllowMultipleWorkspaces] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Users tab states
  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("MEMBER");
  const [inviting, setInviting] = useState(false);
  const [userFilter, setUserFilter] = useState("");

  const { data: org, isLoading: loadingOrg } = useQuery({
    queryKey: ['adminOrgSettings', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        navigate("/");
        throw new Error("Failed to fetch org");
      }
      return res.json();
    },
    enabled: !!orgId,
  });

  // Sync state when org data loads
  useEffect(() => {
    if (org) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setOrgName(org.name || "");
      setAllowGuestInvites(org.workspaceSettings?.allowGuestInvites || false);
      setAllowMultipleWorkspaces(org.workspaceSettings?.allowMultipleWorkspaces !== false);
    }
  }, [org]);

  const { data: invites = [], isLoading: loadingInvites } = useQuery({
    queryKey: ['adminOrgInvites', orgId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/invites`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === 'invites' && !!orgId,
  });

  const { data: joinRequests = [], isLoading: loadingJoinRequests } = useQuery({
    queryKey: ['adminJoinRequests', orgId],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/join-requests`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === 'join-requests' && !!orgId,
  });

  const [activityPage, setActivityPage] = useState(1);

  const { data: activities = [], isLoading: loadingActivities } = useQuery({
    queryKey: ['adminOrgActivity', orgId, activityPage],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/activity?page=${activityPage}&limit=15`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) return [];
      return res.json();
    },
    enabled: activeTab === 'activity' && !!orgId,
    keepPreviousData: true,
  });

  const handleUpdateSettings = async (e) => {
    e.preventDefault();
    setSavingSettings(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: orgName, allowGuestInvites, allowMultipleWorkspaces })
      });
      if (res.ok) {
        showToast("Settings updated successfully!");
        queryClient.invalidateQueries(['adminOrgSettings', orgId]);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update settings", "error");
        // Revert local state to the actual server state since the update failed
        if (org) {
          setOrgName(org.name || "");
          setAllowGuestInvites(org.workspaceSettings?.allowGuestInvites || false);
          setAllowMultipleWorkspaces(org.workspaceSettings?.allowMultipleWorkspaces !== false);
        }
      }
    } catch (err) {
      console.error(err);
    } finally {
      setSavingSettings(false);
    }
  };

  const handleInvite = async (e, forceException = false) => {
    if (e) e.preventDefault();
    if (!inviteEmail.trim()) return;
    setInviting(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/invites`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole, forceException }),
      });
      if (res.ok) {
        showToast("Invitation sent successfully!"); 
        setInviteEmail(""); 
        queryClient.invalidateQueries(['adminOrgInvites', orgId]);
      } else {
        const err = await res.json();
        if (res.status === 409 && err.requiresExceptionConfirmation) {
          if (await confirm(err.error)) {
            return handleInvite(null, true); // retry with forceException
          }
        } else {
          showToast(err.error || "Failed to invite", "error"); 
        }
      }
    } catch (err) { console.error(err); }
    finally { setInviting(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!(await confirm("Remove this member from the organization?"))) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/members/${userId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) queryClient.invalidateQueries(['adminOrgSettings', orgId]);
      else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
    } catch (err) { console.error(err); }
  };

  const handleRoleChange = async (userId, newRole, forceException = false) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/members/${userId}/role`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ role: newRole, forceException }),
      });
      if (res.ok) queryClient.invalidateQueries(['adminOrgSettings', orgId]);
      else { 
        const err = await res.json(); 
        if (res.status === 409 && err.requiresExceptionConfirmation) {
          if (await confirm(err.error)) {
            return handleRoleChange(userId, newRole, true);
          } else {
            // Revert UI to original state since it was cancelled
            queryClient.invalidateQueries(['adminOrgSettings', orgId]);
          }
        } else {
          showToast(err.error || "Failed", "error"); 
          // Revert UI on error
          queryClient.invalidateQueries(['adminOrgSettings', orgId]);
        }
      }
    } catch (err) { 
      console.error(err); 
      queryClient.invalidateQueries(['adminOrgSettings', orgId]);
    }
  };

  const handleRevokeInvite = async (inviteId) => {
    if (!(await confirm("Revoke this invitation?"))) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/invites/${inviteId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) queryClient.invalidateQueries(['adminOrgInvites', orgId]);
      else { const err = await res.json(); showToast(err.error || "Failed to revoke invite", "error"); }
    } catch (err) { console.error(err); }
  };

  const handleRespondJoinRequest = async (requestId, accept) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/join-requests/${requestId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ accept })
      });
      if (res.ok) {
        showToast(`Request ${accept ? 'approved' : 'denied'} successfully`, "success");
        queryClient.invalidateQueries(['adminJoinRequests', orgId]);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to respond to request", "error");
      }
    } catch (err) {
      console.error(err);
    }
  };

  const handleExceptionToggle = async (userId, currentValue) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/members/${userId}/exception`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ multiWorkspaceException: !currentValue })
      });
      if (res.ok) {
        showToast("Exception updated successfully", "success");
        queryClient.invalidateQueries(['adminOrgSettings', orgId]);
      } else {
        const err = await res.json();
        showToast(err.error || "Failed to update exception", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    }
  };

  if (loadingOrg) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <SkeletonCard className="h-64" />
      </div>
    );
  }

  if (!org || (org.myRole !== "OWNER" && org.myRole !== "ADMIN")) {
    return (
      <div className="p-8 text-center">
        <Shield className="w-12 h-12 mx-auto mb-4 text-[var(--error)]" />
        <h2 className="text-xl font-bold">Access Denied</h2>
        <p className="text-[var(--on-surface-variant)] mt-2">You do not have permission to view this page.</p>
      </div>
    );
  }

  const members = org.members || [];
  const filteredMembers = members.filter(m =>
    m.name?.toLowerCase().includes(userFilter.toLowerCase()) ||
    m.email?.toLowerCase().includes(userFilter.toLowerCase())
  );

  const tabs = [
    { id: 'general', name: 'General', icon: Settings },
    { id: 'users', name: 'Users', icon: Users },
    { id: 'invites', name: 'Invites', icon: Mail },
    { id: 'join-requests', name: 'Join Requests', icon: Shield },
    { id: 'activity', name: 'Activity Log', icon: Activity },
  ];

  const roleOptions = ["ADMIN", "MANAGER", "MEMBER", "VIEWER"];

  return (
    <div className="flex flex-col md:flex-row h-full font-sans bg-[var(--surface-container-lowest)] animate-fade-in">
      {/* Sidebar Tabs */}
      <div className="w-full md:w-64 border-b md:border-b-0 md:border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-4 flex flex-col gap-2 shrink-0 z-10 md:z-0">
        <div className="mb-2 md:mb-6 px-2 flex justify-between items-center">
          <div>
            <h1 className="text-xl font-display font-bold text-[var(--on-surface)]">Admin Panel</h1>
            <p className="text-xs text-[var(--on-surface-variant)] mt-1 truncate">{org.name}</p>
          </div>
        </div>
        <div className="flex md:flex-col gap-2 overflow-x-auto custom-scrollbar pb-2 md:pb-0">
          {tabs.map(tab => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`flex items-center gap-2 md:gap-3 px-3 py-2 md:py-2.5 rounded-lg text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${activeTab === tab.id ? 'bg-[var(--primary-container)] text-[var(--on-primary-container)]' : 'text-[var(--on-surface-variant)] hover:bg-[var(--surface-container-high)]'}`}
            >
              <tab.icon className="w-4 h-4" /> {tab.name}
            </button>
          ))}
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 overflow-y-auto p-8 custom-scrollbar">
        {activeTab === 'general' && (
          <div className="max-w-3xl space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)]">General Settings</h2>
              <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Manage workspace identity and global preferences.</p>
            </div>

            <form onSubmit={handleUpdateSettings} className="glass-card-elevated p-6 space-y-6">
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-2">Workspace Name</label>
                <input
                  type="text"
                  className="input-field w-full max-w-md"
                  value={orgName}
                  onChange={(e) => setOrgName(e.target.value)}
                  required
                />
              </div>

              <div className="flex items-center justify-between border-t border-[var(--outline-variant)] pt-6">
                <div>
                  <label className="block text-sm font-bold text-[var(--on-surface)]">Allow Guest Invites</label>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Let members invite external guests to specific projects.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={allowGuestInvites} onChange={(e) => setAllowGuestInvites(e.target.checked)} />
                  <div className="w-11 h-6 bg-[var(--surface-container-high)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>

              <div className="flex items-center justify-between border-t border-[var(--outline-variant)] pt-6">
                <div>
                  <label className="block text-sm font-bold text-[var(--on-surface)]">Allow Members to Join Other Workspaces</label>
                  <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">If disabled, members must request your permission to join other organizations.</p>
                </div>
                <label className="relative inline-flex items-center cursor-pointer">
                  <input type="checkbox" className="sr-only peer" checked={allowMultipleWorkspaces} onChange={(e) => setAllowMultipleWorkspaces(e.target.checked)} />
                  <div className="w-11 h-6 bg-[var(--surface-container-high)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)]"></div>
                </label>
              </div>

              <div className="border-t border-[var(--outline-variant)] pt-6 flex justify-end">
                <button type="submit" disabled={savingSettings} className="btn-primary">
                  {savingSettings ? "Saving..." : "Save Settings"}
                </button>
              </div>
            </form>

            {org.myRole === "OWNER" && (
              <div className="rounded-xl border border-dashed border-[var(--error)] p-6 relative overflow-hidden bg-red-500/5">
                <h3 className="font-bold text-lg text-[var(--error)] flex items-center gap-2 mb-2">
                  <Trash2 className="w-5 h-5" /> Danger Zone
                </h3>
                <p className="text-sm text-[var(--on-surface-variant)] mb-4">Permanently delete this workspace and all associated data. This action cannot be undone.</p>
                <button 
                  onClick={async () => {
                    if (await confirm("Are you absolutely sure you want to delete this entire workspace? This will destroy all projects and tasks permanently.")) {
                      try {
                        const token = await getToken();
                        const res = await fetch(`${API}/api/organizations/${orgId}`, {
                          method: "DELETE",
                          headers: { Authorization: `Bearer ${token}` },
                        });
                        if (res.ok) {
                          showToast("Workspace deleted successfully");
                          navigate("/");
                        } else {
                          const err = await res.json();
                          showToast(err.error || "Failed to delete workspace", "error");
                        }
                      } catch (err) {
                        console.error(err);
                        showToast("An error occurred", "error");
                      }
                    }
                  }}
                  className="px-4 py-2 bg-[var(--error)] text-white font-bold rounded-lg hover:brightness-110 transition-colors"
                >
                  Delete Workspace
                </button>
              </div>
            )}
          </div>
        )}

        {activeTab === 'users' && (
          <div className="max-w-4xl space-y-8 animate-fade-in-up">
            <div className="flex justify-between items-end">
              <div>
                <h2 className="text-2xl font-bold text-[var(--on-surface)]">User Management</h2>
                <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Manage roles and access for workspace members.</p>
              </div>
              <div className="relative">
                <input
                  type="text"
                  placeholder="Search members..."
                  className="input-field pl-9 w-64"
                  value={userFilter}
                  onChange={(e) => setUserFilter(e.target.value)}
                />
                <div className="absolute left-3 top-1/2 -translate-y-1/2">🔍</div>
              </div>
            </div>

            <div className="glass-card-elevated overflow-hidden">
              <table className="w-full text-left text-sm">
                <thead className="bg-[var(--surface-container-low)] text-[var(--outline)] border-b border-[var(--outline-variant)] uppercase text-xs font-bold">
                  <tr>
                    <th className="px-6 py-4">User</th>
                    <th className="px-6 py-4">Role</th>
                    <th className="px-6 py-4 text-center">Exception</th>
                    <th className="px-6 py-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--outline-variant)]">
                  {filteredMembers.map((member) => (
                    <tr key={member.id} className="hover:bg-[var(--surface-container-lowest)] transition-colors">
                      <td className="px-6 py-4">
                        <div className="flex items-center gap-3">
                          <div className="w-10 h-10 rounded-full bg-[var(--primary-container)] text-[var(--on-primary-container)] flex items-center justify-center font-bold">
                            {member.name?.charAt(0)?.toUpperCase() || "?"}
                          </div>
                          <div>
                            <div className="font-bold text-[var(--on-surface)]">{member.name}</div>
                            <div className="text-[var(--outline)] text-xs">{member.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-6 py-4">
                        {member.role === "OWNER" ? (
                          <span className="px-3 py-1 rounded-full text-xs font-bold bg-purple-500/10 text-purple-600 border border-purple-500/20">OWNER</span>
                        ) : (
                          <select 
                            className="input-field py-1 text-xs" 
                            value={member.role}
                            onChange={(e) => handleRoleChange(member.id, e.target.value)}
                            disabled={org.myRole !== "OWNER" && member.role === "ADMIN"}
                          >
                            {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                          </select>
                        )}
                      </td>
                      <td className="px-6 py-4 text-center">
                        <label className="relative inline-flex items-center cursor-pointer">
                          <input
                            type="checkbox"
                            className="sr-only peer"
                            checked={member.multiWorkspaceException || false}
                            onChange={() => handleExceptionToggle(member.id, member.multiWorkspaceException)}
                            disabled={member.role === "OWNER"}
                          />
                          <div className={`w-11 h-6 bg-[var(--surface-container-highest)] peer-focus:outline-none rounded-full peer peer-checked:after:translate-x-full peer-checked:after:border-white after:content-[''] after:absolute after:top-[2px] after:left-[2px] after:bg-white after:border-gray-300 after:border after:rounded-full after:h-5 after:w-5 after:transition-all peer-checked:bg-[var(--primary)] ${member.role === 'OWNER' ? 'opacity-50 cursor-not-allowed' : ''}`}></div>
                        </label>
                      </td>
                      <td className="px-6 py-4 text-right">
                        {member.role !== "OWNER" && member.id !== org.myRole && (
                          <button onClick={() => handleRemoveMember(member.id)} className="text-[var(--error)] hover:text-red-700 transition-colors text-sm font-medium p-2">
                            Remove
                          </button>
                        )}
                      </td>
                    </tr>
                  ))}
                  {filteredMembers.length === 0 && (
                    <tr>
                      <td colSpan="4" className="px-6 py-8 text-center text-[var(--outline)]">No members found.</td>
                    </tr>
                  )}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {activeTab === 'invites' && (
          <div className="max-w-4xl space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)]">Invitations</h2>
              <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Send new invites and manage pending ones.</p>
            </div>

            <form onSubmit={handleInvite} className="glass-card-elevated p-6 flex items-end gap-4">
              <div className="flex-1">
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-2">Email Address</label>
                <input type="email" placeholder="colleague@company.com" className="input-field w-full" value={inviteEmail} onChange={(e) => setInviteEmail(e.target.value)} required />
              </div>
              <div className="w-48">
                <label className="block text-sm font-bold text-[var(--on-surface)] mb-2">Role</label>
                <select className="input-field w-full" value={inviteRole} onChange={(e) => setInviteRole(e.target.value)}>
                  {roleOptions.map(r => <option key={r} value={r}>{r}</option>)}
                </select>
              </div>
              <button type="submit" disabled={inviting} className="btn-primary flex items-center gap-2 px-6">
                <Send className="w-4 h-4" /> Invite
              </button>
            </form>

            <div className="glass-card-elevated overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                <h3 className="font-bold text-[var(--on-surface)]">Pending Invitations</h3>
              </div>
              {loadingInvites ? (
                <div className="p-6 text-center text-[var(--outline)]">Loading...</div>
              ) : invites.length === 0 ? (
                <div className="p-10 text-center text-[var(--outline)]">No pending invitations.</div>
              ) : (
                <ul className="divide-y divide-[var(--outline-variant)]">
                  {invites.map(invite => (
                    <li key={invite.id} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--surface-container-lowest)] transition-colors">
                      <div>
                        <div className="font-bold text-[var(--on-surface)]">{invite.email}</div>
                        <div className="text-xs text-[var(--outline)] mt-1">Role: {invite.role} &nbsp;•&nbsp; Sent: {new Date(invite.createdAt).toLocaleDateString()}</div>
                      </div>
                      <button onClick={() => handleRevokeInvite(invite.id)} className="text-[var(--error)] hover:text-red-700 text-sm font-medium px-3 py-1.5 rounded bg-red-50 hover:bg-red-100 transition-colors">
                        Revoke
                      </button>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'join-requests' && (
          <div className="max-w-4xl space-y-8 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)]">Join Requests</h2>
              <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Manage permission requests from your members wanting to join other workspaces.</p>
            </div>

            <div className="glass-card-elevated overflow-hidden">
              <div className="px-6 py-4 border-b border-[var(--outline-variant)] bg-[var(--surface-container-low)]">
                <h3 className="font-bold text-[var(--on-surface)]">Pending Approvals</h3>
              </div>
              {loadingJoinRequests ? (
                <div className="p-6 text-center text-[var(--outline)]">Loading...</div>
              ) : joinRequests.length === 0 ? (
                <div className="p-10 text-center text-[var(--outline)]">No pending join requests.</div>
              ) : (
                <ul className="divide-y divide-[var(--outline-variant)]">
                  {joinRequests.map(req => (
                    <li key={req.id} className="px-6 py-4 flex items-center justify-between hover:bg-[var(--surface-container-lowest)] transition-colors">
                      <div>
                        <div className="font-bold text-[var(--on-surface)]">{req.user?.name || req.user?.email} <span className="font-normal text-[var(--outline)]">wants to join</span> {req.targetOrgName}</div>
                        <div className="text-xs text-[var(--outline)] mt-1">Requested: {new Date(req.createdAt).toLocaleDateString()}</div>
                      </div>
                      <div className="flex gap-2">
                        <button onClick={() => handleRespondJoinRequest(req.id, true)} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1">
                          <Check className="w-3 h-3" /> Approve
                        </button>
                        <button onClick={() => handleRespondJoinRequest(req.id, false)} className="btn-secondary text-xs py-1.5 px-3 flex items-center gap-1">
                          <X className="w-3 h-3" /> Deny
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        )}

        {activeTab === 'activity' && (
          <div className="max-w-4xl space-y-6 animate-fade-in-up">
            <div>
              <h2 className="text-2xl font-bold text-[var(--on-surface)]">Activity Log</h2>
              <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Audit trail of important actions in your workspace.</p>
            </div>

            <div className="glass-card-elevated overflow-hidden">
              {loadingActivities && activityPage === 1 ? (
                <div className="p-6 text-center text-[var(--outline)]">Loading...</div>
              ) : activities.length === 0 ? (
                <div className="p-10 text-center text-[var(--outline)]">No activity recorded yet.</div>
              ) : (
                <>
                  <ul className="divide-y divide-[var(--outline-variant)]">
                    {activities.map(activity => {
                      const dateStr = activity.timestamp ? new Date(activity.timestamp).toLocaleString() : new Date(activity.createdAt).toLocaleString();
                      let humanAction = activity.action;
                      let friendlyDetails = "";
                      
                      // Map common actions to friendly strings
                      if (activity.action === "TASK_CREATED") {
                        humanAction = "Created Task";
                        friendlyDetails = activity.metadata?.taskName || "";
                      } else if (activity.action === "TASK_MOVED") {
                        humanAction = "Moved Task";
                        friendlyDetails = `to ${activity.metadata?.newStatus || "Unknown"}`;
                      } else if (activity.action === "PROJECT_CREATED") {
                        humanAction = "Created Project";
                        friendlyDetails = activity.metadata?.projectName || "";
                      } else if (activity.action === "MEMBER_ADDED") {
                        humanAction = "Added Member";
                        friendlyDetails = `as ${activity.metadata?.role || "MEMBER"}`;
                      } else if (activity.action === "DOCUMENT_CREATED") {
                        humanAction = "Created Document";
                        friendlyDetails = activity.metadata?.title || "";
                      }
                      
                      return (
                        <li key={activity._id} className="px-6 py-4 hover:bg-[var(--surface-container-lowest)] transition-colors flex gap-4">
                          <div className="w-8 h-8 mt-1 rounded bg-[var(--surface-container-high)] text-[var(--on-surface)] flex items-center justify-center">
                            <Activity className="w-4 h-4" />
                          </div>
                          <div className="flex-1">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="font-bold text-sm text-[var(--on-surface)]">{humanAction} {friendlyDetails && `- ${friendlyDetails}`}</span>
                              <span className="text-[10px] bg-[var(--surface-container)] text-[var(--outline)] px-2 py-0.5 rounded">{dateStr}</span>
                            </div>
                            {activity.metadata && (
                              <div className="flex flex-wrap gap-2 mb-2 mt-2">
                                {Object.entries(activity.metadata).map(([key, value]) => {
                                  if (key === 'updates' && typeof value === 'object' && value !== null) {
                                    return Object.entries(value)
                                      .filter(([uKey]) => !uKey.toLowerCase().includes('id'))
                                      .map(([uKey, uValue]) => (
                                      <div key={`update-${uKey}`} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--primary-container)] text-[10px] text-[var(--on-primary-container)] border border-blue-500/20">
                                        <span className="font-semibold opacity-70 uppercase tracking-wider">{uKey}:</span>
                                        <span className="font-mono">{String(uValue)}</span>
                                      </div>
                                    ));
                                  }
                                  // Skip rendering technical ID fields directly in the tags
                                  if (key.toLowerCase().includes('id')) return null;
                                  if (typeof value === 'object' && value !== null) return null;
                                  
                                  return (
                                    <div key={key} className="inline-flex items-center gap-1.5 px-2 py-1 rounded bg-[var(--surface-container-high)] text-[10px] text-[var(--on-surface)] border border-[var(--outline-variant)]">
                                      <span className="font-semibold opacity-70 uppercase tracking-wider">{key}:</span>
                                      <span className="font-mono text-[var(--primary)]">{String(value)}</span>
                                    </div>
                                  );
                                })}
                              </div>
                            )}
                            <div className="text-xs text-[var(--outline)]">User: {activity.userName || "System"}</div>
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                  <div className="p-4 border-t border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] flex justify-between items-center">
                    <button 
                      onClick={() => setActivityPage(prev => Math.max(1, prev - 1))}
                      disabled={activityPage === 1}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-[var(--surface-container-high)] transition-colors"
                    >
                      Previous
                    </button>
                    <span className="text-xs text-[var(--outline)]">Page {activityPage}</span>
                    <button 
                      onClick={() => setActivityPage(prev => prev + 1)}
                      disabled={activities.length < 15}
                      className="px-4 py-1.5 text-sm font-medium rounded-lg disabled:opacity-50 hover:bg-[var(--surface-container-high)] transition-colors"
                    >
                      Next
                    </button>
                  </div>
                </>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
