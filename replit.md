# Estecapelli — PWA de Preevaluación Capilar

PWA comercial de preevaluación capilar para la clínica Estecapelli. Permite que los pacientes completen un formulario de 3 pasos (datos + 5 fotos guiadas) desde su celular, enviado por enlace WhatsApp. El equipo de la clínica gestiona los casos desde un panel administrativo protegido por contraseña.

## Run & Operate

- `pnpm --filter @workspace/api-server run dev` — servidor API (puerto dinámico, ruta `/api`)
- `pnpm --filter @workspace/estecapelli run dev` — frontend PWA (ruta `/`)
- `pnpm run typecheck` — typecheck completo
- `pnpm --filter @workspace/api-spec run codegen` — regenerar hooks y schemas desde OpenAPI
- `pnpm --filter @workspace/db run push` — aplicar cambios de schema a la DB
- Required env: `DATABASE_URL`, `ADMIN_PASSWORD` (opcional, default: `demo-estecapelli`)

## Stack

- pnpm workspaces, Node.js 24, TypeScript 5.9
- Frontend: React 18 + Vite + Tailwind CSS v4 + shadcn/ui + wouter + TanStack Query
- API: Express 5 + Pino structured logging
- DB: PostgreSQL + Drizzle ORM
- Validation: Zod v4, drizzle-zod
- API codegen: Orval (desde OpenAPI spec)

## Where things live

- `lib/api-spec/openapi.yaml` — fuente de verdad del contrato API
- `lib/db/src/schema/leads.ts` — schema Drizzle de la tabla `leads`
- `artifacts/api-server/src/routes/` — rutas Express (auth, leads, patients, invitations)
- `artifacts/api-server/src/lib/sessions.ts` — gestión de sesiones admin (in-memory)
- `artifacts/estecapelli/src/pages/` — páginas React (home, patient, admin, login)

## Architecture decisions

- Fotos almacenadas como JSONB en Postgres (comprimidas a max 1400px, JPEG 0.72). MVP válido; migrar a object storage para producción.
- Sesiones admin en memoria (Map). Suficiente para instancia única. Para producción usar Redis o DB.
- Pacientes se identifican por token opaco único (no requieren cuenta de usuario).
- `ADMIN_PASSWORD` configura la clave del panel. Si no está definida, usa `demo-estecapelli` y muestra aviso.

## Product

- **Landing page** (`/`): presenta el flujo de 3 pasos, CTA a iniciar evaluación y a panel del equipo
- **Flujo paciente** (`/patient` o `/?token=<token>`): intro → formulario de datos → 5 fotos guiadas → confirmación
- **Login admin** (`/admin/login`): acceso con contraseña definida en Replit Secrets
- **Panel admin** (`/admin`): métricas, lista de leads con filtros, creación de invitaciones WhatsApp, drawer de detalle con fotos, estado, Norwood, notas internas, fecha de consulta

## User preferences

_Agrega instrucciones explícitas aquí según las solicitudes del usuario._

## Gotchas

- Los campos `type: integer` en OpenAPI generan `zod.int()` que no existe en zod v3. Usar `type: number`.
- El `@import` de Google Fonts debe ir en `index.html` (como `<link>`), no en el CSS de Tailwind v4.
- Las sesiones admin se pierden si el servidor reinicia (comportamiento esperado para MVP).
- Para pruebas: clave demo es `demo-estecapelli`. Configurar `ADMIN_PASSWORD` en Replit Secrets antes de usar en producción.

## Pointers

- Ver skill `pnpm-workspace` para estructura del monorepo y TypeScript
- Ver `lib/api-spec/openapi.yaml` para el contrato completo de la API
