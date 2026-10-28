import type { Lead } from "@workspace/db";
import { INTAKE_QUESTIONS } from "./report-intake-i18n";
import { toPdfLanguage } from "./result-pdf-i18n";
import { toSpecialtyId } from "./specialties";

/**
 * The patient's pre-evaluation answers as «question: answer» in the patient's language, only the answered ones.
 * Capilar keeps the patient's own wording (stored as typed); the other specialties store stable keys.
 */
export function intakeAnswers(lead: Pick<Lead, "clinicalData"> & Partial<Record<string, unknown>>, specialty: unknown, language: unknown): Array<{ label: string; value: string }> {
  const lang = toPdfLanguage(language);
  const id = toSpecialtyId(specialty);
  const source = id === "capilar"
    ? (lead as Record<string, unknown>)
    : (lead.clinicalData && typeof lead.clinicalData === "object" && !Array.isArray(lead.clinicalData) ? (lead.clinicalData as Record<string, unknown>) : {});
  const answers: Array<{ label: string; value: string }> = [];
  for (const question of INTAKE_QUESTIONS[id]) {
    const raw = typeof source[question.key] === "string" ? (source[question.key] as string).trim() : "";
    if (!raw) continue;
    const value = question.options ? question.options[raw]?.[lang] : raw;
    if (value) answers.push({ label: question.label[lang], value });
  }
  return answers;
}

/** A stored appointment ("YYYY-MM-DDTHH:mm" or ISO) as a date, or null. */
export function appointmentDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? null : date;
}
