import { useState, useEffect, useRef } from "react";
import { useOutletContext, useNavigate } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useRefresh } from "../contexts/RefreshContext";
import { LayoutGrid, Plus, ArrowRight, Users, Lock, Clock, Check, FolderOpen } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useToast } from "../contexts/ToastContext";
import Skeleton, { SkeletonCard } from "../components/Skeleton";

const API = import.meta.env.VITE_API_URL;

export default function BoardsPage() {
  const { orgId, currentOrg } = useOutletContext();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { refreshKey } = useRefresh();
  const { showToast } = useToast();
  const createInputRef = useRef(null);

  useEffect(() => {
    const handleCreateShortcut = () => {
      if (createInputRef.current) {
        createInputRef.current.focus();
      }
    };
    window.addEventListener('worksphere-create-item', handleCreateShortcut);
    return () => window.removeEventListener('worksphere-create-item', handleCreateShortcut);
  }, []);

  const [newProjectName, setNewProjectName] = useState("");
  const [creating, setCreating] = useState(false);
  const queryClient = useQueryClient();

  const { data: org, isLoading: loading } = useQuery({
    queryKey: ['orgProjects', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) throw new Error("Failed to fetch org");
      return res.json();
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const handleCreate = async (e) => {
    e.preventDefault();
    if (!newProjectName.trim()) return;
    setCreating(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/projects/${orgId}`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newProjectName, members: [] }),
      });
      if (res.ok) { setNewProjectName(""); queryClient.invalidateQueries(['orgProjects', orgId]); }
      else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
    } catch (err) { console.error(err); }
    finally { setCreating(false); }
  };

  const handleRequestAccess = async (projectId, e) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/request-access`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) queryClient.invalidateQueries(['orgProjects', orgId]);
      else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
    } catch (err) { console.error(err); }
  };

  const handleRespondInvite = async (projectId, inviteId, action, e) => {
    e.stopPropagation();
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/invites/${inviteId}/respond`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ action })
      });
      if (res.ok) queryClient.invalidateQueries(['orgProjects', orgId]);
      else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
          <SkeletonCard className="h-40" />
        </div>
      </div>
    );
  }

  const projects = org?.projects || [];
  const canManage = org?.myRole === "OWNER" || org?.myRole === "ADMIN";

  const sortedProjects = [...projects].sort((a, b) => {
    const aIsMember = a.members?.length > 0;
    const aHasAccess = canManage || aIsMember;
    const aPendingInvite = a.invites?.find(i => i.status === "PENDING");

    const bIsMember = b.members?.length > 0;
    const bHasAccess = canManage || bIsMember;
    const bPendingInvite = b.invites?.find(i => i.status === "PENDING");

    const aGroup = aHasAccess ? 1 : aPendingInvite ? 2 : 3;
    const bGroup = bHasAccess ? 1 : bPendingInvite ? 2 : 3;

    if (aGroup !== bGroup) return aGroup - bGroup;
    return a.name.localeCompare(b.name);
  });

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between mb-8">
        <div>
          <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--on-surface)' }}>
            Boards
          </h1>
          <p className="text-sm mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            Select a project to open its Kanban board.
          </p>
        </div>
      </div>

      {/* Project Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {sortedProjects.map(project => {
          const isMember = project.members?.length > 0;
          const hasAccess = canManage || isMember;
          const pendingInvite = project.invites?.find(i => i.status === "PENDING");

          return (
            <div
              key={project.id}
              onClick={() => hasAccess ? navigate(`/${currentOrg.slug}/p/${project.slug}`) : null}
              className={`glass-card p-6 transition-all duration-200 group ${hasAccess ? 'cursor-pointer hover:shadow-lg hover:-translate-y-1' : 'opacity-80'}`}
            >
              <div className="flex items-start justify-between mb-4">
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ background: hasAccess ? 'var(--surface-container-high)' : 'var(--surface-container)' }}>
                  {hasAccess ? (
                    <LayoutGrid className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
                  ) : (
                    <Lock className="w-5 h-5" style={{ color: 'var(--outline)' }} />
                  )}
                </div>
                {hasAccess && <ArrowRight className="w-4 h-4 opacity-0 group-hover:opacity-100 transition-opacity" style={{ color: 'var(--secondary)' }} />}
              </div>
              <h3 className="font-bold text-base mb-1" style={{ color: 'var(--on-surface)' }}>
                {project.name}
              </h3>
              <div className="flex items-center gap-3 mt-3 mb-4">
                <span className="flex items-center gap-1 text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>
                  <Users className="w-3.5 h-3.5" /> {project._count?.members || 0} members
                </span>
              </div>

              {!hasAccess && (
                <div className="pt-4 border-t" style={{ borderColor: 'var(--surface-container-high)' }}>
                  {pendingInvite ? (
                    pendingInvite.type === "INVITE" ? (
                      <div className="flex gap-2">
                        <button onClick={(e) => handleRespondInvite(project.id, pendingInvite.id, "ACCEPT", e)} className="btn-primary flex-1 text-xs py-1.5 flex justify-center items-center gap-1">
                          <Check className="w-3 h-3" /> Accept
                        </button>
                        <button onClick={(e) => handleRespondInvite(project.id, pendingInvite.id, "DECLINE", e)} className="flex-1 text-xs py-1.5 rounded bg-[var(--surface-container-high)] hover:bg-red-50 text-[var(--on-surface-variant)] transition-colors">
                          Decline
                        </button>
                      </div>
                    ) : (
                      <div className="text-center py-1.5 text-xs font-medium flex items-center justify-center gap-1.5 rounded" style={{ background: 'var(--surface-container)', color: 'var(--outline)' }}>
                        <Clock className="w-3.5 h-3.5" /> Request Pending
                      </div>
                    )
                  ) : (
                    <button onClick={(e) => handleRequestAccess(project.id, e)} className="w-full text-center py-1.5 text-xs font-bold rounded transition-colors hover:bg-[var(--surface-container-high)]" style={{ color: 'var(--secondary)', border: '1px solid var(--secondary-container)' }}>
                      Request Access
                    </button>
                  )}
                </div>
              )}
            </div>
          );
        })}

        {/* Create New Project Card */}
        {canManage && (
          <form onSubmit={handleCreate} className="glass-card p-6 border-dashed flex flex-col justify-between" style={{ borderStyle: 'dashed', borderColor: 'var(--outline-variant)' }}>
            <div className="flex items-center gap-2 mb-4">
              <Plus className="w-5 h-5" style={{ color: 'var(--secondary)' }} />
              <h3 className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>New Project</h3>
            </div>
            <input
              ref={createInputRef}
              type="text"
              placeholder="Project name..."
              className="input-field mb-3"
              value={newProjectName}
              onChange={e => setNewProjectName(e.target.value)}
              disabled={creating}
            />
            <button type="submit" disabled={creating || !newProjectName.trim()} className="btn-primary w-full text-center flex items-center justify-center gap-2">
              {creating ? "Creating..." : <><Plus className="w-4 h-4" /> Create</>}
            </button>
          </form>
        )}

        {projects.length === 0 && !canManage && (
          <div className="col-span-full text-center py-16 glass-card flex flex-col items-center justify-center">
            <FolderOpen className="w-12 h-12 mb-3" style={{ color: 'var(--outline-variant)' }} />
            <p className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>No projects available.</p>
          </div>
        )}
      </div>
    </div>
  );
}
