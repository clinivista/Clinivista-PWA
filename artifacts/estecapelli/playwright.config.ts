import { defineConfig, devices } from "@playwright/test";

/**
 * Playwright configuration for browser-level E2E tests.
 *
 * The webServer block starts a local Vite dev server with fixed PORT and
 * BASE_PATH so the tests run independently of any managed workflow.
 * The real API is NOT started — tests use page.route() to intercept
 * /api/** network calls and return controlled responses.
 */
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: false,
  retries: 0,
  timeout: 60_000,
  expect: { timeout: 10_000 },
  reporter: [["list"]],
  use: {
    baseURL: "http://localhost:5399",
    // Capture traces on first retry for debugging
    trace: "on-first-retry",
  },
  projects: [
    {
      name: "chromium",
      use: {
        ...devices["Desktop Chrome"],
        headless: true,
        // Point to the Nix-managed Chromium which has all system libs linked.
        executablePath: process.env["PLAYWRIGHT_CHROMIUM_EXECUTABLE_PATH"] ?? "/nix/store/qa9cnw4v5xkxyip6mb9kxqfq1z4x2dx1-chromium-138.0.7204.100/bin/chromium",
        launchOptions: {
          args: ["--no-sandbox", "--disable-setuid-sandbox"],
        },
      },
    },
  ],
  webServer: {
    // Start the Vite dev server with a fixed port so tests are reproducible.
    // BASE_PATH=/ means assets and routes are served from the root.
    command:
      "PORT=5399 BASE_PATH=/ pnpm --filter @workspace/estecapelli exec vite --config vite.config.ts --host 0.0.0.0",
    port: 5399,
    reuseExistingServer: false,
    timeout: 60_000,
    env: {
      PORT: "5399",
      BASE_PATH: "/",
      NODE_ENV: "test",
    },
  },
});
