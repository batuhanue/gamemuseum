"use client";
import { useLocale } from "next-intl";
import { useRouter } from "next/navigation";
import { api } from "@/lib/client/api";
import { cn } from "@/lib/cn";

export function LocaleSwitch() {
  const locale = useLocale();
  const router = useRouter();
  return (
    <div className="inline-flex rounded-full border border-white/10 p-0.5 text-xs" role="group" aria-label="Language">
      {(["tr", "en"] as const).map((l) => (
        <button
          key={l}
          aria-pressed={locale === l}
          onClick={async () => {
            await api("/api/locale", { method: "POST", body: { locale: l } });
            router.refresh();
          }}
          className={cn("rounded-full px-3 py-1", locale === l ? "bg-white/10 text-ivory" : "text-slate")}
        >
          {l.toUpperCase()}
        </button>
      ))}
    </div>
  );
}
