import { expect, type APIRequestContext, type Page } from "@playwright/test";

export const uniq = () => `e2e${Date.now().toString(36)}${Math.floor(Math.random() * 1e4)}`;

export async function registerViaUi(page: Page) {
  const u = uniq();
  await page.goto("/register");
  await page.fill("#r-email", `${u}@example.com`);
  await page.fill("#r-username", u);
  await page.fill("#r-password", "supersecret1");
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/onboarding/);
  return u;
}

export async function registerViaApi(request: APIRequestContext) {
  const u = uniq();
  const r = await request.post("/api/auth/register", { data: { email: `${u}@example.com`, username: u, password: "supersecret1" }, headers: { "x-forwarded-for": `10.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}.${Math.floor(Math.random() * 250)}` } });
  expect(r.status()).toBe(201);
  await request.post("/api/onboarding", { data: { step: "complete" } });
  return u;
}

export async function addCopy(request: APIRequestContext, catalogGameId: string, generationId: string, ownershipType = "physical") {
  const r = await request.post("/api/collection", { data: { catalogGameId, generationId, ownershipType } });
  expect(r.status()).toBe(201);
  return (await r.json()) as { copy: { id: string; version: number }; unlocked: { awardId: string }[] };
}

export async function museum(request: APIRequestContext) {
  return (await (await request.get("/api/museum")).json()).snapshot as {
    mode: string;
    stats: { copies: number; awards: number };
    galleries: { platformId: string; shelves: { generationId: string; version: number; games: { copyId: string; title: string }[] }[] }[];
    awards: { id: string; earned: null | { displayed: boolean } }[];
    themeId: string;
  };
}

export const shelf = (snap: Awaited<ReturnType<typeof museum>>, gen: string) => snap.galleries.flatMap((g) => g.shelves).find((s) => s.generationId === gen)!;
