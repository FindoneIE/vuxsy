"use client";

import * as React from "react";

export type ToastType = "success" | "error" | "info";

type Toast = {
  id: string;
  title: string;
  message: string;
  type: ToastType;
  closing?: boolean;
};

type ToastContextValue = {
  addToast: (toast: Omit<Toast, "id" | "closing"> & { duration?: number }) => void;
};

const ToastContext = React.createContext<ToastContextValue | undefined>(undefined);

const createToastId = () =>
  typeof crypto !== "undefined" && "randomUUID" in crypto
    ? crypto.randomUUID()
    : `toast-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = React.useState<Toast[]>([]);

  const closeToast = React.useCallback((toastId: string) => {
    setToasts((prev) =>
      prev.map((toast) =>
        toast.id === toastId ? { ...toast, closing: true } : toast
      )
    );
    window.setTimeout(() => {
      setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
    }, 150);
  }, []);

  const addToast = React.useCallback<ToastContextValue["addToast"]>(
    ({ title, message, type, duration }) => {
      const toastId = createToastId();
      const timeoutMs = duration ?? (type === "error" ? 4500 : 2500);
      setToasts((prev) => [
        ...prev,
        {
          id: toastId,
          title,
          message,
          type,
        },
      ]);
      window.setTimeout(() => {
        setToasts((prev) =>
          prev.map((toast) =>
            toast.id === toastId ? { ...toast, closing: true } : toast
          )
        );
      }, Math.max(timeoutMs - 300, 0));
      window.setTimeout(() => {
        setToasts((prev) => prev.filter((toast) => toast.id !== toastId));
      }, timeoutMs);
    },
    []
  );

  const value = React.useMemo(() => ({ addToast }), [addToast]);

  return (
    <ToastContext.Provider value={value}>
      {children}
      {toasts.length > 0 ? (
        <div className="fixed bottom-6 right-6 z-50 flex w-[92%] max-w-[320px] flex-col gap-2">
          {toasts.map((toast) => {
            const isError = toast.type === "error";
            const isSuccess = toast.type === "success";
            const iconStyles = isError
              ? "bg-rose-200 text-rose-900"
              : isSuccess
              ? "bg-emerald-100 text-emerald-700"
              : "bg-sky-100 text-sky-700";
            const icon = isError ? "❌" : isSuccess ? "✔" : "i";
            const toastStyles = isError
              ? "border-rose-300 bg-rose-50 text-rose-800"
              : "border-slate-200 bg-white text-slate-700";
            const titleStyles = isError ? "text-rose-900" : "text-slate-900";
            const messageStyles = isError ? "text-rose-700" : "text-slate-600";

            return (
              <div
                key={toast.id}
                className={`rounded-lg border px-4 py-3 text-sm shadow-[0_8px_20px_rgba(0,0,0,0.15)] transition-all duration-200 ease-out ${toastStyles} ${
                  toast.closing ? "opacity-0 translate-y-2" : "opacity-100 translate-y-0"
                }`}
                aria-live={toast.type === "error" ? "assertive" : "polite"}
              >
                <div className="flex items-start gap-3">
                  <div
                    className={`flex h-6 w-6 items-center justify-center rounded-full text-xs ${iconStyles}`}
                  >
                    {icon}
                  </div>
                  <div className="flex-1 text-left">
                    <p className={`text-sm font-semibold ${titleStyles}`}>{toast.title}</p>
                    <p className={`text-xs ${messageStyles}`}>{toast.message}</p>
                  </div>
                  <button
                    type="button"
                    className="text-slate-400 hover:text-slate-600 transition"
                    onClick={() => closeToast(toast.id)}
                    aria-label="Dismiss notification"
                  >
                    ✕
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      ) : null}
    </ToastContext.Provider>
  );
}

export function useToast() {
  const context = React.useContext(ToastContext);
  if (!context) {
    throw new Error("useToast must be used within ToastProvider");
  }
  return context;
}
