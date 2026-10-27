// Grabación y subida de los videos cortos por vista (plan Titanium).

export const MAX_VIDEO_SECONDS = 20;
export const MAX_VIDEO_BYTES = 25 * 1024 * 1024;
export const VIDEO_BITS_PER_SECOND = 2_500_000;
export const ALLOWED_VIDEO_TYPES = ["video/mp4", "video/webm", "video/quicktime"] as const;

// Safari graba MP4; Chrome, Edge y Firefox, WebM. Se usa el primero que el navegador soporta.
const MIME_CANDIDATES = ["video/mp4;codecs=avc1", "video/mp4", "video/webm;codecs=vp9", "video/webm;codecs=vp8", "video/webm"];

export function canRecordVideo(): boolean {
  return typeof window !== "undefined" && typeof window.MediaRecorder !== "undefined"
    && typeof navigator !== "undefined" && typeof navigator.mediaDevices?.getUserMedia === "function";
}

/** El formato de grabación que soporta este navegador ("" = el que elija el navegador; null = no puede grabar). */
export function pickVideoMime(): string | null {
  if (!canRecordVideo()) return null;
  const supported = (type: string) => typeof MediaRecorder.isTypeSupported === "function" && MediaRecorder.isTypeSupported(type);
  return MIME_CANDIDATES.find(supported) ?? "";
}

/** El tipo que se envía al servidor: sin parámetros de códec, y solo entre los permitidos. */
export function baseVideoType(type: string): (typeof ALLOWED_VIDEO_TYPES)[number] | null {
  const base = type.split(";")[0].trim().toLowerCase();
  return (ALLOWED_VIDEO_TYPES as readonly string[]).includes(base) ? (base as (typeof ALLOWED_VIDEO_TYPES)[number]) : null;
}

/** Un archivo elegido a mano: solo si es MP4/WebM/MOV y pesa hasta 25 MB. */
export function checkVideoFile(file: File): "ok" | "type" | "size" {
  if (!baseVideoType(file.type)) return "type";
  if (file.size > MAX_VIDEO_BYTES) return "size";
  return "ok";
}

export type RecordedVideo = { blob: Blob; type: (typeof ALLOWED_VIDEO_TYPES)[number]; durationMs: number | null; source: "camera" | "upload" };

/** Envía el video a una ruta de subida; devuelve el error del servidor si lo hay. */
export async function uploadVideo(url: string, video: RecordedVideo, headers: Record<string, string> = {}): Promise<{ ok: true; body: unknown } | { ok: false; status: number; error: string | null }> {
  const response = await fetch(url, {
    method: "POST",
    credentials: "include",
    headers: {
      "Content-Type": video.type,
      "x-photo-source": video.source,
      ...(video.durationMs !== null ? { "x-video-duration-ms": String(Math.round(video.durationMs)) } : {}),
      ...headers,
    },
    body: video.blob,
  });
  const body = await response.json().catch(() => null) as { error?: string } | null;
  return response.ok ? { ok: true, body } : { ok: false, status: response.status, error: body?.error ?? null };
}
