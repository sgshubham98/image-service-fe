import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

const TOAST_AUTO_DISMISS_MS = 2000;

export interface ToastData {
  id: string;
  message: string;
  detail?: string;
  action?: { label: string; onClick: () => void };
  variant?: "info" | "success" | "warning";
  duration?: number;
}

interface Props {
  toasts: ToastData[];
  onDismiss: (id: string) => void;
  theme: "dark" | "light";
}

function ToastItem({
  toast,
  onDismiss,
  theme,
}: {
  toast: ToastData;
  onDismiss: () => void;
  theme: "dark" | "light";
}) {
  const isLight = theme === "light";
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    requestAnimationFrame(() => setVisible(true));
    const timer = setTimeout(() => {
      setVisible(false);
      setTimeout(onDismiss, 200);
    }, TOAST_AUTO_DISMISS_MS);
    return () => clearTimeout(timer);
  }, [onDismiss]);

  const iconColor =
    toast.variant === "success"
      ? "text-emerald-400"
      : toast.variant === "warning"
        ? "text-amber-400"
        : isLight
          ? "text-[#2D3142]"
          : "text-violet-400";

  return (
    <div
      className={cn(
        "pointer-events-auto w-full max-w-sm rounded-xl border p-4 shadow-xl backdrop-blur transition-all duration-200",
        visible ? "translate-y-0 opacity-100" : "translate-y-2 opacity-0",
        isLight
          ? "bg-white/95 border-[#cfc7ff] shadow-violet-200/30"
          : "bg-zinc-900/95 border-zinc-700/60 shadow-black/40"
      )}
    >
      <div className="flex items-start gap-3">
        <div className={cn("mt-0.5 shrink-0", iconColor)}>
          {toast.variant === "success" ? (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M9 12.75L11.25 15 15 9.75M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
          ) : (
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M11.25 11.25l.041-.02a.75.75 0 011.063.852l-.708 2.836a.75.75 0 001.063.853l.041-.021M21 12a9 9 0 11-18 0 9 9 0 0118 0zm-9-3.75h.008v.008H12V8.25z" />
            </svg>
          )}
        </div>
        <div className="flex-1 min-w-0">
          <p className={cn("text-sm font-medium", isLight ? "text-zinc-900" : "text-zinc-100")}>
            {toast.message}
          </p>
          {toast.detail && (
            <p className={cn("text-xs mt-0.5", isLight ? "text-zinc-600" : "text-zinc-400")}>
              {toast.detail}
            </p>
          )}
          {toast.action && (
            <button
              onClick={toast.action.onClick}
              className={cn(
                "mt-2 text-xs font-semibold transition-colors cursor-pointer",
                isLight ? "text-[#2D3142] hover:text-[#3d4155]" : "text-violet-400 hover:text-violet-300"
              )}
            >
              {toast.action.label} →
            </button>
          )}
        </div>
        <button
          onClick={() => {
            setVisible(false);
            setTimeout(onDismiss, 200);
          }}
          className={cn(
            "shrink-0 mt-0.5 transition-colors cursor-pointer",
            isLight ? "text-zinc-400 hover:text-zinc-700" : "text-zinc-500 hover:text-zinc-300"
          )}
        >
          <svg className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
          </svg>
        </button>
      </div>
    </div>
  );
}

export function ToastContainer({ toasts, onDismiss, theme }: Props) {
  if (toasts.length === 0) return null;

  return createPortal(
    <div className="fixed top-20 right-4 z-[9998] flex flex-col gap-2 pointer-events-none">
      {toasts.map((toast) => (
        <ToastItem
          key={toast.id}
          toast={toast}
          onDismiss={() => onDismiss(toast.id)}
          theme={theme}
        />
      ))}
    </div>,
    document.body
  );
}
