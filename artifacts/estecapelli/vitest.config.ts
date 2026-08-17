import path from "path";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";

// Standalone Vitest config: the app's vite.config.ts requires PORT/BASE_PATH
// env vars (dev-server concerns) that tests should not depend on.
export default defineConfig({
  plugins: [react()],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test/setup.ts"],
    include: ["src/**/*.test.{ts,tsx}"],
    globals: false,
    // user-event driven form tests can be slow when suites run in parallel
    testTimeout: 30000,
    hookTimeout: 30000,
  },
});
