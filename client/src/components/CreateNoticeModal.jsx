import { useState, useEffect } from "react";
import { X } from "lucide-react";

export default function CreateNoticeModal({ onClose, onCreate, members }) {
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [isForAll, setIsForAll] = useState(true);
  const [viewerIds, setViewerIds] = useState([]);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') onClose();
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [onClose]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!title || !content) return;
    setSubmitting(true);
    await onCreate({ title, content, isForAll, viewerIds });
    setSubmitting(false);
  };

  return (
    <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4" onClick={onClose}>
      <div className="glass-card-elevated w-full max-w-lg p-6 max-h-[90vh] flex flex-col" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between mb-6 shrink-0">
          <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>Create New Notice</h2>
          <button onClick={onClose} className="p-1 rounded-lg hover:bg-[var(--surface-container-high)]">
            <X className="w-5 h-5" style={{ color: 'var(--outline)' }} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto custom-scrollbar pr-2 space-y-4">
          <div>
            <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Title</label>
            <input 
              type="text" 
              className="input-field" 
              value={title} 
              onChange={(e) => setTitle(e.target.value)} 
              placeholder="e.g. Server Maintenance" 
              autoFocus 
            />
          </div>
          <div>
            <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Content</label>
            <textarea 
              className="input-field min-h-[100px] resize-y" 
              value={content} 
              onChange={(e) => setContent(e.target.value)} 
              placeholder="Enter notice details..." 
            />
          </div>
          
          <div className="flex items-center gap-3 pt-2">
            <input 
              type="checkbox" 
              id="isForAll"
              className="w-4 h-4 rounded accent-[var(--secondary)]"
              checked={isForAll}
              onChange={(e) => setIsForAll(e.target.checked)}
            />
            <label htmlFor="isForAll" className="text-sm font-medium cursor-pointer" style={{ color: 'var(--on-surface)' }}>
              Visible to Everyone
            </label>
          </div>

          {!isForAll && (
            <div className="pt-2">
              <label className="label-caps block mb-1.5" style={{ color: 'var(--outline)' }}>Select Viewers</label>
              <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-2 border rounded-lg bg-[var(--surface-container-lowest)]" style={{ borderColor: 'var(--outline-variant)' }}>
                {members.map(m => (
                  <label key={m.id} className="flex items-center gap-2 text-sm cursor-pointer hover:bg-[var(--surface-container)] p-1.5 rounded pr-3">
                    <input 
                      type="checkbox" 
                      className="w-4 h-4 rounded accent-[var(--secondary)]"
                      checked={viewerIds.includes(m.id)}
                      onChange={(e) => {
                        if (e.target.checked) setViewerIds([...viewerIds, m.id]);
                        else setViewerIds(viewerIds.filter(id => id !== m.id));
                      }}
                    />
                    {m.name || m.email}
                  </label>
                ))}
              </div>
            </div>
          )}
          
          <div className="flex gap-3 pt-6 shrink-0 mt-auto">
            <button type="button" onClick={onClose} className="btn-secondary flex-1">Cancel</button>
            <button type="submit" disabled={submitting || !title || !content} className="btn-primary flex-1">
              {submitting ? "Posting..." : "Post Notice"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
