-- sql0008 — Cumplimiento de la Ley 21.719: prueba del consentimiento, solicitudes de los titulares
-- y registro de acceso del personal a las fichas.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Cumplimiento de datos personales».
-- Es idempotente. Si el servidor corre antes que este archivo, el registro de pacientes y la
-- apertura de fichas pueden fallar hasta que se cree lo que falta: ejecútalo primero.

BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS consent_policy_version text DEFAULT '';

CREATE TABLE IF NOT EXISTS data_requests (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  lead_id text NOT NULL,
  type text NOT NULL,
  message text NOT NULL DEFAULT '',
  status text NOT NULL DEFAULT 'pending',
  due_at timestamptz NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_name text NOT NULL DEFAULT '',
  resolution_note text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS data_requests_center_idx ON data_requests (center_id, status);

CREATE TABLE IF NOT EXISTS staff_access_events (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  lead_id text NOT NULL,
  user_id text NOT NULL,
  action text NOT NULL,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE INDEX IF NOT EXISTS staff_access_events_lead_idx ON staff_access_events (lead_id, created_at);

COMMIT;

-- Comprobación (debe devolver 0, 0):
-- SELECT (SELECT count(*) FROM data_requests) AS solicitudes, (SELECT count(*) FROM staff_access_events) AS accesos;
