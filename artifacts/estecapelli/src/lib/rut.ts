// Chilean RUT utilities: masking, normalization and mod-11 validation.

/** Digits + uppercase K only, K allowed only as the last character. */
export function normalizeRut(raw: string): string {
  const stripped = String(raw ?? "").replace(/[^0-9kK]/g, "").toUpperCase();
  // Drop any K that is not in the final (check digit) position
  return stripped.replace(/K(?=.)/g, "").slice(0, 9);
}

/** Formats a raw value as `12.345.678-5` while typing. */
export function formatRut(raw: string): string {
  const n = normalizeRut(raw);
  if (n.length <= 1) return n;
  const body = n.slice(0, -1);
  const dv = n.slice(-1);
  const withDots = body.replace(/\B(?=(\d{3})+(?!\d))/g, ".");
  return `${withDots}-${dv}`;
}

export function computeDv(body: string): string {
  let sum = 0;
  let mul = 2;
  for (let i = body.length - 1; i >= 0; i--) {
    sum += Number(body[i]) * mul;
    mul = mul === 7 ? 2 : mul + 1;
  }
  const rest = 11 - (sum % 11);
  if (rest === 11) return "0";
  if (rest === 10) return "K";
  return String(rest);
}

export interface RutValidation {
  valid: boolean;
  error?: string;
}

export function validateRut(raw: string): RutValidation {
  const n = normalizeRut(raw);
  if (!n) {
    return { valid: false, error: "Ingresa tu RUT." };
  }
  if (n.length < 8) {
    return { valid: false, error: "Ingresa un RUT completo, incluido el dígito verificador." };
  }
  const body = n.slice(0, -1);
  const dv = n.slice(-1);
  if (!/^\d+$/.test(body)) {
    return { valid: false, error: "El RUT ingresado no es válido. Revísalo e inténtalo nuevamente." };
  }
  if (computeDv(body) !== dv) {
    return { valid: false, error: "El RUT ingresado no es válido. Revísalo e inténtalo nuevamente." };
  }
  return { valid: true };
}
