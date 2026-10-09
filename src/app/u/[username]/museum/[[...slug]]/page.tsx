import { Suspense } from "react";
import { notFound } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { getPublicMuseum } from "@/services/profile";
import { resolveLocale } from "@/i18n/request";
import { AppError } from "@/lib/errors";
import { MuseumExperience } from "@/components/museum/MuseumExperience";

type P = { params: Promise<{ username: string; slug?: string[] }>; searchParams: Promise<{ key?: string }> };

export async function generateMetadata({ params }: P) {
  return { title: `@${(await params).username} · Museum`, robots: { index: false } };
}

/** Read-only shared museum. Private museums 404; unlisted ones need the share key. */
export default async function PublicMuseumPage({ params, searchParams }: P) {
  const { username, slug } = await params;
  const { key } = await searchParams;
  if (slug && (slug.length > 1 || !["xbox", "playstation", "pc", "awards"].includes(slug[0]!))) notFound();
  const viewer = await getCurrentUser();
  const t = await getTranslations();
  let res;
  try {
    res = await getPublicMuseum(username, key ?? null, viewer?.id ?? null, await resolveLocale());
  } catch (e) {
    if (e instanceof AppError && e.code === "not_found") notFound();
    throw e;
  }
  const keepQuery = key ? `key=${encodeURIComponent(key)}` : "";
  return (
    <Suspense>
      <MuseumExperience
        initial={res.snapshot}
        queryKey={["public-museum", username, key ?? ""]}
        fetchUrl={`/api/public/${encodeURIComponent(username)}${key ? `?key=${encodeURIComponent(key)}` : ""}`}
        basePath={`/u/${res.profile.username}/museum`}
        readOnly
        keepQuery={keepQuery}
        banner={
          <div className="mx-3 mt-2 rounded-xl border border-white/10 bg-black/60 px-4 py-2 text-center text-xs backdrop-blur lg:mx-auto lg:w-fit">
            {res.isOwner ? t("share.ownerPreview") : t("share.sharedBy", { name: res.profile.displayName })}
          </div>
        }
      />
    </Suspense>
  );
}
