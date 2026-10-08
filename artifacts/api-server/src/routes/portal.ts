import { Router, type IRouter, type Request, type Response } from "express";
import {
  AccountError, createPatientSession, destroyPatientSession, getPatientSession, loginPatient, portalOverview,
  portalResultPath, requestPasswordReset, setPasswordWithToken, throttled,
} from "../lib/patient-accounts";
import { privatePhotoStorage } from "../lib/clinical-photo-storage";
import { baseUrl } from "./results";
import crypto from "crypto";
import { accountProfile, signInWithGoogle } from "../lib/patient-accounts";
import { googleAuthUrl, googleConfig, googleProfileFromCode } from "../lib/google-auth";

const router: IRouter = Router();
const COOKIE = "clinivista_patient";
const MAX_AGE = 7 * 24 * 3600;

function tokenOf(req: Request): string | undefined {
  const match = (req.headers.cookie ?? "").match(/(?:^|;)\s*clinivista_patient=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}

function startSession(res: Response, accountId: string) {
  res.setHeader("Set-Cookie", `${COOKIE}=${createPatientSession(accountId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${process.env.NODE_ENV === "production" ? "; Secure" : ""}`);
}

function fail(error: unknown, res: Response): void {
  if (error instanceof AccountError) {
    res.status(error.status).json({ error: error.message });
    return;
  }
  throw error;
}

router.post("/portal/login", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { email?: unknown; password?: unknown };
  try {
    startSession(res, await loginPatient(body.email, body.password, req.ip ?? ""));
    res.json({ ok: true });
  } catch (error) {
    fail(error, res);
  }
});

router.post("/portal/setup", async (req, res): Promise<void> => {
  const body = (req.body ?? {}) as { token?: unknown; password?: unknown };
  try {
    startSession(res, await setPasswordWithToken(body.token, body.password));
    res.json({ ok: true });
  } catch (error) {
    fail(error, res);
  }
});

// Always answers the same, so it cannot be used to find out who has an account.
router.post("/portal/forgot", async (req, res): Promise<void> => {
  const email = (req.body as { email?: unknown } | undefined)?.email;
  if (typeof email === "string" && email.includes("@") && !throttled(`forgot:${email.trim().toLowerCase()}`, 3, 15 * 60_000) && !throttled(`forgot-ip:${req.ip}`, 20, 15 * 60_000)) {
    await requestPasswordReset(email, baseUrl(req)).catch(() => undefined);
  }
  res.json({ ok: true });
});

// ---- Sign in with Google ----
const STATE_COOKIE = "clinivista_gstate";
// Where Google sends the patient back to: the clinic's registration page or the portal. Nothing else.
const NEXT_PATH = /^\/(?:c\/[a-z0-9][a-z0-9-]{2,39}|paciente)$/;
const secure = process.env.NODE_ENV === "production" ? "; Secure" : "";

function stateOf(req: Request): { state: string; next: string } | null {
  const match = (req.headers.cookie ?? "").match(/(?:^|;)\s*clinivista_gstate=([^;]+)/);
  try {
    const parsed = JSON.parse(decodeURIComponent(match?.[1] ?? "")) as { s?: unknown; n?: unknown };
    return typeof parsed.s === "string" && typeof parsed.n === "string" ? { state: parsed.s, next: parsed.n } : null;
  } catch {
    return null;
  }
}

router.get("/portal/options", async (req, res): Promise<void> => {
  const accountId = getPatientSession(tokenOf(req));
  res.setHeader("Cache-Control", "private, no-store");
  res.json({ googleEnabled: Boolean(googleConfig()), profile: accountId ? await accountProfile(accountId) : null });
});

router.get("/portal/google/start", (req, res): void => {
  const requested = String(req.query.next ?? "/paciente");
  const next = NEXT_PATH.test(requested) ? requested : "/paciente";
  const state = crypto.randomBytes(16).toString("hex");
  const url = googleAuthUrl(`${baseUrl(req)}/api/portal/google/callback`, state);
  if (!url) {
    res.redirect(`${next}?google=off`);
    return;
  }
  res.setHeader("Set-Cookie", `${STATE_COOKIE}=${encodeURIComponent(JSON.stringify({ s: state, n: next }))}; HttpOnly; SameSite=Lax; Path=/api/portal/google; Max-Age=600${secure}`);
  res.redirect(url);
});

router.get("/portal/google/callback", async (req, res): Promise<void> => {
  const saved = stateOf(req);
  const next = saved && NEXT_PATH.test(saved.next) ? saved.next : "/paciente";
  res.setHeader("Set-Cookie", `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/portal/google; Max-Age=0`);
  const code = typeof req.query.code === "string" ? req.query.code : "";
  if (!saved || !code || req.query.state !== saved.state) {
    res.redirect(`${next}?google=error`);
    return;
  }
  const profile = await googleProfileFromCode(code, `${baseUrl(req)}/api/portal/google/callback`);
  if (!profile) {
    res.redirect(`${next}?google=error`);
    return;
  }
  const accountId = await signInWithGoogle(profile);
  res.setHeader("Set-Cookie", [
    `${STATE_COOKIE}=; HttpOnly; SameSite=Lax; Path=/api/portal/google; Max-Age=0`,
    `${COOKIE}=${createPatientSession(accountId)}; HttpOnly; SameSite=Lax; Path=/; Max-Age=${MAX_AGE}${secure}`,
  ]);
  res.redirect(`${next}?google=ok`);
});

router.post("/portal/logout", (req, res): void => {
  destroyPatientSession(tokenOf(req));
  res.setHeader("Set-Cookie", `${COOKIE}=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0`);
  res.json({ ok: true });
});

router.get("/portal/me", async (req, res): Promise<void> => {
  const accountId = getPatientSession(tokenOf(req));
  const overview = accountId ? await portalOverview(accountId) : null;
  if (!overview) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  res.setHeader("Cache-Control", "private, no-store");
  res.json(overview);
});

router.get("/portal/results/:id", async (req, res): Promise<void> => {
  const accountId = getPatientSession(tokenOf(req));
  if (!accountId) {
    res.status(401).json({ error: "Sesión requerida." });
    return;
  }
  const path = await portalResultPath(accountId, String(req.params.id));
  const file = path ? await privatePhotoStorage.read(path).catch(() => null) : null;
  if (!file) {
    res.status(404).json({ error: "Resultado no encontrado." });
    return;
  }
  res.setHeader("Content-Type", "application/pdf");
  res.setHeader("Content-Disposition", 'inline; filename="resultados.pdf"');
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.send(file.bytes);
});

export default router;
