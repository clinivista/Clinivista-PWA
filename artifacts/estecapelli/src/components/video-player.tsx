import { useState } from "react";
import { AlertCircle, Loader2, Video } from "lucide-react";
import { useLanguage } from "@/lib/language";
import { VIDEO_TEXT } from "@/lib/video-i18n";

/**
 * Reproduce un video privado de la ficha. El servidor lo entrega por tramos
 * (Range) con cabeceras privadas; aquí no hay botón de descarga ni enlace público.
 */
export function VideoPlayer({ src, label, durationMs, className = "" }: { src: string | null; label: string; durationMs?: number | null; className?: string }) {
  const { lang } = useLanguage();
  const v = VIDEO_TEXT[lang];
  const [state, setState] = useState<"loading" | "ready" | "error">("loading");

  if (!src) {
    return (
      <div className={`flex flex-col items-center justify-center gap-1 bg-muted text-muted-foreground text-xs ${className}`} data-testid="video-empty">
        <Video className="w-7 h-7 opacity-60" aria-hidden="true" />{v.noVideo}
      </div>
    );
  }
  return (
    <div className={`relative bg-black ${className}`}>
      <video
        src={src}
        controls
        playsInline
        preload="metadata"
        controlsList="nodownload noremoteplayback"
        disablePictureInPicture
        onContextMenu={(event) => event.preventDefault()}
        onLoadedMetadata={() => setState("ready")}
        onError={() => setState("error")}
        aria-label={`${v.video}: ${label}`}
        className="w-full h-full object-contain"
        data-testid="video-player"
      />
      {state === "loading" && (
        <span className="pointer-events-none absolute inset-0 flex items-center justify-center gap-2 text-white/80 text-xs" role="status">
          <Loader2 className="w-4 h-4 animate-spin" aria-hidden="true" />{v.loading}
        </span>
      )}
      {state === "error" && (
        <span className="absolute inset-0 flex items-center justify-center gap-2 bg-black/80 p-3 text-center text-white text-xs" role="alert">
          <AlertCircle className="w-4 h-4 shrink-0" aria-hidden="true" />{v.playError}
        </span>
      )}
      {state === "ready" && durationMs ? (
        <span className="pointer-events-none absolute top-2 end-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-semibold text-white tabular-nums">{v.seconds(Math.round(durationMs / 1000))}</span>
      ) : null}
    </div>
  );
}
