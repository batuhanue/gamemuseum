import { Suspense } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicMuseum } from "@/services/profile";
import { resolveLocale } from "@/i18n/request";
import { AppError } from "@/lib/errors";
import { ProfileView } from "@/components/profile/ProfileView";
import { Button } from "@/components/ui/button";

type P = { params: Promise<{ username: string }>; searchParams: Promise<{ key?: string }> };

export async function generateMetadata({ params }: P) {
  return { title: `@${(await params).username}`, robots: { index: false } };
}

export default async function PublicProfile({ params, searchParams }: P) {
  const { username } = await params;
  const { key } = await searchParams;
  const viewer = await getCurrentUser();
  const t = await getTranslations();
  let res;
  try {
    res = await getPublicMuseum(username, key ?? null, viewer?.id ?? null, await resolveLocale());
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const q = key ? `?key=${encodeURIComponent(key)}` : "";
  return (
    <div>
      {res.isOwner && <p className="mb-4 text-center text-xs text-gold">{t("share.ownerPreview")}</p>}
      <div className="mb-6 flex justify-center">
        <Button asChild variant="primary"><Link href={`/u/${res.profile.username}/museum${q}`}>{t("share.visitMuseum")}</Link></Button>
      </div>
      <Suspense>
        <ProfileView readOnly snapshot={res.snapshot} activity={[]} profile={{ ...res.profile, themesOwned: 0 }} />
      </Suspense>
    </div>
  );
}
