import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { Button } from "@/components/ui/button";

export default async function NotFound() {
  const t = await getTranslations();
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="display text-6xl text-gold">404</div>
      <p className="text-slate">{t("errors.notFound")}</p>
      <Button asChild variant="primary"><Link href="/museum">{t("errors.goHome")}</Link></Button>
    </div>
  );
}
