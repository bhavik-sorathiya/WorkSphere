import { useState } from "react";
import { LifeBuoy, FileQuestion, Search, Keyboard } from "lucide-react";

const ShortcutRow = ({ label, keys }) => (
  <div className="flex items-center justify-between py-1.5 border-b last:border-0" style={{ borderColor: 'var(--surface-container-high)' }}>
    <span className="text-sm" style={{ color: 'var(--on-surface-variant)' }}>{label}</span>
    <div className="flex gap-1">
      {keys.map((k, i) => (
        <kbd key={i} className="font-mono bg-[var(--surface-container)] px-1.5 py-0.5 rounded border border-[var(--outline-variant)] text-[11px] font-bold shadow-sm" style={{ color: 'var(--on-surface)' }}>
          {k}
        </kbd>
      ))}
    </div>
  </div>
);

export default function HelpPage() {
  const [searchQuery, setSearchQuery] = useState("");

  const faqs = [
    {
      q: "How do I manage tasks and project boards?",
      a: "Navigate to your project to see the Kanban board. You can drag and drop tasks between columns (To Do, In Progress, Done) or click on any task to view details, assign members, and post comments. Touch-dragging is not supported on mobile devices."
    },
    {
      q: "How does the search command palette work?",
      a: "Press Ctrl+K (or Cmd+K on macOS) from anywhere in WorkSphere to open the universal search palette. Start typing the name of any project in your organization to navigate to it instantly. Press Esc to close."
    },
    {
      q: "How do I edit and format documents?",
      a: "Open the Docs section from the sidebar, select a document, and use the rich text editor to write, style, and format your content. Changes are saved automatically."
    },
    {
      q: "How do role permissions work?",
      a: "WorkSphere uses Role-Based Access Control (RBAC). Roles include Owner (full control), Admin (can invite/remove users and manage projects), Member (can edit tasks, chats, and docs), and Viewer (read-only access)."
    },
    {
      q: "How does real-time chat work?",
      a: "Open the Chat section to collaborate with your team. Channel messages are updated in real-time, allowing you to discuss project details instantly."
    }
  ];

  const filteredFaqs = faqs.filter(faq =>
    faq.q.toLowerCase().includes(searchQuery.toLowerCase()) ||
    faq.a.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex-1 overflow-y-auto p-8 animate-fade-in custom-scrollbar">
      <div className="max-w-4xl mx-auto space-y-8">

        {/* Header */}
        <div className="text-center py-8">
          <div className="w-16 h-16 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto mb-4 text-[var(--secondary)]">
            <LifeBuoy className="w-8 h-8" />
          </div>
          <h1 className="text-3xl font-display font-extrabold mb-2" style={{ color: 'var(--on-surface)' }}>How can we help?</h1>
          <p className="text-[var(--on-surface-variant)]">Search our guides or browse the frequently asked questions below.</p>

          <div className="max-w-xl mx-auto mt-8 relative text-left">
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5" style={{ color: 'var(--outline)' }} />
            <input
              id="help-search-input"
              type="text"
              placeholder="Search for answers..."
              className="input-field pl-12 py-3 text-base w-full shadow-sm"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
        </div>

        {/* Help Content Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mt-12">
          {/* Keyboard Shortcuts Section */}
          <div className="glass-card p-8 flex flex-col h-[600px]">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <Keyboard className="w-6 h-6" style={{ color: 'var(--secondary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>Keyboard Shortcuts</h2>
            </div>
            <div className="space-y-4 overflow-y-auto custom-scrollbar pr-2 flex-1">
              <div className="space-y-1">
                <h3 className="label-caps font-semibold text-xs mb-2 mt-2" style={{ color: 'var(--secondary)' }}>Navigation & Actions</h3>
                <ShortcutRow label="Open Universal Search" keys={["Ctrl", "K"]} />
                <ShortcutRow label="Toggle Dark/Light Mode" keys={["Shift", "T"]} />
                <ShortcutRow label="Create New Item" keys={["Shift", "N"]} />
                <ShortcutRow label="Go to Dashboard" keys={["Shift", "D"]} />
                <ShortcutRow label="Go to Project Boards" keys={["Shift", "B"]} />
                <ShortcutRow label="Go to Chat Channels" keys={["Shift", "C"]} />
                <ShortcutRow label="Go to Documents" keys={["Shift", "O"]} />
                <ShortcutRow label="Go to Workspace Settings" keys={["Shift", "S"]} />
                <ShortcutRow label="Go to Help Page" keys={["Shift", "H"]} />
                <ShortcutRow label="Close Modals/Overlays" keys={["Esc"]} />
              </div>
              <div className="space-y-1 pt-4 border-t" style={{ borderColor: 'var(--surface-container-high)' }}>
                <h3 className="label-caps font-semibold text-xs mb-2" style={{ color: 'var(--secondary)' }}>Document Editor</h3>
                <ShortcutRow label="Bold text" keys={["Ctrl", "B"]} />
                <ShortcutRow label="Italic text" keys={["Ctrl", "I"]} />
                <ShortcutRow label="Underline text" keys={["Ctrl", "U"]} />
                <p className="text-xs mt-3 italic" style={{ color: 'var(--outline)' }}>* Standard rich-text shortcuts apply in the editor. App navigation shortcuts are automatically disabled while typing to prevent conflicts.</p>
              </div>
            </div>
          </div>

          {/* FAQs Section */}
          <div className="glass-card p-8 flex flex-col h-[600px]">
            <div className="flex items-center gap-2 mb-6 shrink-0">
              <FileQuestion className="w-6 h-6" style={{ color: 'var(--secondary)' }} />
              <h2 className="text-xl font-bold" style={{ color: 'var(--on-surface)' }}>Frequently Asked Questions</h2>
            </div>

            {filteredFaqs.length > 0 ? (
              <div className="space-y-6 flex-1 overflow-y-auto custom-scrollbar pr-2">
                {filteredFaqs.map((faq, i) => (
                  <div key={i} className="border-b pb-6 last:border-0 last:pb-0" style={{ borderColor: 'var(--surface-container-high)' }}>
                    <h4 className="font-bold text-base mb-2" style={{ color: 'var(--on-surface)' }}>{faq.q}</h4>
                    <p className="text-sm leading-relaxed" style={{ color: 'var(--on-surface-variant)' }}>{faq.a}</p>
                  </div>
                ))}
              </div>
            ) : (
              <div className="text-center py-8 text-[var(--on-surface-variant)] animate-fade-in flex-1 flex items-center justify-center">
                No results found for "{searchQuery}". Try searching for something else.
              </div>
            )}
          </div>
        </div>

      </div>
    </div>
  );
}
