import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getCurrentUser } from "@/lib/auth/session";
import { getCatalogGame } from "@/services/catalog";
import { copiesForGame } from "@/services/collection";
import { AppError } from "@/lib/errors";
import { toCatalogDto } from "@/features/games/dto";
import { GameDetail } from "@/components/games/GameDetail";
import { demoPalette } from "@/features/games/demo-catalog";

type P = { params: Promise<{ gameId: string }>; searchParams: Promise<{ copy?: string }> };

async function load(id: string, userId?: string) {
  try {
    return await getCatalogGame(decodeURIComponent(id), userId);
  } catch (e) {
    if (e instanceof AppError && (e.code === "not_found" || e.code === "unavailable")) return null;
    throw e;
  }
}

export async function generateMetadata({ params }: P): Promise<Metadata> {
  const user = await getCurrentUser();
  const g = await load((await params).gameId, user?.id);
  return { title: g?.title ?? "Game" };
}

export default async function GamePage({ params, searchParams }: P) {
  const user = await getCurrentUser();
  const game = await load((await params).gameId, user?.id);
  if (!game) notFound();
  const copies = user ? await copiesForGame(user.id, game.id) : [];
  return (
    <GameDetail
      game={{ ...toCatalogDto(game), artworkUrls: game.artworkUrls, screenshotUrls: game.screenshotUrls, videoIds: game.videoIds, totalRating: game.totalRating }}
      palette={game.dataSource === "demo" ? demoPalette(game.id) : undefined}
      signedIn={!!user}
      focusCopyId={(await searchParams).copy ?? null}
      copies={copies.map((c) => ({
        ...c.copy,
        createdAt: c.copy.createdAt.toISOString(),
        updatedAt: c.copy.updatedAt.toISOString(),
        placement: c.placement ? { shelfIndex: c.placement.shelfIndex, slotIndex: c.placement.slotIndex, sortIndex: c.placement.sortIndex } : null,
      }))}
    />
  );
}
