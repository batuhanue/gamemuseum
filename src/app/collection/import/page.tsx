import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { ImportView } from "@/components/collection/ImportView";

export const metadata = { title: "Import" };

export default async function ImportPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/collection/import");
  return <Suspense><ImportView /></Suspense>;
}
