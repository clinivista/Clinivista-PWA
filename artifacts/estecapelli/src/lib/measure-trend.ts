import type { PhotoMeasurement } from "@workspace/api-client-react";

export type TrendInput = {
  phaseId: string;
  phaseName: string;
  views: Array<{ id: string; label: string; photo?: { id: string; measurement?: PhotoMeasurement | null } | null }>;
};

export type TrendRow = {
  phaseId: string; phaseName: string; photoId: string;
  lengthMm: number; uncertaintyPct: number; at: string; by: "patient" | "staff";
  /** Cambio respecto de la medida anterior de la misma serie; null en la primera. */
  change: null | { deltaMm: number; pct: number; verdict: "same" | "up" | "down" };
};
export type TrendSeries = { label: string; rows: TrendRow[] };

/**
 * Agrupa las medidas por nombre de fotografía (la misma lesión a lo largo de las fases) y compara cada
 * una con la anterior. Un cambio solo cuenta si supera el error combinado de las dos medidas.
 */
export function buildMeasureTrends(phases: TrendInput[]): TrendSeries[] {
  const groups = new Map<string, TrendSeries>();
  for (const phase of phases) {
    for (const view of phase.views) {
      const m = view.photo?.measurement;
      if (!m || !view.photo) continue;
      const key = view.label.trim().toLowerCase();
      const series = groups.get(key) ?? { label: view.label, rows: [] };
      series.rows.push({
        phaseId: phase.phaseId, phaseName: phase.phaseName, photoId: view.photo.id,
        lengthMm: m.lengthMm, uncertaintyPct: m.uncertaintyPct, at: m.at, by: m.by, change: null,
      });
      groups.set(key, series);
    }
  }
  for (const series of groups.values()) {
    series.rows.forEach((row, index) => {
      if (index === 0) return;
      const before = series.rows[index - 1];
      const delta = row.lengthMm - before.lengthMm;
      const tolerance = Math.hypot((before.lengthMm * before.uncertaintyPct) / 100, (row.lengthMm * row.uncertaintyPct) / 100);
      const pct = before.lengthMm > 0 ? Math.round((Math.abs(delta) / before.lengthMm) * 100) : 0;
      row.change = { deltaMm: Math.round(delta * 10) / 10, pct, verdict: Math.abs(delta) <= tolerance ? "same" : delta > 0 ? "up" : "down" };
    });
  }
  return [...groups.values()];
}
