import { eq, inArray } from "drizzle-orm";
import { db, clinicProfilesTable, userProfilesTable } from "@workspace/db";
import { formatRut, validateRut } from "./rut";
import { parseUserPhone } from "./user-phone";
import { logger } from "./logger";

/** Prefijos de tratamiento (se guardan tal cual; la pantalla los muestra en cada idioma). */
export const PREFIXES = ["Sr", "Sra", "Srta", "Dr", "Dra", "Lic", "Ing", "Mg", "Prof"] as const;

/** Especialidades de los médicos: clave guardada → nombre en español (el del contrato). */
export const SPECIALTIES: Record<string, string> = {
  cirujano_plastico: "Cirujano plástico",
  cirujano_capilar: "Cirujano capilar",
  cirujano_general: "Cirujano general",
  dermatologo: "Dermatólogo",
  oftalmologo: "Oftalmólogo",
  otorrino: "Otorrinolaringólogo",
  traumatologo: "Traumatólogo",
  maxilofacial: "Cirujano maxilofacial",
  anestesiologo: "Anestesiólogo",
  podologo: "Podólogo",
  medico_general: "Médico general",
  otra: "Otra",
};

/** Países en que puede operar una clínica (código → nombre en español). Chile usa RUT; los demás, pasaporte. */
export const COUNTRIES: Record<string, string> = {
  CL: "Chile", AR: "Argentina", BO: "Bolivia", BR: "Brasil", CO: "Colombia", CR: "Costa Rica", EC: "Ecuador", ES: "España",
  US: "Estados Unidos", MX: "México", PA: "Panamá", PY: "Paraguay", PE: "Perú", UY: "Uruguay", VE: "Venezuela",
  DE: "Alemania", FR: "Francia", IT: "Italia", PT: "Portugal", GB: "Reino Unido", TR: "Turquía", SA: "Arabia Saudita",
  AE: "Emiratos Árabes Unidos", CN: "China", OTHER: "Otro país",
};
export const DEFAULT_COUNTRY = "CL";
export const isCountry = (value: unknown): value is string => typeof value === "string" && value in COUNTRIES;
/** Chile identifica con RUT; el resto de los países, con pasaporte. */
export const documentKind = (country: string): "rut" | "pasaporte" => (country === "CL" ? "rut" : "pasaporte");

export type UserProfile = { rut: string; address: string; prefix: string; specialty: string };
export type ClinicProfile = { country: string; rut: string; address: string; phone: string };
export const EMPTY_USER_PROFILE: UserProfile = { rut: "", address: "", prefix: "", specialty: "" };
export const EMPTY_CLINIC_PROFILE: ClinicProfile = { country: DEFAULT_COUNTRY, rut: "", address: "", phone: "" };

const MAX_ADDRESS = 200;
export const PROFILE_KEYS = ["rut", "address", "prefix", "specialty"] as const;

/**
 * Documento de identidad según el país: en Chile, RUT con dígito verificador (el 00000000-0 se acepta para
 * demostraciones); en los demás países, pasaporte (5 a 20 letras o números). Devuelve el valor normalizado.
 */
export function parseDocument(value: unknown, country: string = DEFAULT_COUNTRY): { value: string } | { error: string } {
  const passport = documentKind(country) === "pasaporte";
  if (typeof value !== "string" || value.trim() === "") return { error: passport ? "El número de pasaporte es obligatorio." : "El RUT es obligatorio." };
  if (passport) {
    const normalized = value.replace(/[\s.-]/g, "").toUpperCase();
    if (!/^[A-Z0-9]{5,20}$/.test(normalized)) return { error: "El pasaporte debe tener entre 5 y 20 letras o números." };
    return { value: normalized };
  }
  const check = validateRut(value);
  if (!check.valid) return { error: check.error ?? "El RUT ingresado no es válido." };
  return { value: formatRut(value) };
}

function parseAddress(value: unknown): { value: string } | { error: string } {
  if (typeof value !== "string") return { error: "La dirección no es válida." };
  const address = value.trim().replace(/\s+/g, " ");
  if (address.length > MAX_ADDRESS) return { error: `La dirección admite hasta ${MAX_ADDRESS} caracteres.` };
  return { value: address };
}

type Source = Record<string, unknown> | undefined | null;

/**
 * Datos personales de un usuario desde un cuerpo de solicitud.
 * `require`: crear (RUT obligatorio; el médico debe indicar su especialidad).
 * Al editar solo se validan los campos enviados: un RUT enviado no puede quedar vacío.
 */
export function parseUserProfile(source: Source, options: { role: string; require: boolean; requireAddress?: boolean; country?: string }): { value: Partial<UserProfile> } | { error: string } {
  const body = source ?? {};
  const value: Partial<UserProfile> = {};
  if (options.require || body.rut !== undefined) {
    const rut = parseDocument(body.rut, options.country);
    if ("error" in rut) return rut;
    value.rut = rut.value;
  }
  if (body.address !== undefined || options.requireAddress) {
    const address = parseAddress(body.address ?? "");
    if ("error" in address) return address;
    if (options.requireAddress && address.value === "") return { error: "El representante legal necesita su dirección: va en el contrato." };
    value.address = address.value;
  }
  if (body.prefix !== undefined) {
    if (typeof body.prefix !== "string" || (body.prefix !== "" && !(PREFIXES as readonly string[]).includes(body.prefix))) return { error: "Elige un prefijo de la lista." };
    value.prefix = body.prefix;
  }
  if (options.role !== "medico") {
    if (body.specialty !== undefined || options.require) value.specialty = "";
  } else if (options.require || body.specialty !== undefined) {
    if (typeof body.specialty !== "string" || !(body.specialty in SPECIALTIES)) return { error: "Elige la especialidad del médico de la lista." };
    value.specialty = body.specialty;
  }
  return { value };
}

export function parseClinicProfile(source: Source, options: { require: boolean }): { value: Partial<ClinicProfile> } | { error: string } {
  const body = source ?? {};
  const value: Partial<ClinicProfile> = {};
  if (options.require || body.country !== undefined) {
    if (!isCountry(body.country)) return { error: "Elige el país de la clínica." };
    value.country = body.country;
  }
  if (options.require || body.rut !== undefined) {
    const rut = parseDocument(body.rut, value.country ?? DEFAULT_COUNTRY);
    if ("error" in rut) return rut;
    value.rut = rut.value;
  }
  if (options.require || body.address !== undefined) {
    const address = parseAddress(body.address);
    if ("error" in address) return address;
    if (address.value === "") return { error: "La dirección de la clínica es obligatoria." };
    value.address = address.value;
  }
  if (options.require || body.phone !== undefined) {
    const phone = parseUserPhone(body.phone);
    if (phone === null) return { error: "Escribe un teléfono válido (solo números, +, espacios, guiones o paréntesis)." };
    if (phone === "") return { error: "El teléfono de la clínica es obligatorio." };
    value.phone = phone;
  }
  return { value };
}

export const hasProfileKeys = (source: Source) => PROFILE_KEYS.some((key) => (source ?? {})[key] !== undefined);

// Si las tablas aún no existen (SQL sin correr) se trabaja con datos en blanco: nada se rompe.
export async function userProfilesOf(userIds: string[]): Promise<Map<string, UserProfile>> {
  const map = new Map<string, UserProfile>();
  if (userIds.length === 0) return map;
  try {
    const rows = await db.select().from(userProfilesTable).where(inArray(userProfilesTable.userId, userIds));
    for (const row of rows) map.set(row.userId, { rut: row.rut, address: row.address, prefix: row.prefix, specialty: row.specialty });
  } catch (error) {
    logger.warn({ err: error }, "user_profiles unavailable");
  }
  return map;
}

export async function withUserProfiles<T extends { id: string }>(users: T[]): Promise<Array<T & UserProfile>> {
  const profiles = await userProfilesOf(users.map((user) => user.id));
  return users.map((user) => ({ ...user, ...(profiles.get(user.id) ?? EMPTY_USER_PROFILE) }));
}

export async function saveUserProfile(userId: string, value: Partial<UserProfile>): Promise<void> {
  if (Object.keys(value).length === 0) return;
  await db.insert(userProfilesTable).values({ userId, ...value })
    .onConflictDoUpdate({ target: userProfilesTable.userId, set: { ...value, updatedAt: new Date() } });
}

export async function clinicProfileOf(centerId: string): Promise<ClinicProfile> {
  try {
    const [row] = await db.select().from(clinicProfilesTable).where(eq(clinicProfilesTable.centerId, centerId));
    return row ? { country: row.country, rut: row.rut, address: row.address, phone: row.phone } : EMPTY_CLINIC_PROFILE;
  } catch (error) {
    logger.warn({ err: error }, "clinic_profiles unavailable");
    return EMPTY_CLINIC_PROFILE;
  }
}

export async function clinicProfilesOf(centerIds: string[]): Promise<Map<string, ClinicProfile>> {
  const map = new Map<string, ClinicProfile>();
  if (centerIds.length === 0) return map;
  try {
    const rows = await db.select().from(clinicProfilesTable).where(inArray(clinicProfilesTable.centerId, centerIds));
    for (const row of rows) map.set(row.centerId, { country: row.country, rut: row.rut, address: row.address, phone: row.phone });
  } catch (error) {
    logger.warn({ err: error }, "clinic_profiles unavailable");
  }
  return map;
}

export async function saveClinicProfile(centerId: string, value: Partial<ClinicProfile>): Promise<void> {
  if (Object.keys(value).length === 0) return;
  await db.insert(clinicProfilesTable).values({ centerId, ...value })
    .onConflictDoUpdate({ target: clinicProfilesTable.centerId, set: { ...value, updatedAt: new Date() } });
}
