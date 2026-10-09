import { redirect } from "next/navigation";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";
import { AddGameFlow } from "@/components/collection/AddGameFlow";

export const metadata = { title: "Add game" };

export default async function AddPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/collection/add");
  const t = await getTranslations();
  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="display mb-6 text-4xl">{t("add.title")}</h1>
      <AddGameFlow />
    </div>
  );
}
