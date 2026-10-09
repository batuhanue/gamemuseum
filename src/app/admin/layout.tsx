import Link from "next/link";
import { getTranslations } from "next-intl/server";
import { getCurrentUser } from "@/lib/auth/session";

/** Admin access is enforced on every admin API route; this layout only decides what to render. */
export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const user = await getCurrentUser();
  const t = await getTranslations();
  if (user?.role !== "admin") {
    return <div className="panel mx-auto mt-10 max-w-md p-6 text-center text-sm text-slate">{t("admin.forbidden")}</div>;
  }
  const links = [
    ["/admin", t("admin.overview")],
    ["/admin/models", t("admin.models")],
    ["/admin/awards", t("admin.awards")],
    ["/admin/themes", t("admin.themes")],
  ] as const;
  return (
    <div className="font-sans">
      <div className="mb-6 flex flex-wrap items-center gap-4 border-b hairline pb-3">
        <h1 className="text-xl font-semibold">{t("admin.title")}</h1>
        <nav className="flex flex-wrap gap-1 text-sm">
          {links.map(([href, label]) => <Link key={href} href={href} className="rounded-lg px-3 py-1.5 text-slate hover:bg-white/5 hover:text-ivory">{label}</Link>)}
        </nav>
      </div>
      {children}
    </div>
  );
}
