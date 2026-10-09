import { defineConfig, devices } from "@playwright/test";

const port = Number(process.env.E2E_PORT ?? 3100);

export default defineConfig({
  testDir: "tests/e2e",
  timeout: 90_000,
  fullyParallel: false,
  workers: 1,
  use: {
    baseURL: `http://localhost:${port}`,
    trace: "retain-on-failure",
    launchOptions: {
      ...(process.env.PW_CHROMIUM_PATH ? { executablePath: process.env.PW_CHROMIUM_PATH } : {}),
      args: ["--use-gl=angle", "--use-angle=swiftshader", "--enable-unsafe-swiftshader", "--ignore-gpu-blocklist"],
    },
  },
  projects: [
    { name: "desktop", use: { ...devices["Desktop Chrome"], viewport: { width: 1600, height: 900 } }, testIgnore: /mobile\..*\.spec\.ts/ },
    { name: "mobile", use: { ...devices["Pixel 7"] }, testMatch: /mobile\..*\.spec\.ts/ },
  ],
  webServer: {
    command: `npm run start -- -p ${port}`,
    port,
    reuseExistingServer: true,
    timeout: 120_000,
    env: { PGLITE_DIR: ".data/e2e", APP_ENV: "test", SESSION_SECRET: "e2e-secret-e2e-secret-e2e-secret-123" },
  },
});
