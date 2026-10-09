import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

export function Badge({ children, tone = "neutral", className }: { children: ReactNode; tone?: "neutral" | "gold" | "xbox" | "ps" | "pc" | "danger"; className?: string }) {
  const tones = {
    neutral: "border-white/10 text-slate",
    gold: "border-gold/40 text-gold",
    xbox: "border-xbox/40 text-xbox",
    ps: "border-ps/40 text-[#8fb0ff]",
    pc: "border-pc/40 text-pc",
    danger: "border-danger/40 text-[#ff9a92]",
  };
  return <span className={cn("inline-flex items-center gap-1 rounded-full border px-2 py-0.5 text-[11px]", tones[tone], className)}>{children}</span>;
}

export function Skeleton({ className }: { className?: string }) {
  return <div className={cn("animate-pulse rounded-lg bg-white/[0.05]", className)} />;
}

export function SectionTitle({ eyebrow, title, action }: { eyebrow?: string; title: string; action?: ReactNode }) {
  return (
    <div className="mb-4 flex items-end justify-between gap-4">
      <div>
        {eyebrow && <div className="eyebrow mb-1">{eyebrow}</div>}
        <h2 className="display text-2xl text-ivory md:text-3xl">{title}</h2>
      </div>
      {action}
    </div>
  );
}

export function ProgressRing({ value, size = 64, stroke = 5, label }: { value: number; size?: number; stroke?: number; label?: string }) {
  const r = (size - stroke) / 2;
  const c = 2 * Math.PI * r;
  const v = Math.max(0, Math.min(1, value));
  return (
    <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`} role="img" aria-label={label ?? `${Math.round(v * 100)}%`}>
      <defs>
        <linearGradient id="gm-ring" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="#d5b477" />
          <stop offset="100%" stopColor="#45b36b" />
        </linearGradient>
      </defs>
      <circle cx={size / 2} cy={size / 2} r={r} stroke="rgba(255,255,255,0.08)" strokeWidth={stroke} fill="none" />
      <circle cx={size / 2} cy={size / 2} r={r} stroke="url(#gm-ring)" strokeWidth={stroke} fill="none" strokeDasharray={c} strokeDashoffset={c * (1 - v)} strokeLinecap="round" transform={`rotate(-90 ${size / 2} ${size / 2})`} />
      <text x="50%" y="50%" dominantBaseline="central" textAnchor="middle" fill="#f2eee5" fontSize={size * 0.24} fontFamily="Inter">{Math.round(v * 100)}%</text>
    </svg>
  );
}

export function EmptyState({ title, body, action }: { title: string; body?: string; action?: ReactNode }) {
  return (
    <div className="panel flex flex-col items-center gap-3 px-6 py-10 text-center">
      <div className="display text-2xl">{title}</div>
      {body && <p className="max-w-md text-sm text-slate">{body}</p>}
      {action}
    </div>
  );
}
