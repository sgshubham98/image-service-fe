import { createPortal } from "react-dom";
import { cn } from "../utils/cn";

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  cancelLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  theme: "dark" | "light";
  variant?: "danger" | "default";
}

export function ConfirmModal({
  open,
  title,
  message,
  confirmLabel = "Confirm",
  cancelLabel = "Cancel",
  onConfirm,
  onCancel,
  theme,
  variant = "default",
}: Props) {
  if (!open) return null;
  const isLight = theme === "light";
  const isDanger = variant === "danger";

  return createPortal(
    <div
      className="fixed inset-0 z-[9999] flex items-center justify-center bg-black/50 backdrop-blur-sm p-4"
      onClick={onCancel}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className={cn(
          "w-full max-w-sm rounded-2xl border p-6 shadow-2xl theme-animate animate-in fade-in zoom-in-95 duration-200",
          isLight ? "bg-white border-[#cfc7ff]" : "bg-zinc-900 border-zinc-700/60"
        )}
      >
        <h3 className={cn("text-base font-semibold mb-2", isLight ? "text-zinc-900" : "text-zinc-100")}>
          {title}
        </h3>
        <p className={cn("text-sm leading-relaxed mb-6", isLight ? "text-zinc-600" : "text-zinc-400")}>
          {message}
        </p>
        <div className="flex items-center justify-end gap-3">
          <button
            onClick={onCancel}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium transition-colors cursor-pointer",
              isLight
                ? "bg-zinc-100 text-zinc-700 hover:bg-zinc-200"
                : "bg-zinc-800 text-zinc-300 hover:bg-zinc-700"
            )}
          >
            {cancelLabel}
          </button>
          <button
            onClick={onConfirm}
            className={cn(
              "px-4 py-2 rounded-xl text-sm font-medium text-white transition-colors cursor-pointer",
              isDanger
                ? "bg-rose-600 hover:bg-rose-500"
                : isLight
                  ? "bg-[#2D3142] hover:bg-[#3d4155]"
                  : "bg-violet-600 hover:bg-violet-500"
            )}
          >
            {confirmLabel}
          </button>
        </div>
      </div>
    </div>,
    document.body
  );
}
