import crypto from "crypto";
import type { UserRole } from "@workspace/db";

// In-memory session store (sufficient for MVP single-instance deployment)
export type SessionContext = {
  expiresAt: number;
  userId: string;
  // null only for "director" accounts, which aren't scoped to one clinic.
  centerId: string | null;
  role: UserRole;
};

const sessions = new Map<string, SessionContext>();

const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function createSession(context: Omit<SessionContext, "expiresAt">): string {
  const token = crypto.randomBytes(24).toString("hex");
  sessions.set(token, { ...context, expiresAt: Date.now() + SESSION_TTL_MS });
  return token;
}

export function getSession(token: string | undefined): SessionContext | undefined {
  if (!token) return undefined;
  const session = sessions.get(token);
  if (!session || session.expiresAt <= Date.now()) {
    if (session) sessions.delete(token);
    return undefined;
  }
  return session;
}

export function isValidSession(token: string | undefined): boolean {
  return Boolean(getSession(token));
}

export function destroySession(token: string | undefined): void {
  if (token) sessions.delete(token);
}

/** Closes every open session of one user (e.g. after a password reset). */
export function destroySessionsForUser(userId: string): void {
  for (const [token, session] of sessions) {
    if (session.userId === userId) sessions.delete(token);
  }
}
