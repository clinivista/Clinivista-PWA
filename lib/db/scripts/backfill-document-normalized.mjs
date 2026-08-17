// One-off backfill: populate leads.document_normalized from historical document_id values.
// - Only valid Chilean RUTs (mod-11) are backfilled.
// - On historical duplicates, the oldest lead keeps the normalized value; later ones are
//   logged and left empty so the partial unique index is never violated.
// Usage: node lib/db/scripts/backfill-document-normalized.mjs
import pg from "pg";

function normalizeRut(raw) {
  const stripped = String(raw ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  return stripped.replace(/K(?=.)/g, "").slice(0, 9);
}

function computeDv(body) {
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (sum % 11);
  return rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
}

function isValidRut(raw) {
  const n = normalizeRut(raw);
  if (n.length < 8) return false;
  const body = n.slice(0, -1);
  return /^\d+$/.test(body) && computeDv(body) === n.slice(-1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    `SELECT id, document_id, document_normalized, created_at
       FROM leads
      WHERE document_id <> '' AND (document_normalized IS NULL OR document_normalized = '')
      ORDER BY created_at ASC`
  );
  const { rows: existing } = await client.query(
    `SELECT document_normalized FROM leads WHERE document_normalized <> ''`
  );
  const seen = new Set(existing.map((r) => r.document_normalized));
  let updated = 0, skippedInvalid = 0, skippedDuplicate = 0;
  for (const row of rows) {
    if (!isValidRut(row.document_id)) {
      skippedInvalid++;
      console.log(`skip (invalid RUT): lead ${row.id}`);
      continue;
    }
    const normalized = normalizeRut(row.document_id);
    if (seen.has(normalized)) {
      skippedDuplicate++;
      console.log(`skip (duplicate RUT, older lead keeps it): lead ${row.id}`);
      continue;
    }
    await client.query(`UPDATE leads SET document_normalized = $1 WHERE id = $2`, [normalized, row.id]);
    seen.add(normalized);
    updated++;
  }
  console.log(`Backfill done: ${updated} updated, ${skippedInvalid} invalid skipped, ${skippedDuplicate} duplicates skipped.`);
} finally {
  await client.end();
}
