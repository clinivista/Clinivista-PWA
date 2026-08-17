#!/bin/bash
set -e
pnpm install --frozen-lockfile
pnpm --filter db push
# Backfill leads.document_normalized from historical document_id values (idempotent:
# only touches rows where the normalized value is still empty; skips invalid/duplicate RUTs).
node lib/db/scripts/backfill-document-normalized.mjs
