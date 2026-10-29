-- sql0006 — País, RUT (o pasaporte fuera de Chile), domicilio y teléfono de las clínicas; RUT, domicilio, prefijo y especialidad de los usuarios.
--
-- Ejecutar en el SQL Editor de Neon ANTES de fusionar el PR «Datos de clínicas y usuarios».
-- Es idempotente. Las clínicas y usuarios que ya existen quedan sin datos (en blanco) hasta que
-- se completen desde supra-control o desde el panel de la clínica; no se pierde nada.
-- Si el servidor corre antes que este archivo, no falla: los datos se muestran vacíos.

BEGIN;

CREATE TABLE IF NOT EXISTS clinic_profiles (
  center_id text PRIMARY KEY,
  country text NOT NULL DEFAULT 'CL',
  rut text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  phone text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE TABLE IF NOT EXISTS user_profiles (
  user_id text PRIMARY KEY,
  rut text NOT NULL DEFAULT '',
  address text NOT NULL DEFAULT '',
  prefix text NOT NULL DEFAULT '',
  specialty text NOT NULL DEFAULT '',
  updated_at timestamptz NOT NULL DEFAULT now()
);

COMMIT;

-- Comprobación (qué clínicas y usuarios ya tienen RUT):
-- SELECT c.name, p.country, p.rut FROM clinical_centers c LEFT JOIN clinic_profiles p ON p.center_id = c.id ORDER BY c.name;
-- SELECT u.email, u.role, p.rut FROM users u LEFT JOIN user_profiles p ON p.user_id = u.id WHERE u.center_id IS NOT NULL ORDER BY u.email;
