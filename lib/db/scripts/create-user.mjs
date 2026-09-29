// Create (or update) a staff/director user account.
//
// Usage:
//   node lib/db/scripts/create-user.mjs <email> <password> <role> [name] [centerId]
//
//   role       "medico" | "administrativo" | "director"
//   name       optional display name
//   centerId   required for medico/administrativo, ignored (must be omitted) for director
//
// Examples:
//   node lib/db/scripts/create-user.mjs ana@estecapelli.cl "s3cr3t-pass" medico "Dra. Ana Soto" default-center
//   node lib/db/scripts/create-user.mjs jose@clinivista.cl "another-pass" director "Jose Ferraez"
//
// Re-running with the same email updates the password/name/role/centerId of
// the existing account instead of failing on the unique-email constraint.
import crypto from "crypto";
import pg from "pg";

const KEY_LENGTH = 64;
const ROLES = ["medico", "administrativo", "director"];

function hashPassword(password) {
  const salt = crypto.randomBytes(16).toString("hex");
  const derived = crypto.scryptSync(password, salt, KEY_LENGTH);
  return `${salt}:${derived.toString("hex")}`;
}

function normalizeEmail(email) {
  return email.trim().toLowerCase();
}

const [, , email, password, role, name, centerId] = process.argv;

if (!email || !password || !role) {
  console.error("Usage: node lib/db/scripts/create-user.mjs <email> <password> <role> [name] [centerId]");
  process.exit(1);
}
if (!ROLES.includes(role)) {
  console.error(`Invalid role "${role}". Must be one of: ${ROLES.join(", ")}`);
  process.exit(1);
}
if (role === "director" && centerId) {
  console.error(`A "director" account has no centerId (it sees every clinic) — omit the centerId argument.`);
  process.exit(1);
}
if (role !== "director" && !centerId) {
  console.error(`Role "${role}" needs a centerId (which clinic this account belongs to).`);
  process.exit(1);
}
if (password.length < 8) {
  console.error("Password must be at least 8 characters.");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const emailNormalized = normalizeEmail(email);
  const passwordHash = hashPassword(password);
  const id = crypto.randomBytes(9).toString("hex");

  const { rows: existing } = await client.query(
    `SELECT id FROM users WHERE email_normalized = $1`,
    [emailNormalized],
  );

  if (existing.length > 0) {
    await client.query(
      `UPDATE users SET password_hash = $1, name = $2, role = $3, center_id = $4, active = true, updated_at = now()
       WHERE email_normalized = $5`,
      [passwordHash, name ?? "", role, centerId ?? null, emailNormalized],
    );
    console.log(`Updated existing user ${email} (role: ${role}${centerId ? `, center: ${centerId}` : ""}).`);
  } else {
    await client.query(
      `INSERT INTO users (id, email, email_normalized, password_hash, name, role, center_id, active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, true)`,
      [id, email, emailNormalized, passwordHash, name ?? "", role, centerId ?? null],
    );
    console.log(`Created user ${email} (role: ${role}${centerId ? `, center: ${centerId}` : ""}).`);
  }
} finally {
  await client.end();
}
