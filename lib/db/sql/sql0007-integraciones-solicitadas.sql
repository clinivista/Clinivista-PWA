-- sql0007 — Solicitudes de integración que hacen las clínicas desde «Integraciones disponibles».
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Integraciones disponibles».
-- Es idempotente. Si el servidor corre antes que este archivo, el catálogo se ve igual,
-- pero «Solicitar integración» responde con error hasta que se cree la tabla.

BEGIN;

CREATE TABLE IF NOT EXISTS integration_requests (
  id text PRIMARY KEY,
  center_id text NOT NULL,
  integration text NOT NULL,
  requested_by_user_id text NOT NULL,
  requested_by_name text NOT NULL DEFAULT '',
  requested_by_email text NOT NULL DEFAULT '',
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX IF NOT EXISTS integration_requests_center_integration_idx
  ON integration_requests (center_id, integration);

COMMIT;

-- Comprobación (debe devolver 0 filas al comienzo):
-- SELECT count(*) FROM integration_requests;
