import { Suspense } from "react";
import { redirect } from "next/navigation";
import { count, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getMuseumSnapshot } from "@/services/museum";
import { getDemoSnapshot } from "@/services/demo";
import { resolveLocale } from "@/i18n/request";
import { MuseumExperience } from "@/components/museum/MuseumExperience";
import { DemoBanner } from "@/components/museum/DemoBanner";
import { getDb } from "@/lib/db/client";
import { userGames } from "@/lib/db/schema";

export default async function MuseumLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const locale = await resolveLocale();
  if (user && !user.onboardingCompletedAt) {
    const [row] = await (await getDb()).select({ n: count() }).from(userGames).where(eq(userGames.userId, user.id));
    if (Number(row?.n ?? 0) === 0) redirect("/onboarding");
  }
  const snapshot = user ? await getMuseumSnapshot(user.id, locale) : await getDemoSnapshot(locale);
  return (
    <>
      <Suspense>
        <MuseumExperience
          initial={snapshot}
          queryKey={["museum"]}
          fetchUrl="/api/museum"
          basePath="/museum"
          readOnly={!user}
          banner={user ? undefined : <DemoBanner />}
        />
      </Suspense>
      {children}
    </>
  );
}
