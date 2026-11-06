// Visor giratorio: ordena las fotos como se rodea la cabeza (izquierda → frente → derecha → nuca) y la vista superior aparte.
export const RING_KEYS = ["temporalLeft", "frontal", "temporalRight", "donor"] as const;
export const TOP_KEY = "vertex";

export type TurntablePhoto = { id: string; key: string; label: string; mimeType?: string };

/** Las fotos del anillo presentes (la más reciente por vista), en orden; la superior va aparte. */
export function turntableViews(photos: TurntablePhoto[]): { ring: TurntablePhoto[]; top: TurntablePhoto | null } {
  const photoOf = (key: string) => [...photos].reverse().find((photo) => photo.key === key && !photo.mimeType?.startsWith("video/")) ?? null;
  return { ring: RING_KEYS.map(photoOf).filter((photo): photo is TurntablePhoto => photo !== null), top: photoOf(TOP_KEY) };
}

/** Pasos que gira el visor al arrastrar `dx` píxeles (cada `stepPx` es una foto); arrastrar a la derecha vuelve atrás. */
export const stepsForDrag = (dx: number, stepPx = 90) => Math.trunc(-dx / stepPx) + 0;

/** Siguiente posición del anillo, dando la vuelta completa. */
export const wrapIndex = (index: number, delta: number, length: number) => (((index + delta) % length) + length) % length;
