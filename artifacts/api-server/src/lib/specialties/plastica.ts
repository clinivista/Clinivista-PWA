/**
 * Cirugía plástica: la segunda especialidad (Fase 7).
 *
 * A diferencia de "capilar", sus preguntas clínicas no tienen columnas propias
 * en `leads`: viven en `leads.clinical_data` (jsonb) y se copian a la
 * evaluación. Las respuestas de selección se guardan como claves estables
 * (p. ej. "rhinoplasty"); el texto en cada idioma vive en el formulario del
 * paciente y el texto en español para el personal, aquí.
 */
import type { IntakeField, SpecialtyModule } from "./types";

export const SPECIALTY_ID = "plastica";

export const PROTOCOL_VIEWS: SpecialtyModule["views"] = [
  { key: "plasticFront", label: "Vista frontal", required: true },
  { key: "plasticProfileRight", label: "Perfil derecho", required: true },
  { key: "plasticProfileLeft", label: "Perfil izquierdo", required: true },
  { key: "plasticObliqueRight", label: "Oblicua derecha", required: true },
  { key: "plasticObliqueLeft", label: "Oblicua izquierda", required: true },
];

export const DEFAULT_PHASES: SpecialtyModule["phases"] = [
  { key: "preevaluacion", name: "Pre-evaluación" },
  { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis" },
  { key: "preoperatorio", name: "Pre-operatorio" },
  { key: "postoperatorio", name: "Post-operatorio" },
  { key: "control-1", name: "Control médico 1" },
  { key: "control-2", name: "Control médico 2" },
];

export const INTAKE_FIELDS: ReadonlyArray<IntakeField> = [
  {
    key: "procedure",
    label: "Procedimiento de interés",
    type: "select",
    options: [
      ["rhinoplasty", "Rinoplastia"],
      ["breastAugmentation", "Aumento mamario"],
      ["breastReduction", "Reducción mamaria"],
      ["breastLift", "Mastopexia (elevación mamaria)"],
      ["abdominoplasty", "Abdominoplastia"],
      ["liposuction", "Liposucción"],
      ["blepharoplasty", "Blefaroplastia"],
      ["facelift", "Lifting facial"],
      ["otoplasty", "Otoplastia"],
      ["other", "Otro"],
      ["notSure", "No estoy seguro/a"],
    ],
  },
  { key: "concern", label: "Qué le gustaría mejorar", type: "text", maxLength: 300 },
  {
    key: "timeframe",
    label: "Cuándo le gustaría operarse",
    type: "select",
    options: [
      ["lt3", "En menos de 3 meses"],
      ["m3to6", "Entre 3 y 6 meses"],
      ["m6to12", "Entre 6 y 12 meses"],
      ["informing", "Solo me estoy informando"],
    ],
  },
  { key: "previousSurgeries", label: "Cirugías previas", type: "text", maxLength: 250 },
  { key: "conditions", label: "Enfermedades o condiciones médicas", type: "text", maxLength: 250 },
  { key: "medicationsAllergies", label: "Medicamentos y alergias", type: "text", maxLength: 250 },
  {
    key: "smoking",
    label: "Tabaquismo",
    type: "select",
    options: [
      ["no", "No fuma"],
      ["former", "Exfumador/a"],
      ["yes", "Fuma"],
    ],
  },
];

export const plastica: SpecialtyModule = {
  id: SPECIALTY_ID,
  name: "Cirugía plástica",
  protocolName: "Protocolo de cirugía plástica inicial",
  views: PROTOCOL_VIEWS,
  phases: DEFAULT_PHASES,
  intake: INTAKE_FIELDS,
  clinicalData: (lead) => cleanIntake(INTAKE_FIELDS, lead.clinicalData),
};

/** Keeps only this specialty's questions, trimmed, with selections restricted to their known options. */
export function cleanIntake(fields: ReadonlyArray<IntakeField>, raw: unknown): Record<string, string> {
  const source = raw && typeof raw === "object" && !Array.isArray(raw) ? (raw as Record<string, unknown>) : {};
  const result: Record<string, string> = {};
  for (const field of fields) {
    const value = typeof source[field.key] === "string" ? (source[field.key] as string).trim() : "";
    if (!value) continue;
    if (field.type === "select") {
      if (field.options?.some(([key]) => key === value)) result[field.key] = value;
    } else {
      result[field.key] = value.slice(0, field.maxLength ?? 250);
    }
  }
  return result;
}
