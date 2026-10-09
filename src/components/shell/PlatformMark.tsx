import { cn } from "@/lib/cn";

/** Neutral monogram marks (deliberately not the platform holders' logos). */
export function PlatformMark({ platform, size = 28, className }: { platform: string; size?: number; className?: string }) {
  const color = platform === "xbox" ? "#45B36B" : platform === "playstation" ? "#477DFF" : "#AEB9C7";
  const text = platform === "xbox" ? "X" : platform === "playstation" ? "PS" : "PC";
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" className={cn("shrink-0", className)} aria-hidden>
      <circle cx="16" cy="16" r="14.5" fill="none" stroke={color} strokeWidth="1.5" />
      <circle cx="16" cy="16" r="11" fill={color} fillOpacity="0.12" />
      <text x="16" y="16.5" textAnchor="middle" dominantBaseline="central" fontFamily="Inter" fontWeight="600" fontSize={text.length > 1 ? 10 : 13} fill={color}>{text}</text>
    </svg>
  );
}

export function Logo({ compact = false }: { compact?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      <svg width="34" height="34" viewBox="0 0 40 40" aria-hidden>
        <path d="M20 3 35 10v11c0 8-6.5 14-15 16C11.5 35 5 29 5 21V10z" fill="none" stroke="#D5B477" strokeWidth="1.4" />
        <path d="M12 26V15l8-4 8 4v11M15 26v-8M20 26v-10M25 26v-8M10.5 27.5h19" fill="none" stroke="#D5B477" strokeWidth="1.2" />
      </svg>
      {!compact && (
        <div className="leading-none">
          <div className="text-[9px] tracking-[0.3em] text-slate">THE</div>
          <div className="display text-[22px] font-semibold tracking-[0.14em] text-ivory">GAME MUSEUM</div>
        </div>
      )}
    </div>
  );
}
