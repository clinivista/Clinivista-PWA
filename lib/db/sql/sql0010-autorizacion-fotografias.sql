-- sql0010 — Autorización para las fotografías clínicas que toma la clínica:
-- enlace con código al correo, documento firmado subido o firma en tableta.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0042). Es idempotente.
-- Si el servidor corre antes, la ficha sigue funcionando pero «Autorización para fotografías» no puede guardar.

BEGIN;

CREATE TABLE IF NOT EXISTS photo_consents (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  lead_id text NOT NULL,
  method text NOT NULL,
  status text NOT NULL DEFAULT 'pending',
  language text NOT NULL DEFAULT 'es',
  text_version text NOT NULL DEFAULT '',
  text_snapshot text NOT NULL DEFAULT '',
  token_hash text,
  expires_at timestamptz,
  code_hash text,
  code_expires_at timestamptz,
  code_attempts integer NOT NULL DEFAULT 0,
  verified_by text NOT NULL DEFAULT '',
  file jsonb,
  requested_by_name text NOT NULL DEFAULT '',
  registered_by_name text NOT NULL DEFAULT '',
  ip text NOT NULL DEFAULT '',
  user_agent text NOT NULL DEFAULT '',
  contact text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now(),
  granted_at timestamptz,
  revoked_at timestamptz,
  revoke_note text NOT NULL DEFAULT ''
);
CREATE INDEX IF NOT EXISTS photo_consents_lead_idx ON photo_consents (center_id, lead_id);
CREATE INDEX IF NOT EXISTS photo_consents_token_idx ON photo_consents (token_hash);

COMMIT;

-- Verificación (debe devolver 0):
SELECT count(*) AS autorizaciones FROM photo_consents;
