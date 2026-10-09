"use client";
import * as D from "@radix-ui/react-dialog";
import { X } from "lucide-react";
import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Dialog({ open, onOpenChange, title, description, children, className, closeLabel = "Close" }: {
  open: boolean; onOpenChange: (o: boolean) => void; title: string; description?: string; children: ReactNode; className?: string; closeLabel?: string;
}) {
  return (
    <D.Root open={open} onOpenChange={onOpenChange}>
      <D.Portal>
        <D.Overlay className="fixed inset-0 z-50 bg-black/70 backdrop-blur-sm" />
        <D.Content className={cn("panel fixed left-1/2 top-1/2 z-50 w-[min(92vw,520px)] -translate-x-1/2 -translate-y-1/2 p-6 max-h-[88dvh] overflow-y-auto", className)}>
          <div className="mb-4 flex items-start justify-between gap-4">
            <div>
              <D.Title className="display text-2xl text-ivory">{title}</D.Title>
              {description ? <D.Description className="mt-1 text-sm text-slate">{description}</D.Description> : <D.Description className="sr-only">{title}</D.Description>}
            </div>
            <D.Close className="rounded-full p-1.5 text-slate hover:bg-white/5 hover:text-ivory" aria-label={closeLabel}>
              <X size={18} />
            </D.Close>
          </div>
          {children}
        </D.Content>
      </D.Portal>
    </D.Root>
  );
}
