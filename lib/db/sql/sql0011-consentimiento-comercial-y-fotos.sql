-- sql0011 — Fecha y versión del consentimiento comercial (opcional) del paciente.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0047).
-- Es idempotente. IMPORTANTE: si el servidor nuevo corre antes de este SQL, las consultas de pacientes fallan.
-- Los consentimientos comerciales anteriores quedan sin fecha ni versión (no se inventan).

BEGIN;

ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent_at timestamptz;
ALTER TABLE leads ADD COLUMN IF NOT EXISTS marketing_consent_version text DEFAULT '';

COMMIT;

-- Verificación: debe devolver 2.
SELECT count(*) AS columnas_nuevas
FROM information_schema.columns
WHERE table_name = 'leads' AND column_name IN ('marketing_consent_at', 'marketing_consent_version');
