import { createContext, useCallback, useContext, useMemo, useState } from 'react';
import { Icon } from '../components/ui/Icon';

const ToastContext = createContext(null);

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);

  const dismiss = useCallback((id) => {
    setToasts((prev) => prev.filter((item) => item.id !== id));
  }, []);

  const push = useCallback(
    (toast) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
      setToasts((prev) => [...prev, { id, ...toast }]);
      window.setTimeout(() => dismiss(id), toast.duration || 3500);
      return id;
    },
    [dismiss]
  );

  const value = useMemo(
    () => ({
      success: (message) => push({ message, tone: 'success' }),
      error: (message) => push({ message, tone: 'error' }),
      info: (message) => push({ message, tone: 'info' }),
      dismiss,
    }),
    [push, dismiss]
  );

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="fixed bottom-6 right-6 z-[120] flex flex-col gap-3 w-full max-w-sm pointer-events-none">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`pointer-events-auto rounded-2xl px-4 py-3 shadow-2xl shadow-on-surface/10 flex items-start gap-3 border ${
              toast.tone === 'success'
                ? 'bg-surface-container-lowest border-primary text-on-surface'
                : toast.tone === 'error'
                  ? 'bg-surface-container-lowest border-error/20 text-on-surface'
                  : 'bg-surface-container-lowest border-primary/20 text-on-surface'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-full flex items-center justify-center shrink-0 ${
                toast.tone === 'success'
                  ? 'bg-primary text-on-primary'
                  : toast.tone === 'error'
                    ? 'bg-error/10 text-error'
                    : 'bg-primary/20 text-on-surface'
              }`}
            >
              <Icon
                name={
                  toast.tone === 'success'
                    ? 'check_circle'
                    : toast.tone === 'error'
                      ? 'error'
                      : 'info'
                }
              />
            </div>
            <p className="text-sm font-medium flex-1 pt-1.5">{toast.message}</p>
            <button
              type="button"
              className="p-1 rounded-full text-on-surface-variant hover:bg-surface-container-low"
              onClick={() => dismiss(toast.id)}
            >
              <Icon name="close" className="text-sm" />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastContext);
  if (!ctx) {
    throw new Error('useToast must be used within ToastProvider');
  }
  return ctx;
}
