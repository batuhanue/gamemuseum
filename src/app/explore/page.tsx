import { getTranslations } from "next-intl/server";
import { ExploreSearch } from "@/components/games/ExploreSearch";

export const metadata = { title: "Explore" };

export default async function ExplorePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const t = await getTranslations();
  const { q } = await searchParams;
  return (
    <div className="mx-auto max-w-3xl">
      <h1 className="display text-4xl">{t("explore.title")}</h1>
      <p className="mb-6 text-sm text-slate">{t("explore.subtitle")}</p>
      <ExploreSearch initialQuery={q ?? ""} />
    </div>
  );
}
