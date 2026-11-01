import { existsSync } from "node:fs";
import path from "node:path";
import express, { type Express } from "express";
import cors from "cors";
import router from "./routes";
import { getAuthContext } from "./routes/auth";
import { logger } from "./lib/logger";
import { createHttpLogger } from "./lib/http-logger";
import { PlanLimitError } from "./lib/plan-limits";

const app: Express = express();

app.use(createHttpLogger(logger));
// Cabeceras de seguridad. La cámara se permite solo a este mismo origen (captura de fotos del paciente).
app.use((_req, res, next) => {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "DENY");
  res.setHeader("Referrer-Policy", "no-referrer");
  res.setHeader("Permissions-Policy", "camera=(self), microphone=(), geolocation=()");
  if (process.env.NODE_ENV === "production") res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  next();
});
app.use(cors());
// Clinical image bytes use explicit binary routes and private storage, never JSON.
// The doctor's annotation arrives as JSON (vector strokes + the composed image
// in base64), so that one route needs more room than the 1 MB default.
const smallJson = express.json({ limit: "1mb" });
const annotationJson = express.json({ limit: "14mb" });
// Only a signed-in clinic session gets the larger limit.
app.use((req, res, next) => {
  const large = /\/leads\/[^/]+\/photos\/[^/]+\/annotation$/.test(req.path) && getAuthContext(req) !== undefined;
  (large ? annotationJson : smallJson)(req, res, next);
});
app.use(express.urlencoded({ extended: true, limit: "1mb" }));

app.use("/api", router);

// Un límite del plan (almacenamiento lleno, cobro vencido) llega como 403 con el motivo, no como un error 500.
app.use("/api", (error: unknown, _req: express.Request, res: express.Response, next: express.NextFunction) => {
  if (error instanceof PlanLimitError) {
    res.status(error.status).json({ error: error.message, code: error.code });
    return;
  }
  next(error);
});

// Serve the compiled PWA from the same origin, so the admin session cookie and relative /api calls just work.
const pwaDir = path.resolve(import.meta.dirname, "../../estecapelli/dist/public");
if (existsSync(path.join(pwaDir, "index.html"))) {
  // Vite fingerprints everything under /assets, so it can be cached forever.
  app.use("/assets", express.static(path.join(pwaDir, "assets"), { immutable: true, maxAge: "1y", fallthrough: false }));
  app.use(express.static(pwaDir, { index: false }));
  app.use((req, res, next) => {
    if ((req.method !== "GET" && req.method !== "HEAD") || req.path === "/api" || req.path.startsWith("/api/")) {
      next();
      return;
    }
    // Client-side routes (wouter) fall back to index.html.
    res.setHeader("Cache-Control", "no-cache");
    res.sendFile(path.join(pwaDir, "index.html"));
  });
} else if (process.env.NODE_ENV === "production") {
  logger.warn({ pwaDir }, "Compiled PWA not found; only /api will be served");
}

export default app;
