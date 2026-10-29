-- sql0005 — Enlaces únicos para enviar el contrato por correo al representante legal.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Contrato por correo».
-- Requiere haber ejecutado sql0004. Es idempotente. Si el servidor corre antes que este archivo,
-- no falla: el envío por correo simplemente no se ofrece.

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_contract_invites (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  user_id text NOT NULL,
  email text NOT NULL,
  token_hash text NOT NULL UNIQUE,
  plan text NOT NULL,
  contract_version text NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  expires_at timestamptz NOT NULL,
  used_at timestamptz
);

CREATE INDEX IF NOT EXISTS clinic_contract_invites_center_idx ON clinic_contract_invites (center_id, sent_at);

COMMIT;

-- Comprobación (debe devolver 0 filas al comienzo):
-- SELECT count(*) FROM clinic_contract_invites;
