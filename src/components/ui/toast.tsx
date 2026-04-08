"use client";

import { useEffect, useState, useCallback, createContext, useContext } from "react";
import { CheckCircle2, AlertCircle, X } from "lucide-react";

type ToastVariant = "success" | "error" | "info";

type Toast = {
  id: string;
  message: string;
  variant: ToastVariant;
};

type ToastContextType = {
  toast: (message: string, variant?: ToastVariant) => void;
};

const ToastContext = createContext<ToastContextType>({
  toast: () => {},
});

export function useToast() {
  return useContext(ToastContext);
}

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<Toast[]>([]);

  const addToast = useCallback((message: string, variant: ToastVariant = "success") => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    setToasts((prev) => [...prev, { id, message, variant }]);
  }, []);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  return (
    <ToastContext.Provider value={{ toast: addToast }}>
      {children}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2">
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

  useEffect(() => {
    const showTimer = setTimeout(() => setVisible(true), 10);
    const hideTimer = setTimeout(() => {
      setVisible(false);
      setTimeout(() => onDismiss(toast.id), 300);
    }, 3500);

    return () => {
      clearTimeout(showTimer);
      clearTimeout(hideTimer);
    };
  }, [toast.id, onDismiss]);

  const Icon = toast.variant === "error" ? AlertCircle : CheckCircle2;

  const variantStyles =
    toast.variant === "error"
      ? "border-[rgba(255,122,116,0.18)] bg-[rgba(255,122,116,0.12)] text-[#ffb4ad]"
      : toast.variant === "info"
        ? "border-gray-200 dark:border-gray-800 bg-gray-50 dark:bg-[rgba(255,255,255,0.06)] text-gray-900 dark:text-white"
        : "border-[var(--accent)]/20 bg-[var(--accent)]/10 text-[var(--accent)]";

  return (
    <div
      className={`flex items-center gap-2.5 rounded-xl border px-4 py-3 text-sm shadow-[0_24px_44px_rgba(0,0,0,0.36)] backdrop-blur-[22px] transition-all duration-300 ${variantStyles} ${
        visible
          ? "translate-y-0 opacity-100"
          : "translate-y-2 opacity-0"
      }`}
    >
      <Icon className="h-4 w-4 shrink-0" />
      <span className="flex-1">{toast.message}</span>
      <button
        onClick={() => {
          setVisible(false);
          setTimeout(() => onDismiss(toast.id), 300);
        }}
        aria-label="Fechar notificação"
        className="shrink-0 rounded p-0.5 transition-colors hover:bg-gray-100 dark:hover:bg-white/8"
      >
        <X className="h-3 w-3" />
      </button>
    </div>
  );
}
