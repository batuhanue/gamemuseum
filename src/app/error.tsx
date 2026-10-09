"use client";
import { useEffect } from "react";
import { useTranslations } from "next-intl";
import { Button } from "@/components/ui/button";

export default function ErrorPage({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  const t = useTranslations();
  useEffect(() => console.error(error), [error]);
  return (
    <div className="mx-auto flex min-h-[60dvh] max-w-md flex-col items-center justify-center gap-4 text-center">
      <div className="display text-3xl">{t("common.error")}</div>
      {error.digest && <code className="text-xs text-slate">{error.digest}</code>}
      <Button variant="primary" onClick={reset}>{t("common.retry")}</Button>
    </div>
  );
}
