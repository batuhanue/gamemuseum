"use client";
import { useToasts } from "@/stores/toast-store";
import { cn } from "@/lib/cn";

export function Toaster() {
  const toasts = useToasts((s) => s.toasts);
  const dismiss = useToasts((s) => s.dismiss);
  return (
    <div aria-live="polite" className="pointer-events-none fixed inset-x-0 bottom-[calc(var(--safe-bottom)+84px)] z-[70] flex flex-col items-center gap-2 px-4 lg:bottom-6">
      {toasts.map((t) => (
        <button
          key={t.id}
          onClick={() => dismiss(t.id)}
          className={cn(
            "panel pointer-events-auto max-w-md px-4 py-2.5 text-left text-sm",
            t.kind === "error" && "border-danger/40 text-[#ffb3ad]",
            t.kind === "success" && "border-gold/30",
          )}
        >
          {t.text}
        </button>
      ))}
    </div>
  );
}
