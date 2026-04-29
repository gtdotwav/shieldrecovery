"use client";

import { useEffect, useState, useCallback, useRef, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, Info, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
  /** Override default close timing in ms. Set to 0 to disable auto-close. */
  duration?: number;
};

type ToastContextType = {
  toast: (
    message: string,
    variant?: ToastVariant,
    options?: { duration?: number },
  ) => void;
};

const DEFAULT_DURATIONS: Record<ToastVariant, number> = {
  success: 5_000,
  info: 5_000,
  error: 8_000,
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback<ToastContextType["toast"]>(
    (message, variant = "success", options) => {
      const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      setToasts((prev) => [...prev, { id, message, variant, duration: options?.duration }]);
    },
    [],
  );

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div
        className="fixed bottom-5 right-5 z-50 flex flex-col gap-2 pointer-events-none"
        aria-live="polite"
        aria-atomic="false"
      >
        {toasts.map((t) => (
          <ToastItem key={t.id} toast={t} onDismiss={removeToast} />
        ))}
      </div>
    </ToastContext.Provider>
  );
}

function ToastItem({
  toast,
  onDismiss,
}: {
  toast: Toast;
  onDismiss: (id: string) => void;
}) {
  const [visible, setVisible] = useState(false);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const remainingRef = useRef<number>(toast.duration ?? DEFAULT_DURATIONS[toast.variant]);
  const startRef = useRef<number>(0);

  const beginDismiss = useCallback(() => {
    setVisible(false);
    setTimeout(() => onDismiss(toast.id), 300);
  }, [toast.id, onDismiss]);

  const scheduleAutoClose = useCallback(() => {
    if (remainingRef.current <= 0) return;
    startRef.current = Date.now();
    timerRef.current = setTimeout(beginDismiss, remainingRef.current);
  }, [beginDismiss]);

  const pauseAutoClose = useCallback(() => {
    if (!timerRef.current) return;
    clearTimeout(timerRef.current);
    timerRef.current = null;
    const elapsed = Date.now() - startRef.current;
    remainingRef.current = Math.max(0, remainingRef.current - elapsed);
  }, []);

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    scheduleAutoClose();
    return () => {
      clearTimeout(showTimer);
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, [scheduleAutoClose]);

  const Icon =
    toast.variant === "error" ? AlertCircle : toast.variant === "info" ? Info : CheckCircle2;

  const variantStyles =
    toast.variant === "error"
      ? "border-[rgba(255,122,116,0.32)] bg-[rgba(255,122,116,0.16)] text-[#ffb4ad]"
      : toast.variant === "info"
        ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[rgba(255,255,255,0.06)] text-gray-900 dark:text-white"
        : "border-[var(--accent)]/30 bg-[var(--accent)]/10 text-[var(--accent)]";

  return (
    <div
      role={toast.variant === "error" ? "alert" : "status"}
      aria-live={toast.variant === "error" ? "assertive" : "polite"}
      onMouseEnter={pauseAutoClose}
      onMouseLeave={scheduleAutoClose}
      onFocus={pauseAutoClose}
      onBlur={scheduleAutoClose}
      tabIndex={0}
      className={`pointer-events-auto flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-[0_24px_44px_rgba(0,0,0,0.36)] backdrop-blur-[22px] transition-all duration-300 ${variantStyles} ${
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={beginDismiss}
        aria-label="Fechar notificação"
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/8"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
