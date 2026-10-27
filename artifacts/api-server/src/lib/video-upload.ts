import express from "express";
import { privatePhotoStorage } from "./clinical-photo-storage";

// Videos cortos por vista (plan Titanium). No pasan por el camino de las fotos
// (sharp, derivadas, tope de 10 MB, lectura entera en memoria): tienen su propio
// tope, su propio límite de subidas simultáneas y se sirven por tramos (Range).

export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;
export type VideoType = (typeof VIDEO_TYPES)[number];
/** La grabación se corta a los 20 s; se acepta un margen por el redondeo del navegador. */
export const MAX_VIDEO_DURATION_MS = 21_000;
export const MAX_CONCURRENT_VIDEO_UPLOADS = 3;
/** Un tramo abierto («bytes=0-») se responde por partes de este tamaño: nunca se carga el video entero de una vez. */
export const MAX_RANGE_CHUNK = 4 * 1024 * 1024;

export const VIDEO_TOO_BIG = "El video debe pesar hasta 25 MB.";
export const VIDEO_INVALID = "El video debe ser MP4, WebM o MOV y pesar hasta 25 MB.";
export const VIDEO_BUSY = "Hay varios videos subiéndose en este momento. Inténtalo de nuevo en unos segundos.";

export const isVideoMime = (mime: string | null | undefined): boolean => typeof mime === "string" && mime.toLowerCase().startsWith("video/");

/** Contenedor real según los primeros bytes (no según el Content-Type que declara el navegador). */
export function sniffVideoContainer(bytes: Buffer): "iso-bmff" | "quicktime-legacy" | "webm" | null {
  if (bytes.length < 16) return null;
  const box = bytes.toString("latin1", 4, 8);
  if (box === "ftyp" && bytes.readUInt32BE(0) >= 8) return "iso-bmff";
  // QuickTime antiguo puede empezar sin «ftyp», directamente con un átomo.
  if (["moov", "mdat", "wide", "free", "skip"].includes(box)) return "quicktime-legacy";
  if (bytes[0] === 0x1a && bytes[1] === 0x45 && bytes[2] === 0xdf && bytes[3] === 0xa3) {
    // Cabecera EBML: el DocType «webm» aparece en los primeros bytes.
    return bytes.subarray(0, 64).includes(Buffer.from("webm", "latin1")) ? "webm" : null;
  }
  return null;
}

const matches = (type: VideoType, container: ReturnType<typeof sniffVideoContainer>): boolean =>
  type === "video/webm" ? container === "webm"
    : type === "video/mp4" ? container === "iso-bmff"
      : container === "iso-bmff" || container === "quicktime-legacy";

export type ParsedVideo = { contentType: VideoType; bytes: Buffer; durationMs: number | null };

/** Valida el cuerpo crudo: tipo permitido, tamaño y que los bytes sean de verdad ese contenedor. */
export function parseVideoBytes(contentTypeHeader: string | undefined, bytes: unknown, durationHeader?: string): ParsedVideo | null {
  const contentType = (contentTypeHeader ?? "").split(";")[0].trim().toLowerCase();
  if (!(VIDEO_TYPES as readonly string[]).includes(contentType)) return null;
  if (!Buffer.isBuffer(bytes) || bytes.length === 0 || bytes.length > MAX_VIDEO_BYTES) return null;
  if (!matches(contentType as VideoType, sniffVideoContainer(bytes))) return null;
  let durationMs: number | null = null;
  if (durationHeader !== undefined) {
    if (!/^\d{1,6}$/.test(durationHeader)) return null;
    durationMs = Number(durationHeader);
    if (durationMs < 1 || durationMs > MAX_VIDEO_DURATION_MS) return null;
  }
  return { contentType: contentType as VideoType, bytes, durationMs };
}

export function parseVideoRequest(req: express.Request): ParsedVideo | null {
  const duration = req.headers["x-video-duration-ms"];
  return parseVideoBytes(req.headers["content-type"], req.body, typeof duration === "string" ? duration : undefined);
}

let activeUploads = 0;

/** Limita cuántos videos se reciben a la vez (cada uno puede ocupar hasta 25 MB de memoria mientras llega). */
export function videoUploadSlot(_req: express.Request, res: express.Response, next: express.NextFunction): void {
  if (activeUploads >= MAX_CONCURRENT_VIDEO_UPLOADS) {
    res.setHeader("Retry-After", "15");
    res.status(503).json({ error: VIDEO_BUSY });
    return;
  }
  activeUploads++;
  let released = false;
  const release = () => {
    if (released) return;
    released = true;
    activeUploads--;
  };
  res.on("finish", release);
  res.on("close", release);
  next();
}

const raw = express.raw({ type: [...VIDEO_TYPES], limit: MAX_VIDEO_BYTES });

/** express.raw para video con errores en JSON (413 si pesa más de 25 MB). */
export function rawVideo(req: express.Request, res: express.Response, next: express.NextFunction): void {
  raw(req, res, (error?: unknown) => {
    if (error) {
      const tooBig = (error as { status?: number; type?: string }).status === 413;
      res.status(tooBig ? 413 : 400).json({ error: tooBig ? VIDEO_TOO_BIG : VIDEO_INVALID });
      return;
    }
    next();
  });
}

/** Rango pedido en «Range: bytes=…» (uno solo). null = sin Range; "invalid" = no se puede satisfacer. */
export function parseRange(header: string | undefined, size: number): { start: number; end: number } | null | "invalid" {
  if (!header) return null;
  const match = /^bytes=(\d*)-(\d*)$/.exec(header.trim());
  if (!match || (match[1] === "" && match[2] === "") || size === 0) return "invalid";
  let start: number;
  let end: number;
  if (match[1] === "") {
    // «bytes=-500»: los últimos 500 bytes.
    const suffix = Number(match[2]);
    if (suffix === 0) return "invalid";
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(match[1]);
    end = match[2] === "" ? Math.min(size - 1, start + MAX_RANGE_CHUNK - 1) : Math.min(Number(match[2]), size - 1);
  }
  if (start >= size || end < start) return "invalid";
  return { start, end: Math.min(end, start + MAX_RANGE_CHUNK - 1) };
}

/** Envía un video privado, por tramos si el navegador los pide (Safari/iOS lo exige). */
export async function sendPrivateVideo(req: express.Request, res: express.Response, video: { objectPath: string; mimeType: string; size: number }): Promise<void> {
  res.setHeader("Cache-Control", "private, no-store");
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Accept-Ranges", "bytes");
  const range = parseRange(req.headers.range, video.size);
  if (range === "invalid") {
    res.setHeader("Content-Range", `bytes */${video.size}`);
    res.status(416).end();
    return;
  }
  try {
    if (range) {
      const bytes = await privatePhotoStorage.readRange(video.objectPath, range.start, range.end);
      res.status(206);
      res.setHeader("Content-Type", video.mimeType);
      res.setHeader("Content-Range", `bytes ${range.start}-${range.start + bytes.length - 1}/${video.size}`);
      res.setHeader("Content-Length", String(bytes.length));
      res.end(bytes);
      return;
    }
    const file = await privatePhotoStorage.read(video.objectPath);
    res.setHeader("Content-Type", video.mimeType);
    res.setHeader("Content-Length", String(file.bytes.length));
    res.end(file.bytes);
  } catch {
    if (!res.headersSent) res.status(404).json({ error: "Video no encontrado." });
  }
}
