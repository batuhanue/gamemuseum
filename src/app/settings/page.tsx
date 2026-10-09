import { Suspense } from "react";
import { redirect } from "next/navigation";
import { and, eq } from "drizzle-orm";
import { getCurrentUser } from "@/lib/auth/session";
import { getDb } from "@/lib/db/client";
import { linkedAccounts } from "@/lib/db/schema";
import { appUrl } from "@/lib/email";
import { SettingsView } from "@/components/settings/SettingsView";

export const metadata = { title: "Settings" };

export default async function SettingsPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login?next=/settings");
  const [steam] = await (await getDb()).select().from(linkedAccounts).where(and(eq(linkedAccounts.userId, user.id), eq(linkedAccounts.provider, "steam"))).limit(1);
  return (
    <Suspense>
      <SettingsView
        me={{
          email: user.email, username: user.username, emailVerified: !!user.emailVerifiedAt, hasPassword: !!user.passwordHash, plan: user.plan,
          museumVisibility: user.museumVisibility, shareToken: user.shareToken, shareSettings: user.shareSettings, steam: steam?.externalId ?? null, appUrl: appUrl(),
        }}
      />
    </Suspense>
  );
}
