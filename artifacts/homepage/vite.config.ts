import path from "path";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig } from "vite";
import { brandAssets } from "../../lib/brand/vite-plugin.mjs";

// Standalone marketing site for clinivista.cl. Deliberately independent of
// the estecapelli app's build (no shared PORT/BASE_PATH requirements) since
// it ships as its own Render service, at the domain root.
const port = Number(process.env.PORT ?? 5173);

export default defineConfig({
  // Favicon, apple-touch-icon, theme-color e imagen para redes (lib/brand).
  plugins: [react(), tailwindcss(), brandAssets({ siteUrl: "https://www.clinivista.cl", themeColor: "#FFFFFF" })],
  resolve: {
    alias: {
      "@": path.resolve(import.meta.dirname, "src"),
    },
    dedupe: ["react", "react-dom"],
  },
  root: path.resolve(import.meta.dirname),
  build: {
    outDir: path.resolve(import.meta.dirname, "dist"),
    emptyOutDir: true,
  },
  server: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
  preview: {
    port,
    host: "0.0.0.0",
    allowedHosts: true,
  },
});
