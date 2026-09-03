import React, { createContext, useContext, useState, useCallback } from 'react';

export type ToastType = 'success' | 'error' | 'info' | 'warning';

export interface Toast {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface NotificationContextType {
  toasts: Toast[];
  showToast: (toast: Omit<Toast, 'id'>) => void;
  removeToast: (id: string) => void;
}

const NotificationContext = createContext<NotificationContextType | undefined>(undefined);

export function NotificationProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts(prev => prev.filter(t => t.id !== id));
  }, []);

  const showToast = useCallback(({ type, title, message, duration = 4000 }: Omit<Toast, 'id'>) => {
    const id = 'toast_' + Math.random().toString(36).substring(2, 9);
    setToasts(prev => [...prev, { id, type, title, message, duration }]);

    if (duration > 0) {
      setTimeout(() => {
        removeToast(id);
      }, duration);
    }
  }, [removeToast]);

  return (
    <NotificationContext.Provider value={{ toasts, showToast, removeToast }}>
      {children}
      {/* Toast Render Overlay */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none max-w-sm w-full">
        {toasts.map(toast => {
          const bgMap = {
            success: 'bg-emerald-950/95 border-emerald-500/30 text-emerald-100',
            error: 'bg-rose-950/95 border-rose-500/30 text-rose-100',
            warning: 'bg-amber-950/95 border-amber-500/30 text-amber-100',
            info: 'bg-[#0e0e0e]/95 border-white/10 text-zinc-100',
          };

          return (
            <div
              key={toast.id}
              className={`pointer-events-auto p-4 rounded-xl border shadow-xl backdrop-blur-md transition-all duration-200 transform translate-y-0 ${bgMap[toast.type]}`}
            >
              <div className="flex items-start justify-between gap-2">
                <div>
                  <h4 className="font-semibold text-sm">{toast.title}</h4>
                  {toast.message && <p className="text-xs opacity-90 mt-0.5">{toast.message}</p>}
                </div>
                <button
                  onClick={() => removeToast(toast.id)}
                  className="text-xs opacity-60 hover:opacity-100 transition-opacity p-0.5"
                >
                  ✕
                </button>
              </div>
            </div>
          );
        })}
      </div>
    </NotificationContext.Provider>
  );
}

export function useNotification() {
  const context = useContext(NotificationContext);
  if (!context) {
    throw new Error('useNotification must be used within a NotificationProvider');
  }
  return context;
}
