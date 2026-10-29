import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AlertCircle, CheckCircle2, Eye, RefreshCw, RotateCcw, ShieldCheck, SlidersHorizontal, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Slider } from "@/components/ui/slider";
import { useLanguage } from "@/lib/language";
import { PHOTO_EDITOR_TEXT } from "@/lib/tools-i18n";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  TECHNICAL_LIMITS,
  createDefaultTechnicalParams,
  cropFromReframe,
  exportTechnicalPhoto,
  normalizeTechnicalParams,
  renderTechnicalPhoto,
  type TechnicalPhotoParams,
} from "@/lib/photo-editor";

type PhotoEditorProps = {
  originalUrl: string;
  photoLabel: string;
  initialParams?: unknown;
  isSaving?: boolean;
  hasSavedAdjustment?: boolean;
  adjustedUrl?: string;
  onSave: (params: TechnicalPhotoParams, blob: Blob, metadata: { width: number; height: number }) => Promise<string | void> | string | void;
  onDraftChange: (params: TechnicalPhotoParams) => void;
  onClose: () => void;
  onDiscardAdjustment: () => void;
};

type Tab = "frame" | "light" | "color" | "detail";

function Control({ label, value, min, max, step = 1, onChange }: {
  label: string; value: number; min: number; max: number; step?: number; onChange: (value: number) => void;
}) {
  const readable = Number.isInteger(value) ? value : value.toFixed(2);
  return (
    <label className="block space-y-2">
      <span className="flex items-center justify-between text-sm font-semibold text-foreground">
        {label}<span className="rounded-md bg-muted px-2 py-0.5 text-xs font-medium text-muted-foreground">{value > 0 && min < 0 ? "+" : ""}{readable}</span>
      </span>
      <Slider min={min} max={max} step={step} value={[value]} onValueChange={([next]) => onChange(next)} />
    </label>
  );
}

export function PhotoEditor({
  originalUrl, photoLabel, initialParams, isSaving, hasSavedAdjustment, adjustedUrl, onSave, onDraftChange, onClose, onDiscardAdjustment,
}: PhotoEditorProps) {
  const { lang } = useLanguage();
  const x = PHOTO_EDITOR_TEXT[lang];
  const imageRef = useRef<HTMLImageElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [image, setImage] = useState<HTMLImageElement | null>(null);
  const [params, setParams] = useState<TechnicalPhotoParams | null>(null);
  const [tab, setTab] = useState<Tab>("frame");
  const [comparing, setComparing] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [authoritativeUrl, setAuthoritativeUrl] = useState<string | null>(adjustedUrl ?? null);
  const [reviewExitOpen, setReviewExitOpen] = useState(false);

  useEffect(() => {
    const next = new Image();
    next.onload = () => {
      imageRef.current = next;
      setImage(next);
      setParams(normalizeTechnicalParams(initialParams, next.naturalWidth, next.naturalHeight));
    };
    next.onerror = () => setError(x.loadFail);
    next.src = originalUrl;
  }, [initialParams, originalUrl, x.loadFail]);

  useEffect(() => {
    setAuthoritativeUrl(adjustedUrl ?? null);
  }, [adjustedUrl]);

  useEffect(() => {
    if (!image || !params || !canvasRef.current) return;
    const timer = window.setTimeout(() => {
      renderTechnicalPhoto(image, canvasRef.current!, comparing ? createDefaultTechnicalParams(image.naturalWidth, image.naturalHeight) : params, true);
    }, 32);
    return () => window.clearTimeout(timer);
  }, [comparing, image, params]);

  const setSafeParams = useCallback((update: (current: TechnicalPhotoParams) => TechnicalPhotoParams) => {
    setParams((current) => {
      if (!current || !image) return current;
      const next = normalizeTechnicalParams(update(current), image.naturalWidth, image.naturalHeight);
      setAuthoritativeUrl(null);
      onDraftChange(next);
      return next;
    });
  }, [image, onDraftChange]);

  const reframe = useMemo(() => {
    if (!image || !params) return { scale: 1, x: 0, y: 0 };
    return {
      scale: Math.min(1.25, image.naturalWidth / params.crop.width),
      x: params.crop.x / Math.max(1, image.naturalWidth - params.crop.width) * 200 - 100,
      y: params.crop.y / Math.max(1, image.naturalHeight - params.crop.height) * 200 - 100,
    };
  }, [image, params]);

  const reset = () => {
    if (!image) return;
    const next = createDefaultTechnicalParams(image.naturalWidth, image.naturalHeight);
    setAuthoritativeUrl(null);
    setParams(next);
    onDraftChange(next);
  };

  const save = async () => {
    if (!image || !params || isSaving || exporting) return;
    setError(null);
    setExporting(true);
    try {
      const result = await exportTechnicalPhoto(image, params);
      const savedUrl = await onSave(params, result.blob, { width: result.width, height: result.height });
      if (savedUrl) setAuthoritativeUrl(savedUrl);
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : x.processFail);
    } finally {
      setExporting(false);
    }
  };

  const currentSaving = Boolean(isSaving || exporting);
  return (
    <section className="fixed inset-0 z-[100] flex flex-col bg-slate-950 text-white md:flex-row" aria-label={x.title} dir={lang === "ar" ? "rtl" : "ltr"}>
      <div className="relative flex min-h-0 flex-1 flex-col">
        <header className="flex items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
          <div className="flex min-w-0 items-center gap-3">
            <button type="button" onClick={() => authoritativeUrl ? setReviewExitOpen(true) : onClose()} className="rounded-full p-2 text-white/80 hover:bg-white/10 hover:text-white" aria-label={x.cancel}><X className="h-5 w-5" /></button>
            <div className="min-w-0"><h2 className="truncate text-sm font-bold">{x.title}</h2><p className="truncate text-xs text-white/60">{photoLabel} · {x.protectedOriginal}</p></div>
          </div>
          <ShieldCheck className="h-5 w-5 shrink-0 text-emerald-300" aria-label={x.protectedOriginal} />
        </header>
        <div className="flex min-h-0 flex-1 items-center justify-center p-4 md:p-8">
          {error ? <div className="max-w-md rounded-2xl bg-red-950/70 p-5 text-sm leading-relaxed text-red-100"><AlertCircle className="mb-2 h-5 w-5" />{error}</div> : (
            <div className="relative max-h-full max-w-full">
              {!image && <RefreshCw className="h-7 w-7 animate-spin text-white/50" />}
              {authoritativeUrl && !comparing ? (
                <img src={authoritativeUrl} alt={x.adjustedAlt} className="max-h-[52vh] max-w-full rounded-md shadow-2xl md:max-h-[78vh]" />
              ) : <canvas ref={canvasRef} className={`max-h-[52vh] max-w-full rounded-md shadow-2xl md:max-h-[78vh] ${image ? "" : "hidden"}`} />}
              {image && <button type="button" onPointerDown={() => setComparing(true)} onPointerUp={() => setComparing(false)} onPointerLeave={() => setComparing(false)} onPointerCancel={() => setComparing(false)} className="absolute bottom-3 left-1/2 flex -translate-x-1/2 items-center gap-2 whitespace-nowrap rounded-full bg-black/75 px-4 py-2 text-xs font-semibold text-white shadow-lg touch-none"><Eye className="h-4 w-4" />{x.compare}</button>}
            </div>
          )}
        </div>
        <p className="px-5 pb-4 text-center text-xs leading-relaxed text-white/60">{x.disclaimer}</p>
      </div>

      <aside className="flex h-[46vh] w-full flex-col border-t border-white/10 bg-background text-foreground md:h-full md:w-[390px] md:border-l md:border-t-0">
        <div className="flex items-center justify-between gap-2 border-b p-3">
          <span className="text-xs font-bold uppercase tracking-wider text-primary">{x.moderate}</span>
          <button type="button" onClick={reset} className="inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold text-muted-foreground hover:bg-muted"><RotateCcw className="h-3.5 w-3.5" />{x.reset}</button>
        </div>
        {authoritativeUrl && <p className="border-b bg-emerald-50 px-4 py-2 text-xs font-medium leading-relaxed text-emerald-800">{x.reviewing}</p>}
        <div className="grid grid-cols-4 border-b">
          {(["frame", "light", "color", "detail"] as Tab[]).map((option) => <button key={option} type="button" onClick={() => setTab(option)} className={`px-1 py-3 text-[11px] font-bold ${tab === option ? "border-b-2 border-primary text-primary" : "text-muted-foreground hover:text-foreground"}`}>{{ frame: x.tabFrame, light: x.tabLight, color: x.tabColor, detail: x.tabDetail }[option]}</button>)}
        </div>
        <div className="flex-1 overflow-y-auto p-5">
          {params && image && tab === "frame" && <div className="space-y-5">
            <p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{x.cropNote}</p>
            <Control label={x.reframe} value={reframe.scale} min={1} max={1.25} step={0.01} onChange={(scale) => setSafeParams((current) => cropFromReframe(current, image.naturalWidth, image.naturalHeight, scale, reframe.x, reframe.y))} />
            <Control label={x.posH} value={reframe.x} min={-100} max={100} onChange={(x) => setSafeParams((current) => cropFromReframe(current, image.naturalWidth, image.naturalHeight, reframe.scale, x, reframe.y))} />
            <Control label={x.posV} value={reframe.y} min={-100} max={100} onChange={(y) => setSafeParams((current) => cropFromReframe(current, image.naturalWidth, image.naturalHeight, reframe.scale, reframe.x, y))} />
            <Control label={x.tilt} value={params.rotation} min={-5} max={5} step={0.5} onChange={(rotation) => setSafeParams((current) => ({ ...current, rotation }))} />
          </div>}
          {params && tab === "light" && <div className="space-y-5">{(["exposure", "brightness", "contrast", "highlights", "shadows"] as const).map((key) => <Control key={key} label={{ exposure: x.exposure, brightness: x.brightness, contrast: x.contrast, highlights: x.highlights, shadows: x.shadows }[key]} value={params[key]} min={TECHNICAL_LIMITS[key][0]} max={TECHNICAL_LIMITS[key][1]} step={key === "exposure" ? 0.05 : 1} onChange={(value) => setSafeParams((current) => ({ ...current, [key]: value }))} />)}</div>}
          {params && tab === "color" && <div className="space-y-5">{(["temperature", "saturation"] as const).map((key) => <Control key={key} label={key === "temperature" ? x.temperature : x.saturation} value={params[key]} min={TECHNICAL_LIMITS[key][0]} max={TECHNICAL_LIMITS[key][1]} onChange={(value) => setSafeParams((current) => ({ ...current, [key]: value }))} />)}</div>}
          {params && tab === "detail" && <div className="space-y-5"><p className="rounded-xl bg-muted p-3 text-xs leading-relaxed text-muted-foreground">{x.detailNote}</p>{(["clarity", "sharpness", "noiseReduction"] as const).map((key) => <Control key={key} label={{ clarity: x.clarity, sharpness: x.sharpness, noiseReduction: x.noise }[key]} value={params[key]} min={TECHNICAL_LIMITS[key][0]} max={TECHNICAL_LIMITS[key][1]} onChange={(value) => setSafeParams((current) => ({ ...current, [key]: value }))} />)}</div>}
        </div>
        <footer className="space-y-2 border-t p-3">
          {hasSavedAdjustment && <button type="button" onClick={onDiscardAdjustment} disabled={currentSaving} className="w-full rounded-xl py-2 text-xs font-semibold text-destructive hover:bg-destructive/10 disabled:opacity-50">{x.discard}</button>}
          <Button type="button" onClick={authoritativeUrl ? onClose : save} disabled={!image || !params || currentSaving} className="w-full rounded-xl font-bold">{currentSaving ? <><RefreshCw className="mr-2 h-4 w-4 animate-spin" />{x.processing}</> : authoritativeUrl ? <><CheckCircle2 className="mr-2 h-4 w-4" />{x.keep}</> : <><CheckCircle2 className="mr-2 h-4 w-4" />{x.saveReview}</>}</Button>
        </footer>
      </aside>
      <AlertDialog open={reviewExitOpen} onOpenChange={setReviewExitOpen}>
        <AlertDialogContent className="rounded-3xl text-foreground">
          <AlertDialogHeader>
            <AlertDialogTitle>{x.exitTitle}</AlertDialogTitle>
            <AlertDialogDescription>
              {x.exitDesc}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter className="gap-2 sm:flex-col sm:space-x-0">
            <AlertDialogAction onClick={onClose} className="rounded-full bg-primary font-semibold text-primary-foreground hover:bg-primary/90">
              {x.keep}
            </AlertDialogAction>
            <Button type="button" variant="destructive" onClick={() => { setReviewExitOpen(false); onDiscardAdjustment(); }} className="rounded-full font-semibold">
              {x.discard}
            </Button>
            <AlertDialogCancel className="m-0 rounded-full">{x.keepReviewing}</AlertDialogCancel>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </section>
  );
}