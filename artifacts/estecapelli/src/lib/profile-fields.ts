import { normalizeRut, validateRut } from "./rut";

/** Prefijos de tratamiento; se guardan tal cual. */
export const PREFIXES = ["Sr", "Sra", "Srta", "Dr", "Dra", "Lic", "Ing", "Mg", "Prof"] as const;
export const PREFIX_LABEL: Record<(typeof PREFIXES)[number], string> = { Sr: "Sr.", Sra: "Sra.", Srta: "Srta.", Dr: "Dr.", Dra: "Dra.", Lic: "Lic.", Ing: "Ing.", Mg: "Mg.", Prof: "Prof." };

/** Países en que puede operar una clínica (supra-control, en español). Chile usa RUT; los demás, pasaporte. */
export const COUNTRIES: Array<[string, string]> = [
  ["CL", "Chile"], ["AR", "Argentina"], ["BO", "Bolivia"], ["BR", "Brasil"], ["CO", "Colombia"], ["CR", "Costa Rica"], ["EC", "Ecuador"],
  ["ES", "España"], ["US", "Estados Unidos"], ["MX", "México"], ["PA", "Panamá"], ["PY", "Paraguay"], ["PE", "Perú"], ["UY", "Uruguay"],
  ["VE", "Venezuela"], ["DE", "Alemania"], ["FR", "Francia"], ["IT", "Italia"], ["PT", "Portugal"], ["GB", "Reino Unido"], ["TR", "Turquía"],
  ["SA", "Arabia Saudita"], ["AE", "Emiratos Árabes Unidos"], ["CN", "China"], ["OTHER", "Otro país"],
];

export const documentKind = (country: string | undefined): "rut" | "pasaporte" => ((country ?? "CL") === "CL" ? "rut" : "pasaporte");

/** null si el documento es válido; si no, el motivo: vacío o inválido. El servidor vuelve a validar. */
export function documentProblem(value: string, country: string | undefined): "required" | "invalid" | null {
  if (value.trim() === "") return "required";
  if (documentKind(country) === "pasaporte") return /^[A-Z0-9]{5,20}$/.test(value.replace(/[\s.-]/g, "").toUpperCase()) ? null : "invalid";
  return validateRut(normalizeRut(value)).valid ? null : "invalid";
}
