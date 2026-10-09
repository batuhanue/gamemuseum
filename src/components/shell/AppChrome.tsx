"use client";
import { usePathname } from "next/navigation";
import type { ReactNode } from "react";
import { TopNav } from "./TopNav";
import { BottomNav, MobileHeader } from "./MobileChrome";
import { Toaster } from "./Toaster";
import { UnlockModal } from "@/components/awards/UnlockModal";

const BARE = [/^\/login/, /^\/register/, /^\/onboarding/];

/** Desktop top bar, mobile header + safe-area bottom tabs. Museum routes draw their own mobile header. */
export function AppChrome({ children }: { children: ReactNode }) {
  const path = usePathname();
  const bare = BARE.some((r) => r.test(path));
  const museum = path === "/" || path.startsWith("/museum") || /^\/u\/[^/]+\/museum/.test(path);
  if (bare) return <>{children}<Toaster /></>;
  return (
    <>
      <a href="#main" className="sr-only focus:not-sr-only focus:fixed focus:left-3 focus:top-3 focus:z-[60] focus:rounded focus:bg-gold focus:px-3 focus:py-2 focus:text-obsidian">Skip</a>
      <TopNav />
      {!museum && <MobileHeader />}
      <main id="main" className={museum ? "" : "mx-auto w-full max-w-6xl px-4 pb-28 pt-4 lg:px-8 lg:pb-16 lg:pt-24"}>{children}</main>
      <BottomNav />
      <Toaster />
      <UnlockModal />
    </>
  );
}
