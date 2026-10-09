import Link from "next/link";
import { getTranslations } from "next-intl/server";

export async function DemoBanner() {
  const t = await getTranslations();
  return (
    <div className="mx-3 mt-2 flex flex-wrap items-center justify-center gap-x-3 gap-y-1 rounded-xl border border-gold/30 bg-[#1a160e]/90 px-4 py-2 text-center text-xs text-ivory/90 backdrop-blur lg:mx-auto lg:mt-3 lg:w-fit">
      <span className="rounded-full border border-gold/50 px-2 py-0.5 text-[10px] tracking-[0.18em] text-gold">{t("common.demoCatalog").toUpperCase()}</span>
      <span>{t("museum.demoBanner")}</span>
      <Link href="/register" className="font-semibold text-gold hover:underline">{t("common.signUp")} →</Link>
    </div>
  );
}
