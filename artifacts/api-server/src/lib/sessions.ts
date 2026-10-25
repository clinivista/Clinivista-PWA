import crypto from "crypto";
import type { UserRole } from "@workspace/db";

// In-memory session store (sufficient for MVP single-instance deployment)
export type SessionContext = {
  expiresAt: number;
  userId: string;
  // null only for "director" accounts, which aren't scoped to one clinic.
  centerId: string | null;
  role: UserRole;
  /** Directors only: the clinic they are working inside right now (they keep their director role). */
  viewingCenterId?: string | null;
  /** Directors only: inside the clinic they act as its legal representative (configure phases, reports). */
  viewingLegal?: boolean;
  /** Directors only: the role they work as inside that clinic (default médico, which covers everything). */
  viewingRole?: "medico" | "administrativo";
  /** Directors only: they already picked "Supra-control" on the clinic chooser. */
  supraChosen?: boolean;
  /**
   * Staff only: every account (one per clinic, same email) whose password matched at
   * sign-in. Choosing a clinic switches the session to that clinic's account.
   */
  linkedUserIds?: string[];
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
    if (session.userId === userId || session.linkedUserIds?.includes(userId)) sessions.delete(token);
  }
}

/**
 * Moves a staff session to another of its linked accounts (one per clinic).
 * `centerId: null` sends it back to the clinic chooser.
 */
export function setSessionAccount(token: string | undefined, account: { userId: string; centerId: string | null; role: UserRole }): boolean {
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now()) return false;
  if (session.linkedUserIds && !session.linkedUserIds.includes(account.userId)) return false;
  session.userId = account.userId;
  session.centerId = account.centerId;
  session.role = account.role;
  return true;
}

/** A director enters (or, with null, leaves) a clinic's panel without being assigned to it. */
export function setSessionViewing(token: string | undefined, centerId: string | null, profile: "medico" | "administrativo" | "representante_legal" = "medico"): boolean {
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now() || session.role !== "director") return false;
  session.viewingCenterId = centerId;
  applyEntryProfile(session, centerId ? profile : undefined);
  session.supraChosen = centerId ? false : true;
  return true;
}

/** Directors: back to the chooser (clinics + supra-control) instead of any panel. */
export function setSessionDirectorChoice(token: string | undefined): boolean {
  const session = token ? sessions.get(token) : undefined;
  if (!session || session.expiresAt <= Date.now() || session.role !== "director") return false;
  session.viewingCenterId = null;
  session.supraChosen = false;
  return true;
}

/** Closes every open session of one user except the one that is making the change. */
export function destroyOtherSessionsForUser(userId: string, keepToken: string | undefined): void {
  for (const [token, session] of sessions) {
    if (token !== keepToken && session.userId === userId) sessions.delete(token);
  }
}

function applyEntryProfile(session: SessionContext, profile: "medico" | "administrativo" | "representante_legal" | undefined): void {
  session.viewingRole = profile === undefined ? undefined : profile === "administrativo" ? "administrativo" : "medico";
  session.viewingLegal = profile === "representante_legal";
}

/** The director changed their entry profile: it also applies to the clinic they are inside right now. */
export function setDirectorProfileEverywhere(userId: string, profile: "medico" | "administrativo" | "representante_legal"): void {
  for (const session of sessions.values()) {
    if (session.userId === userId && session.role === "director" && session.viewingCenterId) applyEntryProfile(session, profile);
  }
}
