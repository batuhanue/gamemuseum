"use client";
import { useRouter } from "next/navigation";
import { GameSearch } from "@/components/collection/GameSearch";

export function ExploreSearch({ initialQuery }: { initialQuery: string }) {
  const router = useRouter();
  return <GameSearch initialQuery={initialQuery} autoFocus onPick={(g) => router.push(`/games/${encodeURIComponent(g.id)}`)} />;
}
