import { useEffect, useRef, useState, type ReactNode } from "react";
import { Maximize, Minus, Plus, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { COMPARE_TEXT } from "@/lib/compare-i18n";
import { FIT, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, clampView, clampZoom, zoomAt, type View } from "@/lib/zoom-view";

export type CompareItem = { id: string; label: string; date?: string };
type Mode = "side" | "overlay" | "wipe";

/** Un visor con zoom y desplazamiento (rueda, pellizco, arrastre) cuyo estado vive afuera: así dos visores se mueven juntos. */
function Stage({ view, setView, children, label }: { view: View; setView: (update: (prev: View) => View) => void; children: ReactNode; label: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pan"; start: { x: number; y: number }; view: View } | { kind: "pinch"; dist: number; view: View } | null>(null);
  const size = () => ({ width: ref.current?.clientWidth ?? 0, height: ref.current?.clientHeight ?? 0 });
  const fromCenter = (x: number, y: number) => {
    const rect = ref.current!.getBoundingClientRect();
    return { x: x - (rect.left + rect.width / 2), y: y - (rect.top + rect.height / 2) };
  };

  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0025));
      const rect = element.getBoundingClientRect();
      const anchor = { x: event.clientX - (rect.left + rect.width / 2), y: event.clientY - (rect.top + rect.height / 2) };
      const area = { width: element.clientWidth, height: element.clientHeight };
      setView((prev) => zoomAt(prev, prev.zoom * factor, anchor, area, area));
    };
    element.addEventListener("wheel", onWheel, { passive: false });
    return () => element.removeEventListener("wheel", onWheel);
  }, [setView]);

  // Si el zoom baja, el desplazamiento no puede dejar márgenes vacíos.
  useEffect(() => {
    const area = { width: ref.current?.clientWidth ?? 0, height: ref.current?.clientHeight ?? 0 };
    setView((prev) => { const next = clampView(prev, area, area); return next.x === prev.x && next.y === prev.y && next.zoom === prev.zoom ? prev : next; });
  }, [view.zoom, setView]);

  return (
    <div
      ref={ref}
      role="img"
      aria-label={label}
      data-testid="compare-stage"
      className="relative h-full w-full touch-none select-none overflow-hidden bg-black"
      style={{ cursor: view.zoom > 1 ? "grab" : "default" }}
      onPointerDown={(event) => {
        pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        (event.target as Element).setPointerCapture?.(event.pointerId);
        if (pointers.current.size === 2) {
          const [p, q] = [...pointers.current.values()];
          gesture.current = { kind: "pinch", dist: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)), view };
        } else if (pointers.current.size === 1) {
          gesture.current = { kind: "pan", start: { x: event.clientX, y: event.clientY }, view };
        }
      }}
      onPointerMove={(event) => {
        if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
        const g = gesture.current;
        const area = size();
        if (g?.kind === "pinch" && pointers.current.size >= 2) {
          const [p, q] = [...pointers.current.values()];
          const dist = Math.hypot(p.x - q.x, p.y - q.y);
          const mid = fromCenter((p.x + q.x) / 2, (p.y + q.y) / 2);
          setView(() => zoomAt(g.view, g.view.zoom * (dist / g.dist), mid, area, area));
        } else if (g?.kind === "pan" && pointers.current.size === 1) {
          setView(() => clampView({ ...g.view, x: g.view.x + event.clientX - g.start.x, y: g.view.y + event.clientY - g.start.y }, area, area));
        }
      }}
      onPointerUp={(event) => { pointers.current.delete(event.pointerId); gesture.current = null; }}
      onPointerCancel={(event) => { pointers.current.delete(event.pointerId); gesture.current = null; }}
    >
      <div className="absolute inset-0" style={{ transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "center", willChange: "transform" }}>
        {children}
      </div>
    </div>
  );
}

const photo = (leadId: string, id: string) => `/api/leads/${encodeURIComponent(leadId)}/photos/${encodeURIComponent(id)}`;

/**
 * Comparación de dos fotos de la misma zona: lado a lado con zoom y desplazamiento compartidos, superpuestas con
 * transparencia, o con una cortina. Solo cambia la vista; las fotos originales no se tocan.
 */
export function PhotoCompare({ leadId, items, onClose }: { leadId: string; items: CompareItem[]; onClose: () => void }) {
  const { lang } = useLanguage();
  const c = COMPARE_TEXT[lang];
  const [beforeId, setBeforeId] = useState(items[0]?.id ?? "");
  const [afterId, setAfterId] = useState(items[items.length - 1]?.id ?? "");
  const [mode, setMode] = useState<Mode>("overlay");
  const [opacity, setOpacity] = useState(50);
  const [wipe, setWipe] = useState(50);
  const [view, setViewState] = useState<View>(FIT);
  const before = items.find((item) => item.id === beforeId);
  const after = items.find((item) => item.id === afterId);
  const setView = (update: (prev: View) => View) => setViewState(update);
  // Los botones y el teclado acercan alrededor del centro; los visores recortan el desplazamiento a sus límites.
  const zoomBy = (factor: number) => setViewState((prev) => {
    const zoom = clampZoom(prev.zoom * factor);
    return zoom <= 1 ? FIT : { zoom, x: prev.x * (zoom / prev.zoom), y: prev.y * (zoom / prev.zoom) };
  });

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT" || (event.target as HTMLElement)?.tagName === "SELECT") return;
      if (event.key === "Escape") onClose();
      else if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
      else if (event.key === "-" || event.key === "_") zoomBy(1 / ZOOM_STEP);
      else if (event.key === "0") setViewState(FIT);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  });

  if (!before || !after) return null;
  const image = (item: CompareItem, extra = "") => (
    <img src={photo(leadId, item.id)} alt={item.label} draggable={false} className={`absolute inset-0 h-full w-full object-contain ${extra}`} />
  );
  const select = (value: string, onChange: (id: string) => void, name: string) => (
    <label className="flex items-center gap-2 text-xs font-bold text-white/80">
      {name}
      <select value={value} onChange={(event) => onChange(event.target.value)} aria-label={name} className="h-8 max-w-[11rem] rounded-full bg-white/10 px-3 text-xs font-semibold text-white">
        {items.map((item) => <option key={item.id} value={item.id} className="text-black">{item.label}{item.date ? ` · ${item.date}` : ""}</option>)}
      </select>
    </label>
  );
  const modes: Array<{ id: Mode; text: string }> = [{ id: "side", text: c.modeSide }, { id: "overlay", text: c.modeOverlay }, { id: "wipe", text: c.modeWipe }];

  return (
    <div role="dialog" aria-modal="true" aria-label={c.title} className="fixed inset-0 z-[70] flex flex-col bg-neutral-950 text-white" data-testid="photo-compare">
      <div className="flex items-center gap-2 px-3 py-2">
        <h2 className="min-w-0 flex-1 truncate font-bold">{c.title}</h2>
        <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5" role="group" aria-label="Zoom">
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/10 disabled:opacity-30" aria-label={c.zoomOut} disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomBy(1 / ZOOM_STEP)}><Minus className="h-4 w-4" /></Button>
          <span className="w-12 text-center text-xs tabular-nums" aria-live="polite" data-testid="compare-zoom">{Math.round(view.zoom * 100)}%</span>
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/10 disabled:opacity-30" aria-label={c.zoomIn} disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomBy(ZOOM_STEP)}><Plus className="h-4 w-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className="h-9 w-9 rounded-full text-white hover:bg-white/10 disabled:opacity-30" aria-label={c.reset} disabled={view.zoom === 1} onClick={() => setViewState(FIT)}><Maximize className="h-4 w-4" /></Button>
        </div>
        <Button type="button" size="icon" variant="ghost" className="text-white hover:bg-white/10" aria-label={c.close} onClick={onClose}><X className="h-5 w-5" /></Button>
      </div>

      <div className="mx-3 mb-2 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-2xl border border-white/10 bg-white/5 p-2">
        <div className="flex gap-1" role="group" aria-label={c.title}>
          {modes.map(({ id, text }) => (
            <button key={id} type="button" aria-pressed={mode === id} onClick={() => setMode(id)}
              className={`h-8 rounded-full px-4 text-xs font-bold transition-colors ${mode === id ? "bg-white text-neutral-900" : "text-white/70 hover:bg-white/10"}`}>{text}</button>
          ))}
        </div>
        {select(beforeId, setBeforeId, c.before)}
        {select(afterId, setAfterId, c.after)}
        {mode === "overlay" && (
          <label className="flex items-center gap-2 text-xs font-bold text-white/80">{c.opacity}
            <input type="range" min={0} max={100} value={opacity} aria-label={c.opacity} onChange={(event) => setOpacity(Number(event.target.value))} className="w-40" />
            <span className="w-9 tabular-nums" data-testid="compare-opacity">{opacity}%</span>
          </label>
        )}
        {mode === "wipe" && (
          <label className="flex items-center gap-2 text-xs font-bold text-white/80">{c.wipe}
            <input type="range" min={0} max={100} value={wipe} aria-label={c.wipe} onChange={(event) => setWipe(Number(event.target.value))} className="w-40" />
          </label>
        )}
      </div>

      <div className="min-h-0 flex-1 px-3">
        {mode === "side" ? (
          <div className="grid h-full grid-cols-2 gap-2">
            {[before, after].map((item, index) => (
              <div key={index} className="relative h-full overflow-hidden rounded-xl">
                <Stage view={view} setView={setView} label={item.label}>{image(item)}</Stage>
                <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold">{index === 0 ? c.before : c.after} · <bdi>{item.label}</bdi></span>
              </div>
            ))}
          </div>
        ) : (
          <div className="relative h-full overflow-hidden rounded-xl">
            <Stage view={view} setView={setView} label={`${before.label} / ${after.label}`}>
              {image(before)}
              {mode === "overlay"
                ? <div className="absolute inset-0" data-testid="compare-top" style={{ opacity: opacity / 100 }}>{image(after)}</div>
                : <div className="absolute inset-0" data-testid="compare-top" style={{ clipPath: `inset(0 ${100 - wipe}% 0 0)` }}>{image(after)}</div>}
            </Stage>
            <span className="pointer-events-none absolute start-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[11px] font-bold">{c.before}: <bdi>{before.label}</bdi> · {c.after}: <bdi>{after.label}</bdi></span>
          </div>
        )}
      </div>

      <p className="px-4 py-2 text-center text-[11px] text-white/70">{c.hint} {c.note}</p>
    </div>
  );
}
