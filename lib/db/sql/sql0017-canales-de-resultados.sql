-- sql0017 — Canales con los que cada clínica entrega resultados (correo, WhatsApp; SMS queda preparado).
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR (parche 0053).
-- Es idempotente. IMPORTANTE: si el servidor nuevo corre antes de este SQL, las consultas de clínicas fallan.
-- Las clínicas existentes quedan con correo y WhatsApp activos hasta que su administración los configure.

BEGIN;

ALTER TABLE clinical_centers ADD COLUMN IF NOT EXISTS result_channels text NOT NULL DEFAULT 'email,whatsapp';

COMMIT;

-- Verificación: debe devolver 1.
SELECT count(*) AS columnas_nuevas
FROM information_schema.columns
WHERE table_name = 'clinical_centers' AND column_name = 'result_channels';
