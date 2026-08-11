import crypto from "crypto";

// In-memory session store (sufficient for MVP single-instance deployment)
const sessions = new Map<string, { expiresAt: number }>();

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function createSession(): string {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function isValidSession(token: string | undefined): boolean {
  if (!token) return false;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return false;
  }
  return true;
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}
