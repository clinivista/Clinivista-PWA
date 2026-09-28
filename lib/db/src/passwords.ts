import crypto from "crypto";

// scrypt with a random per-password salt. No extra dependency (bcrypt/argon2)
// needed for an MVP user base of a few staff accounts per clinic; revisit if
// this ever needs to scale to self-serve signup at volume.
const KEY_LENGTH = 64;

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hashHex] = stored.split(":");
  if (!salt || !hashHex) return false;
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  const stored_ = Buffer.from(hashHex, "hex");
  if (derived.length !== stored_.length) return false;
  return crypto.timingSafeEqual(derived, stored_);
}

export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}
