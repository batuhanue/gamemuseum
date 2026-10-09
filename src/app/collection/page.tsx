import { Suspense } from "react";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth/session";
import { CollectionView } from "@/components/collection/CollectionView";

export const metadata = { title: "Collection" };

export default async function CollectionPage() {
  if (!(await getCurrentUser())) redirect("/login?next=/collection");
  return <Suspense><CollectionView /></Suspense>;
}
