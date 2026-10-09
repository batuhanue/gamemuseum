import "server-only";
import { desc, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { awardDefinitions, userAwards } from "@/lib/db/schema";
import { levelFromPoints } from "@/features/rewards/engine";
import type { Locale } from "@/i18n/config";

export type ViewerInfo = {
  id: string;
  username: string;
  displayName: string;
  avatarUrl: string | null;
  role: "user" | "admin";
  emailVerified: boolean;
  onboarded: boolean;
  level: number;
  notifications: { id: string; title: string; at: string; unseen: boolean }[];
};

/** Small per-request summary for the navigation chrome (level + recent award notifications). */
export async function getViewer(locale: Locale): Promise<ViewerInfo | null> {
  const user = await getCurrentUser();
  if (!user) return null;
  const db = await getDb();
  const rows = await db
    .select({ id: userAwards.awardDefinitionId, at: userAwards.unlockedAt, seen: userAwards.seenAt, title: awardDefinitions.title, points: awardDefinitions.points })
    .from(userAwards)
    .innerJoin(awardDefinitions, eq(awardDefinitions.id, userAwards.awardDefinitionId))
    .where(eq(userAwards.userId, user.id))
    .orderBy(desc(userAwards.unlockedAt));
  return {
    id: user.id,
    username: user.username,
    displayName: user.displayName,
    avatarUrl: user.avatarUrl,
    role: user.role,
    emailVerified: !!user.emailVerifiedAt,
    onboarded: !!user.onboardingCompletedAt,
    level: levelFromPoints(rows.reduce((s, r) => s + r.points, 0)),
    notifications: rows.slice(0, 8).map((r) => ({ id: r.id, title: r.title[locale] ?? r.title.en, at: r.at.toISOString(), unseen: !r.seen })),
  };
}
