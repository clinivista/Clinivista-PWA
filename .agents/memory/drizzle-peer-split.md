---
name: Drizzle peer-instance split with PGlite
description: Adding @electric-sql/pglite to only one workspace package breaks typecheck across packages sharing drizzle-orm.
---

Rule: any workspace package that adds an optional drizzle-orm peer (e.g. `@electric-sql/pglite` for in-memory test DBs) must add it to **every** package that shares drizzle types — in this repo both `artifacts/api-server` and `lib/db`.

**Why:** pnpm instantiates drizzle-orm once per resolved peer set. With pglite in only one package, `leadsTable` (from lib/db) and `eq`/`sql` (from api-server) come from two type-incompatible drizzle instances → cryptic "private property 'shouldInlineParams'" tsc errors in unrelated route files.

**How to apply:** API route tests mock `@workspace/db` with PGlite + `drizzle-orm/pglite` (see `artifacts/api-server/src/routes/patients.test.ts`). If typecheck suddenly fails with cross-instance SQL type errors after a dep change, check for peer-set drift between these packages.
