import { useEffect, useMemo, useRef, useState } from "react";
import { Loader2, Undo2 } from "lucide-react";
import type { PhotoMeasurement } from "@workspace/api-client-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useLanguage } from "@/lib/language";
import { MEASURE_TEXT, coinLabel } from "@/lib/measure-i18n";
import { MEASURE_REFERENCES, estimateMeasurement, type Point } from "@/lib/measure-references";
import { TILT_WARNING_RATIO, findCoin, imageSampler } from "@/lib/coin-detect";
import { findLesionExtremes } from "@/lib/lesion-detect";

export type MeasurePayload = {
  referenceId: string; referenceMm?: number; referencePoints: Point[]; lesionPoints: Point[]; imageWidth: number; imageHeight: number;
  /** Cómo se ubicó la moneda: sola o a mano, y qué tan ovalada se veía (1 = de frente). */
  detection?: { auto: boolean; axisRatio?: number };
};

type Props = {
  imageUrl: string;
  role: "patient" | "staff";
  initial?: PhotoMeasurement | null;
  onSave: (payload: MeasurePayload) => Promise<void>;
  onRemove?: () => Promise<void>;
  onClose: () => void;
};

const LOUPE = 120;

/**
 * Mide una lesión sobre la foto: primero se marcan dos bordes opuestos de la moneda (o regla) de tamaño
 * conocido y luego los dos extremos de la lesión. Los puntos se pueden arrastrar con una lupa. El servidor
 * recalcula siempre la medida; aquí solo se muestra el resultado en vivo.
 */
export function MeasureTool({ imageUrl, role, initial, onSave, onRemove, onClose }: Props) {
  const { lang } = useLanguage();
  const c = MEASURE_TEXT[lang];
  const imgRef = useRef<HTMLImageElement>(null);
  const svgRef = useRef<SVGSVGElement>(null);
  const loupeRef = useRef<HTMLCanvasElement>(null);
  const [natural, setNatural] = useState<{ w: number; h: number } | null>(null);
  const [shown, setShown] = useState(1);
  const [referenceId, setReferenceId] = useState(initial?.referenceId ?? "clp-500");
  const [customMm, setCustomMm] = useState(initial?.referenceId === "custom" ? String(initial.referenceMm) : "");
  const [refPoints, setRefPoints] = useState<Point[]>((initial?.referencePoints as Point[] | undefined) ?? []);
  const [lesionPoints, setLesionPoints] = useState<Point[]>((initial?.lesionPoints as Point[] | undefined) ?? []);
  const [drag, setDrag] = useState<{ group: "ref" | "lesion"; index: number } | null>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  // Resultado de buscar la moneda sola: "off" mientras no se ha intentado o ya hay puntos guardados.
  // Modo "marcar la lesión sola": el próximo toque dentro de la lesión es el punto de partida.
  const [seedMode, setSeedMode] = useState(false);
  const [lesionNote, setLesionNote] = useState<"" | "found" | "missing">("");
  const [auto, setAuto] = useState<{ state: "off" | "searching" | "found" | "missing"; axisRatio?: number; placed: boolean }>({ state: "off", placed: false });

  const detectCoin = (img: HTMLImageElement, place: boolean) => {
    setAuto({ state: "searching", placed: false });
    // Se pospone un instante para que la foto se vea antes de empezar el cálculo.
    setTimeout(() => {
      let fit = null;
      try { fit = findCoin(img.naturalWidth, img.naturalHeight, imageSampler(img)); } catch { fit = null; }
      if (!fit) { setAuto({ state: "missing", placed: false }); return; }
      if (place) setRefPoints(fit.diameterPoints);
      setAuto({ state: "found", axisRatio: fit.axisRatio, placed: place });
    }, 30);
  };

  const measure = () => {
    const img = imgRef.current;
    if (!img || !img.naturalWidth) return;
    setNatural({ w: img.naturalWidth, h: img.naturalHeight });
    setShown(img.getBoundingClientRect().width || img.naturalWidth);
  };
  const onImageLoad = () => {
    measure();
    const img = imgRef.current;
    // Con una medida ya guardada no se toca nada; si no, se busca la moneda y se proponen sus bordes.
    if (img && img.naturalWidth && refPoints.length === 0 && !initial) detectCoin(img, true);
  };
  useEffect(() => {
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, []);

  // Pixeles de la imagen por pixel de pantalla: sirve para dibujar marcadores de tamaño constante.
  const unit = natural ? natural.w / Math.max(shown, 1) : 1;
  const step: "ref" | "lesion" = refPoints.length < 2 ? "ref" : "lesion";

  const toImagePoint = (event: { clientX: number; clientY: number }): Point | null => {
    const svg = svgRef.current;
    if (!svg || !natural) return null;
    const rect = svg.getBoundingClientRect();
    if (!rect.width || !rect.height) return null;
    return {
      x: Math.min(natural.w, Math.max(0, ((event.clientX - rect.left) / rect.width) * natural.w)),
      y: Math.min(natural.h, Math.max(0, ((event.clientY - rect.top) / rect.height) * natural.h)),
    };
  };

  const handleAt = (point: Point): { group: "ref" | "lesion"; index: number } | null => {
    const reach = 18 * unit;
    let found: { group: "ref" | "lesion"; index: number } | null = null;
    let nearest = Infinity;
    const groups: Array<["ref" | "lesion", Point[]]> = [["ref", refPoints], ["lesion", lesionPoints]];
    for (const [group, points] of groups) {
      for (let index = 0; index < points.length; index++) {
        const d = Math.hypot(points[index].x - point.x, points[index].y - point.y);
        if (d <= reach && d < nearest) { nearest = d; found = { group, index }; }
      }
    }
    return found;
  };

  const setPoint = (group: "ref" | "lesion", index: number, point: Point) => {
    const update = (points: Point[]) => points.map((existing, i) => (i === index ? point : existing));
    if (group === "ref") { setRefPoints(update); setAuto((current) => ({ ...current, placed: false })); } else setLesionPoints(update);
  };

  const drawLoupe = (point: Point) => {
    const canvas = loupeRef.current;
    const img = imgRef.current;
    const context = canvas?.getContext?.("2d");
    if (!canvas || !img || !context) return;
    const region = 60 * unit; // 60 px de pantalla alrededor del dedo, ampliados al tamaño de la lupa
    try {
      context.clearRect(0, 0, LOUPE, LOUPE);
      context.drawImage(img, point.x - region / 2, point.y - region / 2, region, region, 0, 0, LOUPE, LOUPE);
      context.strokeStyle = "#ff3b30";
      context.beginPath();
      context.moveTo(LOUPE / 2, LOUPE / 2 - 12); context.lineTo(LOUPE / 2, LOUPE / 2 + 12);
      context.moveTo(LOUPE / 2 - 12, LOUPE / 2); context.lineTo(LOUPE / 2 + 12, LOUPE / 2);
      context.stroke();
    } catch { /* la lupa es solo una ayuda */ }
  };

  const proposeLesion = (seed: Point) => {
    const img = imgRef.current;
    setSeedMode(false);
    if (!img || !natural) return;
    const coinFit = refPoints.length === 2
      ? { center: { x: (refPoints[0].x + refPoints[1].x) / 2, y: (refPoints[0].y + refPoints[1].y) / 2 }, radius: Math.hypot(refPoints[0].x - refPoints[1].x, refPoints[0].y - refPoints[1].y) / 2 }
      : undefined;
    let fit = null;
    try { fit = findLesionExtremes(natural.w, natural.h, imageSampler(img), seed, coinFit); } catch { fit = null; }
    if (fit) { setLesionPoints(fit.points); setLesionNote("found"); } else setLesionNote("missing");
  };

  const onPointerDown = (event: React.PointerEvent<SVGSVGElement>) => {
    const point = toImagePoint(event);
    if (!point) return;
    const hit = handleAt(point);
    if (hit) {
      setDrag(hit);
      (event.currentTarget as Element).setPointerCapture?.(event.pointerId);
      drawLoupe(point);
      return;
    }
    if (seedMode && step === "lesion" && lesionPoints.length === 0) { proposeLesion(point); return; }
    if (step === "ref") setRefPoints((points) => (points.length < 2 ? [...points, point] : points));
    else if (lesionPoints.length < 2) setLesionPoints((points) => [...points, point]);
  };
  const onPointerMove = (event: React.PointerEvent<SVGSVGElement>) => {
    if (!drag) return;
    const point = toImagePoint(event);
    if (!point) return;
    setPoint(drag.group, drag.index, point);
    drawLoupe(point);
  };
  const stopDrag = () => setDrag(null);

  const undo = () => {
    if (lesionPoints.length > 0) setLesionPoints((points) => points.slice(0, -1));
    else setRefPoints((points) => points.slice(0, -1));
  };
  const reset = () => { setRefPoints([]); setLesionPoints([]); setError(""); setAuto({ state: "off", placed: false }); setSeedMode(false); setLesionNote(""); };

  const custom = referenceId === "custom";
  const estimate = useMemo(() => estimateMeasurement({
    referenceId, customMm: custom ? Number(customMm.replace(",", ".")) : undefined, referencePoints: refPoints, lesionPoints, by: role, axisRatio: auto.axisRatio,
  }), [referenceId, custom, customMm, refPoints, lesionPoints, role, auto.axisRatio]);

  const save = async () => {
    if (!natural || !estimate) { setError(c.needPoints); return; }
    setBusy(true);
    setError("");
    try {
      await onSave({
        referenceId, ...(custom ? { referenceMm: Number(customMm.replace(",", ".")) } : {}),
        referencePoints: refPoints, lesionPoints, imageWidth: natural.w, imageHeight: natural.h,
        detection: { auto: auto.placed, ...(auto.axisRatio !== undefined ? { axisRatio: auto.axisRatio } : {}) },
      });
    } catch (caught) {
      setError(caught instanceof Error && caught.message ? caught.message : c.saveFailed);
    } finally {
      setBusy(false);
    }
  };

  const radius = 7 * unit;
  const fixed = (value: number) => value.toFixed(1).replace(".", lang === "en" || lang === "zh" || lang === "tr" ? "." : ",");

  return (
    <div className="flex flex-col gap-3" data-testid="measure-tool">
      <label className="flex flex-col gap-1 text-sm font-semibold">
        {c.pickCoin}
        <select value={referenceId} onChange={(event) => setReferenceId(event.target.value)} className="h-11 rounded-2xl border border-[#E8E4DE] bg-white px-3 text-sm" data-testid="measure-reference">
          {MEASURE_REFERENCES.map((reference) => <option key={reference.id} value={reference.id}>{coinLabel(reference, lang)}</option>)}
          {role === "staff" && <option value="custom">{c.customRef}</option>}
        </select>
      </label>
      {custom && (
        <label className="flex flex-col gap-1 text-sm font-semibold">
          {c.customMm}
          <Input inputMode="decimal" className="h-11 rounded-2xl" value={customMm} onChange={(event) => setCustomMm(event.target.value)} data-testid="measure-custom-mm" />
        </label>
      )}
      <p className="text-sm font-semibold text-primary" data-testid="measure-step">{step === "ref" ? c.stepCoin : c.stepLesion}</p>
      {step === "lesion" && lesionPoints.length === 0 && (
        <div className="flex flex-col gap-1.5">
          <Button type="button" variant="outline" className="rounded-full self-start" aria-pressed={seedMode} onClick={() => { setSeedMode((on) => !on); setLesionNote(""); }} data-testid="measure-auto-lesion">{c.autoLesion}</Button>
          {seedMode && <p className="text-xs text-primary font-semibold" role="status" data-testid="measure-seed-hint">{c.seedHint}</p>}
        </div>
      )}
      {lesionNote === "found" && <p className="text-xs text-muted-foreground" role="status" data-testid="measure-lesion-note">{c.lesionFound}</p>}
      {lesionNote === "missing" && <p className="text-xs text-muted-foreground" role="status" data-testid="measure-lesion-note">{c.lesionMissing}</p>}
      {auto.state === "searching" && <p className="text-xs text-muted-foreground flex items-center gap-1.5" role="status" data-testid="measure-auto"><Loader2 className="w-3.5 h-3.5 animate-spin" />{c.detecting}</p>}
      {auto.state === "found" && auto.placed && <p className="text-xs text-muted-foreground" role="status" data-testid="measure-auto">{c.autoFound}</p>}
      {auto.state === "missing" && <p className="text-xs text-muted-foreground" role="status" data-testid="measure-auto">{c.autoNotFound}</p>}
      {auto.axisRatio !== undefined && auto.axisRatio < TILT_WARNING_RATIO && <p className="text-xs rounded-xl bg-amber-50 text-amber-900 p-2" role="alert" data-testid="measure-tilt">{c.tiltWarn}</p>}

      <div className="relative inline-block self-center max-w-full touch-none select-none rounded-2xl overflow-hidden bg-black/5">
        <img ref={imgRef} src={imageUrl} alt="" onLoad={onImageLoad} className="block max-w-full max-h-[55vh] w-auto" draggable={false} />
        {natural && (
          <svg ref={svgRef} viewBox={`0 0 ${natural.w} ${natural.h}`} preserveAspectRatio="none" className="absolute inset-0 w-full h-full cursor-crosshair touch-none"
            onPointerDown={onPointerDown} onPointerMove={onPointerMove} onPointerUp={stopDrag} onPointerCancel={stopDrag} data-testid="measure-surface">
            {refPoints.length === 2 && <line x1={refPoints[0].x} y1={refPoints[0].y} x2={refPoints[1].x} y2={refPoints[1].y} stroke="#0ea5e9" strokeWidth={2 * unit} />}
            {lesionPoints.length === 2 && <line x1={lesionPoints[0].x} y1={lesionPoints[0].y} x2={lesionPoints[1].x} y2={lesionPoints[1].y} stroke="#f59e0b" strokeWidth={2 * unit} />}
            {refPoints.map((point, index) => <circle key={`r${index}`} cx={point.x} cy={point.y} r={radius} fill="#0ea5e9" stroke="#fff" strokeWidth={1.5 * unit} data-testid="measure-ref-point" />)}
            {lesionPoints.map((point, index) => <circle key={`l${index}`} cx={point.x} cy={point.y} r={radius} fill="#f59e0b" stroke="#fff" strokeWidth={1.5 * unit} data-testid="measure-lesion-point" />)}
          </svg>
        )}
        <canvas ref={loupeRef} width={LOUPE} height={LOUPE} className={`absolute top-2 left-2 rounded-full border-2 border-white shadow-lg ${drag ? "" : "hidden"}`} aria-hidden="true" />
      </div>
      <p className="text-xs text-muted-foreground">{c.dragHint}</p>

      {estimate && (
        <div className="rounded-2xl bg-[#E8F6F5] p-3" role="status" data-testid="measure-result">
          <p className="font-extrabold text-foreground">{c.result(fixed(estimate.lengthMm), fixed(estimate.lengthMm / 10))}</p>
          <p className="text-xs text-muted-foreground">{c.margin(estimate.uncertaintyPct)}</p>
          {role === "patient" && <p className="text-xs text-muted-foreground mt-1">{c.resultNoteLead}</p>}
        </div>
      )}
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}

      <div className="flex flex-wrap gap-2">
        <Button type="button" className="rounded-full" disabled={busy || !estimate} onClick={() => void save()} data-testid="measure-save">
          {busy && <Loader2 className="w-4 h-4 animate-spin mr-2" />}{busy ? c.saving : c.save}
        </Button>
        <Button type="button" variant="outline" className="rounded-full" disabled={busy || (refPoints.length === 0 && lesionPoints.length === 0)} onClick={undo}>
          <Undo2 className="w-4 h-4 mr-1.5" />{c.undo}
        </Button>
        <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={reset}>{c.reset}</Button>
        {auto.state === "missing" && <Button type="button" variant="ghost" className="rounded-full" disabled={busy} onClick={() => { if (imgRef.current) detectCoin(imgRef.current, refPoints.length === 0); }}>{c.redetect}</Button>}
        {initial && onRemove && <Button type="button" variant="ghost" className="rounded-full text-destructive" disabled={busy} onClick={() => void onRemove()}>{c.remove}</Button>}
        <Button type="button" variant="ghost" className="rounded-full ml-auto" onClick={onClose}>{c.close}</Button>
      </div>
    </div>
  );
}
