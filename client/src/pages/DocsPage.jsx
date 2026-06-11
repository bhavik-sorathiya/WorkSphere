import { useState, useEffect } from "react";
import { useOutletContext } from "react-router-dom";
import { useAuth } from "@clerk/clerk-react";
import { useRefresh } from "../contexts/RefreshContext";
import { useConfirm } from "../contexts/ConfirmContext";
import { FileText, FolderOpen, Plus, Save, Trash2, ArrowLeft } from "lucide-react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import ReactQuill from 'react-quill-new';
import 'react-quill-new/dist/quill.snow.css';
import Skeleton from "../components/Skeleton";

const API = import.meta.env.VITE_API_URL;

const quillModules = {
  toolbar: [
    [{ 'header': [1, 2, 3, false] }],
    ['bold', 'italic', 'underline', 'strike'],
    [{ 'list': 'ordered'}, { 'list': 'bullet' }],
    ['link', 'blockquote', 'code-block'],
    ['clean']
  ]
};

export default function DocsPage() {
  const { orgId } = useOutletContext();
  const { getToken } = useAuth();
  const { refreshKey } = useRefresh();
  const confirm = useConfirm();

  const [selectedDoc, setSelectedDoc] = useState(null);
  const [docContent, setDocContent] = useState("");
  const [docTitle, setDocTitle] = useState("");
  const [saving, setSaving] = useState(false);
  const [showNewDoc, setShowNewDoc] = useState(false);
  const [newDocTitle, setNewDocTitle] = useState("");
  const [selectedProjectForDoc, setSelectedProjectForDoc] = useState("");
  const queryClient = useQueryClient();

  useEffect(() => {
    const handleCreateShortcut = () => {
      setShowNewDoc(true);
      setTimeout(() => {
        const input = document.querySelector('input[placeholder="Document title..."]');
        if (input) input.focus();
      }, 50);
    };
    window.addEventListener('worksphere-create-item', handleCreateShortcut);
    return () => window.removeEventListener('worksphere-create-item', handleCreateShortcut);
  }, []);

  const { data, isLoading: loading } = useQuery({
    queryKey: ['orgDocs', orgId, refreshKey],
    queryFn: async () => {
      const token = await getToken();
      const headers = { Authorization: `Bearer ${token}` };

      const [orgRes, docsRes] = await Promise.all([
        fetch(`${API}/api/organizations/${orgId}`, { headers }),
        fetch(`${API}/api/documents/${orgId}/all-documents`, { headers })
      ]);

      if (!orgRes.ok) throw new Error("Failed to fetch org");

      return {
        orgData: await orgRes.json(),
        docs: docsRes.ok ? await docsRes.json() : []
      };
    },
    enabled: !!orgId,
    staleTime: 5 * 60 * 1000
  });

  const projects = data?.orgData?.projects || [];
  const documents = data?.docs || [];

  const handleSelectDoc = (doc) => {
    setSelectedDoc(doc);
    setDocTitle(doc.title || "");
    setDocContent(doc.currentContent || doc.content || "");
  };

  const handleSave = async () => {
    if (!selectedDoc) return;
    setSaving(true);
    try {
      const token = await getToken();
      await fetch(`${API}/api/documents/${orgId}/projects/${selectedDoc.projectId}/documents/${selectedDoc._id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: docTitle, content: docContent }),
      });
    } catch (err) { console.error(err); }
    finally { setSaving(false); }
  };

  const handleCreateDoc = async (e) => {
    e.preventDefault();
    if (!newDocTitle.trim() || !selectedProjectForDoc) return;
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/documents/${orgId}/projects/${selectedProjectForDoc}/documents`, {
        method: "POST",
        headers: { "Content-Type": "application/json", Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: newDocTitle, content: "" }),
      });
      if (res.ok) {
        setNewDocTitle("");
        setShowNewDoc(false);
        queryClient.invalidateQueries(['orgDocs', orgId]);
      }
    } catch (err) { console.error(err); }
  };

  const handleDeleteDoc = async () => {
    if (!selectedDoc || !(await confirm("Delete this document?"))) return;
    try {
      const token = await getToken();
      await fetch(`${API}/api/documents/${orgId}/projects/${selectedDoc.projectId}/documents/${selectedDoc._id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}` },
      });
      setSelectedDoc(null);
      queryClient.invalidateQueries(['orgDocs', orgId]);
    } catch (err) { console.error(err); }
  };

  if (loading) {
    return (
      <div className="flex h-full">
        <div className="w-64 border-r p-4 space-y-3" style={{ borderColor: 'var(--outline-variant)' }}>
          <Skeleton className="h-5 w-24 rounded" />
          <Skeleton className="h-7 w-full rounded" />
          <Skeleton className="h-7 w-full rounded" />
        </div>
        <div className="flex-1 p-8">
          <Skeleton className="h-8 w-64 rounded mb-4" />
          <Skeleton className="h-[60vh] w-full rounded-xl" />
        </div>
      </div>
    );
  }

  // Group docs by project
  const groupedDocs = {};
  documents.forEach(d => {
    const key = d.projectName || "Unknown";
    if (!groupedDocs[key]) groupedDocs[key] = [];
    groupedDocs[key].push(d);
  });

  return (
    <div className="flex h-full">
      {/* ─── DOCUMENT TREE SIDEBAR ─── */}
      <div className={`${selectedDoc ? 'hidden md:flex' : 'flex'} w-full md:w-64 border-r flex-col shrink-0`} style={{ borderColor: 'var(--outline-variant)', background: 'var(--surface-container-low)' }}>
        <div className="p-4 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-container-high)' }}>
          <h2 className="font-bold text-sm" style={{ color: 'var(--on-surface)' }}>Directory</h2>
          <button onClick={() => setShowNewDoc(!showNewDoc)} className="p-1 rounded hover:bg-[var(--surface-container-high)] transition-colors" style={{ color: 'var(--secondary)' }}>
            <Plus className="w-4 h-4" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto custom-scrollbar p-3 space-y-4">
          {Object.entries(groupedDocs).map(([projectName, docs]) => (
            <div key={projectName}>
              <div className="flex items-center gap-2 px-2 mb-1">
                <FolderOpen className="w-3.5 h-3.5" style={{ color: 'var(--outline)' }} />
                <p className="text-xs font-semibold truncate" style={{ color: 'var(--on-surface-variant)' }}>{projectName}</p>
              </div>
              {docs.map(doc => (
                <button
                  key={doc._id}
                  onClick={() => handleSelectDoc(doc)}
                  className={`w-full text-left flex items-center gap-2 px-3 py-1.5 ml-3 rounded-md text-sm transition-colors`}
                  style={{
                    background: selectedDoc?._id === doc._id ? 'var(--secondary-container)' : 'transparent',
                    color: selectedDoc?._id === doc._id ? 'var(--on-secondary-container)' : 'var(--on-surface-variant)',
                    fontWeight: selectedDoc?._id === doc._id ? 600 : 400,
                  }}
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span className="truncate">{doc.title}</span>
                </button>
              ))}
            </div>
          ))}

          {documents.length === 0 && (
            <div className="text-center py-8">
              <FileText className="w-8 h-8 mx-auto mb-2" style={{ color: 'var(--outline-variant)' }} />
              <p className="text-xs" style={{ color: 'var(--outline)' }}>No documents yet.</p>
            </div>
          )}
        </div>

        {/* Create new doc bottom */}
        <div className="p-3 border-t" style={{ borderColor: 'var(--surface-container-high)' }}>
          {showNewDoc ? (
            <form onSubmit={handleCreateDoc} className="space-y-2">
              <select className="input-field text-xs py-1.5" value={selectedProjectForDoc} onChange={e => setSelectedProjectForDoc(e.target.value)}>
                <option value="">Select project...</option>
                {projects.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
              </select>
              <input type="text" placeholder="Document title..." className="input-field text-xs py-1.5" value={newDocTitle} onChange={e => setNewDocTitle(e.target.value)} />
              <button type="submit" className="btn-primary w-full text-xs py-1.5" disabled={!newDocTitle.trim() || !selectedProjectForDoc}>Create</button>
            </form>
          ) : (
            <button onClick={() => setShowNewDoc(true)} className="flex items-center gap-2 w-full px-3 py-2 text-sm rounded-md transition-colors hover:bg-[var(--surface-container-high)]" style={{ color: 'var(--on-surface-variant)' }}>
              <FileText className="w-4 h-4" /> Create new doc
            </button>
          )}
        </div>
      </div>

      {/* ─── DOCUMENT EDITOR ─── */}
      <div className={`${selectedDoc ? 'flex' : 'hidden md:flex'} flex-1 flex-col min-w-0`}>
        {selectedDoc ? (
          <>
            {/* Toolbar */}
            <div className="px-4 md:px-6 py-3 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-container-high)' }}>
              <div className="flex items-center gap-2">
                <button 
                  onClick={() => setSelectedDoc(null)} 
                  className="md:hidden p-1.5 -ml-2 mr-1 rounded-lg hover:bg-[var(--surface-container-high)] transition-colors"
                >
                  <ArrowLeft className="w-5 h-5" style={{ color: 'var(--on-surface)' }} />
                </button>
              </div>
              <div className="flex items-center gap-2">
                <span className="text-xs" style={{ color: saving ? 'var(--secondary)' : 'var(--outline)' }}>
                  {saving ? "Saving..." : "✓ Saved"}
                </span>
                <button onClick={handleSave} className="btn-primary text-xs py-1.5 px-3 flex items-center gap-1.5">
                  <Save className="w-3.5 h-3.5" /> Save
                </button>
                <button onClick={handleDeleteDoc} className="p-2 rounded-lg transition-colors hover:bg-red-50" title="Delete">
                  <Trash2 className="w-4 h-4" style={{ color: 'var(--error)' }} />
                </button>
              </div>
            </div>

            {/* Editor Canvas */}
            <div className="flex-1 overflow-y-auto custom-scrollbar px-4 md:px-12 py-6 md:py-8 max-w-4xl mx-auto w-full">
              <input
                type="text"
                value={docTitle}
                onChange={e => setDocTitle(e.target.value)}
                className="w-full text-4xl font-display font-bold border-none outline-none mb-2"
                style={{ color: 'var(--on-surface)', background: 'transparent' }}
                placeholder="Untitled"
              />
              <p className="label-caps mb-4" style={{ color: 'var(--outline)' }}>
                Last edited • {selectedDoc.projectName}
              </p>
              <div className="quill-container rounded-lg shadow-sm border" style={{ borderColor: 'var(--outline-variant)' }}>
                <ReactQuill
                  theme="snow"
                  value={docContent}
                  onChange={setDocContent}
                  className="min-h-[400px]"
                  modules={quillModules}
                />
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center">
              <FileText className="w-12 h-12 mx-auto mb-3" style={{ color: 'var(--outline-variant)' }} />
              <p className="font-medium" style={{ color: 'var(--on-surface-variant)' }}>Select a document from the directory.</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
