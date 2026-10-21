import { defineConfig, devices } from "@playwright/test";

const basePath = process.env.VITE_BASE_PATH || "/";

export default defineConfig({
  testDir: "./tests",
  testMatch: "pwa.spec.ts",
  workers: 1,
  timeout: 30_000,
  use: {
    baseURL: `http://127.0.0.1:4175${basePath}`,
    locale: "ru-RU",
    timezoneId: "Europe/Moscow",
    serviceWorkers: "allow",
    launchOptions: {
      executablePath: process.env.PLAYWRIGHT_CHROMIUM_EXECUTABLE,
    },
  },
  projects: [
    { name: "desktop", use: { viewport: { width: 1440, height: 1000 } } },
    {
      name: "iphone-size",
      use: { ...devices["iPhone 13"], defaultBrowserType: "chromium" },
    },
  ],
  webServer: {
    command: "npm run build && npm run preview -- --port 4175 --strictPort",
    url: `http://127.0.0.1:4175${basePath}`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
});
