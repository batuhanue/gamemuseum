import "server-only";
import { z } from "zod";
import { AppError } from "../errors";

const owned = z.object({
  response: z.object({
    game_count: z.number().optional(),
    games: z.array(z.object({ appid: z.number(), name: z.string().optional(), playtime_forever: z.number().optional() })).optional(),
  }),
});

export type SteamOwnedGame = { appId: string; name: string; playtimeMinutes: number };

export function steamConfigured() {
  return !!process.env.STEAM_WEB_API_KEY;
}

/**
 * Returns visible owned games. `null` means the library is not visible (private profile / game details),
 * which must not be interpreted as "owns no games".
 */
export async function getOwnedGames(steamId: string, fetchImpl: typeof fetch = fetch): Promise<SteamOwnedGame[] | null> {
  const key = process.env.STEAM_WEB_API_KEY;
  if (!key) throw new AppError("unavailable", "STEAM_WEB_API_KEY is not configured");
  const url = `https://api.steampowered.com/IPlayerService/GetOwnedGames/v1/?key=${encodeURIComponent(key)}&steamid=${steamId}&include_appinfo=1&include_played_free_games=1&format=json`;
  const res = await fetchImpl(url, { signal: AbortSignal.timeout(15_000), cache: "no-store" });
  if (res.status === 401 || res.status === 403) return null;
  if (!res.ok) throw new AppError("unavailable", `Steam API error (${res.status})`);
  const data = owned.parse(await res.json());
  if (!data.response.games) return null;
  return data.response.games.map((g) => ({ appId: String(g.appid), name: g.name ?? `App ${g.appid}`, playtimeMinutes: g.playtime_forever ?? 0 }));
}
