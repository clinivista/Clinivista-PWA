/**
 * Dermatología: la tercera especialidad.
 *
 * Como cirugía plástica, sus preguntas viven en `leads.clinical_data` (jsonb) y
 * se copian a la evaluación. Las respuestas de selección son claves estables;
 * el texto en cada idioma vive en el formulario del paciente (derm-i18n.ts) y
 * el texto en español para el personal, aquí.
 *
 * El proceso inicial es solo un punto de partida: la clínica configura sus
 * fotos y etapas desde la pantalla «Fases».
 */
import { cleanIntake } from "./plastica";
import type { IntakeField, SpecialtyModule } from "./types";

export const SPECIALTY_ID = "dermatologia";

export const PROTOCOL_VIEWS: SpecialtyModule["views"] = [
  { key: "dermOverview", label: "Vista panorámica", required: true },
  { key: "dermClose", label: "Primer plano con referencia", required: true },
  { key: "dermDermoscopy", label: "Dermatoscopía", required: false },
];

export const DEFAULT_PHASES: SpecialtyModule["phases"] = [
  { key: "preevaluacion", name: "Pre-evaluación" },
  { key: "diagnostico", name: "Diagnóstico", kind: "diagnosis" },
  { key: "tratamiento", name: "Tratamiento" },
  { key: "control-1", name: "Control 1" },
  { key: "control-2", name: "Control 2" },
];

export const INTAKE_FIELDS: ReadonlyArray<IntakeField> = [
  {
    key: "reason",
    label: "Motivo de consulta",
    type: "select",
    options: [
      ["mole", "Lunar o lesión pigmentada"],
      ["spot", "Mancha en la piel"],
      ["acne", "Acné o rosácea"],
      ["rash", "Erupción, picazón o enrojecimiento"],
      ["growth", "Bulto, verruga o herida que no cierra"],
      ["other", "Otro"],
    ],
  },
  { key: "area", label: "Zona afectada", type: "text", maxLength: 200 },
  {
    key: "duration",
    label: "Tiempo de evolución",
    type: "select",
    options: [
      ["lt1m", "Menos de 1 mes"],
      ["m1to6", "Entre 1 y 6 meses"],
      ["m6to12", "Entre 6 y 12 meses"],
      ["gt1y", "Más de 1 año"],
    ],
  },
  {
    key: "changes",
    label: "Cambios recientes",
    type: "select",
    options: [
      ["none", "Sin cambios"],
      ["size", "Ha crecido"],
      ["colorShape", "Cambió de color o de forma"],
      ["symptoms", "Pica, duele o sangra"],
    ],
  },
  { key: "history", label: "Antecedentes (cáncer de piel propio o familiar, alergias)", type: "text", maxLength: 250 },
  { key: "treatments", label: "Medicamentos y tratamientos previos", type: "text", maxLength: 250 },
  {
    key: "sun",
    label: "Exposición solar",
    type: "select",
    options: [
      ["low", "Baja"],
      ["moderate", "Moderada"],
      ["high", "Alta o con quemaduras frecuentes"],
    ],
  },
  {
    key: "skinType",
    label: "Tipo de piel (fototipo)",
    type: "select",
    options: [
      ["light", "Clara: se quema fácil y casi no se broncea"],
      ["medium", "Intermedia: se broncea gradualmente"],
      ["dark", "Oscura: rara vez se quema"],
    ],
  },
];

export const dermatologia: SpecialtyModule = {
  id: SPECIALTY_ID,
  name: "Dermatología",
  protocolName: "Protocolo de dermatología inicial",
  views: PROTOCOL_VIEWS,
  phases: DEFAULT_PHASES,
  intake: INTAKE_FIELDS,
  clinicalData: (lead) => cleanIntake(INTAKE_FIELDS, lead.clinicalData),
};
