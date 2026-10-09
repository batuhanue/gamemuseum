import { cn } from "@/lib/cn";

/** 2D cover: catalog art when available, otherwise a typographic tile (never invented box art). */
export function CoverImage({ title, url, palette, demo, className, tiny }: { title: string; url: string | null; palette?: [string, string]; demo?: boolean; className?: string; tiny?: boolean }) {
  if (url) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={url} alt={title} loading="lazy" className={cn("aspect-[3/4] w-full rounded-md object-cover", className)} />;
  }
  const [a, b] = palette ?? ["#1d222a", "#3a4150"];
  return (
    <div className={cn("relative flex aspect-[3/4] w-full flex-col items-center justify-start overflow-hidden rounded-md p-2 text-center", className)} style={{ background: `linear-gradient(160deg, ${b}, ${a} 60%, #050506)` }} role="img" aria-label={title}>
      {!tiny && <span className="display mt-2 line-clamp-3 text-[13px] font-semibold uppercase leading-tight text-ivory">{title}</span>}
      {demo && !tiny && <span className="absolute bottom-1.5 text-[8px] tracking-[0.2em] text-gold">DEMO</span>}
    </div>
  );
}
