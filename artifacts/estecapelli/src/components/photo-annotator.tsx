import { useCallback, useEffect, useRef, useState } from "react";
import { ArrowUpRight, Circle, Eraser, Grid3x3, Hand, Hexagon, Loader2, Maximize, MapPin, Minus, Pencil, Plus, Redo2, Ruler, Scaling, SeparatorVertical, TriangleRight, Type, Undo2, X, AlignJustify, ScanLine, Sparkles, Spline, Square, Waypoints, ScanFace, Calculator, ChevronDown, ChevronUp, WandSparkles, MousePointer2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { ANNOTATOR_TEXT } from "@/lib/annotator-i18n";
import { MEASURE_TOOLS_TEXT } from "@/lib/measure-tools-i18n";
import { EDITOR_UI_TEXT, type EditorUiText } from "@/lib/editor-ui-i18n";
import { HAIR_PLAN_TEXT } from "@/lib/hair-plan-i18n";
import { GRAFT_DEFAULTS, GRAFT_KEYS, GRAFT_RANGES, fitHairline, graftPrefill, graftText, parseGraft, planSummary, type GraftKey } from "@/lib/hair-plan";
import { hasEstimatedScale, proposeDesign, syncRecipientArea } from "@/lib/hair-design";
import { createFaceTurn, faceGuideFromLandmarks } from "@/lib/face-turn";
import {
  GUIDE_KINDS, PALETTE, WIDTHS, clamp01, mmPerPixel, tapDensity, describeMeasures, drawStrokes, formatArea, formatAngle, formatLength, hitsStroke, polygonStats, simplify, strokeToJson,
  type GuideKind, type Pt, type Stroke, type StrokeType,
} from "@/lib/annotation";
import { FIT, MAX_ZOOM, MIN_ZOOM, ZOOM_STEP, clampView, zoomAt, type View } from "@/lib/zoom-view";

type Tool = Exclude<StrokeType, "guide" | "class" | "face" | "graft"> | "eraser" | "pan" | "adjust";
type TabId = "draw" | "measure" | "hair" | "view";

const DRAW_TOOLS: Array<{ tool: Tool; icon: typeof Pencil }> = [
  { tool: "pen", icon: Pencil },
  { tool: "line", icon: Minus },
  { tool: "arrow", icon: ArrowUpRight },
  { tool: "ellipse", icon: Circle },
  { tool: "text", icon: Type },
  { tool: "eraser", icon: Eraser },
  { tool: "pan", icon: Hand },
];
const MEASURE_TOOLS: Array<{ tool: Tool; icon: typeof Pencil }> = [
  { tool: "scale", icon: Scaling },
  { tool: "ruler", icon: Ruler },
  { tool: "angle", icon: TriangleRight },
  { tool: "area", icon: Hexagon },
  { tool: "marker", icon: MapPin },
];
// Capilar: zonas y líneas son un área o una regla con nombre; la densidad tiene su propio trazo.
const HAIR_TOOLS: Array<{ name: keyof EditorUiText; tool: Tool; icon: typeof Pencil }> = [
  { name: "donor", tool: "area", icon: Hexagon },
  { name: "recipient", tool: "area", icon: Square },
  { name: "hairline", tool: "ruler", icon: Ruler },
  { name: "templeR", tool: "ruler", icon: Waypoints },
  { name: "templeL", tool: "ruler", icon: Waypoints },
  { name: "density", tool: "density", icon: ScanLine },
];

const samePoint = (a: Pt, b: Pt) => Math.abs(a[0] - b[0]) < 1e-4 && Math.abs(a[1] - b[1]) < 1e-4;
const isEditable = (stroke: Stroke) => stroke.type === "hairline" || stroke.type === "area";
const MAX_EXPORT_SIDE = 2400;
const ENHANCE_FILTER = "contrast(1.3) brightness(1.08) saturate(1.2)";
const GUIDE_ICON: Record<GuideKind, typeof Grid3x3> = { grid: Grid3x3, midline: SeparatorVertical, planes: AlignJustify };
const MEASURE_TOOL_KEYS = ["scale", "ruler", "angle", "area", "marker"] as const;
const TAB_DEFAULT_TOOL: Record<TabId, Tool | null> = { draw: "pen", measure: "ruler", hair: null, view: null };

// Editor de dibujo del médico. Nunca toca la foto del paciente: guarda los
// trazos (vectores) y una imagen compuesta aparte.
export function PhotoAnnotator({ photoUrl, label, initialStrokes, saving, onSave, onClose, specialty }: {
  specialty?: string;
  photoUrl: string;
  label: string;
  initialStrokes: Stroke[];
  saving: boolean;
  onSave: (strokes: ReturnType<typeof strokeToJson>, imageDataUrl: string) => void;
  onClose: () => void;
}) {
  const { lang } = useLanguage();
  const a = ANNOTATOR_TEXT[lang];
  const m = MEASURE_TOOLS_TEXT[lang];
  const u = EDITOR_UI_TEXT[lang];
  const h = HAIR_PLAN_TEXT[lang];
  const isHair = specialty === "capilar";
  const isHairInitial = isHair;
  const hasFaceGuides = isHair || specialty === "plastica";
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [failed, setFailed] = useState(false);
  // Historial de versiones del dibujo: deshacer/rehacer sirve tanto para trazos nuevos como para borrados.
  const [strokes, setStrokes] = useState<Stroke[]>(initialStrokes);
  const [past, setPast] = useState<Stroke[][]>([]);
  const [future, setFuture] = useState<Stroke[][]>([]);
  // Las clínicas capilares abren en su pestaña, con el ajuste de puntos listo (no dibuja nada por sí solo).
  const [tool, setTool] = useState<Tool>(isHairInitial ? "adjust" : "pen");
  const [tab, setTab] = useState<TabId>(isHairInitial ? "hair" : "draw");
  // Nombre de la zona o línea capilar en curso (vacío = medición común).
  const [preset, setPreset] = useState("");
  // Realce de cuero cabelludo: solo se aplica a la vista, nunca a la imagen guardada.
  const [enhance, setEnhance] = useState(false);
  const [color, setColor] = useState<string>(PALETTE[0]);
  const [width, setWidth] = useState<number>(WIDTHS[1].value);
  const [draft, setDraft] = useState<Stroke | null>(null);
  const [textAt, setTextAt] = useState<{ pt: Pt; value: string } | null>(null);
  // Medición: puntos ya tocados de un ángulo o un área en curso, el punto bajo el cursor y la escala esperando su medida real.
  const [pending, setPending] = useState<Pt[]>([]);
  const [hover, setHover] = useState<Pt | null>(null);
  const [scaleAt, setScaleAt] = useState<{ points: [Pt, Pt]; value: string } | null>(null);
  // Guías faciales automáticas: detección en curso y último aviso.
  // Consola de herramientas recogida: deja casi toda la pantalla a la foto (útil en el teléfono).
  const [collapsed, setCollapsed] = useState(false);
  const [faceBusy, setFaceBusy] = useState(false);
  const [faceMsg, setFaceMsg] = useState("");
  const [graftFilled, setGraftFilled] = useState(false);
  const [box, setBox] = useState({ width: 0, height: 0 });
  const [view, setView] = useState<View>(FIT);
  const viewRef = useRef<View>(FIT);
  viewRef.current = view;
  const boxRef = useRef(box);
  boxRef.current = box;
  const strokesRef = useRef<Stroke[]>(initialStrokes);
  const pointers = useRef(new Map<number, { x: number; y: number }>());
  const gesture = useRef<{ kind: "pinch"; dist: number; view: View; mid: { x: number; y: number } } | { kind: "pan"; start: { x: number; y: number }; view: View } | null>(null);
  const dragging = useRef(false);
  // Puntos que se mueven juntos: el de la línea frontal y el de la zona receptora que coinciden con él.
  const handle = useRef<Array<{ i: number; j: number }> | null>(null);
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
      // El alto disponible es el del visor (cambia al plegar o desplegar la consola); sin medida, se estima por la ventana.
      const maxHeight = Math.max(200, wrap.clientHeight > 0 ? wrap.clientHeight - 8 : window.innerHeight - 260);
      const scale = Math.min(maxWidth / image.naturalWidth, maxHeight / image.naturalHeight);
      setBox({ width: Math.floor(image.naturalWidth * scale), height: Math.floor(image.naturalHeight * scale) });
    };
    fit();
    window.addEventListener("resize", fit);
    const observer = typeof ResizeObserver === "undefined" ? null : new ResizeObserver(fit);
    observer?.observe(wrapRef.current);
    return () => { window.removeEventListener("resize", fit); observer?.disconnect(); };
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
    if (enhance) ctx.filter = ENHANCE_FILTER;
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    ctx.filter = "none";
    const inProgress: Stroke[] = [];
    if (draft) inProgress.push(draft);
    if (pending.length > 0 && (tool === "angle" || tool === "area")) inProgress.push({ type: tool, color, width, points: hover ? [...pending, hover] : pending, ...(preset ? { text: preset } : {}) });
    drawStrokes(ctx, [...strokes, ...inProgress], canvas.width, canvas.height);
    // Con «Ajustar puntos» se ven las asas de la línea frontal y de las zonas (solo en pantalla, no en la imagen guardada).
    if (tool === "adjust") {
      const radius = (7 * canvas.width) / box.width;
      const drawn: Pt[] = [];
      for (const stroke of strokes) {
        if (!isEditable(stroke)) continue;
        for (const p of stroke.points) {
          // Un solo asa por lugar: la zona receptora comparte los puntos de la línea frontal.
          if (drawn.some((q) => samePoint(p, q))) continue;
          drawn.push(p);
          ctx.beginPath();
          ctx.arc(p[0] * canvas.width, p[1] * canvas.height, radius, 0, Math.PI * 2);
          ctx.fillStyle = "#ffffff";
          ctx.fill();
          ctx.lineWidth = radius * 0.35;
          ctx.strokeStyle = "#111827";
          ctx.stroke();
        }
      }
    }
  }, [image, box, strokes, draft, view.zoom, pending, hover, tool, color, width, enhance]);

  // Al cambiar de herramienta se descarta lo que estaba a medias.
  useEffect(() => { setPending([]); setHover(null); setScaleAt(null); }, [tool, preset]);

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

  strokesRef.current = strokes;
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
    if (tool === "adjust") {
      // Toma el punto más cercano (a menos de unos 22 px de pantalla) y lo arrastra; todo el arrastre es un solo paso del historial.
      const reach = 22 / viewRef.current.zoom;
      let best: { i: number; j: number; d: number } | null = null;
      strokes.forEach((item, i) => {
        if (!isEditable(item)) return;
        item.points.forEach((p, j) => {
          const d = Math.hypot((p[0] - pt[0]) * box.width, (p[1] - pt[1]) * box.height);
          if (d <= reach && (!best || d < best.d)) best = { i, j, d };
        });
      });
      const hit = best as { i: number; j: number; d: number } | null;
      if (hit) {
        (event.target as Element).setPointerCapture?.(event.pointerId);
        const grabbed = strokes[hit.i].points[hit.j];
        handle.current = strokes.flatMap((item, i) => (isEditable(item) ? item.points.flatMap((p, j) => (samePoint(p, grabbed) ? [{ i, j }] : [])) : []));
        dragging.current = true;
        setPast((prev) => [...prev, strokes]);
        setFuture([]);
      }
      return;
    }
    if (tool === "text") {
      setTextAt({ pt, value: "" });
      return;
    }
    if (tool === "density") {
      const next = tapDensity(strokes, pt, { width: image.naturalWidth, height: image.naturalHeight }, { color, width });
      if (next) change(next);
      return;
    }
    if (tool === "marker") {
      commit({ type: "marker", color, width, points: [pt], text: "" });
      return;
    }
    if (tool === "angle" || tool === "area") {
      if (tool === "area" && pending.length >= 3 && Math.hypot((pt[0] - pending[0][0]) * (image?.naturalWidth ?? 1), (pt[1] - pending[0][1]) * (image?.naturalHeight ?? 1)) < 0.03 * Math.max(image?.naturalWidth ?? 1, image?.naturalHeight ?? 1)) {
        finishArea();
        return;
      }
      const next = [...pending, pt];
      if (tool === "angle" && next.length === 3) { commit({ type: "angle", color, width, points: next }); setPending([]); setHover(null); return; }
      if (tool === "area" && next.length >= 60) { commit({ type: "area", color, width, points: next, ...(preset ? { text: preset } : {}) }); setPending([]); setHover(null); return; }
      setPending(next);
      return;
    }
    (event.target as Element).setPointerCapture?.(event.pointerId);
    dragging.current = true;
    erasedInDrag.current = false;
    if (tool === "eraser") {
      eraseAt(pt);
      return;
    }
    setDraft({ type: tool, color, width, points: tool === "pen" || tool === "hairline" ? [pt] : [pt, pt], ...(tool === "ruler" && preset ? { text: preset } : {}) });
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
    if (!dragging.current) {
      if (pending.length > 0) setHover(pointOf(event));
      return;
    }
    const pt = pointOf(event);
    if (handle.current) {
      const targets = handle.current;
      setStrokes((prev) => prev.map((item, index) => {
        const mine = targets.filter((target) => target.i === index);
        return mine.length ? { ...item, points: item.points.map((p, k) => (mine.some((target) => target.j === k) ? pt : p)) } : item;
      }));
      return;
    }
    if (tool === "eraser") {
      eraseAt(pt);
      return;
    }
    setDraft((prev) => {
      if (!prev) return prev;
      return prev.type === "pen" || prev.type === "hairline"
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
    if (handle.current) {
      // Al soltar, la superficie receptora de la estimación de injertos sigue a la zona corregida.
      handle.current = null;
      dragging.current = false;
      setStrokes((prev) => syncRecipientArea(prev, { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 }, Object.values(EDITOR_UI_TEXT).map((text) => text.recipient)));
      return;
    }
    if (!dragging.current) return;
    dragging.current = false;
    if (!draft) return;
    const finished = draft.type === "pen" ? { ...draft, points: simplify(draft.points) } : draft.type === "hairline" ? { ...draft, points: fitHairline(draft.points, simplify) } : draft;
    setDraft(null);
    const [a, b] = [finished.points[0], finished.points[finished.points.length - 1]];
    // Un toque sin arrastrar solo cuenta como punto con el lápiz.
    if (finished.type !== "pen" && Math.hypot(a[0] - b[0], a[1] - b[1]) < 0.005) return;
    // La escala necesita su medida real antes de guardarse.
    if (finished.type === "scale") { setScaleAt({ points: [finished.points[0], finished.points[1]], value: "" }); return; }
    if (finished.type === "hairline") {
      // Hay una sola línea frontal por foto: la nueva reemplaza a la anterior.
      if (finished.points.length >= 2) change([...strokes.filter((stroke) => stroke.type !== "hairline"), finished]);
      return;
    }
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

  const finishArea = () => {
    if (pending.length >= 3) commit({ type: "area", color, width, points: pending, ...(preset ? { text: preset } : {}) });
    setPending([]);
    setHover(null);
  };

  const confirmScale = () => {
    const mm = Number(scaleAt?.value.replace(",", "."));
    if (scaleAt && Number.isFinite(mm) && mm > 0 && mm <= 10000) {
      // Una sola escala vale: la nueva reemplaza a la anterior.
      change([...strokes.filter((stroke) => stroke.type !== "scale"), { type: "scale", color, width, points: scaleAt.points, text: String(Math.round(mm * 100) / 100) }]);
    }
    setScaleAt(null);
  };

  const pickTool = (next: Tool, name = "") => { setTool(next); setPreset(name); };
  const pickTab = (next: TabId) => {
    setTab(next);
    const first = TAB_DEFAULT_TOOL[next];
    if (first) pickTool(first);
    else if (next === "hair") pickTool("adjust");
  };
  const hasScale = mmPerPixel(strokes, { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 }) !== null;

  const toggleGuide = (kind: GuideKind) => {
    const exists = strokes.some((stroke) => stroke.type === "guide" && stroke.text === kind);
    change(exists ? strokes.filter((stroke) => !(stroke.type === "guide" && stroke.text === kind)) : [...strokes, { type: "guide", color, width: WIDTHS[0].value, points: [[0.5, 0.5]], text: kind }]);
  };

  // Detecta el rostro en el dispositivo y devuelve los cinco puntos de las guías (o null, con el aviso en pantalla).
  const detectFace = async (): Promise<Pt[] | null> => {
    if (!image || faceBusy) return null;
    setFaceBusy(true);
    setFaceMsg("");
    try {
      const engine = await createFaceTurn();
      const guide = faceGuideFromLandmarks(engine?.landmarks ? await engine.landmarks(image) : null);
      if (!guide.ok) { setFaceMsg(guide.reason === "turned" ? h.faceTurned : guide.reason === "tilted" ? h.faceTilted : h.faceNone); return null; }
      return guide.points;
    } finally {
      setFaceBusy(false);
    }
  };
  // La detección tarda: se parte de los trazos de ahora, no de los de cuando se pulsó.
  const replaceStrokes = (next: Stroke[]) => {
    const base = strokesRef.current;
    setPast((prev) => [...prev, base]);
    setFuture([]);
    setStrokes(next);
  };
  const toggleFace = async () => {
    if (strokes.some((stroke) => stroke.type === "face")) {
      change(strokes.filter((stroke) => stroke.type !== "face"));
      setFaceMsg("");
      return;
    }
    const points = await detectFace();
    if (!points) return;
    replaceStrokes([...strokesRef.current.filter((stroke) => stroke.type !== "face"), { type: "face", color, width: WIDTHS[0].value, points }]);
    setFaceMsg(h.faceHint);
  };
  const proposeNow = async () => {
    const points = await detectFace();
    if (!points) return;
    const next = proposeDesign(strokesRef.current, points, { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 }, {
      recipientNames: Object.values(EDITOR_UI_TEXT).map((text) => text.recipient), recipientName: u.recipient, style: { color, width },
    });
    if (!next) { setFaceMsg(h.faceNone); return; }
    replaceStrokes(next);
    pickTool("adjust");
    setFaceMsg(h.proposeNote);
  };

  const graftStroke = strokes.find((stroke) => stroke.type === "graft");
  const graftParams = parseGraft(graftStroke?.text);
  const addGraft = () => {
    const size = { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 };
    const k = mmPerPixel(strokes, size);
    const names = { recipient: Object.values(EDITOR_UI_TEXT).map((text) => text.recipient), donor: Object.values(EDITOR_UI_TEXT).map((text) => text.donor) };
    const filled = graftPrefill(strokes, names, (points) => (k === null ? null : (polygonStats(points, size).areaPx * k * k) / 100));
    setGraftFilled(Object.keys(filled).length > 0);
    change([...strokes.filter((stroke) => stroke.type !== "graft"), { type: "graft", color, width, points: [[0.5, 0.94]], text: graftText({ ...GRAFT_DEFAULTS, ...filled }) }]);
  };
  const setGraftValue = (key: GraftKey, input: HTMLInputElement) => {
    const value = Number(input.value.replace(",", "."));
    const [min, max] = GRAFT_RANGES[key];
    // Un valor fuera de rango no se guarda y el campo vuelve al valor vigente.
    if (input.value.trim() === "" || !Number.isFinite(value) || value < min || value > max) { input.value = String(graftParams[key]); return; }
    if (!graftStroke || value === graftParams[key]) return;
    change(strokes.map((stroke) => (stroke === graftStroke ? { ...stroke, text: graftText({ ...graftParams, [key]: value }) } : stroke)));
  };

  const setMarkerNote = (strokeIndex: number, note: string) => {
    if ((strokes[strokeIndex]?.text ?? "") === note) return;
    change(strokes.map((stroke, index) => index === strokeIndex ? { ...stroke, text: note.slice(0, 200) } : stroke));
  };

  const confirmText = () => {
    if (textAt && textAt.value.trim()) commit({ type: "text", color, width, points: [textAt.pt], text: textAt.value.trim().slice(0, 200) });
    setTextAt(null);
  };

  const sizeNow = { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 };
  const plan = planSummary(strokes, sizeNow, mmPerPixel(strokes, sizeNow));
  const legend = describeMeasures(strokes, { width: image?.naturalWidth ?? 1, height: image?.naturalHeight ?? 1 });
  const scaleLabel = String(strokes.filter((stroke) => stroke.type === "scale").at(-1)?.text ?? "");

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

  const toolText = (value: Tool) =>
    (MEASURE_TOOL_KEYS as readonly string[]).includes(value) ? m[value as (typeof MEASURE_TOOL_KEYS)[number]] : (a[value as keyof typeof a & ("pen" | "line" | "arrow" | "ellipse" | "text" | "eraser" | "pan")] as string);
  const toolButton = (key: string, Icon: typeof Pencil, text: string, active: boolean, onClick: () => void) => (
    <button key={key} type="button" aria-pressed={active} aria-label={text} title={text} onClick={onClick}
      className={`flex w-[4.25rem] shrink-0 flex-col items-center gap-1 rounded-xl px-1 py-2 text-[11px] font-semibold leading-tight transition-colors ${active ? "bg-white text-neutral-900 shadow" : "text-white/80 hover:bg-white/10"}`}>
      <Icon className="h-5 w-5" /><span className="max-w-full text-center">{text}</span>
    </button>
  );
  const chip = (key: string, text: string, active: boolean, onClick: () => void, name?: string) => (
    <button key={key} type="button" aria-pressed={active} aria-label={name} onClick={onClick}
      className={`h-8 min-w-9 rounded-full px-3 text-xs font-bold transition-colors ${active ? "bg-white text-neutral-900" : "bg-white/10 text-white hover:bg-white/20"}`}>{text}</button>
  );
  const roundBtn = "h-9 w-9 rounded-full text-white hover:bg-white/10 disabled:opacity-30";
  const tabs: Array<{ id: TabId; text: string }> = [
    { id: "draw", text: u.tabDraw }, { id: "measure", text: u.tabMeasure },
    ...(isHair ? [{ id: "hair" as TabId, text: u.tabHair }] : []), { id: "view", text: u.tabView },
  ];

  return (
    <div role="dialog" aria-modal="true" aria-label={a.title(label)} className="fixed inset-0 z-[70] bg-neutral-950 flex flex-col">
      <div className="flex items-center gap-2 px-3 py-2 text-white">
        <h2 className="min-w-0 flex-1 truncate font-bold">{a.title(label)}</h2>
        <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5" role="group" aria-label={u.history}>
          <Button type="button" size="icon" variant="ghost" className={roundBtn} aria-label={a.undo} disabled={!past.length} onClick={undo}><Undo2 className="w-4 h-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className={roundBtn} aria-label={a.redo} disabled={!future.length} onClick={redoLast}><Redo2 className="w-4 h-4" /></Button>
        </div>
        <div className="flex items-center gap-0.5 rounded-full bg-white/10 p-0.5" role="group" aria-label={u.zoom}>
          <Button type="button" size="icon" variant="ghost" className={roundBtn} aria-label={a.zoomOut} disabled={view.zoom <= MIN_ZOOM} onClick={() => zoomBy(1 / ZOOM_STEP)}><Minus className="w-4 h-4" /></Button>
          <span className="w-10 text-center text-xs tabular-nums" aria-live="polite" data-testid="zoom-level">{Math.round(view.zoom * 100)}%</span>
          <Button type="button" size="icon" variant="ghost" className={roundBtn} aria-label={a.zoomIn} disabled={view.zoom >= MAX_ZOOM} onClick={() => zoomBy(ZOOM_STEP)}><Plus className="w-4 h-4" /></Button>
          <Button type="button" size="icon" variant="ghost" className={roundBtn} aria-label={a.zoomReset} disabled={view.zoom === 1} onClick={() => setView(FIT)}><Maximize className="w-4 h-4" /></Button>
        </div>
        <Button type="button" variant="ghost" size="icon" className="text-white hover:bg-white/10" onClick={onClose} aria-label={a.closeNoSave}>
          <X className="w-5 h-5" />
        </Button>
      </div>

      <div className="mx-3 mb-2 rounded-2xl border border-white/10 bg-white/5 p-2" role="toolbar" aria-label={a.toolbar}>
        <div className="flex gap-1 overflow-x-auto" role="tablist" aria-label={u.toolsOf}>
          {tabs.map(({ id, text }) => (
            <button key={id} type="button" role="tab" aria-selected={tab === id} onClick={() => { setCollapsed(false); pickTab(id); }}
              className={`h-8 shrink-0 rounded-full px-4 text-xs font-bold transition-colors ${tab === id ? "bg-white text-neutral-900" : "text-white/70 hover:bg-white/10 hover:text-white"}`}>{text}</button>
          ))}
          <button type="button" aria-expanded={!collapsed} aria-label={collapsed ? h.showTools : h.hideTools} title={collapsed ? h.showTools : h.hideTools} onClick={() => setCollapsed((prev) => !prev)}
            className="ms-auto flex h-8 w-8 shrink-0 items-center justify-center rounded-full text-white/80 hover:bg-white/10">
            {collapsed ? <ChevronDown className="h-4 w-4" /> : <ChevronUp className="h-4 w-4" />}
          </button>
        </div>
        <div className={`mt-2 flex max-h-[28vh] flex-wrap items-start gap-x-4 gap-y-2 overflow-y-auto ${collapsed ? "hidden" : ""}`} role="tabpanel">
          <div className="flex gap-1 overflow-x-auto">
            {tab === "draw" && DRAW_TOOLS.map(({ tool: value, icon }) => toolButton(value, icon, toolText(value), tool === value, () => pickTool(value)))}
            {tab === "measure" && MEASURE_TOOLS.map(({ tool: value, icon }) => toolButton(value, icon, toolText(value), tool === value, () => pickTool(value)))}
            {tab === "hair" && toolButton("propose", WandSparkles, faceBusy ? h.proposeBusy : h.propose, false, () => void proposeNow())}
            {tab === "hair" && toolButton("adjust", MousePointer2, h.adjust, tool === "adjust", () => pickTool("adjust"))}
            {tab === "hair" && HAIR_TOOLS.map(({ name, tool: value, icon }) => {
              const text = u[name];
              return toolButton(name, icon, text, tool === value && (value === "density" || preset === text), () => pickTool(value, value === "density" ? "" : text));
            })}
            {tab === "hair" && toolButton("designLine", Spline, h.designLine, tool === "hairline", () => pickTool("hairline"))}
            {tab === "view" && (
              <>
                {GUIDE_KINDS.map((kind) => {
                  const name = { grid: m.guideGrid, midline: m.guideMidline, planes: m.guidePlanes }[kind];
                  return toolButton(kind, GUIDE_ICON[kind], name, strokes.some((stroke) => stroke.type === "guide" && stroke.text === kind), () => toggleGuide(kind));
                })}
                {hasFaceGuides && toolButton("face", ScanFace, faceBusy ? h.faceBusy : h.faceGuides, strokes.some((stroke) => stroke.type === "face"), () => void toggleFace())}
                {isHair && toolButton("enhance", Sparkles, u.enhance, enhance, () => setEnhance((prev) => !prev))}
                {toolButton("pan", Hand, a.pan, tool === "pan", () => pickTool("pan"))}
              </>
            )}
          </div>
          {tab !== "view" && (
            <div className="flex flex-wrap items-center gap-x-3 gap-y-1.5" role="group" aria-label={u.style}>
              <div className="flex flex-wrap items-center gap-1.5">
                {PALETTE.map((value) => (
                  <button key={value} type="button" aria-label={a.color(value)} aria-pressed={color === value}
                    onClick={() => setColor(value)}
                    className={`h-6 w-6 rounded-full border-2 transition-transform ${color === value ? "scale-110 border-white" : "border-white/30"}`}
                    style={{ background: value }} />
                ))}
              </div>
              <div className="flex gap-1">
                {WIDTHS.map(({ value }, index) => chip(String(value), [a.thin, a.medium, a.thick][index], width === value, () => setWidth(value)))}
              </div>
            </div>
          )}
          {tab === "hair" && (
            <div className="flex min-w-[15rem] flex-col gap-1.5" role="group" aria-label={h.graftTitle} data-testid="graft-form">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-white/70">{h.graftTitle}</span>
                {graftStroke
                  ? <Button type="button" size="sm" variant="secondary" className="h-7 rounded-full" onClick={() => change(strokes.filter((stroke) => stroke.type !== "graft"))}>{h.removeGraft}</Button>
                  : <Button type="button" size="sm" className="h-7 rounded-full" onClick={addGraft}><Calculator className="me-1 h-3.5 w-3.5" />{h.addGraft}</Button>}
              </div>
              {graftStroke && (
                <div className="grid grid-cols-2 gap-x-2 gap-y-1">
                  {GRAFT_KEYS.map((key) => (
                    <label key={key} className="flex flex-col text-[10px] text-white/70">
                      {h[key]}
                      <input key={`${key}-${graftStroke.text}`} inputMode="decimal" defaultValue={graftParams[key]} aria-label={h[key]}
                        onBlur={(event) => setGraftValue(key, event.target)}
                        onKeyDown={(event) => { if (event.key === "Enter") (event.target as HTMLInputElement).blur(); }}
                        className="mt-0.5 w-full rounded bg-white/10 px-2 py-1 text-xs text-white" />
                    </label>
                  ))}
                </div>
              )}
              {graftStroke && graftFilled && <p className="text-[11px] text-white/60">{h.prefilled}</p>}
            </div>
          )}
        </div>
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
            {enhance && <span className="pointer-events-none absolute left-2 top-2 rounded-full bg-black/60 px-2 py-0.5 text-[10px] font-bold text-amber-300">{u.viewOnly}</span>}
            {scaleAt && (
              <div className="absolute z-10 flex items-center gap-1 rounded-lg bg-white/95 p-1.5 shadow" style={{ left: `${Math.min(((scaleAt.points[0][0] + scaleAt.points[1][0]) / 2) * 100, 55)}%`, top: `${((scaleAt.points[0][1] + scaleAt.points[1][1]) / 2) * 100}%` }}>
                <input
                  autoFocus
                  inputMode="decimal"
                  aria-label={m.scalePrompt}
                  placeholder={m.scalePrompt}
                  value={scaleAt.value}
                  onChange={(event) => setScaleAt({ ...scaleAt, value: event.target.value })}
                  onKeyDown={(event) => { if (event.key === "Enter") confirmScale(); if (event.key === "Escape") setScaleAt(null); }}
                  className="w-32 rounded border border-slate-300 px-2 py-1 text-sm text-black"
                />
                <Button type="button" size="sm" className="h-8 rounded-md" onClick={confirmScale}>{m.scaleOk}</Button>
              </div>
            )}
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

      <div className="px-4 pt-1 pb-1 text-white/90 text-xs flex flex-col gap-1.5 max-h-28 overflow-y-auto" data-testid="measure-panel">
        {enhance && <p className="font-semibold text-amber-300" data-testid="enhance-note">{u.viewOnly}</p>}
        {tool === "adjust" && <p data-testid="tool-hint" className="font-semibold text-white">{h.hintAdjust}</p>}
        {tool === "hairline" && <p data-testid="tool-hint" className="font-semibold text-white">{h.hintDesign}</p>}
        {(tool === "scale" || tool === "ruler" || tool === "angle" || tool === "area" || tool === "marker" || tool === "density") && (
          <p data-testid="tool-hint" className="font-semibold text-white">
            {tool === "density" ? (hasScale ? u.hintDensity : u.needScale) : preset && tool === "area" ? u.hintZone : preset && tool === "ruler" ? u.hintLine : { scale: m.hintScale, ruler: m.hintRuler, angle: m.hintAngle, area: m.hintArea, marker: m.hintMarker }[tool]}
            {tool === "area" && pending.length >= 3 && (
              <Button type="button" size="sm" className="ms-2 h-7 rounded-full" onClick={finishArea}>{m.finishArea}</Button>
            )}
          </p>
        )}
        {faceBusy && <p className="font-semibold text-white" role="status">{h.faceBusy}</p>}
        {faceMsg && !faceBusy && <p className="text-amber-300" role="status" data-testid="face-msg">{faceMsg}</p>}
        {(plan.face || plan.hairline || plan.graft || strokes.some((stroke) => stroke.type === "hairline")) && (
          <div data-testid="plan-legend">
            <p className="font-bold text-white">{h.planTitle}</p>
            <ul className="mt-1 flex flex-col gap-0.5">
              {plan.face && plan.face.middleMm !== null && plan.face.lowerMm !== null && plan.face.suggestedMm !== null && (
                <li>{h.middleThird}: <b>{formatLength(plan.face.middleMm)}</b> · {h.lowerThird}: <b>{formatLength(plan.face.lowerMm)}</b> · {h.suggested}: <b>{formatLength(plan.face.suggestedMm)}</b></li>
              )}
              {hasEstimatedScale(strokes) && <li className="text-white/70" data-testid="auto-scale">{h.autoScale}</li>}
              {plan.graft && plan.graft.params.da <= 0 && <li className="text-amber-300">{h.donorNeeded}</li>}
              {strokes.some((stroke) => stroke.type === "hairline") && !plan.face && <li className="text-amber-300">{h.needFace}</li>}
              {plan.hairline && (
                <li>{h.lineHeight}: <b>{plan.hairline.heightMm === null ? "—" : formatLength(plan.hairline.heightMm)}</b>{plan.hairline.ratio !== null && <span className="text-white/70"> · {h.ratio.replace("{x}", String(plan.hairline.ratio))}</span>}</li>
              )}
              {plan.graft && (
                <li data-testid="graft-result">{h.needed}: <b>{plan.graft.needed} {h.fu}</b> · {h.available}: <b>{plan.graft.available} {h.fu}</b>{plan.graft.coveragePct !== null && <> · {h.coverage}: <b className={plan.graft.coveragePct < 100 ? "text-amber-300" : ""}>{plan.graft.coveragePct}%</b></>}</li>
              )}
            </ul>
            {plan.hairline && plan.face && <p className="mt-1 text-white/70">{h.mirrorNote}</p>}
            {plan.graft && <p className="mt-1 text-white/70">{h.graftNote}</p>}
          </div>
        )}
        {legend.measures.length > 0 && (
          <div data-testid="measure-legend">
            <p className="font-bold text-white">{m.legend}{legend.scaleMm !== null && <span className="ms-2 font-normal text-white/80">{m.legendScale.replace("{mm}", scaleLabel)}</span>}</p>
            <ul className="mt-1 flex flex-col gap-1">
              {legend.measures.map((item) => (
                <li key={`${item.kind}-${item.index}-${item.kind === "marker" ? item.note : ""}`} className="flex items-center gap-2">
                  {item.kind === "ruler" && <span><b>{item.name || `R${item.index}`}</b> · {item.mm === null ? "—" : formatLength(item.mm)}</span>}
                  {item.kind === "angle" && <span><b>A{item.index}</b> · {formatAngle(item.degrees)}</span>}
                  {item.kind === "area" && <span><b>{item.name || `Z${item.index}`}</b> · {item.mm2 === null ? "—" : formatArea(item.mm2)}{item.perimeterMm !== null && <span className="text-white/70"> · {m.perimeter} {formatLength(item.perimeterMm)}</span>}</span>}
                  {item.kind === "density" && <span><b>D{item.index}</b> · {item.count} {u.count}{item.perCm2 !== null && <span> · <b>{item.perCm2}</b>{u.perCm2}</span>}</span>}
                  {item.kind === "marker" && (
                    <>
                      <b className="flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-white text-[11px] text-black">{item.index}</b>
                      <input
                        defaultValue={item.note}
                        aria-label={`${m.marker} ${item.index}: ${m.noteHolder}`}
                        placeholder={m.noteHolder}
                        maxLength={200}
                        onBlur={(event) => setMarkerNote(item.strokeIndex, event.target.value.trim())}
                        className="min-w-0 flex-1 rounded bg-white/10 px-2 py-1 text-white placeholder:text-white/50"
                      />
                    </>
                  )}
                </li>
              ))}
            </ul>
            {legend.scaleMm === null && legend.measures.some((item) => item.kind === "ruler" || item.kind === "area") && <p className="mt-1 text-amber-300">{m.needScale}</p>}
            {legend.scaleMm !== null && <p className="mt-1 text-white/70">{m.disclaimer}</p>}
          </div>
        )}
      </div>

      <div className="px-4 py-2 flex justify-end gap-2">
        <Button type="button" variant="secondary" className="rounded-full" onClick={onClose} disabled={saving}>{a.cancel}</Button>
        <Button type="button" className="rounded-full font-bold" onClick={handleSave} disabled={!image || !strokes.length || saving}>
          {saving ? <Loader2 className="w-4 h-4 animate-spin" /> : a.save}
        </Button>
      </div>
    </div>
  );
}
