import { useState, useEffect, useCallback } from "react";
import { useNavigate, useParams, Link, useLocation, Outlet } from "react-router-dom";
import { useAuth, UserButton } from "@clerk/clerk-react";
import { Home, LayoutGrid, MessageSquare, FileText, RefreshCw, ChevronDown, Search, HelpCircle, UserPlus, X, Moon, Sun, Loader2, Shield, Users, CheckCircle2 } from "lucide-react";
import { useRefresh } from "../contexts/RefreshContext";
import logoUrl from "../assets/logo.png";

const API = import.meta.env.VITE_API_URL;

export default function SidebarLayout() {
  const { orgSlug } = useParams();
  const navigate = useNavigate();
  const location = useLocation();
  const { getToken } = useAuth();
  const { triggerRefresh } = useRefresh();

  const [orgs, setOrgs] = useState([]);
  const [currentOrg, setCurrentOrg] = useState(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showOrgDropdown, setShowOrgDropdown] = useState(false);
  
  // Search Modal State
  const [showSearch, setShowSearch] = useState(false);
  const [searchQuery, setSearchQuery] = useState("");
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  

  const [isDarkMode, setIsDarkMode] = useState(() => {
    return localStorage.getItem('theme') === 'dark' || 
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

  const fetchOrgs = useCallback(async () => {
    try {
      const token = await getToken();
      const res = await fetch(`${API}/api/organizations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (res.ok) {
        const data = await res.json();
        setOrgs(data);
        const active = data.find(o => o.slug === orgSlug);
        if (active) setCurrentOrg(active);
      }
    } catch (err) {
      console.error(err);
    }
  }, [getToken, orgSlug]);

  // eslint-disable-next-line react-hooks/set-state-in-effect
  useEffect(() => { fetchOrgs(); }, [fetchOrgs]);

  const handleRefresh = () => {
    setIsRefreshing(true);
    triggerRefresh();
    setTimeout(() => setIsRefreshing(false), 1000);
  };

  // Search & Navigation Shortcuts Logic
  useEffect(() => {
    const handleKeyDown = (e) => {
      // 1. If typing in an input, textarea, or contenteditable element, skip shortcuts
      const activeEl = document.activeElement;
      const isInput = activeEl && (
        activeEl.tagName === 'INPUT' || 
        activeEl.tagName === 'TEXTAREA' || 
        activeEl.tagName === 'SELECT' ||
        activeEl.isContentEditable ||
        activeEl.classList.contains('ql-editor') ||
        activeEl.classList.contains('w-md-editor-text-input')
      );

      if (isInput) {
        if (e.key === 'Escape') {
          activeEl.blur();
        }
        return;
      }

      // 2. Escape closes all overlays
      if (e.key === 'Escape') {
        setShowSearch(false);
        return;
      }

      // 3. Search shortcut (Ctrl+K or Cmd+K)
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setShowSearch(prev => !prev);
        return;
      }

      // 4. Shift + Key combinations for navigation and actions (2-key shortcuts)
      if (e.shiftKey && !e.altKey && !e.ctrlKey && !e.metaKey) {
        const key = e.key.toLowerCase();
        
        // Dark mode toggle (Shift + T)
        if (key === 't') {
          e.preventDefault();
          setIsDarkMode(prev => !prev);
          return;
        }

        // Create item (Shift + N)
        if (key === 'n') {
          e.preventDefault();
          window.dispatchEvent(new CustomEvent('worksphere-create-item'));
          return;
        }

        // Navigation
        let targetPath = null;
        if (key === 'd') targetPath = `/${orgSlug}/home`;
        else if (key === 'b') targetPath = `/${orgSlug}/boards`;
        else if (key === 'c') targetPath = `/${orgSlug}/chat`;
        else if (key === 'o') targetPath = `/${orgSlug}/docs`;
        else if (key === 's') targetPath = `/${orgSlug}/directory`;
        else if (key === 'h') targetPath = `/${orgSlug}/help`;

        if (targetPath) {
          e.preventDefault();
          navigate(targetPath);
          return;
        }
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [orgSlug, navigate, setIsDarkMode]);

  useEffect(() => {
    if (!showSearch || !searchQuery.trim() || !currentOrg) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setSearchResults([]);
      return;
    }
    
    setIsSearching(true);
    const q = searchQuery.trim();
    
    const timeoutId = setTimeout(async () => {
      try {
        if (!currentOrg) return;
        const token = await getToken();
        const res = await fetch(`${API}/api/organizations/${currentOrg.id}/search?q=${encodeURIComponent(q)}`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        if (res.ok) {
          const data = await res.json();
          setSearchResults(data);
        }
      } catch (err) {
        console.error("Search error:", err);
      } finally {
        setIsSearching(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(timeoutId);
  }, [searchQuery, showSearch, currentOrg, getToken]);

  const navLinks = [
    { name: "Home", icon: Home, path: `/${orgSlug}/home` },
    { name: "Boards", icon: LayoutGrid, path: `/${orgSlug}/boards` },
    { name: "Chat", icon: MessageSquare, path: `/${orgSlug}/chat` },
    { name: "Docs", icon: FileText, path: `/${orgSlug}/docs` },
    { name: "Directory", icon: Users, path: `/${orgSlug}/directory` },
  ];

  if (currentOrg && (currentOrg.myRole === 'OWNER' || currentOrg.myRole === 'ADMIN')) {
    navLinks.push({ name: "Admin", icon: Shield, path: `/${orgSlug}/admin` });
  }

  return (
    <div className="flex h-screen overflow-hidden font-sans pb-14 md:pb-0" style={{ background: 'var(--surface)' }}>
      {/* ─── LEFT SIDEBAR (Desktop) ─── */}
      <aside className="hidden md:flex flex-col border-r relative z-10" style={{
        width: 'var(--sidebar-width)',
        minWidth: 'var(--sidebar-width)',
        background: 'var(--surface-container-lowest)',
        borderColor: 'var(--outline-variant)',
      }}>
        {/* Org Branding */}
        <div className="px-5 pt-5 pb-5 border-b flex items-center justify-between" style={{ borderColor: 'var(--surface-container-high)' }}>
          <div className="flex items-center gap-3 w-full">
            <div className="w-9 h-9 rounded-lg flex items-center justify-center font-bold text-base shrink-0" style={{ background: 'var(--primary-container)', color: 'var(--on-primary-container)' }}>
              {currentOrg?.name?.charAt(0).toUpperCase() || "W"}
            </div>
            <div className="min-w-0 flex-1">
              <p className="font-bold text-sm truncate" style={{ color: 'var(--on-surface)' }}>
                {currentOrg?.name || "Loading..."}
              </p>
              <p className="label-caps truncate mt-0.5" style={{ color: 'var(--on-surface-variant)', fontSize: '0.625rem' }}>
                WORKSPACE
              </p>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <nav className="flex-1 overflow-y-auto custom-scrollbar px-3 py-4 space-y-1">
          {navLinks.map((link) => {
            let isActive = location.pathname.startsWith(link.path);
            if (link.name === "Boards" && location.pathname.includes("/p/")) {
              isActive = true;
            }
            const Icon = link.icon;
            return (
              <Link
                key={link.name}
                to={link.path}
                className={`nav-item ${isActive ? 'active' : ''}`}
              >
                <Icon className="w-5 h-5" />
                {link.name}
              </Link>
            );
          })}
        </nav>

        {/* Footer Actions */}
        <div className="px-3 pb-4 space-y-2 border-t pt-4" style={{ borderColor: 'var(--surface-container-high)' }}>
          <button onClick={handleRefresh} className="nav-item w-full" title="Refresh data">
            <RefreshCw className={`w-4 h-4 ${isRefreshing ? 'animate-spin-slow text-[var(--secondary)]' : ''}`} />
            <span className="text-sm">Refresh</span>
          </button>
          {currentOrg && (currentOrg.myRole === 'OWNER' || currentOrg.myRole === 'ADMIN') && (
            <Link to={`/${orgSlug}/admin?tab=users`} className="nav-item w-full">
              <UserPlus className="w-4 h-4" />
              <span className="text-sm">Invite Members</span>
            </Link>
          )}
        </div>
      </aside>

      {/* ─── MAIN AREA ─── */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* ─── TOP HEADER BAR ─── */}
        <header className="flex items-center justify-between px-6 border-b shrink-0 relative z-20" style={{
          height: 'var(--header-height)',
          background: 'var(--surface-container-lowest)',
          borderColor: 'var(--outline-variant)',
        }}>
          {/* Left: Logo + Org Switcher */}
          <div className="flex items-center gap-4">
            <Link to="/" className="flex items-center gap-2 group">
              <img src={logoUrl} alt="WorkSphere" className="w-7 h-7 rounded-md group-hover:scale-105 transition-transform" />
              <span className="hidden sm:inline font-display font-extrabold text-lg tracking-tight" style={{ color: 'var(--on-surface)' }}>WorkSphere</span>
            </Link>

            {/* Org Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowOrgDropdown(!showOrgDropdown)}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium transition-colors hover:bg-[var(--surface-container-high)]"
                style={{ color: 'var(--on-surface-variant)' }}
              >
                {currentOrg?.name || "Select Org"} <ChevronDown className="w-3.5 h-3.5" />
              </button>

              {showOrgDropdown && (
                <>
                  <div className="fixed inset-0 z-40" onClick={() => setShowOrgDropdown(false)} />
                  <div className="absolute top-full left-0 mt-1 w-56 py-1 rounded-lg shadow-lg border z-50 animate-fade-in" style={{
                    background: 'var(--surface-container-lowest)',
                    borderColor: 'var(--outline-variant)',
                  }}>
                    {orgs.map(org => (
                      <button
                        key={org.id}
                        onClick={() => { navigate(`/${org.slug}/home`); setShowOrgDropdown(false); }}
                        className="w-full text-left px-4 py-2 text-sm hover:bg-[var(--surface-container-high)] transition-colors"
                        style={{ color: org.slug === orgSlug ? 'var(--secondary)' : 'var(--on-surface)', fontWeight: org.slug === orgSlug ? 600 : 400 }}
                      >
                        {org.name}
                      </button>
                    ))}
                    <div className="border-t my-1" style={{ borderColor: 'var(--outline-variant)' }} />
                    <Link
                      to="/"
                      onClick={() => setShowOrgDropdown(false)}
                      className="block px-4 py-2 text-sm font-medium transition-colors hover:bg-[var(--surface-container-high)]"
                      style={{ color: 'var(--secondary)' }}
                    >
                      View All Workspaces
                    </Link>
                  </div>
                </>
              )}
            </div>
          </div>

          {/* Center: Search */}
          <div className="flex-1 max-w-md mx-4 sm:mx-8 flex justify-end sm:justify-start">
            <div className="relative hidden sm:block w-full">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4" style={{ color: 'var(--outline)' }} />
              <input
                type="text"
                placeholder="Search projects..."
                readOnly
                className="input-field pl-9 pr-16 py-2 text-sm cursor-pointer w-full transition-shadow hover:shadow-sm"
                onClick={() => setShowSearch(true)}
              />
              <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 pointer-events-none">
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--outline-variant)', color: 'var(--outline)', background: 'var(--surface-container)' }}>⌘</kbd>
                <kbd className="px-1.5 py-0.5 rounded text-[10px] font-mono border" style={{ borderColor: 'var(--outline-variant)', color: 'var(--outline)', background: 'var(--surface-container)' }}>K</kbd>
              </div>
            </div>
            
            {/* Mobile Search Icon */}
            <button 
              className="sm:hidden p-2 rounded-lg transition-colors hover:bg-[var(--surface-container-high)]" 
              onClick={() => setShowSearch(true)}
              title="Search"
            >
              <Search className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
            </button>
          </div>

          {/* Right: Actions */}
          <div className="flex items-center gap-2 sm:gap-3">
            <button onClick={handleRefresh} className="md:hidden p-2 rounded-lg transition-colors hover:bg-[var(--surface-container-high)]" title="Refresh data">
              <RefreshCw className={`w-5 h-5 ${isRefreshing ? 'animate-spin-slow text-[var(--secondary)]' : ''}`} />
            </button>
             <button onClick={() => setIsDarkMode(!isDarkMode)} className="p-2 rounded-lg transition-colors hover:bg-[var(--surface-container-high)]" title="Toggle theme (Alt+T)">
              {isDarkMode ? (
                <Sun className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
              ) : (
                <Moon className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
              )}
            </button>

            <Link to={`/${orgSlug}/help`} className="hidden sm:flex p-2 rounded-lg transition-colors hover:bg-[var(--surface-container-high)]" title="Help">
              <HelpCircle className="w-5 h-5" style={{ color: 'var(--on-surface-variant)' }} />
            </Link>
            <UserButton
              afterSignOutUrl="/"
              appearance={{
                elements: {
                  userButtonAvatarBox: "w-8 h-8 rounded-full",
                }
              }}
            />
          </div>
        </header>

        {/* ─── CONTENT AREA ─── */}
        <main className="flex-1 overflow-y-auto custom-scrollbar" style={{ background: 'var(--surface)' }}>
          {currentOrg ? <Outlet context={{ orgId: currentOrg.id, currentOrg }} /> : <div className="p-8 text-center text-[var(--outline)]">Loading workspace...</div>}
        </main>
      </div>

      {/* ─── SEARCH MODAL ─── */}
      {showSearch && (
        <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-start justify-center z-50 pt-32" onClick={() => setShowSearch(false)}>
          <div className="glass-card-elevated w-full max-w-2xl overflow-hidden shadow-2xl animate-fade-in-up" onClick={(e) => e.stopPropagation()}>
            <div className="p-4 border-b flex items-center gap-3" style={{ borderColor: 'var(--surface-container-high)' }}>
              <Search className="w-5 h-5" style={{ color: 'var(--outline)' }} />
              <input 
                type="text" 
                autoFocus
                placeholder="Search for projects..." 
                className="flex-1 bg-transparent border-none focus:outline-none text-lg"
                style={{ color: 'var(--on-surface)' }}
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              <button onClick={() => setShowSearch(false)} className="p-1 rounded hover:bg-[var(--surface-container-high)]">
                <X className="w-5 h-5" style={{ color: 'var(--outline)' }} />
              </button>
            </div>
            
            <div className="max-h-96 overflow-y-auto p-2 custom-scrollbar">
              {!searchQuery.trim() ? (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--outline)' }}>
                  Type to start searching your workspace...
                </div>
              ) : isSearching ? (
                <div className="p-8 flex flex-col items-center justify-center text-[var(--outline)]">
                  <Loader2 className="w-6 h-6 animate-spin mb-2" />
                  <span className="text-sm">Searching...</span>
                </div>
              ) : searchResults.length > 0 ? (
                searchResults.map((res, i) => {
                  let Icon = LayoutGrid;
                  if (res.type === 'Task') Icon = CheckCircle2;
                  else if (res.type === 'Document') Icon = FileText;
                  else if (res.type === 'Message') Icon = MessageSquare;

                  return (
                    <Link 
                      key={i} 
                      to={res.link}
                      onClick={() => setShowSearch(false)}
                      className="flex items-center gap-3 px-4 py-3 rounded-lg hover:bg-[var(--surface-container-low)] transition-colors"
                    >
                      <div className="w-8 h-8 rounded bg-[var(--surface-container-high)] flex items-center justify-center">
                        <Icon className="w-4 h-4" style={{ color: 'var(--secondary)' }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="font-medium text-sm truncate" style={{ color: 'var(--on-surface)' }}>{res.title}</p>
                        <p className="text-xs" style={{ color: 'var(--outline)' }}>{res.type}</p>
                      </div>
                    </Link>
                  )
                })
              ) : (
                <div className="p-8 text-center text-sm" style={{ color: 'var(--outline)' }}>
                  No results found for "{searchQuery}"
                </div>
              )}
            </div>
            
            <div className="px-4 py-2 border-t text-xs flex justify-between" style={{ borderColor: 'var(--surface-container-high)', background: 'var(--surface-container-lowest)', color: 'var(--outline)' }}>
              <span>Use <kbd className="font-mono bg-[var(--surface-container)] px-1 py-0.5 rounded border border-[var(--outline-variant)]">↑</kbd> <kbd className="font-mono bg-[var(--surface-container)] px-1 py-0.5 rounded border border-[var(--outline-variant)]">↓</kbd> to navigate</span>
              <span><kbd className="font-mono bg-[var(--surface-container)] px-1 py-0.5 rounded border border-[var(--outline-variant)]">esc</kbd> to close</span>
            </div>
          </div>
        </div>
      )}


      {/* ─── BOTTOM NAVIGATION (Mobile) ─── */}
      <nav className="md:hidden fixed bottom-0 left-0 right-0 z-40 border-t flex items-center justify-around px-2 py-2 pb-safe" style={{
        background: 'var(--surface-container-lowest)',
        borderColor: 'var(--outline-variant)',
      }}>
        {navLinks.map((link) => {
          let isActive = location.pathname.startsWith(link.path);
          if (link.name === "Boards" && location.pathname.includes("/p/")) {
            isActive = true;
          }
          const Icon = link.icon;
          return (
            <Link
              key={link.name}
              to={link.path}
              className={`flex flex-col items-center justify-center p-2 rounded-lg min-w-[64px] ${isActive ? 'bg-[var(--primary-container)]' : ''}`}
            >
              <Icon className="w-5 h-5 mb-1" style={{ color: isActive ? 'var(--on-primary-container)' : 'var(--on-surface-variant)' }} />
              <span className="text-[10px] font-medium" style={{ color: isActive ? 'var(--on-primary-container)' : 'var(--on-surface-variant)' }}>{link.name}</span>
            </Link>
          );
        })}
      </nav>
    </div>
  );
}
