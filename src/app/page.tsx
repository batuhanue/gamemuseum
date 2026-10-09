import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { getDemoSnapshot } from "@/services/demo";
import { resolveLocale } from "@/i18n/request";
import { MuseumExperience } from "@/components/museum/MuseumExperience";
import { DemoBanner } from "@/components/museum/DemoBanner";

/** Signed-in visitors go straight to their museum; everyone else sees the labelled demo museum. */
export default async function Home() {
  if (await getCurrentUser()) redirect("/museum");
  const snapshot = await getDemoSnapshot(await resolveLocale());
  return (
    <Suspense>
      <MuseumExperience initial={snapshot} queryKey={["museum", "demo"]} fetchUrl="/api/museum" basePath="/museum" readOnly banner={<DemoBanner />} />
    </Suspense>
  );
}
