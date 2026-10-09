import { redirect } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";

export const metadata: Metadata = { title: "Customize" };

export default async function CustomizePage() {
  if (!(await getCurrentUser())) redirect("/login?next=/museum/customize");
  return null;
}
