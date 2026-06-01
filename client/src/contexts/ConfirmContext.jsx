/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState, useCallback } from 'react';
import { AlertTriangle, X } from 'lucide-react';

const ConfirmContext = createContext(null);

export const useConfirm = () => {
  const context = useContext(ConfirmContext);
  if (!context) throw new Error("useConfirm must be used within a ConfirmProvider");
  return context;
};

export const ConfirmProvider = ({ children }) => {
  const [modalState, setModalState] = useState({
    isOpen: false,
    message: "",
    onConfirm: null,
    onCancel: null
  });

  const confirm = useCallback((message) => {
    return new Promise((resolve) => {
      setModalState({
        isOpen: true,
        message,
        onConfirm: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(true);
        },
        onCancel: () => {
          setModalState(prev => ({ ...prev, isOpen: false }));
          resolve(false);
        }
      });
    });
  }, []);

  return (
    <ConfirmContext.Provider value={confirm}>
      {children}
      {modalState.isOpen && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-[99999] flex items-center justify-center p-4 animate-fade-in" onClick={modalState.onCancel}>
          <div className="glass-card-elevated max-w-sm w-full p-6 relative animate-fade-in-up" onClick={e => e.stopPropagation()}>
            <button onClick={modalState.onCancel} className="absolute top-4 right-4 text-[var(--outline)] hover:bg-[var(--surface-container)] p-1 rounded-md transition-colors">
              <X className="w-5 h-5" />
            </button>
            <div className="flex flex-col items-center text-center">
              <div className="w-12 h-12 rounded-full bg-red-500/10 flex items-center justify-center mb-4">
                <AlertTriangle className="w-6 h-6 text-[var(--error)]" />
              </div>
              <h3 className="text-lg font-bold text-[var(--on-surface)] mb-2">Are you sure?</h3>
              <p className="text-sm text-[var(--on-surface-variant)] mb-6">
                {modalState.message}
              </p>
              <div className="flex gap-3 w-full">
                <button 
                  onClick={modalState.onCancel} 
                  className="flex-1 py-2 rounded-lg font-medium bg-[var(--surface-container-high)] text-[var(--on-surface)] hover:bg-[var(--surface-container-highest)] transition-colors"
                >
                  Cancel
                </button>
                <button 
                  onClick={modalState.onConfirm} 
                  className="flex-1 py-2 rounded-lg font-medium bg-[var(--error)] text-white hover:brightness-110 transition-colors shadow-lg shadow-red-500/20"
                >
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </ConfirmContext.Provider>
  );
};
