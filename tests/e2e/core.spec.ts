import { expect, test } from "@playwright/test";
import { addCopy, museum, registerViaApi, registerViaUi, shelf } from "./helpers";

test("register → onboarding → first game appears on its generation shelf → award in showcase", async ({ page }) => {
  await registerViaUi(page);
  await page.getByRole("button", { name: /^(İleri|Next)$/ }).click();
  await page.getByRole("button", { name: /^(İleri|Next)$/ }).click();
  await page.getByPlaceholder(/Oyun adı|Type a game/).fill("Bloodline");
  await page.getByRole("button", { name: /Bloodline/ }).first().click();
  await page.getByRole("button", { name: /^PlayStation 2$/ }).click();
  await page.getByRole("button", { name: /^(İleri|Next)$/ }).click();
  await page.getByRole("button", { name: /Koleksiyona ekle|Add to collection/ }).click();
  await expect(page.getByText(/eklendi|was added/)).toBeVisible();
  // real data changed on the server
  const snap = await museum(page.request);
  expect(shelf(snap, "ps2").games.map((g) => g.title)).toEqual(["Bloodline"]);
  expect(snap.awards.find((a) => a.id === "first-game")?.earned?.displayed).toBe(true);
  await page.getByRole("button", { name: /Müzeme git|Go to my museum/ }).click();
  await page.waitForURL(/\/museum/);
  await expect(page.locator("canvas").first()).toBeVisible();
});

test("login, logout and wrong password", async ({ page, request }) => {
  const u = await registerViaApi(request);
  await page.goto("/login");
  await page.fill("#email", `${u}@example.com`);
  await page.fill("#password", "wrongpassword");
  await page.locator("form button[type=submit]").click();
  await expect(page.getByRole("alert").filter({ hasText: /hatalı|Invalid/ })).toBeVisible();
  await page.fill("#password", "supersecret1");
  await page.locator("form button[type=submit]").click();
  await page.waitForURL(/\/museum/);
  expect((await (await page.request.get("/api/me")).json()).user.username).toBe(u);
  await page.request.post("/api/auth/logout");
  expect((await (await page.request.get("/api/me")).json()).user).toBeNull();
});

test("copies on different platforms stay separate; manual order persists across reload/devices", async ({ page, browser }) => {
  await registerViaApi(page.request);
  await addCopy(page.request, "demo-frostpunker", "ps2");
  await addCopy(page.request, "demo-frostpunker", "pc-steam", "digital");
  const b = await addCopy(page.request, "demo-bloodline", "ps2");
  const c = await addCopy(page.request, "demo-echoes-of-aeris", "ps2");
  let snap = await museum(page.request);
  expect(shelf(snap, "pc-steam").games).toHaveLength(1);
  const ps2 = shelf(snap, "ps2");
  const reversed = ps2.games.map((g) => g.copyId).reverse();
  const put = await page.request.put("/api/museum/shelves/ps2", { data: { mode: "manual", sortBy: "custom", order: reversed, expectedVersion: ps2.version } });
  expect(put.status()).toBe(200);
  // stale write from another device is rejected
  const stale = await page.request.put("/api/museum/shelves/ps2", { data: { mode: "manual", sortBy: "custom", order: reversed, expectedVersion: ps2.version } });
  expect(stale.status()).toBe(409);
  await page.reload().catch(() => undefined);
  snap = await museum(page.request);
  expect(shelf(snap, "ps2").games.map((g) => g.copyId)).toEqual(reversed);
  // "another device" = fresh context with same cookies
  const other = await browser.newContext({ storageState: await page.context().storageState() });
  const snap2 = await museum(other.request);
  expect(shelf(snap2, "ps2").games.map((g) => g.copyId)).toEqual(reversed);
  await other.close();
  // delete updates placements
  await page.request.delete(`/api/collection/${b.copy.id}`);
  snap = await museum(page.request);
  expect(shelf(snap, "ps2").games.map((g) => g.copyId)).not.toContain(b.copy.id);
  void c;
});

test("Show on shelf highlights the real copy in the 3D gallery", async ({ page }) => {
  await registerViaApi(page.request);
  const a = await addCopy(page.request, "demo-lumen", "ps5");
  await page.goto(`/games/demo-lumen?copy=${a.copy.id}`);
  await page.getByRole("link", { name: /Rafta Göster|Show on Shelf/ }).click();
  await page.waitForURL(new RegExp(`/museum/playstation\\?highlight=${a.copy.id}`));
  await expect(page.getByRole("complementary", { name: "Lumen" })).toBeVisible();
});

test("theme selection is saved and earned award can be toggled; unearned cannot", async ({ page }) => {
  await registerViaApi(page.request);
  await addCopy(page.request, "demo-lumen", "ps5");
  expect((await page.request.put("/api/museum/theme", { data: { themeId: "minimal-gallery" } })).status()).toBe(200);
  expect((await museum(page.request)).themeId).toBe("minimal-gallery");
  expect((await page.request.put("/api/museum/theme", { data: { themeId: "cyber-gallery" } })).status()).toBe(402);
  expect((await page.request.patch("/api/awards/first-game", { data: { displayed: false } })).status()).toBe(200);
  expect((await page.request.patch("/api/awards/games-500", { data: { displayed: true } })).status()).toBe(403);
});

test("private museum is not reachable; other users cannot edit my copies", async ({ browser }) => {
  const owner = await browser.newContext();
  const u = await registerViaApi(owner.request);
  const a = await addCopy(owner.request, "demo-lumen", "ps5");
  const stranger = await browser.newContext();
  await registerViaApi(stranger.request);
  expect((await stranger.request.get(`/api/public/${u}`)).status()).toBe(404);
  expect((await stranger.request.patch(`/api/collection/${a.copy.id}`, { data: { status: "completed", expectedVersion: 1 } })).status()).toBe(404);
  expect((await stranger.request.delete(`/api/collection/${a.copy.id}`)).status()).toBe(404);
  const anon = await browser.newContext();
  expect((await anon.request.get("/api/collection")).status()).toBe(401);
  expect((await anon.request.get("/api/admin/assets")).status()).toBe(401);
  expect((await stranger.request.get("/api/admin/assets")).status()).toBe(403);
});

test("export and demo isolation", async ({ page, request }) => {
  await registerViaApi(page.request);
  const snap = await museum(page.request);
  expect(snap.mode).toBe("user");
  expect(snap.stats.copies).toBe(0); // demo data never belongs to a real account
  const anon = await museum(request);
  expect(anon.mode).toBe("demo");
  await addCopy(page.request, "demo-lumen", "ps5");
  const json = await (await page.request.get("/api/me/export?format=json")).json();
  expect(json.collection).toHaveLength(1);
  const csv = await (await page.request.get("/api/me/export?format=csv")).text();
  expect(csv).toContain("Lumen");
});

test("WebGL unavailable → 2D collection view with explanation", async ({ browser }) => {
  const ctx = await browser.newContext();
  await ctx.addInitScript(() => {
    const proto = HTMLCanvasElement.prototype as unknown as { getContext: (type: string, ...args: unknown[]) => unknown };
    const orig = proto.getContext;
    proto.getContext = function (this: HTMLCanvasElement, type: string, ...args: unknown[]) {
      if (type.startsWith("webgl")) return null;
      return orig.call(this, type, ...args);
    };
  });
  const page = await ctx.newPage();
  await page.goto("/");
  await expect(page.getByRole("alert").filter({ hasText: /WebGL/ })).toBeVisible();
  await expect(page.getByText("Starfall Chronicles").first()).toBeVisible();
});

test("catalog search returns labelled demo results without IGDB", async ({ request }) => {
  const r = await (await request.get("/api/games/search?q=star")).json();
  expect(r.source).toBe("demo");
  expect(r.games.length).toBeGreaterThan(0);
});
