import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["src/**/*.test.ts"],
    globals: false,
    // PGlite (in-memory Postgres) startup can be slow on first run
    testTimeout: 20000,
    hookTimeout: 30000,
  },
});
