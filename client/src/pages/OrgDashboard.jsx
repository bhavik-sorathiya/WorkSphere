import { useState } from "react";
import { useOutletContext, Link } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useRefresh } from "../contexts/RefreshContext";
import { useToast } from "../contexts/ToastContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { CheckCircle2, MessageSquare, Megaphone, Plus, ListTodo, FileText, Clock } from "lucide-react";
import Skeleton, { SkeletonCard } from "../components/Skeleton";
import CreateNoticeModal from "../components/CreateNoticeModal";

const API = import.meta.env.VITE_API_URL;

export default function OrgDashboard() {
  const { orgId, currentOrg } = useOutletContext();
  const { getToken } = useAuth();
  const { refreshKey } = useRefresh();
  const { showToast } = useToast();

  const [showNoticeModal, setShowNoticeModal] = useState(false);
  const queryClient = useQueryClient();

  const { data, isLoading: loading } = useQuery({
    queryKey: ['orgDashboard', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [tasksRes, activityRes, noticesRes, orgRes] = await Promise.all([
        fetch(`${API}/api/organizations/${orgId}/tasks`, { headers }),
        fetch(`${API}/api/organizations/${orgId}/activity`, { headers }),
        fetch(`${API}/api/organizations/${orgId}/notices`, { headers }),
        fetch(`${API}/api/organizations/${orgId}`, { headers })
      ]);

      if (!orgRes.ok) throw new Error("Failed to fetch org");

      return {
        tasks: tasksRes.ok ? await tasksRes.json() : [],
        activities: activityRes.ok ? await activityRes.json() : [],
        notices: noticesRes.ok ? await noticesRes.json() : [],
        org: await orgRes.json()
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000 // Cache for 5 minutes
  });

  const tasks = data?.tasks || [];
  const activities = data?.activities || [];
  const notices = data?.notices || [];
  const org = data?.org || null;

  const openTasks = tasks.filter(t => t.status !== "DONE");

  const handleCreateNotice = async (noticeData) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/notices`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify(noticeData),
      });
      if (res.ok) {
        queryClient.invalidateQueries(['orgDashboard', orgId]);
        setShowNoticeModal(false);
        showToast("Notice posted successfully!");
      } else {
        showToast("Failed to post notice", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    }
  };

  const handleDeleteNotice = async (noticeId) => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations/${orgId}/notices/${noticeId}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        queryClient.invalidateQueries(['orgDashboard', orgId]);
        showToast("Notice deleted");
      } else {
        showToast("Failed to delete notice", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-8 animate-fade-in">
        <Skeleton className="h-10 w-48 rounded-lg" />
        <div className="flex gap-4">
          <Skeleton className="h-20 w-40 rounded-xl" />
          <Skeleton className="h-20 w-40 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          <SkeletonCard className="h-96" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-6xl mx-auto animate-fade-in">
      {/* Greeting */}
      <header className="mb-8">
        <h1 className="text-2xl font-display font-bold" style={{ color: 'var(--on-surface)' }}>
          Good morning!
        </h1>
      </header>

      {/* Stat Chips */}
      <div className="flex gap-4 mb-8">
        <div className="glass-card px-5 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--secondary-container)' }}>
            <ListTodo className="w-4 h-4" style={{ color: 'var(--on-secondary-container)' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>{openTasks.length}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Open Tasks</p>
          </div>
        </div>
        <div className="glass-card px-5 py-3 flex items-center gap-3">
          <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ background: 'var(--secondary-container)' }}>
            <MessageSquare className="w-4 h-4" style={{ color: 'var(--on-secondary-container)' }} />
          </div>
          <div>
            <p className="text-lg font-bold" style={{ color: 'var(--on-surface)' }}>{activities.filter(a => a.action?.includes("MESSAGE")).length}</p>
            <p className="text-xs font-medium" style={{ color: 'var(--on-surface-variant)' }}>Unread Msgs</p>
          </div>
        </div>
      </div>

      {/* Three-Column Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Notices */}
        <div className="glass-card-elevated p-6 flex flex-col" style={{ maxHeight: '520px' }}>
          <div className="flex items-center justify-between mb-4">
            <h2 className="font-bold text-base flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
              <Megaphone className="w-5 h-5 text-amber-500" /> Announcements
            </h2>
            {org && (org.myRole === "ADMIN" || org.myRole === "OWNER" || org.myRole === "MANAGER") && (
              <button onClick={() => setShowNoticeModal(true)} className="p-1 rounded-md hover:bg-[var(--surface-container-high)]" style={{ color: 'var(--outline)' }}>
                <Plus className="w-4 h-4" />
              </button>
            )}
          </div>
          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {notices.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <Megaphone className="w-10 h-10 mb-3" style={{ color: 'var(--outline-variant)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>No announcements</p>
              </div>
            ) : (
              notices.map(notice => (
                <div key={notice.id} className="p-4 rounded-lg border flex flex-col" style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)' }}>
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>{notice.title}</h3>
                    {!notice.isForAll && <span className="chip-azure">Private</span>}
                  </div>
                  <p className="text-xs mb-3 whitespace-pre-wrap" style={{ color: 'var(--outline)' }}>{notice.content}</p>
                  <div className="mt-auto flex justify-between items-center text-[10px]" style={{ color: 'var(--outline)' }}>
                    <span>{new Date(notice.createdAt).toLocaleDateString()}</span>
                    {org && (org.myRole === "ADMIN" || org.myRole === "OWNER" || org.myRole === "MANAGER") && (
                      <button onClick={() => handleDeleteNotice(notice.id)} className="hover:underline" style={{ color: 'var(--error)' }}>Delete</button>
                    )}
                  </div>
                </div>
              ))
            )}
          </div>
        </div>

        {/* My Tasks */}
        <div className="glass-card-elevated p-6 flex flex-col" style={{ maxHeight: '520px' }}>
          <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
            My Tasks
          </h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-2 pr-1">
            {tasks.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <CheckCircle2 className="w-10 h-10 mb-3" style={{ color: 'var(--outline-variant)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>You're all caught up!</p>
              </div>
            ) : (
              tasks.map(task => (
                <div key={task.id} className="flex items-center gap-3 px-4 py-3 rounded-lg transition-colors hover:bg-[var(--surface-container)]">
                  <input
                    type="checkbox"
                    readOnly
                    checked={task.status === "DONE"}
                    className="w-4 h-4 rounded accent-[var(--secondary)]"
                  />
                  <div className="flex-1 min-w-0">
                    <p className={`text-sm font-medium truncate ${task.status === "DONE" ? "line-through" : ""}`} style={{ color: task.status === "DONE" ? 'var(--outline)' : 'var(--on-surface)' }}>
                      {task.title}
                    </p>
                    <p className="text-xs truncate" style={{ color: 'var(--outline)' }}>
                      <Link to={`/${currentOrg.slug}/p/${task.project?.slug}`}>{task.project?.name || "—"}</Link>
                    </p>
                  </div>
                  <span className="label-caps shrink-0" style={{
                    color: task.priority === "HIGH" ? 'var(--error)' : task.priority === "MEDIUM" ? 'var(--warning)' : 'var(--outline)',
                    fontSize: '0.6rem',
                  }}>
                    {task.priority}
                  </span>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Activity Feed */}
        <div className="glass-card-elevated p-6 flex flex-col" style={{ maxHeight: '520px' }}>
          <h2 className="font-bold text-base mb-4 flex items-center gap-2" style={{ color: 'var(--on-surface)' }}>
            Activity Feed
          </h2>

          <div className="flex-1 overflow-y-auto custom-scrollbar space-y-3 pr-1">
            {activities.length === 0 ? (
              <div className="h-64 flex flex-col items-center justify-center">
                <Clock className="w-10 h-10 mb-3" style={{ color: 'var(--outline-variant)' }} />
                <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>No recent activity</p>
              </div>
            ) : (
              activities.map((act, i) => {
                let Icon = MessageSquare;
                let iconBg = 'var(--secondary-container)';
                let iconColor = 'var(--on-secondary-container)';
                if (act.action?.includes("TASK")) { Icon = CheckCircle2; iconBg = 'var(--success-container)'; iconColor = 'var(--success)'; }
                if (act.action?.includes("DOC")) { Icon = FileText; iconBg = 'var(--warning-container)'; iconColor = 'var(--warning)'; }

                let humanAction = act.action?.toLowerCase().replace(/_/g, ' ');
                let friendlyDetails = "";
                
                if (act.action === "TASK_CREATED") {
                  humanAction = "created task";
                  friendlyDetails = act.metadata?.taskName ? `'${act.metadata.taskName}'` : "";
                } else if (act.action === "TASK_MOVED") {
                  humanAction = "moved task";
                  friendlyDetails = act.metadata?.newStatus ? `to ${act.metadata.newStatus}` : "";
                } else if (act.action === "PROJECT_CREATED") {
                  humanAction = "created project";
                  friendlyDetails = act.metadata?.projectName ? `'${act.metadata.projectName}'` : "";
                } else if (act.action === "MEMBER_ADDED") {
                  humanAction = "added member";
                  friendlyDetails = act.metadata?.role ? `as ${act.metadata.role}` : "";
                } else if (act.action === "DOCUMENT_CREATED") {
                  humanAction = "created document";
                  friendlyDetails = act.metadata?.title ? `'${act.metadata.title}'` : "";
                }

                return (
                  <div key={act._id || i} className="flex gap-3 px-3 py-2 rounded-lg transition-colors hover:bg-[var(--surface-container)]">
                    <div className="w-7 h-7 rounded-full flex items-center justify-center shrink-0" style={{ background: iconBg }}>
                      <Icon className="w-3.5 h-3.5" style={{ color: iconColor }} />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>
                        <span className="font-semibold" style={{ color: 'var(--on-surface)' }}>
                          {act.userName || "System"}
                        </span>
                        {" "}{humanAction} {friendlyDetails && <span className="font-medium" style={{ color: 'var(--on-surface)' }}>{friendlyDetails}</span>}
                      </p>
                      <p className="text-[10px] font-mono mt-0.5" style={{ color: 'var(--outline)' }}>
                        {act.createdAt ? new Date(act.createdAt).toLocaleString() : ""}
                      </p>
                    </div>
                  </div>
                );
              })
            )}
          </div>
        </div>
      </div>

      {showNoticeModal && org && (
        <CreateNoticeModal 
          members={org.members} 
          onClose={() => setShowNoticeModal(false)} 
          onCreate={handleCreateNotice} 
        />
      )}
    </div>
  );
}
