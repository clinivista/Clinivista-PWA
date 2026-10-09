// Agrupación pura de las fotos del paciente por zona anatómica (sin acceso a la base de datos).
import type { LeadPhase } from "./clinical-photos";
import type { DiagnosisPhoto } from "./diagnosis";
import { zoneKeyOf } from "./evolution-i18n";

export type EvolutionCell = {
  phaseKey: string;
  phaseName: string;
  phaseKind: "capture" | "diagnosis";
  viewKey: string;
  viewLabel: string;
  photoId: string;
  /** The doctor's drawing over the photo (diagnosis phase): the picture shown is the annotated one. */
  edited: boolean;
  createdAt: Date | null;
};
export type EvolutionZone = { key: string; label: string; cells: EvolutionCell[] };

/**
 * Groups the patient's photos by anatomical zone across the phases. Later phases
 * repeat the starting views as "<phase>-<view>", so the zone is the view's base key.
 * The diagnosis phase has no photos of its own: it contributes the doctor's edited
 * (annotated) pictures, one per zone, only when there is a drawing.
 */
export function groupEvolutionZones(phases: LeadPhase[], diagnosisPhotos: DiagnosisPhoto[]): EvolutionZone[] {
  const zones = new Map<string, EvolutionZone>();
  const add = (zoneKey: string, label: string, cell: EvolutionCell) => {
    const zone = zones.get(zoneKey) ?? { key: zoneKey, label, cells: [] };
    zone.cells.push(cell);
    zones.set(zoneKey, zone);
  };
  const first = phases[0];
  for (const phase of phases) {
    if (phase.kind === "diagnosis") {
      for (const photo of diagnosisPhotos.filter((candidate) => candidate.hasAnnotation)) {
        const zoneKey = zoneKeyOf(photo.viewKey, first?.key ?? "");
        add(zoneKey, photo.label, {
          phaseKey: phase.key, phaseName: phase.name, phaseKind: "diagnosis", viewKey: photo.viewKey, viewLabel: photo.label,
          photoId: photo.photoId, edited: true, createdAt: photo.annotationUpdatedAt,
        });
      }
      continue;
    }
    for (const view of phase.views) {
      if (!view.photo) continue;
      add(zoneKeyOf(view.key, phase.key), view.label, {
        phaseKey: phase.key, phaseName: phase.name, phaseKind: "capture", viewKey: view.key, viewLabel: view.label,
        photoId: view.photo.id, edited: false, createdAt: view.photo.createdAt ?? null,
      });
    }
  }
  return [...zones.values()];
}
