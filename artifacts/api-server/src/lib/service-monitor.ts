import dns from "node:dns/promises";
import tls from "node:tls";
import { AwsClient } from "aws4fetch";
import { eq, sql } from "drizzle-orm";
import { db, adminServicesTable, adminServiceStatusTable, adminSettingsTable } from "@workspace/db";
import { readS3Config } from "./clinical-photo-storage";
import { googleConfig } from "./google-auth";
import { sendMail } from "./mailer";
import { logger } from "./logger";

export type CheckStatus = "ok" | "warn" | "fail" | "unknown";
export type CheckResult = { key: string; status: CheckStatus; detail: string };

export const CHECK_LABELS: Record<string, string> = {
  database: "Base de datos (Neon)",
  storage: "Fotos clínicas (almacenamiento R2)",
  email: "Correo (Resend)",
  google: "Ingreso con Google",
  dns: "Dominio y DNS",
  https: "Aplicación y certificado HTTPS",
  github: "Código y despliegue (GitHub)",
};
export const CHECK_KEYS = Object.keys(CHECK_LABELS);

const TIMEOUT = 10_000;
const FAILS_BEFORE_ALERT = 2;
const REMINDER_MS = 24 * 3600_000;
const CERT_WARN_DAYS = 14;
const RENEWAL_WARN_DAYS = 7;

const appUrl = () => {
  try { return process.env.PUBLIC_APP_URL ? new URL(process.env.PUBLIC_APP_URL) : undefined; } catch { return undefined; }
};
const errText = (e: unknown) => (e instanceof Error ? e.message : String(e)).slice(0, 160);

async function checkDatabase(): Promise<CheckResult> {
  try { await db.execute(sql`select 1`); return { key: "database", status: "ok", detail: "Responde correctamente." }; }
  catch (e) { return { key: "database", status: "fail", detail: `No responde: ${errText(e)}` }; }
}

/** Pide un objeto inexistente con firma: 404 = bucket y claves válidas; 403 = claves rechazadas. No escribe nada. */
async function checkStorage(): Promise<CheckResult> {
  let config;
  try { config = readS3Config(); } catch (e) { return { key: "storage", status: "fail", detail: errText(e) }; }
  if (!config) return { key: "storage", status: "unknown", detail: "No hay bucket configurado (modo desarrollo)." };
  try {
    const client = new AwsClient({ accessKeyId: config.accessKeyId, secretAccessKey: config.secretAccessKey, service: "s3", region: config.region });
    const url = new URL(`${config.endpoint}/${config.bucket}/__healthcheck__`);
    url.searchParams.set("X-Amz-Expires", "60");
    const signed = await client.sign(url.toString(), { method: "GET", aws: { signQuery: true } });
    const response = await fetch(signed.url, { signal: AbortSignal.timeout(TIMEOUT) });
    if (response.status === 200 || response.status === 404) return { key: "storage", status: "ok", detail: "El bucket responde y las claves son válidas." };
    if (response.status === 403 || response.status === 401) return { key: "storage", status: "fail", detail: "El almacenamiento rechazó las claves (¿cuenta suspendida o claves revocadas?)." };
    return { key: "storage", status: "fail", detail: `El almacenamiento respondió ${response.status}.` };
  } catch (e) { return { key: "storage", status: "fail", detail: `No se pudo contactar el almacenamiento: ${errText(e)}` }; }
}

async function checkEmail(): Promise<CheckResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key || !process.env.MAIL_FROM) return { key: "email", status: "warn", detail: "El correo no está configurado (faltan RESEND_API_KEY o MAIL_FROM)." };
  try {
    const response = await fetch("https://api.resend.com/domains", { headers: { Authorization: `Bearer ${key}` }, signal: AbortSignal.timeout(TIMEOUT) });
    if (response.ok) {
      const body = (await response.json().catch(() => ({}))) as { data?: Array<{ name?: string; status?: string }> };
      const domains = body.data ?? [];
      const bad = domains.filter((d) => d.status && d.status !== "verified");
      if (bad.length) return { key: "email", status: "warn", detail: `Dominio sin verificar en Resend: ${bad.map((d) => d.name).join(", ")}.` };
      return { key: "email", status: "ok", detail: domains.length ? `Resend responde; ${domains.length} dominio(s) verificado(s).` : "Resend responde." };
    }
    const body = (await response.json().catch(() => ({}))) as { name?: string };
    if (response.status === 401 && body.name === "restricted_api_key") return { key: "email", status: "ok", detail: "Resend responde (clave solo de envío)." };
    if (response.status === 401 || response.status === 403) return { key: "email", status: "fail", detail: "Resend rechazó la clave (¿revocada o cuenta suspendida?)." };
    return { key: "email", status: "fail", detail: `Resend respondió ${response.status}.` };
  } catch (e) { return { key: "email", status: "fail", detail: `No se pudo contactar Resend: ${errText(e)}` }; }
}

async function checkGoogle(): Promise<CheckResult> {
  if (!googleConfig()) return { key: "google", status: "unknown", detail: "El ingreso con Google no está activado." };
  try {
    const response = await fetch("https://accounts.google.com/.well-known/openid-configuration", { signal: AbortSignal.timeout(TIMEOUT) });
    return response.ok ? { key: "google", status: "ok", detail: "Google responde y las claves están configuradas." } : { key: "google", status: "fail", detail: `Google respondió ${response.status}.` };
  } catch (e) { return { key: "google", status: "fail", detail: `No se pudo contactar Google: ${errText(e)}` }; }
}

/** El DNS debe responder con servidores de nombres: si la zona se borra, deja de hacerlo. */
async function checkDns(): Promise<CheckResult> {
  const url = appUrl();
  if (!url) return { key: "dns", status: "unknown", detail: "PUBLIC_APP_URL no está definido." };
  const parts = url.hostname.split(".");
  const apex = parts.slice(-2).join(".");
  if (parts.length < 2 || /^\d+(\.\d+){3}$/.test(url.hostname) || url.hostname === "localhost") return { key: "dns", status: "unknown", detail: "No aplica con una dirección local." };
  try {
    const ns = await dns.resolveNs(apex);
    if (!ns.length) return { key: "dns", status: "fail", detail: `${apex} no tiene servidores de nombres.` };
    try { await dns.lookup(url.hostname); } catch { return { key: "dns", status: "fail", detail: `${url.hostname} no resuelve a ninguna dirección.` }; }
    return { key: "dns", status: "ok", detail: `${apex} resuelve (${ns.slice(0, 2).join(", ")}).` };
  } catch (e) { return { key: "dns", status: "fail", detail: `El dominio ${apex} no responde en DNS: ${errText(e)}` }; }
}

function certDaysLeft(host: string): Promise<number> {
  return new Promise((resolve, reject) => {
    const socket = tls.connect({ host, port: 443, servername: host, timeout: TIMEOUT }, () => {
      const cert = socket.getPeerCertificate();
      socket.end();
      resolve(Math.floor((new Date(cert.valid_to).getTime() - Date.now()) / 86_400_000));
    });
    socket.on("error", reject);
    socket.on("timeout", () => { socket.destroy(); reject(new Error("tiempo agotado")); });
  });
}

async function checkHttps(): Promise<CheckResult> {
  const url = appUrl();
  if (!url || url.protocol !== "https:" || url.hostname === "localhost") return { key: "https", status: "unknown", detail: "No aplica fuera de producción." };
  try {
    const response = await fetch(new URL("/api/healthz", url), { signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) return { key: "https", status: "fail", detail: `La aplicación respondió ${response.status} desde su dirección pública.` };
    const days = await certDaysLeft(url.hostname);
    if (days < 0) return { key: "https", status: "fail", detail: "El certificado HTTPS está vencido." };
    if (days < CERT_WARN_DAYS) return { key: "https", status: "warn", detail: `El certificado HTTPS vence en ${days} día(s).` };
    return { key: "https", status: "ok", detail: `Responde por su dirección pública; certificado vigente (${days} días).` };
  } catch (e) { return { key: "https", status: "fail", detail: `No se pudo abrir ${url.origin}: ${errText(e)}` }; }
}

/**
 * GitHub guarda el código y dispara los despliegues. Con GITHUB_TOKEN y GITHUB_REPO
 * (owner/repo, token de solo lectura) se comprueba que la cuenta y el repositorio
 * sigan accesibles; sin ellos solo se mira el estado público de GitHub.
 */
async function checkGithub(): Promise<CheckResult> {
  const token = process.env.GITHUB_TOKEN?.trim();
  const repo = process.env.GITHUB_REPO?.trim();
  try {
    if (token && repo && /^[\w.-]+\/[\w.-]+$/.test(repo)) {
      const response = await fetch(`https://api.github.com/repos/${repo}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/vnd.github+json", "User-Agent": "clinivista-monitor" },
        signal: AbortSignal.timeout(TIMEOUT),
      });
      if (response.ok) {
        const body = (await response.json().catch(() => ({}))) as { archived?: boolean; disabled?: boolean; pushed_at?: string };
        if (body.disabled || body.archived) return { key: "github", status: "fail", detail: `El repositorio ${repo} está ${body.disabled ? "deshabilitado" : "archivado"}.` };
        return { key: "github", status: "ok", detail: `Repositorio ${repo} accesible${body.pushed_at ? `; último push ${body.pushed_at.slice(0, 10)}` : ""}.` };
      }
      if (response.status === 401) return { key: "github", status: "fail", detail: "GitHub rechazó el token (¿vencido o revocado?)." };
      if (response.status === 403) return { key: "github", status: "fail", detail: "GitHub negó el acceso (¿cuenta suspendida o límite alcanzado?)." };
      if (response.status === 404) return { key: "github", status: "fail", detail: `No se encuentra el repositorio ${repo} o el token no tiene acceso.` };
      return { key: "github", status: "fail", detail: `GitHub respondió ${response.status}.` };
    }
    const response = await fetch("https://www.githubstatus.com/api/v2/status.json", { signal: AbortSignal.timeout(TIMEOUT) });
    if (!response.ok) return { key: "github", status: "unknown", detail: "No se pudo consultar el estado público de GitHub." };
    const body = (await response.json()) as { status?: { indicator?: string; description?: string } };
    const hint = " Para vigilar también tu cuenta y repositorio, define GITHUB_TOKEN y GITHUB_REPO en el servidor.";
    return body.status?.indicator === "none"
      ? { key: "github", status: "ok", detail: `GitHub operativo.${hint}` }
      : { key: "github", status: "warn", detail: `GitHub informa: ${body.status?.description ?? "incidente"}.${hint}` };
  } catch (e) { return { key: "github", status: "unknown", detail: `No se pudo consultar GitHub: ${errText(e)}` }; }
}

export async function runAllChecks(): Promise<CheckResult[]> {
  return Promise.all([checkDatabase(), checkStorage(), checkEmail(), checkGoogle(), checkDns(), checkHttps(), checkGithub()]);
}

// ── Destinatarios de las alertas ─────────────────────────────────────────

export async function getAlertEmails(): Promise<string[]> {
  const [row] = await db.select().from(adminSettingsTable).where(eq(adminSettingsTable.key, "alert_emails"));
  const raw = row?.value ?? process.env.ALERT_EMAILS ?? "";
  return raw.split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter((e) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e));
}

export async function setAlertEmails(emails: string[]): Promise<void> {
  const value = emails.join(",");
  await db.insert(adminSettingsTable).values({ key: "alert_emails", value }).onConflictDoUpdate({ target: adminSettingsTable.key, set: { value } });
}

async function notify(subject: string, body: string): Promise<void> {
  const recipients = await getAlertEmails();
  if (!recipients.length) { logger.warn({ subject }, "Alerta de servicio sin destinatarios configurados"); return; }
  const html = `<div style="font-family:system-ui,sans-serif;font-size:15px;line-height:1.5"><p>${body.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/\n/g, "<br>")}</p><p style="color:#667">Revisa el panel de supra-control → Administración → Servicios.</p></div>`;
  for (const to of recipients) {
    try { await sendMail({ to, subject, text: body, html }); }
    catch (err) { logger.error({ err, to }, "No se pudo enviar la alerta de servicio"); }
  }
}

// ── Estado guardado y alertas ────────────────────────────────────────────

/**
 * Guarda los resultados y decide qué avisar: un fallo se avisa tras
 * FAILS_BEFORE_ALERT revisiones seguidas (evita falsas alarmas), se recuerda
 * cada 24 h mientras dure y se avisa cuando se recupera.
 */
export async function applyResults(results: CheckResult[], now = new Date(), send: typeof notify = notify): Promise<void> {
  const rows = await db.select().from(adminServiceStatusTable);
  const previous = new Map(rows.map((r) => [r.checkKey, r]));
  for (const r of results) {
    const before = previous.get(r.key);
    let failures = before?.failures ?? 0;
    let alerted = before?.alerted ?? false;
    let lastAlertAt = before?.lastAlertAt ?? null;
    const label = CHECK_LABELS[r.key] ?? r.key;
    if (r.status === "fail") {
      failures += 1;
      const dueReminder = alerted && lastAlertAt && now.getTime() - lastAlertAt.getTime() >= REMINDER_MS;
      if (failures >= FAILS_BEFORE_ALERT && (!alerted || dueReminder)) {
        await send(`⚠ Clinivista: falla en ${label}`, `${label} está fallando.\n\nDetalle: ${r.detail}\n\nSi es un servicio externo, revisa tu cuenta con ese proveedor (pagos, suspensión, claves).`);
        alerted = true; lastAlertAt = now;
      }
    } else {
      failures = 0;
      if (alerted) {
        await send(`✔ Clinivista: ${label} se recuperó`, `${label} volvió a funcionar.\n\nDetalle: ${r.detail}`);
        alerted = false;
      }
    }
    const changed = !before || before.status !== r.status;
    const values = { checkKey: r.key, status: r.status, detail: r.detail, checkedAt: now, changedAt: changed ? now : before!.changedAt, failures, alerted, lastAlertAt };
    await db.insert(adminServiceStatusTable).values(values).onConflictDoUpdate({ target: adminServiceStatusTable.checkKey, set: values });
  }
}

const dayDiff = (isoDate: string, now: Date) => Math.ceil((new Date(`${isoDate}T23:59:59-03:00`).getTime() - now.getTime()) / 86_400_000);

export async function upcomingRenewals(now = new Date()) {
  const services = await db.select().from(adminServicesTable).where(eq(adminServicesTable.active, true));
  return services
    .filter((s) => s.renewalDate && s.billingCycle !== "none")
    .map((s) => ({ id: s.id, name: s.name, renewalDate: s.renewalDate!, days: dayDiff(s.renewalDate!, now), alertedFor: s.renewalAlertedFor }))
    .filter((s) => s.days <= RENEWAL_WARN_DAYS)
    .sort((a, b) => a.days - b.days);
}

/** Avisa una sola vez por correo de cada renovación próxima (o vencida). */
export async function alertRenewals(now = new Date(), send: typeof notify = notify): Promise<number> {
  const due = (await upcomingRenewals(now)).filter((s) => s.alertedFor !== s.renewalDate);
  for (const s of due) {
    const when = s.days < 0 ? `venció hace ${-s.days} día(s)` : s.days === 0 ? "vence hoy" : `vence en ${s.days} día(s)`;
    await send(`Clinivista: renovación de ${s.name}`, `La renovación de ${s.name} (${s.renewalDate}) ${when}.\n\nAsegúrate de que el pago esté al día para que el servicio no se suspenda.`);
    await db.update(adminServicesTable).set({ renewalAlertedFor: s.renewalDate }).where(eq(adminServicesTable.id, s.id));
  }
  return due.length;
}

export async function runMonitorTick(): Promise<void> {
  await applyResults(await runAllChecks());
  await alertRenewals();
}

export async function currentStatuses() {
  const rows = await db.select().from(adminServiceStatusTable);
  const byKey = new Map(rows.map((r) => [r.checkKey, r]));
  return CHECK_KEYS.map((key) => {
    const row = byKey.get(key);
    return { key, label: CHECK_LABELS[key]!, status: row?.status ?? ("unknown" as CheckStatus), detail: row?.detail ?? "Aún sin revisar.", checkedAt: row?.checkedAt.toISOString() ?? null, since: row?.changedAt.toISOString() ?? null };
  });
}
