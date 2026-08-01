import { createContext, useCallback, useContext, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

const ToastContext = createContext(null);

const AUTO_DISMISS_MS = 3500;

/** Tiny toast system for the Kamdhenu portal — mount once (KamdhenuLayout),
 *  then `const toast = useKamdhenuToast(); toast.success('Saved')`. */
export function KamdhenuToastProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const idRef = useRef(0);

  const push = useCallback((kind, message) => {
    idRef.current += 1;
    const id = idRef.current;
    setToasts((list) => [...list, { id, kind, message }]);
    setTimeout(() => {
      setToasts((list) => list.filter((t) => t.id !== id));
    }, AUTO_DISMISS_MS);
  }, []);

  const toast = useMemo(
    () => ({
      success: (message) => push('success', message),
      error: (message) => push('error', message),
    }),
    [push]
  );

  return (
    <ToastContext.Provider value={toast}>
      {children}
      {createPortal(
        <div className="kerp-toasts" aria-live="polite">
          {toasts.map((t) => (
            <div key={t.id} className={`kerp-toast kerp-toast--${t.kind}`}>
              {t.message}
            </div>
          ))}
        </div>,
        document.body
      )}
    </ToastContext.Provider>
  );
}

export function useKamdhenuToast() {
  const toast = useContext(ToastContext);
  if (!toast) throw new Error('useKamdhenuToast must be used inside <KamdhenuToastProvider>');
  return toast;
}
