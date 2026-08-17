// API tests for RUT validation, consent gating and duplicate handling.
// Requires the API server to be running. Usage:
//   node artifacts/api-server/scripts/test-rut-api.mjs [baseUrl]
// Cleans up the leads it creates (via DATABASE_URL when available).

const BASE = process.argv[2] ?? "http://localhost:80/api";
const uniq = Date.now().toString(36);
const emailA = `rut-test-a-${uniq}@example.com`;
const emailB = `rut-test-b-${uniq}@example.com`;
// 21.111.111 -> dv 8? computed below dynamically to stay correct.
function computeDv(body) {
  let sum = 0, mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (sum % 11);
  return rest === 11 ? "0" : rest === 10 ? "K" : String(rest);
}
const body9 = String(90000000 + (Date.now() % 9000000));
const validRut = `${body9}-${computeDv(body9)}`;
const wrongDv = computeDv(body9) === "0" ? "1" : "0";
const invalidRut = `${body9}-${wrongDv}`;

let failures = 0;
function check(name, cond, extra = "") {
  if (cond) console.log(`PASS ${name}`);
  else { failures++; console.error(`FAIL ${name} ${extra}`); }
}

async function post(payload) {
  const res = await fetch(`${BASE}/patients`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });
  return { status: res.status, body: await res.json() };
}

const base = { name: "RUT Test", phone: "+56 912345678", email: emailA, consent: true, photos: [] };

// 1. Invalid RUT rejected with 400
let r = await post({ ...base, documentId: invalidRut });
check("invalid RUT -> 400", r.status === 400, JSON.stringify(r));

// 2. Missing/incomplete RUT rejected
r = await post({ ...base, documentId: "" });
check("empty RUT -> 400", r.status === 400, JSON.stringify(r));
r = await post({ ...base, documentId: "1234" });
check("incomplete RUT -> 400", r.status === 400, JSON.stringify(r));

// 3. Missing consent rejected
r = await post({ ...base, documentId: validRut, consent: false });
check("consent=false -> 4xx", r.status === 400 || r.status === 422, JSON.stringify(r));

// 4. Valid create succeeds and normalizes
r = await post({ ...base, documentId: validRut });
check("valid create -> 201", r.status === 201, JSON.stringify(r));
const createdLead = r.body?.lead;
check("documentNormalized stored", createdLead?.documentNormalized === validRut.replace(/[^0-9kK]/gi, "").toUpperCase());

// 5. Duplicate RUT (different phone/email) -> 409 with NO token and no data leakage
r = await post({ ...base, documentId: validRut, email: emailB, phone: "+56 998765432" });
check("duplicate RUT -> 409", r.status === 409, JSON.stringify(r));
check("duplicate response has no token", r.body?.token === undefined, JSON.stringify(r.body));
check("duplicate response has no lead data", r.body?.lead === undefined, JSON.stringify(r.body));

// 6. Duplicate did not create a second record or mutate the original
const getRes = await fetch(`${BASE}/patients/${createdLead?.token}`);
const getBody = await getRes.json();
check("original lead unchanged (email)", getBody?.lead?.email === emailA, JSON.stringify(getBody?.lead?.email));

// Cleanup
if (process.env.DATABASE_URL) {
  const { createRequire } = await import("node:module");
  const require = createRequire(new URL("../../../lib/db/package.json", import.meta.url));
  const pg = require("pg");
  const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
  await client.connect();
  await client.query("DELETE FROM leads WHERE email = ANY($1)", [[emailA, emailB]]);
  await client.end();
  console.log("cleanup done");
}

if (failures > 0) { console.error(`${failures} test(s) failed`); process.exit(1); }
console.log("All API RUT tests passed.");
