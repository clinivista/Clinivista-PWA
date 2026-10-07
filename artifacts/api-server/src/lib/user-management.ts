import crypto from "crypto";
import { eq } from "drizzle-orm";
import { db, usersTable, hashPassword } from "@workspace/db";
import { destroySessionsForUser } from "./sessions";

// Sin caracteres ambiguos (0/O, 1/l/I) para que se pueda dictar o leer sin errores.
const TEMP_PASSWORD_ALPHABET = "abcdefghijkmnpqrstuvwxyzABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const TEMP_PASSWORD_LENGTH = 12;

export function generateTemporaryPassword(): string {
  return Array.from({ length: TEMP_PASSWORD_LENGTH }, () =>
    TEMP_PASSWORD_ALPHABET[crypto.randomInt(TEMP_PASSWORD_ALPHABET.length)],
  ).join("");
}

/** Sets a fresh temporary password, closes the user's sessions and returns it (shown once, never stored). */
export async function resetToTemporaryPassword(userId: string): Promise<string> {
  const temporaryPassword = generateTemporaryPassword();
  await db.update(usersTable)
    .set({ passwordHash: hashPassword(temporaryPassword), updatedAt: new Date() })
    .where(eq(usersTable.id, userId));
  destroySessionsForUser(userId);
  return temporaryPassword;
}
