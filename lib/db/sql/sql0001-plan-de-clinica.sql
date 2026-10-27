-- sql0001 — Plan de cada clínica (basic | unlimited | titanium).
--
-- Ejecutar en Neon ANTES de fusionar el PR «Video por fotografía (plan Titanium)».
-- Es idempotente: se puede correr más de una vez sin error y no modifica datos
-- existentes (todas las clínicas quedan en 'basic', que no les quita nada).
-- Coincide con lib/db/src/schema/clinical.ts, así que `pnpm --filter db push`
-- no verá diferencias después.

BEGIN;

ALTER TABLE clinical_centers
  ADD COLUMN IF NOT EXISTS plan text NOT NULL DEFAULT 'basic';

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint
    WHERE conname = 'clinical_centers_plan_check'
      AND conrelid = 'clinical_centers'::regclass
  ) THEN
    ALTER TABLE clinical_centers
      ADD CONSTRAINT clinical_centers_plan_check
      CHECK (plan IN ('basic', 'unlimited', 'titanium'));
  END IF;
END $$;

COMMIT;

-- Comprobación (debe listar todas las clínicas con su plan):
-- SELECT id, name, plan FROM clinical_centers ORDER BY name;
