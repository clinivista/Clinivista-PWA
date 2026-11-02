-- sql0009 — El paciente puede modificar su evaluación mientras la clínica no la haya revisado.
-- Después de la revisión envía información adicional, sin sobrescribir lo anterior.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0041).
-- Es idempotente. Si el servidor corre antes, el registro de novedades queda sin guardarse
-- (no rompe la evaluación), pero la información adicional falla hasta crear las tablas.

BEGIN;

CREATE TABLE IF NOT EXISTS patient_updates (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  lead_id text NOT NULL,
  kind text NOT NULL,
  summary text NOT NULL DEFAULT '',
  details jsonb NOT NULL DEFAULT '{}'::jsonb,
  created_at timestamptz NOT NULL DEFAULT now(),
  seen_at timestamptz,
  seen_by_name text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS patient_updates_lead_idx ON patient_updates (center_id, lead_id, seen_at);

CREATE TABLE IF NOT EXISTS patient_additions (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  lead_id text NOT NULL,
  note text NOT NULL DEFAULT '',
  files jsonb NOT NULL DEFAULT '[]'::jsonb,
  status text NOT NULL DEFAULT 'pending',
  created_at timestamptz NOT NULL DEFAULT now(),
  resolved_at timestamptz,
  resolved_by_name text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS patient_additions_lead_idx ON patient_additions (center_id, lead_id);

COMMIT;

-- Verificación (debe devolver 0 y 0):
SELECT (SELECT count(*) FROM patient_updates) AS novedades, (SELECT count(*) FROM patient_additions) AS adicionales;
