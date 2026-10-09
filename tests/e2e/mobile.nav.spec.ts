import { expect, test } from "@playwright/test";
import { registerViaApi } from "./helpers";

test("mobile bottom navigation reaches every tab", async ({ page }) => {
  await registerViaApi(page.request);
  await page.goto("/museum");
  const nav = page.getByRole("navigation", { name: "Primary" });
  await expect(nav).toBeVisible();
  await nav.getByRole("link", { name: /Keşfet|Explore/ }).click();
  await page.waitForURL(/\/explore/);
  await nav.getByRole("link", { name: /Ödüller|Awards/ }).click();
  await page.waitForURL(/\/museum\/awards/);
  await nav.getByRole("link", { name: /Profil|Profile/ }).click();
  await page.waitForURL(/\/profile/);
  await page.goto("/museum");
  await page.getByRole("link", { name: /PlayStation/ }).first().click();
  await page.waitForURL(/\/museum\/playstation/);
  await expect(page.getByRole("tab", { name: "PS2" })).toBeVisible();
});
