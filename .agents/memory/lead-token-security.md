---
name: Lead token security & RUT dedup
description: Rules for duplicate handling and token exposure on the unauthenticated patient API
---
The lead `token` is the sole bearer credential for reading/updating a patient record (GET/PUT /patients/:token).

**Rule:** Never return an existing lead's token or lead data from unauthenticated endpoints (e.g. 409 duplicate responses must be generic), and never auto-attach a new submission to an existing lead based on matching RUT/phone/email — that enables record takeover by anyone who knows a patient's RUT.

**Why:** Completion review rejected an implementation that returned the token on duplicate-RUT 409 so the frontend could PUT to the existing record.

**How to apply:** Duplicate detection uses `leads.document_normalized` (digits+K, partial unique index; backfill runs idempotently in `scripts/post-merge.sh`). Patients who already registered must reuse their original invitation link to update. RUT mod-11 logic is mirrored in `src/lib/rut.ts` on both frontend and api-server — keep them in sync.
