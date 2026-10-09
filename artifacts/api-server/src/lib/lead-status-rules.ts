export type PhaseFacts = { key: string; kind: "capture" | "diagnosis"; complete: boolean };

/**
 * Estados del paciente, en el orden del proceso:
 *  incompleto → listo (para revisión) → contactar (listo para contactar) →
 *  agendado | contactado → operado → completado (tratamiento completado).
 * "cerrado" y "nuevo" no se calculan: "cerrado" lo pone el personal a mano y
 * se respeta siempre.
 */
export const LEAD_STATUSES = ["nuevo", "incompleto", "listo", "contactar", "agendado", "contactado", "operado", "completado", "cerrado"] as const;

/** The phase after which a patient counts as "operado": the post-operatorio (the fourth phase of the starting protocol). */
const POSTOP_KEY = "postoperatorio";
const POSTOP_FALLBACK_POSITION = 3;

/**
 * The status the patient's process calls for. `current` and `appointmentAt`
 * are only used to remember the administrative contact (agendado/contactado),
 * which is not a photographic fact the phases can tell.
 */
export function deriveStatus(current: string, appointmentAt: string | null | undefined, phases: ReadonlyArray<PhaseFacts>): string {
  if (current === "cerrado" || phases.length === 0) return current;
  const preEvaluation = phases[0].complete;
  const diagnosisDone = phases.some((phase) => phase.kind === "diagnosis" && phase.complete);
  const postop = phases.find((phase) => phase.key === POSTOP_KEY) ?? phases[POSTOP_FALLBACK_POSITION];

  if (phases.every((phase) => phase.complete)) return "completado";
  if (postop?.complete) return "operado";

  const contact = appointmentAt ? "agendado" : current === "agendado" || current === "contactado" ? current : null;
  if (diagnosisDone) return contact ?? "contactar";
  if (preEvaluation) return contact ?? "listo";
  return "incompleto";
}

