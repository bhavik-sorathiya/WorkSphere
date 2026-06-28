import { useState, useEffect, useRef } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth, useUser } from "@clerk/clerk-react";
import { useSocket } from "../contexts/SocketContext";
import { useRefresh } from "../contexts/RefreshContext";
import { Hash, Send, Plus, MessageSquare, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import Skeleton from "../components/Skeleton";

const API = import.meta.env.VITE_API_URL;

export default function ChatPage() {
  const { orgId } = useOutletContext();
  const { getToken } = useAuth();
  const { user } = useUser();
  const { refreshKey } = useRefresh();
  const queryClient = useQueryClient();
  const chatEndRef = useRef(null);

  const [activeChannel, setActiveChannel] = useState(null);
  const [messages, setMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [sending, setSending] = useState(false);
  const socket = useSocket();
  const [showNewChannel, setShowNewChannel] = useState(false);
  const [newChannelName, setNewChannelName] = useState("");
  const [selectedProjectForChannel, setSelectedProjectForChannel] = useState("");

  const activeChannelRef = useRef(activeChannel);
  useEffect(() => { activeChannelRef.current = activeChannel; }, [activeChannel]);

  // Fetch org projects and their channels

  useEffect(() => {
    const handleCreateShortcut = () => {
      setShowNewChannel(true);
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Channel name..."]');
        if (input) input.focus();
      }, 50);
    };
    window.addEventListener('worksphere-create-item', handleCreateShortcut);
    return () => window.removeEventListener('worksphere-create-item', handleCreateShortcut);
  }, []);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['orgChannels', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [orgRes, channelsRes] = await Promise.all([
        fetch(`${API}/api/organizations/${orgId}`, { headers }),
        fetch(`${API}/api/chat/${orgId}/all-channels`, { headers })
      ]);

      if (!orgRes.ok) throw new Error("Failed to fetch org");

      const orgData = await orgRes.json();
      const channelsData = channelsRes.ok ? await channelsRes.json() : [];
      
      const allChannels = channelsData.map(ch => ({
        ...ch,
        projectName: ch.project?.name || "Unknown",
      }));

      return {
        projects: orgData.projects || [],
        channels: allChannels
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
  });

  const projects = data?.projects || [];
  const channels = data?.channels || [];

  useEffect(() => {
    if (channels.length > 0 && !activeChannelRef.current && window.innerWidth >= 768) {
      setActiveChannel(channels[0]);
    }
  }, [channels]);

  // Socket.io
  useEffect(() => {
    if (!socket) return;

    const handleNewMessage = (msg) => {
      if (activeChannelRef.current && msg.channelId === activeChannelRef.current.id) {
        setMessages(prev => [...prev, msg]);
      }
    };

    const handleChannelCreated = () => {
      queryClient.invalidateQueries(['orgChannels', orgId]);
    };

    socket.on("NEW_MESSAGE", handleNewMessage);
    socket.on("CHANNEL_CREATED", handleChannelCreated);

    return () => {
      socket.off("NEW_MESSAGE", handleNewMessage);
      socket.off("CHANNEL_CREATED", handleChannelCreated);
    };
  }, [socket, orgId, queryClient]);

  // Fetch messages when channel changes
  useEffect(() => {
    if (!activeChannel) return;
    const fetchMessages = async () => {
      try {
        const token = await getToken();
        const res = await fetch(`${API}/api/chat/${orgId}/projects/${activeChannel.projectId}/channels/${activeChannel.id}/messages`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.ok) setMessages(await res.json());
      } catch (err) { console.error(err); }
    };
    fetchMessages();
    if (socket) {
      socket.emit("join_channel", activeChannel.id);
      // Also join the project for socket events
      if (activeChannel.projectId) {
        socket.emit("join_project", activeChannel.projectId);
      }
    }
  }, [activeChannel, socket, orgId, getToken]);

  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!chatInput.trim() || !activeChannel) return;
    setSending(true);
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/chat/${orgId}/projects/${activeChannel.projectId}/channels/${activeChannel.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ content: chatInput }),
      });
      if (res.ok) {
        setChatInput("");
      } else {
        const err = await res.json();
        console.error("Failed to send message:", err);
      }
    } catch (err) { console.error(err); }
    finally { setSending(false); }
  };

  const handleCreateChannel = async (e) => {
    e.preventDefault();
    if (!newChannelName.trim() || !selectedProjectForChannel) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/chat/${orgId}/projects/${selectedProjectForChannel}/channels`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: newChannelName, projectId: selectedProjectForChannel }),
      });
      if (res.ok) {
        setNewChannelName("");
        setShowNewChannel(false);
        queryClient.invalidateQueries(['orgChannels', orgId]);
      }
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-60 border-r p-4 space-y-3" style={{ borderColor: 'var(--outline-variant)' }}>
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-8 w-full rounded" />
          <Skeleton className="h-8 w-full rounded" />
          <Skeleton className="h-8 w-full rounded" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-48 rounded mb-4" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Group channels by project
  const groupedChannels = {};
  channels.forEach(ch => {
    const key = ch.projectName || "Unknown";
    if (!groupedChannels[key]) groupedChannels[key] = [];
    groupedChannels[key].push(ch);
  });

  return (
    <div className="flex h-full">
      {/* ─── CHANNEL SIDEBAR ─── */}
      <div className={`${activeChannel ? 'hidden md:flex' : 'flex'} w-full md:w-60 border-r flex-col shrink-0`} style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-low)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-container-high)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>Channels</h2>
          <button onClick={() => setShowNewChannel(!showNewChannel)} className="p-1 rounded hover:bg-[var(--surface-container-high)] transition-colors">
            <Plus className="w-4 h-4" style={{ color: 'var(--on-surface-variant)' }} />
          </button>
        </div>

        {showNewChannel && (
          <form onSubmit={handleCreateChannel} className="p-3 border-b space-y-2" style={{ borderColor: 'var(--surface-container-high)' }}>
            <select
              className="input-field text-xs py-1.5"
              value={selectedProjectForChannel}
              onChange={e => setSelectedProjectForChannel(e.target.value)}
            >
              <option value="">Select project...</option>
              {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
            </select>
            <input
              type="text"
              placeholder="Channel name..."
              className="input-field text-xs py-1.5"
              value={newChannelName}
              onChange={e => setNewChannelName(e.target.value)}
            />
            <button type="submit" className="btn-primary w-full text-xs py-1.5" disabled={!newChannelName.trim() || !selectedProjectForChannel}>
              Create
            </button>
          </form>
        )}

        <div className="flex-1 overflow-y-auto custom-scrollbar p-2 space-y-4">
          {Object.entries(groupedChannels).map(([projectName, projectChannels]) => (
            <div key={projectName}>
              <p className="label-caps px-2 mb-1" style={{ color: 'var(--outline)', fontSize: '0.6rem' }}>{projectName}</p>
              {projectChannels.map(ch => (
                <button
                  key={ch.id}
                  onClick={() => setActiveChannel(ch)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 rounded-md text-sm transition-colors ${activeChannel?.id === ch.id ? 'font-semibold' : ''}`}
                  style={{
                    background: activeChannel?.id === ch.id ? 'var(--primary-container)' : 'transparent',
                    color: activeChannel?.id === ch.id ? 'var(--on-primary-container)' : 'var(--on-surface-variant)',
                  }}
                >
                  <Hash className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{ch.name}</span>
                </button>
              ))}
            </div>
          ))}

          {channels.length === 0 && (
            <div className="text-center py-8">
              <MessageSquare className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
              <p className="text-xs" style={{ color: 'var(--outline)' }}>No channels yet.</p>
            </div>
          )}
        </div>
      </div>

      {/* ─── CHAT CANVAS ─── */}
      <div className={`${activeChannel ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {activeChannel ? (
          <>
            {/* Channel Header */}
            <div className="px-4 md:px-6 py-3 border-b flex items-center gap-2 md:gap-3 shrink-0" style={{ borderColor: 'var(--surface-container-high)' }}>
              <button 
                onClick={() => setActiveChannel(null)} 
                className="md:hidden p-1.5 -ml-2 mr-1 rounded-lg hover:bg-[var(--surface-container-high)] transition-colors"
              >
                <ArrowLeft className="w-5 h-5" style={{ color: 'var(--on-surface)' }} />
              </button>
              <Hash className="w-5 h-5 shrink-0" style={{ color: 'var(--on-surface-variant)' }} />
              <h3 className="font-bold truncate" style={{ color: 'var(--on-surface)' }}>{activeChannel.name}</h3>
              <span className="text-xs ml-2" style={{ color: 'var(--outline)' }}>{activeChannel.projectName}</span>
            </div>

            {/* Messages */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-6 py-4 space-y-4">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <MessageSquare className="w-10 h-10 mx-auto mb-3" style={{ color: 'var(--outline-variant)' }} />
                  <p className="font-medium" style={{ color: 'var(--outline)' }}>No messages yet. Start the conversation!</p>
                </div>
              )}
              {messages.map((msg, i) => {
                const isMe = msg.senderId === user?.id;
                return (
                  <div key={msg._id || i} className="flex gap-3 animate-fade-in">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0" style={{
                      background: isMe ? 'var(--secondary-container)' : 'var(--surface-container-high)',
                      color: isMe ? 'var(--on-secondary-container)' : 'var(--on-surface)',
                    }}>
                      {(msg.sender?.name || "U").charAt(0).toUpperCase()}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-sm" style={{ color: 'var(--on-surface)' }}>
                          {msg.sender?.name || "User"}
                        </span>
                        <span className="text-[10px] font-mono" style={{ color: 'var(--outline)' }}>
                          {msg.createdAt ? new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }) : ""}
                        </span>
                      </div>
                      <p className="text-sm mt-0.5" style={{ color: 'var(--on-surface-variant)' }}>{msg.content}</p>
                    </div>
                  </div>
                );
              })}
              <div ref={chatEndRef} />
            </div>

            {/* Input */}
            <form onSubmit={handleSend} className="px-6 py-4 border-t flex gap-3" style={{ borderColor: 'var(--surface-container-high)' }}>
              <input
                type="text"
                className="input-field flex-1"
                placeholder={`Message #${activeChannel.name}...`}
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={sending}
              />
              <button type="submit" disabled={sending || !chatInput.trim()} className="btn-primary flex items-center gap-2">
                <Send className="w-4 h-4" />
              </button>
            </form>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <MessageSquare className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--outline-variant)' }} />
              <p className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Select a channel to start chatting.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
