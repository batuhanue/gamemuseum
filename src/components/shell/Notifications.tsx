"use client";
import * as DM from "@radix-ui/react-dropdown-menu";
import { Bell } from "lucide-react";
import Link from "next/link";
import { useTranslations, useFormatter } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { useViewer } from "./ViewerContext";

export function Notifications() {
  const t = useTranslations();
  const f = useFormatter();
  const viewer = useViewer();
  const router = useRouter();
  if (!viewer) return null;
  const unseen = viewer.notifications.filter((n) => n.unseen).length;
  return (
    <DM.Root onOpenChange={(o) => { if (!o && unseen) void api("/api/awards/seen", { method: "POST" }).then(() => router.refresh()); }}>
      <DM.Trigger className="relative rounded-full p-2 text-ivory/80 hover:bg-white/5" aria-label={t("common.notifications")}>
        <Bell size={20} />
        {unseen > 0 && <span className="absolute right-1 top-1 h-2 w-2 rounded-full bg-gold" />}
      </DM.Trigger>
      <DM.Portal>
        <DM.Content align="end" sideOffset={8} className="panel z-50 w-72 p-2">
          {viewer.notifications.length === 0 && <div className="px-3 py-4 text-sm text-slate">{t("common.noNotifications")}</div>}
          {viewer.notifications.map((n) => (
            <DM.Item key={n.id} asChild>
              <Link href={`/museum/awards?award=${n.id}`} className="block rounded-lg px-3 py-2 text-sm outline-none hover:bg-white/5 data-[highlighted]:bg-white/5">
                <div className="flex items-center gap-2">
                  {n.unseen && <span className="h-1.5 w-1.5 rounded-full bg-gold" />}
                  <span>{n.title}</span>
                </div>
                <div className="text-xs text-slate">{f.relativeTime(new Date(n.at), new Date())}</div>
              </Link>
            </DM.Item>
          ))}
        </DM.Content>
      </DM.Portal>
    </DM.Root>
  );
}
