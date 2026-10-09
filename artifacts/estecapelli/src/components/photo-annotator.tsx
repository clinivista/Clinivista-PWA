import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Circle, Eraser, Hand, Loader2, Maximize, Minus, Pencil, Plus, Redo2, Type, Undo2, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { ANNOTATOR_TEXT } from "@/lib/annotator-i18n";
import {
  PALETTE, WIDTHS, clamp01, drawStrokes, hitsStroke, simplify, strokeToJson,
  type Pt, type Stroke, type StrokeType,
} from "@/lib/annotation";
import { FIT, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, clampView, zoomAt, type View } from "@/lib/zoom-view";

type Tool = StrokeType | "eraser" | "pan";

const TOOLS: Array<{ tool: Tool; icon: typeof Pencil }> = [
  { tool: "pen", icon: Pencil },
  { tool: "line", icon: Minus },
  { tool: "arrow", icon: ArrowUpRight },
  { tool: "ellipse", icon: Circle },
  { tool: "text", icon: Type },
  { tool: "eraser", icon: Eraser },
  { tool: "pan", icon: Hand },
];

const MAX_EXPORT_SIDE = 2400;

// Editor de dibujo del médico. Nunca toca la foto del paciente: guarda los
// trazos (vectores) y una imagen compuesta aparte.
export function PhotoAnnotator({ photoUrl, label, initialStrokes, saving, onSave, onClose }: {
  photoUrl: string;
  label: string;
  initialStrokes: Stroke[];
  saving: boolean;
  onSave: (strokes: ReturnType<typeof strokeToJson>, imageDataUrl: string) => void;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const a = ANNOTATOR_TEXT[lang];
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  // Historial de versiones del dibujo: deshacer/rehacer sirve tanto para trazos nuevos como para borrados.
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  const [tool, setTool] = useState<Tool>("pen");
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [width, setWidth] = useState<number>(WIDTHS[1].value);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [textAt, setTextAt] = useState<{ pt: Pt; value: string } | null>(null);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>(FIT);
  const viewRef = useRef<View>(FIT);
  viewRef.current = view;
  const boxRef = useRef(box);
  boxRef.current = box;
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pinch"; dist: number; view: View; mid: { x: number; y: number } } | { kind: "pan"; start: { x: number; y: number }; view: View } | null>(null);
  const dragging = useRef(false);
  const erasedInDrag = useRef(false);

  useEffect(() => {
    const img = new Image();
    img.onload = () => setImage(img);
    img.onerror = () => setFailed(true);
    img.src = photoUrl;
  }, [photoUrl]);

  // Ajusta el lienzo al espacio disponible conservando la proporción de la foto.
  useEffect(() => {
    if (!image || !wrapRef.current) return;
    const fit = () => {
      const wrap = wrapRef.current!;
      const maxWidth = wrap.clientWidth;
      const maxHeight = Math.max(240, window.innerHeight - 260);
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      setBox({ width: Math.floor(image.naturalWidth * scale), height: Math.floor(image.naturalHeight * scale) });
    };
    fit();
    window.addEventListener("resize", fit);
    return () => window.removeEventListener("resize", fit);
  }, [image]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !image || !box.width) return;
    // Con zoom se dibuja con más resolución para que la foto no se vea borrosa al acercarla.
    const ratio = (window.devicePixelRatio || 1) * Math.max(1, Math.min(view.zoom, 3));
    canvas.width = Math.min(4096, Math.round(box.width * ratio));
    canvas.height = Math.min(4096, Math.round(box.height * ratio));
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    drawStrokes(ctx, draft ? [...strokes, draft] : strokes, canvas.width, canvas.height);
  }, [image, box, strokes, draft, view.zoom]);

  const pointOf = useCallback((event: React.PointerEvent): Pt => {
    const rect = canvasRef.current!.getBoundingClientRect();
    return [clamp01((event.clientX - rect.left) / rect.width), clamp01((event.clientY - rect.top) / rect.height)];
  }, []);

  // Posición de un punto de pantalla respecto al centro del visor (el zoom se hace alrededor de ese punto).
  const fromCenter = (clientX: number, clientY: number) => {
    const rect = wrapRef.current!.getBoundingClientRect();
    return { x: clientX - (rect.left + rect.width / 2), y: clientY - (rect.top + rect.height / 2) };
  };
  const viewport = () => {
    const rect = wrapRef.current?.getBoundingClientRect();
    return { width: rect?.width ?? 0, height: rect?.height ?? 0 };
  };
  const zoomBy = (factor: number, anchor = { x: 0, y: 0 }) =>
    setView((prev) => zoomAt(prev, prev.zoom * factor, anchor, boxRef.current, viewport()));

  // Rueda del ratón / trackpad: zoom alrededor del cursor. Listener nativo porque React registra wheel como pasivo.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el || !image) return;
    const onWheel = (event: WheelEvent) => {
      event.preventDefault();
      const factor = Math.exp(-event.deltaY * (event.ctrlKey ? 0.01 : 0.0025));
      const rect = el.getBoundingClientRect();
      const anchor = { x: event.clientX - (rect.left + rect.width / 2), y: event.clientY - (rect.top + rect.height / 2) };
      setView((prev) => zoomAt(prev, prev.zoom * factor, anchor, boxRef.current, { width: rect.width, height: rect.height }));
    };
    el.addEventListener("wheel", onWheel, { passive: false });
    return () => el.removeEventListener("wheel", onWheel);
  }, [image]);

  // Teclado: + acerca, − aleja, 0 ajusta (no mientras se escribe un texto).
  useEffect(() => {
    const onKey = (event: KeyboardEvent) => {
      if ((event.target as HTMLElement)?.tagName === "INPUT") return;
      if (event.key === "+" || event.key === "=") zoomBy(ZOOM_STEP);
      else if (event.key === "-" || event.key === "_") zoomBy(1 / ZOOM_STEP);
      else if (event.key === "0") setView(FIT);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  // Si cambia el tamaño del lienzo, la vista se reajusta a los nuevos límites.
  useEffect(() => {
    if (box.width) setView((prev) => clampView(prev, box, viewport()));
  }, [box]);

  const change = (next: Stroke[]) => {
    setPast((prev) => [...prev, strokes]);
    setFuture([]);
    setStrokes(next);
  };
  const commit = (stroke: Stroke) => change([...strokes, stroke]);

  const startPinch = () => {
    const [p, q] = [...pointers.current.values()];
    gesture.current = {
      kind: "pinch",
      dist: Math.max(1, Math.hypot(p.x - q.x, p.y - q.y)),
      view: viewRef.current,
      mid: fromCenter((p.x + q.x) / 2, (p.y + q.y) / 2),
    };
  };

  const onPointerDown = (event: React.PointerEvent) => {
    if (!image || textAt) return;
    pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    // Dos dedos: pellizco para acercar/alejar y arrastre para mover. Cancela cualquier trazo en curso.
    if (pointers.current.size === 2) {
      dragging.current = false;
      setDraft(null);
      startPinch();
      return;
    }
    if (pointers.current.size > 2) return;
    if (tool === "pan") {
      (event.target as Element).setPointerCapture?.(event.pointerId);
      gesture.current = { kind: "pan", start: { x: event.clientX, y: event.clientY }, view: viewRef.current };
      return;
    }
    const pt = pointOf(event);
    if (tool === "text") {
      setTextAt({ pt, value: "" });
      return;
    }
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragging.current = true;
    erasedInDrag.current = false;
    if (tool === "eraser") {
      eraseAt(pt);
      return;
    }
    setDraft({ type: tool, color, width, points: tool === "pen" ? [pt] : [pt, pt] });
  };

  const eraseAt = (pt: Pt) => {
    const aspect = image ? image.naturalWidth / image.naturalHeight : 1;
    for (let i = strokes.length - 1; i >= 0; i -= 1) {
      if (!hitsStroke(strokes[i], pt, aspect)) continue;
      const next = strokes.filter((_, index) => index !== i);
      // Arrastrar el borrador por varios trazos es un solo paso del historial.
      if (erasedInDrag.current) setStrokes(next);
      else { change(next); erasedInDrag.current = true; }
      return;
    }
  };

  const onPointerMove = (event: React.PointerEvent) => {
    if (pointers.current.has(event.pointerId)) pointers.current.set(event.pointerId, { x: event.clientX, y: event.clientY });
    const g = gesture.current;
    if (g?.kind === "pinch" && pointers.current.size >= 2) {
      const [p, q] = [...pointers.current.values()];
      const mid = fromCenter((p.x + q.x) / 2, (p.y + q.y) / 2);
      const dist = Math.hypot(p.x - q.x, p.y - q.y);
      const zoomed = zoomAt(g.view, g.view.zoom * (dist / g.dist), g.mid, box, viewport());
      // Mover los dos dedos desplaza la foto.
      setView(clampView({ ...zoomed, x: zoomed.x + (mid.x - g.mid.x), y: zoomed.y + (mid.y - g.mid.y) }, box, viewport()));
      return;
    }
    if (g?.kind === "pan") {
      setView(clampView({ ...g.view, x: g.view.x + event.clientX - g.start.x, y: g.view.y + event.clientY - g.start.y }, box, viewport()));
      return;
    }
    if (!dragging.current) return;
    const pt = pointOf(event);
    if (tool === "eraser") {
      eraseAt(pt);
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.type === "pen"
        ? { ...prev, points: [...prev.points, pt] }
        : { ...prev, points: [prev.points[0], pt] };
    });
  };

  const onPointerUp = (event: React.PointerEvent) => {
    pointers.current.delete(event.pointerId);
    if (gesture.current?.kind === "pinch") {
      // Al soltar un dedo no se sigue dibujando con el otro.
      if (pointers.current.size < 2) gesture.current = null;
      return;
    }
    gesture.current = null;
    if (!dragging.current) return;
    dragging.current = false;
    if (!draft) return;
    const finished = draft.type === "pen" ? { ...draft, points: simplify(draft.points) } : draft;
    setDraft(null);
    const [a, b] = [finished.points[0], finished.points[finished.points.length - 1]];
    // Un toque sin arrastrar solo cuenta como punto con el lápiz.
    if (finished.type !== "pen" && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.005) return;
    commit(finished);
  };

  const undo = () => {
    if (!past.length) return;
    setFuture((prev) => [...prev, strokes]);
    setStrokes(past[past.length - 1]);
    setPast(past.slice(0, -1));
  };
  const redoLast = () => {
    if (!future.length) return;
    setPast((prev) => [...prev, strokes]);
    setStrokes(future[future.length - 1]);
    setFuture(future.slice(0, -1));
  };

  const confirmText = () => {
    if (textAt && textAt.value.trim()) commit({ type: "text", color, width, points: [textAt.pt], text: textAt.value.trim().slice(0, 200) });
    setTextAt(null);
  };

  const handleSave = () => {
    if (!image) return;
    const scale = Math.min(1, MAX_EXPORT_SIDE / Math.max(image.naturalWidth, image.naturalHeight));
    const out = document.createElement("canvas");
    out.width = Math.round(image.naturalWidth * scale);
    out.height = Math.round(image.naturalHeight * scale);
    const ctx = out.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(image, 0, 0, out.width, out.height);
    drawStrokes(ctx, strokes, out.width, out.height);
    onSave(strokeToJson(strokes), out.toDataURL("image/jpeg", 0.9));
  };

  return (
    <div role="dialog" aria-modal="true" aria-label={a.title(label)} className="fixed inset-0 z-[70] bg-neutral-950 flex flex-col">
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <h2 className="font-bold truncate">{a.title(label)}</h2>
        <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose} aria-label={a.closeNoSave}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="px-3 pb-2 flex flex-wrap items-center gap-2" role="toolbar" aria-label={a.toolbar}>
        {TOOLS.map(({ tool: value, icon: Icon }) => {
          const text = a[value];
          return (
          <Button key={value} type="button" size="sm" variant={tool === value ? "default" : "secondary"} className="rounded-full h-9"
            aria-pressed={tool === value} aria-label={text} onClick={() => setTool(value)}>
            <Icon className="w-4 h-4 sm:mr-1.5" /><span className="hidden sm:inline">{text}</span>
          </Button>
          );
        })}
        <span className="w-px h-6 bg-white/20 mx-1" />
        {PALETTE.map((value) => (
          <button key={value} type="button" aria-label={a.color(value)} aria-pressed={color === value}
            onClick={() => setColor(value)}
            className={`w-7 h-7 rounded-full border-2 ${color === value ? "border-white scale-110" : "border-white/30"}`}
            style={{ background: value }} />
        ))}
        <span className="w-px h-6 bg-white/20 mx-1" />
        {WIDTHS.map(({ value }, index) => (
          <Button key={value} type="button" size="sm" variant={width === value ? "default" : "secondary"} className="rounded-full h-9 px-3"
            aria-pressed={width === value} onClick={() => setWidth(value)}>{[a.thin, a.medium, a.thick][index]}</Button>
        ))}
        <span className="w-px h-6 bg-white/20 mx-1" />
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-9 w-9" aria-label={a.zoomOut} disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomBy(1 / ZOOM_STEP)}><Minus className="w-4 h-4" /></Button>
        <span className="text-white text-xs tabular-nums w-10 text-center" aria-live="polite" data-testid="zoom-level">{Math.round(view.zoom * 100)}%</span>
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-9 w-9" aria-label={a.zoomIn} disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomBy(ZOOM_STEP)}><Plus className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-9 w-9" aria-label={a.zoomReset} disabled={view.zoom === 1} onClick={() => setView(FIT)}><Maximize className="w-4 h-4" /></Button>
        <span className="w-px h-6 bg-white/20 mx-1" />
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-9 w-9" aria-label={a.undo} disabled={!past.length} onClick={undo}><Undo2 className="w-4 h-4" /></Button>
        <Button type="button" size="icon" variant="secondary" className="rounded-full h-9 w-9" aria-label={a.redo} disabled={!future.length} onClick={redoLast}><Redo2 className="w-4 h-4" /></Button>
      </div>

      <div ref={wrapRef} className="flex-1 min-h-0 overflow-hidden px-3 flex items-center justify-center touch-none">
        {failed ? (
          <p className="text-white/80 text-sm py-10">{a.loadError}</p>
        ) : !image ? (
          <Loader2 className="w-6 h-6 animate-spin text-white mt-10" />
        ) : (
          <div className="relative" style={{ width: box.width, height: box.height, transform: `translate(${view.x}px, ${view.y}px) scale(${view.zoom})`, transformOrigin: "center", willChange: "transform" }}>
            <canvas
              ref={canvasRef}
              data-testid="annotation-canvas"
              style={{ width: box.width, height: box.height, touchAction: "none", cursor: tool === "pan" ? (view.zoom > 1 ? "grab" : "default") : tool === "eraser" ? "cell" : "crosshair" }}
              className="rounded-lg bg-black"
              // Sin esto el navegador mueve el foco al lienzo y cierra el campo de texto recién abierto.
              onMouseDown={(event) => { if (tool === "text") event.preventDefault(); }}
              onPointerDown={onPointerDown}
              onPointerMove={onPointerMove}
              onPointerUp={onPointerUp}
              onPointerCancel={onPointerUp}
            />
            {textAt && (
              <input
                autoFocus
                aria-label={a.textAria}
                maxLength={200}
                value={textAt.value}
                onChange={(event) => setTextAt({ ...textAt, value: event.target.value })}
                onKeyDown={(event) => {
                  if (event.key === "Enter") confirmText();
                  if (event.key === "Escape") setTextAt(null);
                }}
                onBlur={confirmText}
                className="absolute bg-white/90 text-black text-sm rounded px-2 py-1 shadow min-w-[8rem] max-w-[80%]"
                style={{ left: `${Math.min(textAt.pt[0] * 100, 70)}%`, top: `${textAt.pt[1] * 100}%` }}
                placeholder={a.textPlaceholder}
              />
            )}
          </div>
        )}
      </div>

      <div className="px-4 py-3 flex justify-end gap-2">
        <Button type="button" variant="secondary" className="rounded-full" onClick={onClose} disabled={saving}>{a.cancel}</Button>
        <Button type="button" className="rounded-full font-bold" onClick={handleSave} disabled={!image || !strokes.length || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : a.save}
        </Button>
      </div>
    </div>
  );
}
