/** Contact phone of a staff user: optional, free format, digits with + ( ) - . and spaces. */
export const PHONE_ERROR = "Escribe un teléfono válido (solo números, +, espacios, guiones o paréntesis).";

/** "" for empty, the trimmed number when valid, null when it is not a phone number. */
export function parseUserPhone(value: unknown): string | null {
  if (value === undefined || value === null) return "";
  if (typeof value !== "string") return null;
  const phone = value.trim();
  if (phone === "") return "";
  if (phone.length > 30 || !/^\+?[\d\s().-]{5,29}$/.test(phone) || (phone.match(/\d/g) ?? []).length < 6) return null;
  return phone;
}
