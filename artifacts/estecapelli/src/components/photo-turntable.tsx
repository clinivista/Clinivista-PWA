import { useEffect, useRef, useState } from "react";
import { ChevronLeft, ChevronRight, Pause, Play, RotateCw } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { TURNTABLE_TEXT } from "@/lib/turntable-i18n";
import { stepsForDrag, turntableViews, wrapIndex, type TurntablePhoto } from "@/lib/turntable";

const AUTO_MS = 1300;

/**
 * Recorrido giratorio por las fotos del paciente: arrastrar, flechas del teclado, botones o giro automático.
 * No es un modelo 3D (no inventa geometría ni sirve para medir): solo pasa de una foto a la siguiente con un fundido.
 */
export function PhotoTurntable({ leadId, photos, onExpand }: { leadId: string; photos: TurntablePhoto[]; onExpand?: (url: string) => void }) {
  const { lang } = useLanguage();
  const x = TURNTABLE_TEXT[lang];
  const { ring, top } = turntableViews(photos);
  const stops = top ? [...ring, top] : ring; // la superior se alcanza con su botón, no girando
  const [index, setIndex] = useState(() => Math.max(0, ring.findIndex((photo) => photo.key === "frontal")));
  const [auto, setAuto] = useState(false);
  const drag = useRef<{ x: number; index: number } | null>(null);
  const shownTop = top !== null && index >= ring.length;
  const urlOf = (photo: TurntablePhoto) => `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(photo.id)}`;

  useEffect(() => {
    if (!auto || ring.length < 2) return;
    const timer = window.setInterval(() => setIndex((prev) => (prev >= ring.length ? 0 : wrapIndex(prev, 1, ring.length))), AUTO_MS);
    return () => window.clearInterval(timer);
  }, [auto, ring.length]);

  if (ring.length < 2) return null;
  const rotate = (delta: number) => setIndex((prev) => (prev >= ring.length ? 0 : wrapIndex(prev, delta, ring.length)));

  return (
    <section className="mb-5 rounded-2xl border border-border bg-card p-3" aria-label={x.title} data-testid="turntable">
      <div className="mb-2 flex items-center gap-2">
        <RotateCw className="h-4 w-4 text-primary" aria-hidden />
        <h4 className="flex-1 text-sm font-bold">{x.title}</h4>
        <Button type="button" size="sm" variant="outline" className="h-8 rounded-full px-3 text-xs" aria-pressed={auto} onClick={() => setAuto((prev) => !prev)}>
          {auto ? <Pause className="me-1.5 h-3.5 w-3.5" /> : <Play className="me-1.5 h-3.5 w-3.5" />}{auto ? x.pause : x.play}
        </Button>
      </div>
      <div
        role="group"
        tabIndex={0}
        aria-label={x.hint}
        data-testid="turntable-stage"
        className="relative mx-auto aspect-[4/3] max-h-[420px] w-full touch-pan-y select-none overflow-hidden rounded-xl bg-black outline-none focus-visible:ring-2 focus-visible:ring-primary"
        style={{ cursor: "grab" }}
        onKeyDown={(event) => { if (event.key === "ArrowLeft") rotate(-1); else if (event.key === "ArrowRight") rotate(1); }}
        onPointerDown={(event) => { drag.current = { x: event.clientX, index }; (event.target as Element).setPointerCapture?.(event.pointerId); }}
        onPointerMove={(event) => {
          if (!drag.current || drag.current.index >= ring.length) return;
          setIndex(wrapIndex(drag.current.index, stepsForDrag(event.clientX - drag.current.x), ring.length));
        }}
        onPointerUp={() => { drag.current = null; }}
        onPointerCancel={() => { drag.current = null; }}
      >
        {stops.map((photo, position) => (
          <img key={photo.id} src={urlOf(photo)} alt={photo.label} draggable={false} data-testid={`turntable-${photo.key}`} aria-hidden={position !== index}
            className={`absolute inset-0 h-full w-full object-contain transition-opacity duration-300 ${position === index ? "opacity-100" : "opacity-0"}`} />
        ))}
        <Button type="button" size="icon" variant="secondary" className="absolute start-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full opacity-90" aria-label={x.prev} onClick={() => rotate(-1)}><ChevronLeft className="h-5 w-5" /></Button>
        <Button type="button" size="icon" variant="secondary" className="absolute end-2 top-1/2 h-9 w-9 -translate-y-1/2 rounded-full opacity-90" aria-label={x.next} onClick={() => rotate(1)}><ChevronRight className="h-5 w-5" /></Button>
        <button type="button" className="absolute bottom-2 end-2 rounded-full bg-black/60 px-3 py-1 text-xs font-bold text-white" onClick={() => onExpand?.(urlOf(stops[index]))}>
          <bdi>{stops[index].label}</bdi>
        </button>
      </div>
      <div className="mt-2 flex flex-wrap items-center justify-center gap-1.5" role="group" aria-label={x.title}>
        {ring.map((photo, position) => (
          <button key={photo.id} type="button" aria-pressed={position === index} onClick={() => setIndex(position)}
            className={`h-7 rounded-full px-3 text-xs font-semibold ${position === index ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}><bdi>{photo.label}</bdi></button>
        ))}
        {top && (
          <button type="button" aria-pressed={shownTop} onClick={() => setIndex(ring.length)}
            className={`h-7 rounded-full px-3 text-xs font-semibold ${shownTop ? "bg-primary text-primary-foreground" : "bg-muted text-muted-foreground"}`}>{x.top}</button>
        )}
      </div>
      <p className="mt-2 text-center text-[11px] text-muted-foreground">{x.note}</p>
    </section>
  );
}
