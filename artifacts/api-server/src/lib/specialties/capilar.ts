/**
 * Fase 5 — first step toward a specialty-agnostic patient record.
 *
 * Today Clinivista only runs one specialty (capilar/trasplante capilar), and
 * its photo protocol and clinical intake fields used to be hardcoded
 * directly into clinical-photos.ts and the `leads` table. This module pulls
 * that specialty-specific knowledge into one place, tagged by `SPECIALTY_ID`,
 * so a future specialty (Fase 7) is a new sibling module — not a rewrite of
 * the generic evaluation/protocol machinery.
 *
 * `leads` still carries the six capilar fields below as real columns (no
 * destructive migration here — that data already exists in production).
 * What changes is that they're no longer the *only* place this data lives:
 * `ensureEvaluationForLead` mirrors them into the evaluation's `clinicalData`
 * jsonb, tagged with this specialty, so generic tooling (exports, future
 * reporting) can read a patient's clinical data the same way regardless of
 * which specialty produced it — without needing a new `leads` column every
 * time a specialty is added.
 */

export const SPECIALTY_ID = "capilar";

export const PROTOCOL_VIEWS: ReadonlyArray<{ key: string; label: string; required: boolean }> = [
  { key: "frontal", label: "Vista frontal", required: true },
  { key: "vertex", label: "Vista superior / vértex", required: true },
  { key: "temporalRight", label: "Temporal derecha", required: true },
  { key: "temporalLeft", label: "Temporal izquierda", required: true },
  { key: "donor", label: "Zona donante", required: true },
];

/** The six `leads` columns that are specific to this specialty (as opposed
 * to generic identity/contact/consent fields like name, phone or city). */
export const CLINICAL_DATA_FIELDS = [
  "hairLossTime",
  "pattern",
  "previousTreatment",
  "symptoms",
  "surgeryHistory",
  "norwood",
] as const;

export type CapilarClinicalData = Partial<Record<typeof CLINICAL_DATA_FIELDS[number], string>>;

/** Builds the specialty-tagged clinicalData snapshot from a lead's legacy
 * flat columns. Only non-empty values are included, so an untouched field
 * doesn't clutter every evaluation's jsonb with empty strings. */
export function clinicalDataFromLead(lead: Record<string, unknown>): CapilarClinicalData {
  const data: CapilarClinicalData = {};
  for (const field of CLINICAL_DATA_FIELDS) {
    const value = lead[field];
    if (typeof value === "string" && value !== "") data[field] = value;
  }
  return data;
}
