import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { Onboarding } from "@/components/onboarding/Onboarding";

export const metadata = { title: "Welcome" };

export default async function OnboardingPage() {
  const user = await getCurrentUser();
  if (!user) redirect("/login");
  return <Onboarding name={user.displayName} />;
}
