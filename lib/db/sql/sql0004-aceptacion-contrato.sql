-- sql0004 — Registro de aceptación del contrato de servicio.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Contrato de servicio: aceptación en línea».
-- Es idempotente. Si el servidor corre antes que este archivo, no falla: el contrato no se ofrece.

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_contract_acceptances (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  plan text NOT NULL,
  contract_version text NOT NULL,
  contract_hash text NOT NULL,
  accepted_by_user_id text NOT NULL,
  accepted_by_name text NOT NULL DEFAULT '',
  accepted_by_email text NOT NULL DEFAULT '',
  accepted_by_role text NOT NULL DEFAULT '',
  ip text,
  user_agent text,
  accepted_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS clinic_contract_acceptances_center_idx ON clinic_contract_acceptances (center_id, accepted_at);

COMMIT;

-- Comprobación (debe devolver 0 filas al comienzo):
-- SELECT count(*) FROM clinic_contract_acceptances;
