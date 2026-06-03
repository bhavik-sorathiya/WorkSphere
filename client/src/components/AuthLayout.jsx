import { Link } from "react-router-dom";
import logoUrl from "../assets/logo.png";

export default function AuthLayout({ children }) {
  return (
    <div className="min-h-screen flex flex-col relative overflow-hidden" style={{ background: 'var(--surface)' }}>
      {/* Background Decor */}
      <div className="absolute top-0 left-0 w-full h-full overflow-hidden pointer-events-none z-0">
        <div className="absolute -top-[20%] -left-[10%] w-[50%] h-[50%] rounded-full blur-[120px] opacity-20 animate-pulse-slow" style={{ background: 'var(--primary)' }} />
        <div className="absolute top-[60%] -right-[10%] w-[40%] h-[60%] rounded-full blur-[100px] opacity-10" style={{ background: 'var(--secondary)' }} />
      </div>

      {/* Header */}
      <header className="relative z-10 border-b px-8 py-4 flex items-center justify-between glass-card rounded-none" style={{ borderColor: 'var(--surface-container-high)' }}>
        <Link to="/" className="flex items-center gap-3 group">
          <img src={logoUrl} alt="WorkSphere" className="w-8 h-8 rounded-lg shadow-sm group-hover:scale-105 transition-transform" />
          <span className="font-display font-bold text-xl tracking-tight" style={{ color: 'var(--on-surface)' }}>WorkSphere</span>
        </Link>
        <Link to="/" className="text-sm font-medium hover:text-[var(--primary)] transition-colors" style={{ color: 'var(--on-surface-variant)' }}>
          Back to Home
        </Link>
      </header>

      {/* Main Content */}
      <main className="flex-1 relative z-10 flex flex-col items-center justify-center p-8">
        <div className="mb-8 text-center animate-fade-in-up">
          <h1 className="font-display font-extrabold text-4xl mb-2" style={{ color: 'var(--on-surface)' }}>Welcome to WorkSphere</h1>
          <p className="text-base" style={{ color: 'var(--on-surface-variant)' }}>Enter your details to access your workspaces.</p>
        </div>
        <div className="w-full max-w-md animate-fade-in-up" style={{ animationDelay: '0.1s' }}>
          {children}
        </div>
      </main>

      {/* Footer */}
      <footer className="relative z-10 py-6 text-center border-t" style={{ borderColor: 'var(--surface-container-high)' }}>
        <p className="text-xs font-medium" style={{ color: 'var(--outline)' }}>
          © {new Date().getFullYear()} WorkSphere. All rights reserved.
        </p>
      </footer>
    </div>
  );
}
