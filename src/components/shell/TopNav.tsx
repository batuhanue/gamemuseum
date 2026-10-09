"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import * as DM from "@radix-ui/react-dropdown-menu";
import { ChevronDown, Crown, Settings } from "lucide-react";
import { cn } from "@/lib/cn";
import { api } from "@/lib/client/api";
import { Logo, PlatformMark } from "./PlatformMark";
import { Avatar } from "./Avatar";
import { GlobalSearch } from "./GlobalSearch";
import { Notifications } from "./Notifications";
import { useViewer } from "./ViewerContext";
import { Button } from "@/components/ui/button";

export function TopNav() {
  const t = useTranslations();
  const path = usePathname();
  const viewer = useViewer();
  const router = useRouter();
  const items = [
    { href: "/museum", label: t("nav.museum"), active: path === "/museum" || path === "/" },
    { href: "/collection", label: t("nav.collection"), active: path.startsWith("/collection") },
    { href: "/museum/awards", label: t("nav.awards"), active: path.startsWith("/museum/awards") },
    { href: "/profile?tab=stats", label: t("nav.stats"), active: false },
    { href: "/profile", label: t("nav.profile"), active: path === "/profile" },
  ];
  const galleries = [
    { id: "xbox", label: "Xbox" },
    { id: "playstation", label: "PlayStation" },
    { id: "pc", label: "PC" },
  ];
  const platformActive = /^\/museum\/(xbox|playstation|pc)/.test(path);

  return (
    <header className="fixed inset-x-0 top-0 z-40 hidden h-16 items-center border-b hairline bg-[#07080b]/85 px-5 backdrop-blur-md lg:flex">
      <Link href="/museum" className="mr-8 shrink-0" aria-label="Game Museum">
        <Logo />
      </Link>
      <nav className="flex h-full items-stretch gap-1" aria-label="Main">
        {items.slice(0, 2).map((it) => <NavLink key={it.href} {...it} />)}
        <DM.Root>
          <DM.Trigger className={cn("relative flex items-center gap-1 px-4 text-sm outline-none", platformActive ? "text-ivory" : "text-slate hover:text-ivory")}>
            {t("nav.platforms")} <ChevronDown size={14} />
            {platformActive && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-gold" />}
          </DM.Trigger>
          <DM.Portal>
            <DM.Content sideOffset={6} className="panel z-50 min-w-48 p-1.5">
              {galleries.map((g) => (
                <DM.Item key={g.id} asChild>
                  <Link href={`/museum/${g.id}`} className="flex items-center gap-2 rounded-lg px-3 py-2 text-sm outline-none data-[highlighted]:bg-white/5">
                    <PlatformMark platform={g.id} size={22} /> {g.label}
                  </Link>
                </DM.Item>
              ))}
            </DM.Content>
          </DM.Portal>
        </DM.Root>
        {items.slice(2).map((it) => <NavLink key={it.href} {...it} />)}
        {viewer?.role === "admin" && <NavLink href="/admin" label={t("nav.admin")} active={path.startsWith("/admin")} />}
      </nav>
      <div className="ml-auto flex items-center gap-3">
        <GlobalSearch variant="bar" />
        {viewer ? (
          <>
            <Notifications />
            <DM.Root>
              <DM.Trigger className="flex items-center gap-3 rounded-full py-1 pl-1 pr-3 outline-none hover:bg-white/5">
                <Avatar name={viewer.displayName} url={viewer.avatarUrl} size={40} />
                <div className="text-left leading-tight">
                  <div className="flex items-center gap-1 text-sm font-medium">{viewer.displayName} <Crown size={13} className="text-gold" /></div>
                  <div className="text-[11px] text-slate">{t("common.curator")} · {t("common.level", { level: viewer.level })}</div>
                </div>
              </DM.Trigger>
              <DM.Portal>
                <DM.Content align="end" sideOffset={8} className="panel z-50 min-w-48 p-1.5">
                  <MenuLink href="/profile">{t("nav.profile")}</MenuLink>
                  <MenuLink href="/museum/customize">{t("nav.customize")}</MenuLink>
                  <MenuLink href="/settings">{t("nav.settings")}</MenuLink>
                  <DM.Separator className="my-1 h-px bg-white/5" />
                  <DM.Item
                    onSelect={async () => {
                      await api("/api/auth/logout", { method: "POST" });
                      router.push("/");
                      router.refresh();
                    }}
                    className="cursor-pointer rounded-lg px-3 py-2 text-sm text-slate outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-ivory"
                  >
                    {t("common.signOut")}
                  </DM.Item>
                </DM.Content>
              </DM.Portal>
            </DM.Root>
            <Link href="/settings" className="rounded-full p-2 text-ivory/80 hover:bg-white/5" aria-label={t("common.settings")}>
              <Settings size={19} />
            </Link>
          </>
        ) : (
          <>
            <Button asChild variant="ghost" size="sm"><Link href="/login">{t("common.signIn")}</Link></Button>
            <Button asChild variant="primary" size="sm"><Link href="/register">{t("common.signUp")}</Link></Button>
          </>
        )}
      </div>
    </header>
  );
}

function NavLink({ href, label, active }: { href: string; label: string; active: boolean }) {
  return (
    <Link href={href} className={cn("relative flex items-center px-4 text-sm transition-colors", active ? "text-ivory" : "text-slate hover:text-ivory")} aria-current={active ? "page" : undefined}>
      {label}
      {active && <span className="absolute inset-x-3 bottom-0 h-0.5 bg-gold" />}
    </Link>
  );
}

function MenuLink({ href, children }: { href: string; children: React.ReactNode }) {
  return (
    <DM.Item asChild>
      <Link href={href} className="block rounded-lg px-3 py-2 text-sm text-slate outline-none data-[highlighted]:bg-white/5 data-[highlighted]:text-ivory">{children}</Link>
    </DM.Item>
  );
}
