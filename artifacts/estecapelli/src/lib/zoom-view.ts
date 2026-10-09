// Zoom y desplazamiento de la vista del editor de fotos (solo la vista: el
// dibujo y la imagen guardada no cambian).

export type View = { zoom: number; x: number; y: number };
export type Size = { width: number; height: number };
export type Point = { x: number; y: number };

export const MIN_ZOOM = 1;
export const MAX_ZOOM = 6;
export const ZOOM_STEP = 1.5;
export const FIT: View = { zoom: 1, x: 0, y: 0 };

export const clampZoom = (zoom: number) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, zoom));

/** Keeps the picture covering the viewport: no empty margins once it is larger than the viewport. */
export function clampView(view: View, content: Size, viewport: Size): View {
  const zoom = clampZoom(view.zoom);
  const limitX = Math.max(0, (content.width * zoom - viewport.width) / 2);
  const limitY = Math.max(0, (content.height * zoom - viewport.height) / 2);
  return { zoom, x: Math.min(limitX, Math.max(-limitX, view.x)), y: Math.min(limitY, Math.max(-limitY, view.y)) };
}

/**
 * Changes the zoom keeping the picture point under `anchor` (relative to the
 * viewport center) where it is, so pinching or the wheel zoom around the
 * fingers/cursor and the buttons zoom around the center.
 */
export function zoomAt(view: View, nextZoom: number, anchor: Point, content: Size, viewport: Size): View {
  const zoom = clampZoom(nextZoom);
  const ratio = zoom / view.zoom;
  return clampView({ zoom, x: anchor.x - (anchor.x - view.x) * ratio, y: anchor.y - (anchor.y - view.y) * ratio }, content, viewport);
}
