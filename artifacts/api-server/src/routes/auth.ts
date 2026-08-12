import { Router, type IRouter, type Request, type Response } from "express";
import crypto from "crypto";
import { AdminLoginBody } from "@workspace/api-zod";
import { createSession, isValidSession, destroySession } from "../lib/sessions";
import { getSessionToken } from "../lib/helpers";

const router: IRouter = Router();

const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD ?? "demo-clinivista";
const IS_DEMO_PASSWORD = !process.env.ADMIN_PASSWORD;

function getToken(req: Request): string | undefined {
  return getSessionToken(req.headers.cookie);
}

export function requireAuth(req: Request, res: Response): boolean {
  if (!isValidSession(getToken(req))) {
    res.status(401).json({ error: "Sesión requerida." });
    return false;
  }
  return true;
}

router.get("/auth/me", (req, res): void => {
  const authenticated = isValidSession(getToken(req));
  res.json({ authenticated, demoPassword: IS_DEMO_PASSWORD });
});

router.post("/auth/login", async (req, res): Promise<void> => {
  const parsed = AdminLoginBody.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Solicitud inválida." });
    return;
  }

  const given = parsed.data.password ?? "";
  const padLen = 64;
  const a = Buffer.from(given.padEnd(padLen).slice(0, padLen));
  const b = Buffer.from(ADMIN_PASSWORD.padEnd(padLen).slice(0, padLen));

  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) {
    res.status(401).json({ error: "Clave incorrecta." });
    return;
  }

  const token = createSession();
  res.setHeader(
    "Set-Cookie",
    `clinivista_session=${token}; HttpOnly; SameSite=Lax; Path=/; Max-Age=43200`,
  );
  res.json({ ok: true, demoPassword: IS_DEMO_PASSWORD });
});

router.post("/auth/logout", (req, res): void => {
  const token = getToken(req);
  destroySession(token);
  res.setHeader(
    "Set-Cookie",
    "clinivista_session=; HttpOnly; SameSite=Lax; Path=/; Max-Age=0",
  );
  res.json({ ok: true });
});

export default router;
