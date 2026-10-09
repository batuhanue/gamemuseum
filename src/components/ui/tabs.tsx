"use client";
import { cn } from "@/lib/cn";

/** Pill tab row used across mobile and desktop screens (reference style). */
export function PillTabs<T extends string>({ items, value, onChange, className, ariaLabel }: { items: { value: T; label: string }[]; value: T; onChange: (v: T) => void; className?: string; ariaLabel: string }) {
  return (
    <div role="tablist" aria-label={ariaLabel} className={cn("no-scrollbar flex gap-2 overflow-x-auto", className)}>
      {items.map((it) => (
        <button
          key={it.value}
          role="tab"
          aria-selected={value === it.value}
          onClick={() => onChange(it.value)}
          className={cn(
            "shrink-0 rounded-full border px-3.5 py-1.5 text-xs transition-colors",
            value === it.value ? "border-[#5d7fd6]/70 bg-[#1a2c55]/70 text-ivory" : "border-white/8 bg-white/[0.03] text-slate hover:text-ivory",
          )}
        >
          {it.label}
        </button>
      ))}
    </div>
  );
}
