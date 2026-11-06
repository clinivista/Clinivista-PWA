-- sql0019 — Correo de la clínica (lo puede completar el representante legal desde «Datos de la clínica»).
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0085). Es idempotente.
-- IMPORTANTE: si el servidor nuevo corre antes de este SQL, las consultas de datos de la clínica fallan.

BEGIN;

ALTER TABLE clinic_profiles ADD COLUMN IF NOT EXISTS email text NOT NULL DEFAULT '';

COMMIT;
