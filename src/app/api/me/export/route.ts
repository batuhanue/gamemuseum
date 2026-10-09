import { NextResponse } from "next/server";
import { route } from "@/lib/http";
import { requireUser } from "@/lib/auth/session";
import { exportCollectionCsv, exportUserData } from "@/services/profile";

export const GET = route(async (req) => {
  const user = await requireUser();
  const format = req.nextUrl.searchParams.get("format") === "csv" ? "csv" : "json";
  const stamp = new Date().toISOString().slice(0, 10);
  if (format === "csv") {
    return new NextResponse(await exportCollectionCsv(user.id), {
      headers: { "Content-Type": "text/csv; charset=utf-8", "Content-Disposition": `attachment; filename="game-museum-${stamp}.csv"` },
    });
  }
  return new NextResponse(JSON.stringify(await exportUserData(user.id), null, 2), {
    headers: { "Content-Type": "application/json", "Content-Disposition": `attachment; filename="game-museum-${stamp}.json"` },
  });
});
