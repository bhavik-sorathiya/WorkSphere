/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertCircle, Info, X } from 'lucide-react';

const ToastContext = createContext(null);

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) throw new Error("useToast must be used within a ToastProvider");
  return context;
};

export const ToastProvider = ({ children }) => {
  const [toasts, setToasts] = useState([]);

  const showToast = useCallback((message, type = 'success', duration = 3000) => {
    const id = Date.now().toString();
    setToasts(prev => [...prev, { id, message, type, isLeaving: false }]);

    setTimeout(() => {
      setToasts(prev => prev.map(t => t.id === id ? { ...t, isLeaving: true } : t));
      setTimeout(() => {
        setToasts(prev => prev.filter(t => t.id !== id));
      }, 300); // Wait for leave animation
    }, duration);
  }, []);

  const removeToast = (id) => {
    setToasts(prev => prev.map(t => t.id === id ? { ...t, isLeaving: true } : t));
    setTimeout(() => {
      setToasts(prev => prev.filter(t => t.id !== id));
    }, 300);
  };

  return (
    <ToastContext.Provider value={{ showToast }}>
      {children}
      {/* Toast Container */}
      <div className="fixed bottom-4 right-4 z-[99999] flex flex-col gap-2 pointer-events-none">
        {toasts.map(toast => {
          const isError = toast.type === 'error';
          const Icon = isError ? AlertCircle : (toast.type === 'info' ? Info : CheckCircle2);
          const iconColor = isError ? 'var(--error)' : (toast.type === 'info' ? 'var(--secondary)' : 'var(--success)');
          
          return (
            <div 
              key={toast.id}
              className={`pointer-events-auto glass-card-elevated px-4 py-3 min-w-[280px] max-w-sm flex items-start gap-3 shadow-xl ${toast.isLeaving ? 'animate-toast-leave' : 'animate-toast-enter'}`}
            >
              <Icon className="w-5 h-5 shrink-0 mt-0.5" style={{ color: iconColor }} />
              <p className="text-sm font-medium flex-1 pt-0.5" style={{ color: 'var(--on-surface)' }}>
                {toast.message}
              </p>
              <button onClick={() => removeToast(toast.id)} className="p-1 -mr-2 -mt-1 rounded-md hover:bg-[var(--surface-container)] transition-colors">
                <X className="w-4 h-4" style={{ color: 'var(--outline)' }} />
              </button>
            </div>
          );
        })}
      </div>
    </ToastContext.Provider>
  );
};
