import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { ArrowRight, LayoutGrid, MessageSquare, FileText, Shield, Zap, Target, Moon, Sun } from "lucide-react";
import { useAuth } from "@clerk/clerk-react";
import logoUrl from "../assets/logo.png";

export default function LandingPage() {
  const { isSignedIn } = useAuth();
  
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

  return (
    <div className="min-h-screen bg-[var(--surface)] text-[var(--on-surface)] selection:bg-[var(--secondary)] selection:text-white">
      {/* ─── NAVIGATION ─── */}
      <nav className="fixed top-0 left-0 w-full z-50 glass-card rounded-none border-b border-[var(--surface-container-high)] px-8 py-4 flex items-center justify-between">
        <div className="flex items-center gap-3">
          <img src={logoUrl} alt="WorkSphere" className="w-8 h-8 rounded-lg shadow-sm" />
          <span className="font-display font-extrabold text-xl tracking-tight">WorkSphere</span>
        </div>
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
          {isSignedIn ? (
            <Link to="/" className="btn-primary">Go to Dashboard</Link>
          ) : (
            <>
              <Link to="/sign-in" className="text-sm font-semibold hover:text-[var(--secondary)] transition-colors">Sign In</Link>
              <Link to="/sign-up" className="btn-primary shadow-lg shadow-blue-500/20">Get Started</Link>
            </>
          )}
        </div>
      </nav>

      {/* ─── HERO SECTION ─── */}
      <section className="relative pt-32 pb-20 px-8 overflow-hidden">
        {/* Abstract Background */}
        <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none">
          <div className="absolute top-[-20%] left-[-10%] w-[50%] h-[50%] bg-[var(--primary)] rounded-full blur-[150px] opacity-20 animate-pulse-slow" />
          <div className="absolute top-[40%] right-[-10%] w-[40%] h-[60%] bg-[var(--secondary)] rounded-full blur-[150px] opacity-20" />
        </div>

        <div className="max-w-7xl mx-auto relative z-10 flex flex-col items-center text-center">
          <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full glass-card border border-[var(--outline-variant)] mb-8 animate-fade-in-up">
            <span className="w-2 h-2 rounded-full bg-[var(--secondary)] animate-pulse" />
            <span className="text-xs font-bold text-[var(--on-surface-variant)] uppercase tracking-wider">The Future of Work</span>
          </div>
          
          <h1 className="text-6xl md:text-8xl font-display font-extrabold tracking-tight leading-[1.1] mb-8 animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
            Unify your <span className="text-transparent bg-clip-text bg-gradient-to-r from-[var(--primary)] to-[var(--secondary)]">Workflow.</span>
          </h1>
          
          <p className="text-xl md:text-2xl text-[var(--on-surface-variant)] max-w-3xl mb-12 animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
            WorkSphere brings Kanban boards, real-time chat, and collaborative documents into one seamlessly integrated, lightning-fast platform.
          </p>
          
          <div className="flex items-center gap-4 animate-fade-in-up" style={{ animationDelay: '0.3s' }}>
            <Link to="/sign-up" className="btn-primary text-lg px-8 py-4 shadow-xl shadow-blue-500/25 flex items-center gap-2 group">
              Start for free <ArrowRight className="w-5 h-5 group-hover:translate-x-1 transition-transform" />
            </Link>
          </div>
        </div>

        {/* Dashboard Preview Mockup */}
        <div className="mt-20 max-w-6xl mx-auto animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
          <div className="rounded-2xl border border-[var(--surface-container-high)] bg-[var(--surface-container-lowest)] p-2 shadow-2xl relative">
            <div className="absolute inset-0 bg-gradient-to-t from-[var(--surface)] to-transparent z-10 rounded-2xl pointer-events-none" />
            <div className="rounded-xl overflow-hidden border border-[var(--surface-container-high)] bg-[var(--surface-container)] aspect-video relative">
              {/* Real Dashboard Mockup */}
              <div className="flex h-full bg-[var(--surface)]">
                {/* Mock Sidebar */}
                <div className="w-64 border-r border-[var(--outline-variant)] bg-[var(--surface-container-lowest)] p-4 hidden md:flex flex-col">
                  <div className="flex items-center gap-2 mb-8 px-2">
                    <div className="w-8 h-8 rounded-lg bg-[var(--primary)] flex items-center justify-center text-white font-bold">W</div>
                    <span className="font-bold text-[var(--on-surface)]">WorkSphere</span>
                  </div>
                  <div className="space-y-1">
                    {['Dashboard', 'Projects', 'Chat', 'Documents'].map((item, i) => (
                      <div key={i} className={`px-3 py-2 rounded-lg text-sm font-medium ${i === 1 ? 'bg-[var(--secondary-container)] text-[var(--on-secondary-container)]' : 'text-[var(--on-surface-variant)]'}`}>
                        {item}
                      </div>
                    ))}
                  </div>
                </div>
                
                {/* Mock Main Area (Kanban) */}
                <div className="flex-1 p-6 md:p-8 overflow-hidden bg-[var(--surface)] relative">
                  {/* Header */}
                  <div className="flex justify-between items-center mb-8">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-lg bg-[var(--primary-container)] flex items-center justify-center text-[var(--on-primary-container)] font-bold text-lg">W</div>
                      <div>
                        <h3 className="font-bold text-lg text-[var(--on-surface)]">Website Redesign</h3>
                        <p className="text-xs text-[var(--outline)]">8 active members</p>
                      </div>
                    </div>
                    <div className="hidden sm:flex items-center gap-2">
                      <div className="flex -space-x-2">
                        {['J', 'A', 'S'].map((initial, idx) => (
                          <div key={idx} className="w-8 h-8 rounded-full border-2 border-[var(--surface)] bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] flex items-center justify-center text-white text-xs font-bold">{initial}</div>
                        ))}
                      </div>
                      <button className="px-3 py-1.5 rounded-lg bg-[var(--primary)] text-white text-sm font-semibold shadow-md ml-2">Share</button>
                    </div>
                  </div>

                  {/* Kanban Columns */}
                  <div className="flex gap-4 sm:gap-6 h-full min-h-[300px]">
                    {/* To Do */}
                    <div className="flex-1 min-w-[200px] bg-[var(--surface-container-lowest)] border border-[var(--outline-variant)] rounded-xl p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm uppercase tracking-wide text-[var(--on-surface)]">To Do</h4>
                        <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-xs px-2 py-0.5 rounded-full font-bold">2</span>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-[var(--surface)] border border-[var(--outline-variant)] p-3 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-sm text-[var(--on-surface)] leading-tight mb-2">Design landing page mockups</h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--error)]/10 text-[var(--error)]">High</span>
                        </div>
                        <div className="bg-[var(--surface)] border border-[var(--outline-variant)] p-3 rounded-lg shadow-sm">
                           <h5 className="font-semibold text-sm text-[var(--on-surface)] leading-tight mb-2">Write hero copy</h5>
                           <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--warning)]/10 text-[var(--warning)]">Medium</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* In Progress */}
                    <div className="flex-1 min-w-[200px] bg-[var(--surface-container-low)] border border-[var(--outline-variant)] rounded-xl p-4 flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm uppercase tracking-wide text-[var(--on-surface)]">In Progress</h4>
                        <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-xs px-2 py-0.5 rounded-full font-bold">1</span>
                      </div>
                      <div className="space-y-3">
                        <div className="bg-[var(--surface)] border border-[var(--outline-variant)] p-3 rounded-lg shadow-md border-l-4 border-l-[var(--primary)]">
                          <h5 className="font-semibold text-sm text-[var(--on-surface)] leading-tight mb-2">Implement Global Search API</h5>
                          <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-[var(--error)]/10 text-[var(--error)]">High</span>
                        </div>
                      </div>
                    </div>
                    
                    {/* Done */}
                    <div className="flex-1 min-w-[200px] bg-[var(--surface-container)] border border-[var(--outline-variant)] rounded-xl p-4 hidden lg:flex flex-col">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold text-sm uppercase tracking-wide text-[var(--on-surface)]">Done</h4>
                        <span className="bg-[var(--surface-container-high)] text-[var(--on-surface-variant)] text-xs px-2 py-0.5 rounded-full font-bold">1</span>
                      </div>
                      <div className="space-y-3 opacity-60">
                        <div className="bg-[var(--surface)] border border-[var(--outline-variant)] p-3 rounded-lg shadow-sm">
                          <h5 className="font-semibold text-sm text-[var(--on-surface)] leading-tight line-through">Setup PostgreSQL DB</h5>
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FEATURES GRID ─── */}
      <section className="py-24 px-8 bg-[var(--surface-container-lowest)] relative z-20">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-4">Everything you need to ship faster.</h2>
            <p className="text-lg text-[var(--on-surface-variant)]">No context switching. Just deep work.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="glass-card-elevated p-8 group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mb-6 text-blue-500 group-hover:scale-110 transition-transform">
                <LayoutGrid className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Kanban Boards</h3>
              <p className="text-[var(--on-surface-variant)] leading-relaxed">
                Visualize your workflow with highly customizable boards. Drag and drop tasks, assign team members, and track progress effortlessly.
              </p>
            </div>

            <div className="glass-card-elevated p-8 group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-purple-500/10 flex items-center justify-center mb-6 text-purple-500 group-hover:scale-110 transition-transform">
                <MessageSquare className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Real-time Chat</h3>
              <p className="text-[var(--on-surface-variant)] leading-relaxed">
                Project-scoped channels ensure conversations stay relevant. Instantly discuss tasks and share updates without leaving the workspace.
              </p>
            </div>

            <div className="glass-card-elevated p-8 group hover:-translate-y-2 transition-transform duration-300">
              <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center mb-6 text-emerald-500 group-hover:scale-110 transition-transform">
                <FileText className="w-7 h-7" />
              </div>
              <h3 className="text-xl font-bold mb-3">Collaborative Docs</h3>
              <p className="text-[var(--on-surface-variant)] leading-relaxed">
                Create beautiful product specs and technical documentation with a rich markdown editor, version history, and real-time syncing.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* ─── HIGHLIGHTS ─── */}
      <section className="py-24 px-8 border-t border-[var(--surface-container-high)]">
        <div className="max-w-7xl mx-auto">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-16 items-center">
            <div>
              <h2 className="text-3xl md:text-5xl font-display font-extrabold mb-6">Designed for speed & security.</h2>
              <div className="space-y-6">
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-container-high)] flex items-center justify-center shrink-0">
                    <Zap className="w-6 h-6 text-yellow-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Lightning Fast</h4>
                    <p className="text-[var(--on-surface-variant)]">Optimized database queries ensure instant load times even with thousands of tasks.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-container-high)] flex items-center justify-center shrink-0">
                    <Shield className="w-6 h-6 text-green-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Enterprise Security</h4>
                    <p className="text-[var(--on-surface-variant)]">Clerk authentication and highly strict Row Level Security (RLS) policies protect your data.</p>
                  </div>
                </div>
                <div className="flex gap-4">
                  <div className="w-12 h-12 rounded-xl bg-[var(--surface-container-high)] flex items-center justify-center shrink-0">
                    <Target className="w-6 h-6 text-blue-500" />
                  </div>
                  <div>
                    <h4 className="font-bold text-lg mb-1">Zero Clutter</h4>
                    <p className="text-[var(--on-surface-variant)]">Our 'Atmospheric Azure' design system ensures high contrast, legibility, and reduced eye strain.</p>
                  </div>
                </div>
              </div>
            </div>
            <div className="relative aspect-square">
              <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)] to-[var(--secondary)] rounded-full blur-[100px] opacity-30 animate-pulse-slow" />
              <div className="absolute inset-8 glass-card-elevated border border-white/10 rounded-2xl flex flex-col justify-center p-8 overflow-hidden">
                 <div className="space-y-4 flex flex-col h-full justify-end pb-4">
                   <div className="self-start bg-[var(--surface)] border border-[var(--outline-variant)] rounded-2xl rounded-tl-sm p-4 shadow-md max-w-[85%] animate-fade-in-up">
                     <p className="text-sm font-medium text-[var(--on-surface)]">Hey team, the new search API is deployed! 🚀</p>
                     <span className="text-[10px] text-[var(--outline)] mt-2 block">10:42 AM</span>
                   </div>
                   <div className="self-end bg-[var(--primary)] text-white rounded-2xl rounded-tr-sm p-4 shadow-lg max-w-[85%] animate-fade-in-up" style={{ animationDelay: '0.2s' }}>
                     <p className="text-sm font-medium">Awesome work! The latency dropped by 60%.</p>
                     <span className="text-[10px] text-white/70 mt-2 block text-right">10:45 AM</span>
                   </div>
                   <div className="self-start bg-[var(--surface)] border border-[var(--outline-variant)] rounded-2xl rounded-tl-sm p-4 shadow-md max-w-[85%] animate-fade-in-up" style={{ animationDelay: '0.4s' }}>
                     <p className="text-sm font-medium text-[var(--on-surface)]">I'll update the Kanban board to mark that task as Done.</p>
                     <span className="text-[10px] text-[var(--outline)] mt-2 block">10:46 AM</span>
                   </div>
                 </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ─── FOOTER ─── */}
      <footer className="border-t border-[var(--surface-container-high)] py-12 px-8 bg-[var(--surface-container-lowest)] text-center">
        <div className="flex items-center justify-center gap-3 mb-6">
          <img src={logoUrl} alt="WorkSphere" className="w-6 h-6 rounded grayscale opacity-50" />
          <span className="font-display font-bold text-lg text-[var(--on-surface-variant)]">WorkSphere</span>
        </div>
        <p className="text-sm text-[var(--outline)]">
          © {new Date().getFullYear()} WorkSphere. Built with passion. 100% Free to Use.
        </p>
      </footer>
    </div>
  );
}
