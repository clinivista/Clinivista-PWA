-- sql0003 — Límites por clínica, registro de horas y suspensión por pago.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Planes: cuotas, horas y cobro».
-- Es idempotente: se puede correr más de una vez sin error.
--
-- Las clínicas que ya existen quedan SIN límites (0 = sin límite) y con la
-- suspensión automática apagada, así que nada cambia para ellas hasta que
-- supra-control lo parametrice. Las clínicas nuevas parten con los valores de su plan.
-- Si el servidor corre antes que este archivo, no falla: trata todo como «sin límites».

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_plan_settings (
  center_id text PRIMARY KEY,
  patients_per_month integer,
  storage_gb integer,
  pending_plan text,
  pending_plan_from timestamptz,
  billing_auto boolean NOT NULL DEFAULT false,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS clinic_hours_ledger (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  kind text NOT NULL,
  minutes integer NOT NULL,
  note text NOT NULL DEFAULT '',
  created_by text,
  created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT clinic_hours_kind_check CHECK (kind IN ('incluidas', 'compradas', 'usadas', 'ajuste'))
);

CREATE INDEX IF NOT EXISTS clinic_hours_ledger_center_idx ON clinic_hours_ledger (center_id, created_at);

-- Congela a las clínicas existentes: sin tope de pacientes ni de almacenamiento.
INSERT INTO clinic_plan_settings (center_id, patients_per_month, storage_gb)
SELECT id, 0, 0 FROM clinical_centers
ON CONFLICT (center_id) DO NOTHING;

-- Conserva la cuota de transcripciones que cada clínica tiene hoy (100 si nunca se configuró).
INSERT INTO clinic_transcription_settings (center_id, monthly_quota, advanced_enabled)
SELECT id, 100, false FROM clinical_centers
ON CONFLICT (center_id) DO NOTHING;

COMMIT;

-- Comprobación (cada clínica con sus límites):
-- SELECT c.name, c.plan, s.patients_per_month, s.storage_gb, s.billing_auto
-- FROM clinical_centers c LEFT JOIN clinic_plan_settings s ON s.center_id = c.id ORDER BY c.name;
