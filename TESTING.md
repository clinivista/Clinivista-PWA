# Testing

## Automated tests

Run everything from the repo root:

```bash
pnpm test
```

This runs Vitest in each workspace package that defines a `test` script:

- **`artifacts/estecapelli`** (frontend, jsdom + Testing Library)
  - `src/lib/rut.test.ts` — RUT utility: `12.345.678-5` accepted, `12345678-5` normalises to the same value, `12.345.678-9` rejected (bad check digit), `k` → `K`, empty and short-body inputs handled.
  - `src/pages/patient-form.test.tsx` — patient data step: city starts empty, "Continuar a Fotografías" disabled without consent, enabled once all fields are valid + consent ticked, RUT error shown on blur, RUT input masked while typing.
- **`artifacts/api-server`** (API, Vitest + Supertest against an in-memory PGlite Postgres — no real database or real patient data touched)
  - `src/lib/rut.test.ts` — server-side RUT utility mirror.
  - `src/routes/patients.test.ts` — POST `/patients`: 201 + token on valid submission, 400 on missing consent field, 422 on `consent: false`, 400 on invalid RUT, 409 on duplicate RUT (no second record, existing token never leaked), 409 on duplicate phone; GET `/patients/:token`: 404 on unknown token, summary never includes photos; PUT: 404 unknown token, 409 RUT clash with another lead, self-update OK.

All test fixtures use fake data only (generic RUT `12.345.678-5`, `example.com` emails). No real patient data may ever be added to fixtures.

## Manual test checklist (browser-specific)

Run these before a release; automated tests cannot cover them. Mark each ✅/❌ with the date.

| # | Check | How | Status |
|---|-------|-----|--------|
| 1 | Camera stops on exit | Start the photo step, open the camera, then exit the flow (back button / "Salir"). The camera indicator light must turn off and the browser must show no active media capture. | ⬜ Not yet run |
| 2 | File upload works on Mac (Safari & Chrome) | On macOS, use "Subir desde el dispositivo" and pick a JPEG/PNG/HEIC-converted file; preview and "Usar esta foto" must work. | ⬜ Not yet run |
| 3 | WhatsApp link opens directly to pre-evaluation | Send an invitation link via WhatsApp, tap it on a phone: the in-app browser must land on the pre-evaluation with the token applied (no login wall, no broken redirect). | ⬜ Not yet run |
| 4 | Admin panel smoke test | Log into the admin panel: the leads list loads, a lead can be opened, and its status can be changed and persists after refresh. | ⬜ Not yet run |

When a check is run, replace ⬜ with ✅ Pass / ❌ Fail + date (e.g. `✅ 2026-08-17`).
