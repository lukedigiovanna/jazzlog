import { defineConfig, devices } from "@playwright/test";

export default defineConfig({
  testDir: "./tests/pwa",
  outputDir: "./test-results-offline",
  workers: 1,
  use: { baseURL: "http://127.0.0.1:5181", trace: "retain-on-failure" },
  projects: [
    { name: "desktop", use: devices["Desktop Chrome"] },
    { name: "mobile", use: devices["Pixel 7"] },
  ],
  webServer: {
    command:
      "npm run build && npm run preview -- --host 127.0.0.1 --port 5181 --strictPort",
    url: "http://127.0.0.1:5181",
    env: {
      VITE_SUPABASE_URL: "http://127.0.0.1:59999",
      VITE_SUPABASE_PUBLISHABLE_KEY: "offline-test",
    },
    reuseExistingServer: false,
  },
});
