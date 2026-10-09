"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useTranslations } from "next-intl";
import { Award, Box, Compass, Home, Settings, User } from "lucide-react";
import { cn } from "@/lib/cn";
import { Avatar } from "./Avatar";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { useViewer } from "./ViewerContext";
import { Logo } from "./PlatformMark";

export function MobileHeader() {
  const t = useTranslations();
  const viewer = useViewer();
  return (
    <header className="sticky top-0 z-30 flex items-center gap-3 bg-obsidian/90 px-4 pb-2 pt-[calc(var(--safe-top)+10px)] backdrop-blur-md lg:hidden">
      {viewer ? (
        <Link href="/profile" className="flex min-w-0 items-center gap-2.5">
          <Avatar name={viewer.displayName} url={viewer.avatarUrl} size={38} />
          <div className="min-w-0 leading-tight">
            <div className="truncate text-[15px] font-semibold">{viewer.displayName}</div>
            <div className="truncate text-[11px] text-slate">{t("common.level", { level: viewer.level })} · {t("common.collector")}</div>
          </div>
        </Link>
      ) : (
        <Link href="/" aria-label="Game Museum"><Logo /></Link>
      )}
      <div className="ml-auto flex items-center">
        <GlobalSearch variant="icon" />
        <Notifications />
        <Link href={viewer ? "/settings" : "/login"} className="rounded-full p-2 text-ivory/80" aria-label={t("common.settings")}>
          <Settings size={20} />
        </Link>
      </div>
    </header>
  );
}

export function BottomNav() {
  const t = useTranslations();
  const path = usePathname();
  const tabs = [
    { href: "/museum", label: t("nav.home"), icon: Home, active: path === "/museum" || path === "/" },
    { href: "/explore", label: t("nav.explore"), icon: Compass, active: path.startsWith("/explore") },
    { href: "/museum?explore=1", label: t("nav.museum"), icon: Box, active: false, center: true },
    { href: "/museum/awards", label: t("nav.awards"), icon: Award, active: path.startsWith("/museum/awards") },
    { href: "/profile", label: t("nav.profile"), icon: User, active: path.startsWith("/profile") },
  ];
  return (
    <nav aria-label="Primary" className="fixed inset-x-0 bottom-0 z-40 border-t hairline bg-[#0b0d12]/95 pb-[var(--safe-bottom)] backdrop-blur-md lg:hidden">
      <ul className="grid h-16 grid-cols-5">
        {tabs.map((tb) => (
          <li key={tb.href} className="flex items-center justify-center">
            <Link href={tb.href} aria-current={tb.active ? "page" : undefined} className={cn("flex flex-col items-center gap-0.5 text-[10px]", tb.active ? "text-[#7aa2ff]" : "text-slate")}>
              {tb.center ? (
                <span className="-mt-6 flex h-14 w-14 items-center justify-center rounded-full border border-[#7aa2ff]/40 bg-gradient-to-b from-[#2f63e0] to-[#1b3f9c] text-white shadow-[0_8px_24px_-6px_rgba(71,125,255,0.7)]">
                  <tb.icon size={24} />
                </span>
              ) : (
                <tb.icon size={21} />
              )}
              <span className={tb.center ? "sr-only" : undefined}>{tb.label}</span>
            </Link>
          </li>
        ))}
      </ul>
    </nav>
  );
}
