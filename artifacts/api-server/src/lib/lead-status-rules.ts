/**
 * `complete` aquí significa "superada": la etapa se completó o el personal la
 * omitió. Así omitir una etapa deja avanzar el estado igual que completarla.
 */
export type PhaseFacts = { key: string; kind: "capture" | "diagnosis"; complete: boolean };

/**
 * Estados del paciente, en el orden del proceso:
 *  incompleto → listo (para revisión) → contactar (listo para contactar) →
 *  agendado | contactado → operado → completado (tratamiento completado).
 * "cerrado", "alta" y "nuevo" no se calculan: "cerrado" lo pone el personal a
 * mano y "alta" (alta médica) solo un médico; ambos se respetan siempre hasta
 * que se reabren.
 */
export const LEAD_STATUSES = ["nuevo", "incompleto", "listo", "contactar", "agendado", "contactado", "operado", "completado", "cerrado", "alta"] as const;

/** The phase after which a patient counts as "operado": the post-operatorio (the fourth phase of the starting protocol) or, in dermatología, the tratamiento. */
const POSTOP_KEY = "postoperatorio";
const TREATMENT_KEY = "tratamiento";
const POSTOP_FALLBACK_POSITION = 3;

/**
 * The status the patient's process calls for. `current` and `appointmentAt`
 * are only used to remember the administrative contact (agendado/contactado),
 * which is not a photographic fact the phases can tell.
 */
export function deriveStatus(current: string, appointmentAt: string | null | undefined, phases: ReadonlyArray<PhaseFacts>): string {
  if (current === "cerrado" || current === "alta" || phases.length === 0) return current;
  const preEvaluation = phases[0].complete;
  const diagnosisDone = phases.some((phase) => phase.kind === "diagnosis" && phase.complete);
  const postop = phases.find((phase) => phase.key === POSTOP_KEY) ?? phases.find((phase) => phase.key === TREATMENT_KEY) ?? phases[POSTOP_FALLBACK_POSITION];

  if (phases.every((phase) => phase.complete)) return "completado";
  if (postop?.complete) return "operado";

  const contact = appointmentAt ? "agendado" : current === "agendado" || current === "contactado" ? current : null;
  if (diagnosisDone) return contact ?? "contactar";
  if (preEvaluation) return contact ?? "listo";
  return "incompleto";
}

