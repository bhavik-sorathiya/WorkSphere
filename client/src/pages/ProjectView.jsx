import { useEffect, useState, useCallback } from "react";
import { useParams, useNavigate, useOutletContext } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useSocket } from "../contexts/SocketContext";
import Skeleton, { SkeletonCard } from "../components/Skeleton";
import { Plus, Settings, Calendar, X, Trash2, Users, Check, ArrowLeft, Columns, MessageCircle } from "lucide-react";
import { useToast } from "../contexts/ToastContext";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useConfirm } from "../contexts/ConfirmContext";

const API = import.meta.env.VITE_API_URL;

const COLUMNS = [
  { id: "TODO", label: "To Do", bg: "var(--surface-container-lowest)", border: "var(--outline-variant)" },
  { id: "IN_PROGRESS", label: "In Progress", bg: "var(--surface-container-low)", border: "var(--outline-variant)" },
  { id: "DONE", label: "Done", bg: "var(--surface-container)", border: "var(--outline-variant)" },
];

const PRIORITIES = {
  LOW: { label: "Low", color: "var(--outline)" },
  MEDIUM: { label: "Medium", color: "var(--warning)" },
  HIGH: { label: "High", color: "var(--error)" },
};

export default function ProjectView() {
  const { orgId, currentOrg } = useOutletContext();
  const { projectSlug } = useParams();
  const { getToken } = useAuth();
  const navigate = useNavigate();
  const { showToast } = useToast();
  const confirm = useConfirm();

  const [project, setProject] = useState(null);
  const [prevFetchedProject, setPrevFetchedProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const socket = useSocket();
  const [activeTab, setActiveTab] = useState("board");
  const queryClient = useQueryClient();

  // Kanban state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [newTask, setNewTask] = useState({ title: "", priority: "MEDIUM", dueDate: "", status: "TODO", assigneeIds: [] });
  const [creating, setCreating] = useState(false);
  const [selectedTask, setSelectedTask] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [newComment, setNewComment] = useState("");
  const [submittingComment, setSubmittingComment] = useState(false);

  // Member management state
  const [orgMembers, setOrgMembers] = useState([]);
  const [memberLoading, setMemberLoading] = useState(false);

  const { data: fetchedProject, isLoading: loading } = useQuery({
    queryKey: ['project', orgId, projectSlug],
    queryFn: async () => {
      const token = await getToken();
      const res = await fetch(`${API}/api/projects/${orgId}/by-slug/${projectSlug}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!res.ok) {
        navigate(`/${currentOrg?.slug || orgId}/boards`);
        throw new Error("Project not found");
      }
      const briefProject = await res.json();
      
      const fullRes = await fetch(`${API}/api/projects/${orgId}/${briefProject.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      
      if (!fullRes.ok) {
        throw new Error("Failed to fetch full project details");
      }
      
      return fullRes.json();
    },
    enabled: !!projectSlug && !!orgId,
    staleTime: 5 * 60 * 1000
  });

  const projectId = fetchedProject?.id;

  if (fetchedProject && fetchedProject !== prevFetchedProject) {
    setPrevFetchedProject(fetchedProject);
    setProject(fetchedProject);
    setTasks(fetchedProject.tasks || []);
  }

  const fetchProject = () => {
    queryClient.invalidateQueries(['project', orgId, projectSlug]);
  };

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        setShowCreateModal(false);
        setSelectedTask(null);
      }
    };
    const handleCreateShortcut = () => {
      if (activeTab === "board") {
        setShowCreateModal(true);
        setTimeout(() => {
          const input = document.querySelector('input[placeholder="e.g. Design Ad Graphics"]');
          if (input) input.focus();
        }, 50);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    window.addEventListener('worksphere-create-item', handleCreateShortcut);
    return () => {
      window.removeEventListener('keydown', handleKeyDown);
      window.removeEventListener('worksphere-create-item', handleCreateShortcut);
    };
  }, [activeTab]);

  useEffect(() => {
    if (!socket) return;
    
    socket.emit("join_project", projectId);
    
    const handleTaskCreated = (task) => setTasks((prev) => [task, ...prev]);
    const handleTaskUpdated = (updatedTask) => {
      setTasks((prev) => prev.map((t) => (t.id === updatedTask.id ? updatedTask : t)));
      setSelectedTask((prev) => (prev?.id === updatedTask.id ? updatedTask : prev));
    };
    const handleTaskDeleted = ({ taskId }) => {
      setTasks((prev) => prev.filter((t) => t.id !== taskId));
      setSelectedTask((prev) => (prev?.id === taskId ? null : prev));
    };

    socket.on("TASK_CREATED", handleTaskCreated);
    socket.on("TASK_UPDATED", handleTaskUpdated);
    socket.on("TASK_DELETED", handleTaskDeleted);

    return () => {
      socket.off("TASK_CREATED", handleTaskCreated);
      socket.off("TASK_UPDATED", handleTaskUpdated);
      socket.off("TASK_DELETED", handleTaskDeleted);
    };
  }, [socket, projectId]);

  const authHeaders = useCallback(async () => {
    const token = await getToken();
    return { "Content-Type": "application/json", Authorization: `Bearer ${token}` };
  }, [getToken]);

  const fetchOrgMembers = useCallback(async () => {
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/organizations/${orgId}`, { headers });
      if (res.ok) {
        const data = await res.json();
        setOrgMembers(data.members || []);
      }
    } catch (err) { console.error(err); }
  }, [orgId, authHeaders]);

  const handleAddMember = async (userId, role) => {
    setMemberLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/members`, {
        method: "POST", headers, body: JSON.stringify({ userId, role }),
      });
      if (res.ok) fetchProject();
    } catch (err) { console.error(err); }
    finally { setMemberLoading(false); }
  };

  const handleRemoveMember = async (userId) => {
    if (!(await confirm("Remove this member from the project?"))) return;
    setMemberLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/members/${userId}`, {
        method: "DELETE", headers,
      });
      if (res.ok) fetchProject();
    } catch (err) { console.error(err); }
    finally { setMemberLoading(false); }
  };

  const handleUpdateRole = async (userId, role) => {
    setMemberLoading(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/members/${userId}/role`, {
        method: "PATCH", headers, body: JSON.stringify({ role }),
      });
      if (res.ok) fetchProject();
    } catch (err) { console.error(err); }
    finally { setMemberLoading(false); }
  };


  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { if (activeTab === "members") fetchOrgMembers(); }, [activeTab, fetchOrgMembers]);

  // --- TASKS ---
  const handleCreateTask = async (e) => {
    e.preventDefault();
    if (!newTask.title) return;
    setCreating(true);
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/tasks/${orgId}/projects/${projectId}/tasks`, {
        method: "POST", headers, body: JSON.stringify(newTask),
      });
      if (res.ok) {
        setNewTask({ title: "", priority: "MEDIUM", dueDate: "", status: newTask.status, assigneeIds: [] });
        setShowCreateModal(false);
        fetchProject();
        showToast("Task created successfully!");
      } else {
        showToast("Failed to create task", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    } finally { setCreating(false); }
  };

  const handleDrop = async (e, newStatus) => {
    e.preventDefault();
    if (!draggedTaskId) return;
    const task = tasks.find((t) => t.id === draggedTaskId);
    if (!task || task.status === newStatus) { setDraggedTaskId(null); return; }
    setTasks((prev) => prev.map((t) => (t.id === draggedTaskId ? { ...t, status: newStatus } : t)));
    setDraggedTaskId(null);
    try {
      const headers = await authHeaders();
      await fetch(`${API}/api/tasks/${orgId}/projects/${projectId}/tasks/${draggedTaskId}/status`, {
        method: "PATCH", headers, body: JSON.stringify({ status: newStatus }),
      });
    } catch (err) { console.error(err); fetchProject(); }
  };

  const handleDeleteTask = async (taskId) => {
    if (!(await confirm("Delete this task?"))) return;
    try {
      const headers = await authHeaders();
      const res = await fetch(`${API}/api/tasks/${orgId}/projects/${projectId}/tasks/${taskId}`, { method: "DELETE", headers });
      if (res.ok) {
        setTasks(tasks.filter(t => t.id !== taskId));
        setSelectedTask(null);
        showToast("Task deleted");
      } else {
        showToast("Failed to delete task", "error");
      }
    } catch (err) {
      console.error(err);
      showToast("An error occurred", "error");
    }
  };

  // --- COMMENTS ---
  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!newComment || !selectedTask) return;
    setSubmittingComment(true);
    try {
      const headers = await authHeaders();
      await fetch(`${API}/api/comments/${orgId}/projects/${projectId}/tasks/${selectedTask.id}/comments`, {
        method: "POST", headers, body: JSON.stringify({ content: newComment }),
      });
      setNewComment("");
    } catch (err) { console.error(err); }
    finally { setSubmittingComment(false); }
  };

  if (loading) {
    return (
      <div className="p-8 space-y-6 max-w-6xl mx-auto animate-fade-in">
        <Skeleton className="h-10 w-64 rounded-lg" />
        <Skeleton className="h-6 w-32 rounded-lg mb-8" />
        <div className="flex gap-4 border-b pb-4" style={{ borderColor: 'var(--surface-container-high)' }}>
          <Skeleton className="h-10 w-32 rounded-lg" />
          <Skeleton className="h-10 w-32 rounded-lg" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
          <SkeletonCard className="h-96" />
          <SkeletonCard className="h-96" />
          <SkeletonCard className="h-96" />
        </div>
      </div>
    );
  }

  if (!project) return null;

  return (
    <div className="p-8 max-w-7xl mx-auto animate-fade-in">
      {/* Project Header */}
      <div className="flex items-center justify-between border-b pb-5 mb-6" style={{ borderColor: 'var(--surface-container-high)' }}>
        <div>
          <button onClick={() => navigate(`/${currentOrg?.slug || orgId}/boards`)} className="text-sm font-medium hover:text-[var(--secondary)] mb-2 inline-flex items-center gap-1.5 transition-colors" style={{ color: 'var(--outline)' }}>
            <ArrowLeft className="w-4 h-4" /> Back to Boards
          </button>
          <h1 className="text-3xl font-display font-extrabold tracking-tight" style={{ color: 'var(--on-surface)' }}>{project.name}</h1>
          <p className="text-sm font-medium mt-1" style={{ color: 'var(--on-surface-variant)' }}>
            {project.members?.length} members · {tasks.length} tasks
          </p>
        </div>
        {activeTab === "board" && (
          <button onClick={() => setShowCreateModal(true)} className="btn-primary flex items-center gap-2">
            <Plus className="w-4 h-4" /> New Task
          </button>
        )}
      </div>

      {/* Tabs */}
      <div className="flex gap-2 p-1 rounded-lg mb-8 w-fit border" style={{ background: 'var(--surface-container-low)', borderColor: 'var(--outline-variant)' }}>
        {[
          { id: "board", label: "Kanban Board", icon: <Columns className="w-4 h-4" /> },
          { id: "members", label: `Members ${project.invites?.length > 0 ? `(${project.invites.length} pending)` : ''}`, icon: <Users className="w-4 h-4" /> },
          { id: "settings", label: "Settings", icon: <Settings className="w-4 h-4" /> },
        ].map((tab) => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)}
            className={`flex items-center gap-2 px-4 py-2 font-semibold text-sm rounded-md transition-all duration-200`}
            style={{
              background: activeTab === tab.id ? 'var(--surface-container-lowest)' : 'transparent',
              color: activeTab === tab.id ? 'var(--on-surface)' : 'var(--on-surface-variant)',
              boxShadow: activeTab === tab.id ? '0 1px 3px rgba(0,0,0,0.06)' : 'none',
            }}
          >
            {tab.icon} {tab.label}
          </button>
        ))}
      </div>

      {/* ==================== KANBAN BOARD ==================== */}
      {activeTab === "board" && (
        <div className="flex flex-col lg:flex-row items-stretch lg:items-start gap-6 overflow-x-hidden lg:overflow-x-auto custom-scrollbar pb-6 w-full">
          {COLUMNS.map((col) => {
            const columnTasks = tasks.filter((t) => t.status === col.id);
            return (
              <div key={col.id} className="rounded-xl border p-4 min-h-[150px] lg:min-h-[500px] w-full lg:w-80 shrink-0 flex flex-col"
                style={{ background: col.bg, borderColor: col.border }}
                onDragOver={(e) => e.preventDefault()} onDrop={(e) => handleDrop(e, col.id)}>
                <div className="flex items-center justify-between mb-4">
                  <div className="flex items-center gap-2">
                    <h3 className="font-bold text-sm tracking-wide uppercase" style={{ color: 'var(--on-surface)' }}>{col.label}</h3>
                    <span className="px-2 py-0.5 text-xs font-bold rounded-full" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface-variant)' }}>{columnTasks.length}</span>
                  </div>
                </div>
                <div className="space-y-4 flex-1">
                  {columnTasks.map((task) => (
                    <div key={task.id} draggable onDragStart={() => setDraggedTaskId(task.id)} onClick={() => setSelectedTask(task)}
                      className="glass-card-elevated p-4 cursor-grab active:cursor-grabbing hover:-translate-y-1 transition-transform duration-200 group">
                      <div className="flex items-start justify-between mb-3">
                        <h4 className="font-semibold text-sm leading-snug flex-1 group-hover:text-[var(--secondary)] transition-colors" style={{ color: 'var(--on-surface)' }}>{task.title}</h4>
                      </div>
                      <div className="flex items-center gap-2 mb-4 flex-wrap">
                        <span className="px-2 py-0.5 text-[10px] font-bold rounded" style={{ background: 'var(--surface-container)', color: PRIORITIES[task.priority]?.color }}>{task.priority}</span>
                        {task.dueDate && <span className="text-[10px] font-medium flex items-center gap-1" style={{ color: 'var(--outline)' }}><Calendar className="w-3 h-3" /> {new Date(task.dueDate).toLocaleDateString()}</span>}
                      </div>
                      <div className="flex items-center justify-between mt-auto">
                        <div className="flex -space-x-2">
                          {task.assignees?.slice(0, 3).map((a) => (
                            <div key={a.userId} className="w-6 h-6 rounded-full border-2 flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)', borderColor: 'var(--surface-container-lowest)' }} title={a.user?.name || a.user?.email}>
                              {(a.user?.name || a.user?.email || "?").charAt(0).toUpperCase()}
                            </div>
                          ))}
                        </div>
                        {task.comments?.length > 0 && <span className="text-xs font-semibold px-2 py-1 rounded flex items-center gap-1" style={{ background: 'var(--surface-container)', color: 'var(--outline)' }}><MessageCircle className="w-3.5 h-3.5" /> {task.comments.length}</span>}
                      </div>
                    </div>
                  ))}
                  {columnTasks.length === 0 && (
                    <div className="h-full flex flex-col items-center justify-center border-2 border-dashed rounded-lg opacity-50" style={{ borderColor: 'var(--outline-variant)' }}>
                      <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>Drop here</p>
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ==================== MEMBERS ==================== */}
      {activeTab === "members" && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 glass-card-elevated p-0 overflow-hidden">
            <div className="px-6 py-4 border-b" style={{ borderColor: 'var(--surface-container-high)' }}>
              <h3 className="font-semibold text-base" style={{ color: 'var(--on-surface)' }}>Project Members ({project.members?.length || 0})</h3>
            </div>
            <div className="divide-y" style={{ borderColor: 'var(--surface-container-high)' }}>
              {project.members?.map((m) => (
                <div key={m.userId} className="flex items-center justify-between px-6 py-4 transition-colors hover:bg-[var(--surface-container-low)]">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-full flex items-center justify-center text-sm font-bold" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>
                      {(m.user?.name || m.user?.email || "?").charAt(0).toUpperCase()}
                    </div>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>{m.user?.name || "No Name"}</p>
                      <p className="text-xs" style={{ color: 'var(--outline)' }}>{m.user?.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <select
                      value={m.role}
                      onChange={(e) => handleUpdateRole(m.userId, e.target.value)}
                      disabled={memberLoading || m.implicit}
                      className="input-field py-1.5 text-xs w-auto"
                    >
                      <option value="MANAGER">Manager</option>
                      <option value="MEMBER">Member</option>
                      <option value="VIEWER">Viewer</option>
                    </select>
                    {!m.implicit && (
                      <button onClick={() => handleRemoveMember(m.userId)} disabled={memberLoading} className="p-1.5 rounded-lg hover:bg-red-50 transition-colors" title="Remove member">
                        <Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />
                      </button>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="glass-card-elevated p-6 h-fit space-y-6">
            {/* Pending Requests/Invites section */}
            {project.invites?.length > 0 && (
              <div>
                <h3 className="font-semibold text-base mb-4" style={{ color: 'var(--on-surface)' }}>Pending Requests</h3>
                <div className="space-y-3">
                  {project.invites.map(invite => (
                    <div key={invite.id} className="flex flex-col gap-3 p-4 border rounded-lg" style={{ borderColor: 'var(--surface-container-high)', background: 'var(--surface-container-lowest)' }}>
                      <div>
                        <p className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>{invite.user?.name || "No Name"}</p>
                        <p className="text-xs" style={{ color: 'var(--outline)' }}>{invite.user?.email}</p>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded mt-1 inline-block" style={{ background: 'var(--surface-container)', color: 'var(--outline)' }}>
                          {invite.type === "REQUEST" ? "Requested Access" : "Invited"}
                        </span>
                      </div>
                      <div className="flex gap-2 mt-1">
                        <button onClick={async () => {
                          try {
                            const token = await getToken();
                            const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/invites/${invite.id}/respond`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ action: "ACCEPT" })
                            });
                            if (res.ok) fetchProject();
                            else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
                          } catch (err) { console.error(err); }
                        }} disabled={memberLoading} className="btn-primary text-xs py-1.5 px-4 flex-1 flex justify-center items-center gap-1">
                           <Check className="w-3.5 h-3.5" /> Accept
                        </button>
                        <button onClick={async () => {
                          try {
                            const token = await getToken();
                            const res = await fetch(`${API}/api/projects/${orgId}/${projectId}/invites/${invite.id}/respond`, {
                              method: "POST",
                              headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
                              body: JSON.stringify({ action: "DECLINE" })
                            });
                            if (res.ok) fetchProject();
                            else { const err = await res.json(); showToast(err.error || "Failed", "error"); }
                          } catch (err) { console.error(err); }
                        }} disabled={memberLoading} className="text-xs py-1.5 px-4 flex-1 rounded bg-[var(--surface-container-high)] hover:bg-[var(--error-container)] hover:text-[var(--error)] text-[var(--on-surface-variant)] transition-colors">
                          Decline
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
                <hr className="my-6 border-[var(--surface-container-high)]" />
              </div>
            )}

            <div>
              <h3 className="font-semibold text-base mb-4" style={{ color: 'var(--on-surface)' }}>Add Members</h3>
              <div className="space-y-3">
              {orgMembers.filter(orgM => !project.members?.some(pm => pm.userId === orgM.id) && orgM.role !== 'OWNER' && orgM.role !== 'ADMIN').length === 0 ? (
                <p className="text-sm font-medium" style={{ color: 'var(--outline)' }}>All available organization members are already in this project.</p>
              ) : (
                orgMembers.filter(orgM => !project.members?.some(pm => pm.userId === orgM.id) && orgM.role !== 'OWNER' && orgM.role !== 'ADMIN').map(orgM => (
                  <div key={orgM.id} className="flex flex-col gap-3 p-4 border rounded-lg" style={{ borderColor: 'var(--surface-container-high)', background: 'var(--surface-container-lowest)' }}>
                    <div>
                      <p className="font-medium text-sm" style={{ color: 'var(--on-surface)' }}>{orgM.name || "No Name"}</p>
                      <p className="text-xs" style={{ color: 'var(--outline)' }}>{orgM.email}</p>
                    </div>
                    <div className="flex gap-2 mt-1">
                      <select id={`role-${orgM.id}`} className="input-field text-xs py-1.5 flex-1">
                        <option value="MANAGER">Manager</option>
                        <option value="MEMBER">Member</option>
                        <option value="VIEWER">Viewer</option>
                      </select>
                      <button onClick={() => handleAddMember(orgM.id, document.getElementById(`role-${orgM.id}`).value)} disabled={memberLoading} className="btn-primary text-xs py-1.5 px-4">
                        Add
                      </button>
                    </div>
                  </div>
                ))
              )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ==================== SETTINGS ==================== */}
      {activeTab === "settings" && (
        <div className="max-w-3xl space-y-8 animate-fade-in-up">
          <div>
            <h2 className="text-2xl font-bold text-[var(--on-surface)]">Project Settings</h2>
            <p className="text-[var(--on-surface-variant)] mt-1 text-sm">Manage project configuration and lifecycle.</p>
          </div>

          <div className="glass-card-elevated p-6 space-y-6">
            <div>
              <label className="block text-sm font-bold text-[var(--on-surface)] mb-2">Project Name</label>
              <div className="flex gap-4">
                <input
                  type="text"
                  className="input-field w-full max-w-md"
                  defaultValue={project.name}
                  id="rename-project-input"
                />
                <button 
                  className="btn-primary"
                  onClick={async () => {
                    const newName = document.getElementById("rename-project-input").value;
                    if (!newName) return;
                    try {
                      const headers = await authHeaders();
                      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}`, {
                        method: "PUT", headers, body: JSON.stringify({ name: newName })
                      });
                      if (res.ok) {
                        showToast("Project renamed");
                        fetchProject();
                      } else {
                        const err = await res.json();
                        showToast(err.error || "Failed", "error");
                      }
                    } catch(e) { console.error(e); showToast("Error", "error"); }
                  }}
                >
                  Rename
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--outline-variant)] pt-6">
              <label className="block text-sm font-bold text-[var(--on-surface)] mb-2">Target Date</label>
              <div className="flex gap-4">
                <input
                  type="date"
                  className="input-field w-full max-w-md"
                  defaultValue={project.targetDate ? new Date(project.targetDate).toISOString().split('T')[0] : ''}
                  id="target-date-input"
                />
                <button 
                  className="btn-primary"
                  onClick={async () => {
                    const newDate = document.getElementById("target-date-input").value;
                    try {
                      const headers = await authHeaders();
                      const res = await fetch(`${API}/api/projects/${orgId}/${projectId}`, {
                        method: "PUT", headers, body: JSON.stringify({ targetDate: newDate || null })
                      });
                      if (res.ok) {
                        showToast("Target date updated");
                        fetchProject();
                      } else {
                        const err = await res.json();
                        showToast(err.error || "Failed", "error");
                      }
                    } catch(e) { console.error(e); showToast("Error", "error"); }
                  }}
                >
                  Save Date
                </button>
              </div>
            </div>

            <div className="border-t border-[var(--outline-variant)] pt-6 flex items-center justify-between">
              <div>
                <label className="block text-sm font-bold text-[var(--on-surface)]">Mark as Complete</label>
                <p className="text-xs text-[var(--on-surface-variant)] mt-0.5">Mark the project as complete if all tasks are done.</p>
              </div>
              <button 
                className="px-4 py-2 bg-[var(--primary)] text-[var(--on-primary)] font-bold rounded-lg hover:brightness-110 transition-colors"
                onClick={async () => {
                  try {
                    const headers = await authHeaders();
                    const res = await fetch(`${API}/api/projects/${orgId}/${projectId}`, {
                      method: "PUT", headers, body: JSON.stringify({ isComplete: true })
                    });
                    if (res.ok) {
                      showToast("Project marked as complete!");
                      fetchProject();
                    } else {
                      const err = await res.json();
                      showToast(err.error || "Failed", "error");
                    }
                  } catch(e) { console.error(e); }
                }}
              >
                Complete Project
              </button>
            </div>
          </div>

          <div className="rounded-xl border border-dashed border-[var(--error)] p-6 relative overflow-hidden bg-red-500/5">
            <h3 className="font-bold text-lg text-[var(--error)] flex items-center gap-2 mb-2">
              <Trash2 className="w-5 h-5" /> Danger Zone
            </h3>
            <p className="text-sm text-[var(--on-surface-variant)] mb-4">Permanently delete this project. This action cannot be undone.</p>
            <button 
              className="px-4 py-2 bg-[var(--error)] text-white font-bold rounded-lg hover:brightness-110 transition-colors"
              onClick={async () => {
                if(!(await confirm("Are you absolutely sure you want to delete this project?"))) return;
                try {
                  const headers = await authHeaders();
                  const res = await fetch(`${API}/api/projects/${orgId}/${projectId}`, {
                    method: "DELETE", headers
                  });
                  if (res.ok) {
                    navigate(`/${currentOrg?.slug || orgId}/boards`);
                  } else {
                    const err = await res.json();
                    showToast(err.error || "Failed", "error");
                  }
                } catch(e) { console.error(e); }
              }}
            >
              Delete Project
            </button>
          </div>
        </div>
      )}


      {/* ==================== MODALS ==================== */}
      {/* Create Task Modal */}
      {showCreateModal && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setShowCreateModal(false)}>
          <div className="glass-card-elevated w-full max-w-lg p-6" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>Create New Task</h2>
              <button onClick={() => setShowCreateModal(false)} className="p-1 rounded-lg hover:bg-[var(--surface-container-high)]"><X className="w-5 h-5" style={{ color: 'var(--outline)' }} /></button>
            </div>
            <form onSubmit={handleCreateTask} className="space-y-4">
              <div>
                <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Title</label>
                <input type="text" className="input-field" value={newTask.title} onChange={(e) => setNewTask({ ...newTask, title: e.target.value })} placeholder="e.g. Design Ad Graphics" autoFocus />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Priority</label>
                  <select className="input-field" value={newTask.priority} onChange={(e) => setNewTask({ ...newTask, priority: e.target.value })}>
                    <option value="LOW">Low</option><option value="MEDIUM">Medium</option><option value="HIGH">High</option>
                  </select>
                </div>
                <div>
                  <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Status</label>
                  <select className="input-field" value={newTask.status} onChange={(e) => setNewTask({ ...newTask, status: e.target.value })}>
                    <option value="TODO">To Do</option><option value="IN_PROGRESS">In Progress</option><option value="DONE">Done</option>
                  </select>
                </div>
              </div>
              <div>
                <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Due Date</label>
                <input type="date" className="input-field" value={newTask.dueDate} onChange={(e) => setNewTask({ ...newTask, dueDate: e.target.value })} />
              </div>
              <div>
                <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Assignees (Leave empty for Everyone)</label>
                <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg bg-[var(--surface-container-lowest)]" style={{ borderColor: 'var(--outline-variant)' }}>
                  {project?.members?.map(m => (
                    <label key={m.user.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--surface-container)] p-1.5 rounded pr-3">
                      <input 
                        type="checkbox" 
                        className="w-4 h-4 rounded accent-[var(--secondary)]"
                        checked={newTask.assigneeIds.includes(m.user.id)}
                        onChange={(e) => {
                          if (e.target.checked) setNewTask({ ...newTask, assigneeIds: [...newTask.assigneeIds, m.user.id] });
                          else setNewTask({ ...newTask, assigneeIds: newTask.assigneeIds.filter(id => id !== m.user.id) });
                        }}
                      />
                      {m.user.name || m.user.email}
                    </label>
                  ))}
                </div>
              </div>
              <div className="flex gap-3 pt-4 border-t" style={{ borderColor: 'var(--surface-container-high)' }}>
                <button type="button" onClick={() => setShowCreateModal(false)} className="btn-secondary flex-1">Cancel</button>
                <button type="submit" disabled={creating || !newTask.title} className="btn-primary flex-1">{creating ? "Creating..." : "Create Task"}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Task Detail Modal */}
      {selectedTask && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={() => setSelectedTask(null)}>
          <div className="glass-card-elevated w-full max-w-2xl max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
            <div className="p-6 border-b shrink-0 flex items-start justify-between" style={{ borderColor: 'var(--surface-container-high)' }}>
              <div>
                <h2 className="text-xl font-bold mb-3" style={{ color: 'var(--on-surface)' }}>{selectedTask.title}</h2>
                <div className="flex gap-2 flex-wrap">
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded" style={{ background: 'var(--surface-container)', color: PRIORITIES[selectedTask.priority]?.color }}>{selectedTask.priority}</span>
                  <span className="px-2.5 py-1 text-[10px] font-bold rounded" style={{ background: 'var(--surface-container-low)', color: 'var(--on-surface-variant)' }}>{COLUMNS.find(c => c.id === selectedTask.status)?.label}</span>
                  {selectedTask.dueDate && <span className="px-2.5 py-1 text-[10px] font-medium rounded flex items-center gap-1.5" style={{ background: 'var(--surface-container)', color: 'var(--outline)' }}><Calendar className="w-3.5 h-3.5" /> {new Date(selectedTask.dueDate).toLocaleDateString()}</span>}
                </div>
              </div>
              <button onClick={() => setSelectedTask(null)} className="p-1 rounded-lg hover:bg-[var(--surface-container-high)]"><X className="w-5 h-5" style={{ color: 'var(--outline)' }} /></button>
            </div>
            
            <div className="flex-1 overflow-y-auto custom-scrollbar p-6 space-y-8">
              {/* Assignees */}
              <div>
                <h4 className="label-caps mb-3" style={{ color: 'var(--outline)' }}>Assignees</h4>
                {selectedTask.assignees?.length > 0 ? (
                  <div className="flex flex-wrap gap-2">
                    {selectedTask.assignees.map((a) => (
                      <span key={a.userId} className="inline-flex items-center gap-2 px-2.5 py-1.5 rounded-lg border text-xs font-medium" style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--outline-variant)', color: 'var(--on-surface)' }}>
                        <span className="w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>{(a.user?.name || a.user?.email || "?").charAt(0).toUpperCase()}</span>
                        {a.user?.name || a.user?.email}
                      </span>
                    ))}
                  </div>
                ) : <p className="text-sm font-medium" style={{ color: 'var(--on-surface)' }}>Everyone (Generalized)</p>}
              </div>

              {/* Comments */}
              <div>
                <h4 className="label-caps mb-3" style={{ color: 'var(--outline)' }}>Comments ({selectedTask.comments?.length || 0})</h4>
                {selectedTask.comments?.length > 0 && (
                  <div className="space-y-4 mb-4">
                    {selectedTask.comments.map((c) => (
                      <div key={c.id} className="p-4 rounded-lg border" style={{ background: 'var(--surface-container-lowest)', borderColor: 'var(--surface-container-high)' }}>
                        <div className="flex items-center gap-2 mb-2">
                          <span className="w-6 h-6 rounded-full flex items-center justify-center text-[10px] font-bold" style={{ background: 'var(--surface-container-high)', color: 'var(--on-surface)' }}>{(c.user?.name || c.user?.email || "?").charAt(0).toUpperCase()}</span>
                          <span className="text-sm font-semibold" style={{ color: 'var(--on-surface)' }}>{c.user?.name || c.user?.email}</span>
                          <span className="text-[10px] font-mono ml-auto" style={{ color: 'var(--outline)' }}>{new Date(c.createdAt).toLocaleString()}</span>
                        </div>
                        <p className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{c.content}</p>
                      </div>
                    ))}
                  </div>
                )}
                {/* Add Comment Form */}
                <form onSubmit={handleAddComment} className="flex gap-3">
                  <input type="text" className="input-field flex-1" placeholder="Add a comment..." value={newComment} onChange={(e) => setNewComment(e.target.value)} disabled={submittingComment} />
                  <button type="submit" disabled={submittingComment || !newComment} className="btn-primary flex items-center gap-2">Post</button>
                </form>
              </div>
            </div>

            <div className="p-4 border-t bg-[var(--surface-container-low)] shrink-0 flex justify-end rounded-b-xl" style={{ borderColor: 'var(--surface-container-high)' }}>
              <button onClick={() => { handleDeleteTask(selectedTask.id); }} className="text-sm font-medium flex items-center gap-2 transition-colors hover:opacity-80" style={{ color: 'var(--error)' }}>
                <Trash2 className="w-4 h-4" /> Delete Task
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
