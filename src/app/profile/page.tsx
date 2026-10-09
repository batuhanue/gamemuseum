import { Suspense } from "react";
import { redirect } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getMuseumSnapshot } from "@/services/museum";
import { resolveLocale } from "@/i18n/request";
import { getDb } from "@/lib/db/client";
import { activityEvents } from "@/lib/db/schema";
import { userEntitlements } from "@/services/profile";
import { THEMES } from "@/features/museum/themes";
import { ProfileView } from "@/components/profile/ProfileView";

export const metadata = { title: "Profile" };

export default async function ProfilePage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/profile");
  const [snapshot, events, ent] = await Promise.all([
    getMuseumSnapshot(user.id, await resolveLocale()),
    (await getDb()).select().from(activityEvents).where(eq(activityEvents.userId, user.id)).orderBy(desc(activityEvents.createdAt)).limit(30),
    userEntitlements(user.id),
  ]);
  const themesOwned = THEMES.filter((t) => !t.premiumSku || ent.plan === "premium" || ent.skus.includes(t.premiumSku)).length;
  return (
    <Suspense>
      <ProfileView
        snapshot={snapshot}
        profile={{ displayName: user.displayName, username: user.username, avatarUrl: user.avatarUrl, bio: user.bio, collectionDescription: user.collectionDescription, memberSince: user.createdAt.toISOString(), themesOwned }}
        activity={events.map((e) => ({ id: e.id, type: e.type, at: e.createdAt.toISOString() }))}
      />
    </Suspense>
  );
}
