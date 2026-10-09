import { cn } from "@/lib/cn";

export function Avatar({ name, url, size = 36, className }: { name: string; url: string | null; size?: number; className?: string }) {
  const initials = name.slice(0, 2).toUpperCase();
  return (
    <span className={cn("relative inline-flex shrink-0 items-center justify-center overflow-hidden rounded-full border border-gold/50 bg-graphite", className)} style={{ width: size, height: size }}>
      {url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={url} alt="" className="h-full w-full object-cover" referrerPolicy="no-referrer" />
      ) : (
        <span className="display text-gold" style={{ fontSize: size * 0.42 }}>{initials}</span>
      )}
    </span>
  );
}
