-- sql0018 — WhatsApp de la clínica y links de agendamiento en línea (Medilink, AgendaPro, Reservo).
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0076). Es idempotente.
-- IMPORTANTE: si el servidor nuevo corre antes de este SQL, las consultas de datos de la clínica fallan.

BEGIN;

ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS whatsapp text NOT NULL DEFAULT '';

CREATE TABLE IF NOT EXISTS clinic_booking_links (
  center_id text NOT NULL,
  integration text NOT NULL,
  url text NOT NULL,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS clinic_booking_links_center_integration_idx
  ON clinic_booking_links (center_id, integration);

COMMIT;

-- Verificación: debe devolver 2 (la columna y la tabla).
SELECT (SELECT count(*) FROM information_schema.columns WHERE table_name = 'clinic_profiles' AND column_name = 'whatsapp')
     + (SELECT count(*) FROM information_schema.tables WHERE table_name = 'clinic_booking_links') AS piezas_nuevas;
