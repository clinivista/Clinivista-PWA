// Encuadre de la foto tomada con la cámara de la app: la zona del cuadro de
// referencia con un margen, para reducir el fondo sin cortar la zona evaluada.

export type Size = { width: number; height: number };
export type CropRect = { sx: number; sy: number; sw: number; sh: number };

/** Share of the viewfinder the reference frame may take (the rest is a margin). */
export const FRAME_FILL = 0.8;

/** "3:4" → { w: 3, h: 4 }; anything unreadable falls back to portrait 3:4. */
export function parseRatio(value: string | undefined): { w: number; h: number } {
  const match = /^(\d{1,2}):(\d{1,2})$/.exec(value ?? "");
  return match && Number(match[1]) > 0 && Number(match[2]) > 0 ? { w: Number(match[1]), h: Number(match[2]) } : { w: 3, h: 4 };
}

/**
 * Extra picture kept around the reference frame (share of the frame size, per
 * side). The frame is a guide, not a cut line: the photo is framed a little
 * wider so the evaluated area is never clipped; the doctor zooms in later.
 */
export const CAPTURE_MARGIN = 0.08;

/** The largest frame of the given aspect ratio that fits the viewfinder, centered. */
export function frameFor(box: Size, ratio: { w: number; h: number }): Size {
  const maxW = box.width * FRAME_FILL;
  const maxH = box.height * FRAME_FILL;
  const width = Math.min(maxW, (maxH * ratio.w) / ratio.h);
  return { width, height: (width * ratio.h) / ratio.w };
}

/**
 * The part of the camera picture that sits under the frame. The viewfinder
 * shows the video with `object-fit: cover`, so the picture is scaled to fill
 * the box and cropped by it; this inverts that mapping. Returns null when the
 * sizes are not known yet (then the whole picture is kept).
 */
export function cropRectForVideo(box: Size, video: Size, frame: Size, margin = CAPTURE_MARGIN): CropRect | null {
  if (box.width <= 0 || box.height <= 0 || video.width <= 0 || video.height <= 0 || frame.width <= 0 || frame.height <= 0) return null;
  const scale = Math.max(box.width / video.width, box.height / video.height);
  const offsetX = (box.width - video.width * scale) / 2;
  const offsetY = (box.height - video.height * scale) / 2;
  const frameX = (box.width - frame.width) / 2;
  const frameY = (box.height - frame.height) / 2;
  // Frame in picture coordinates, widened by the margin on every side.
  let sw = (frame.width * (1 + 2 * margin)) / scale;
  let sh = (frame.height * (1 + 2 * margin)) / scale;
  // The widened area must still fit the picture: shrink (keeping the ratio) if it does not.
  const fit = Math.min(1, video.width / sw, video.height / sh);
  sw *= fit;
  sh *= fit;
  const centerX = (frameX + frame.width / 2 - offsetX) / scale;
  const centerY = (frameY + frame.height / 2 - offsetY) / scale;
  const sx = Math.min(Math.max(0, centerX - sw / 2), video.width - sw);
  const sy = Math.min(Math.max(0, centerY - sh / 2), video.height - sh);
  return { sx: Math.round(sx), sy: Math.round(sy), sw: Math.round(sw), sh: Math.round(sh) };
}
