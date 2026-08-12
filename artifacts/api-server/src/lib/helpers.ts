import crypto from "crypto";

export function uid(bytes = 12): string {
  return crypto.randomBytes(bytes).toString("hex");
}

export function clean(value: unknown, max = 500): string {
  return String(value ?? "").trim().replace(/[<>]/g, "").slice(0, max);
}

export function cleanPhone(value: unknown): string {
  return clean(value, 30).replace(/[^+\d]/g, "");
}

export function getSessionToken(cookieHeader: string | undefined): string | undefined {
  if (!cookieHeader) return undefined;
  const match = cookieHeader.match(/(?:^|;)\s*clinivista_session=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : undefined;
}
