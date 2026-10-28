import { useCallback, useEffect, useRef, useState } from "react";
import { useParams } from "wouter";
import { Camera, CheckCircle2, Loader2, Video } from "lucide-react";
import { Button } from "@/components/ui/button";
import { BrandLogo } from "@/components/brand-logo";
import { useLanguage } from "@/lib/language";
import { phaseName, viewLabel } from "@/lib/phases-i18n";
import { CAPTURE_TEXT } from "@/lib/capture-i18n";
import { VideoRecorder } from "@/components/video-recorder";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import { uploadVideo, type RecordedVideo } from "@/lib/video-capture";

type CaptureView = { id: string; key: string; label: string; required: boolean; video?: boolean; taken: boolean };
type CaptureInfo = { clinicName: string; expiresAt: string; phase: { key: string; name: string }; views: CaptureView[] };

const MAX_SIDE = 2400;

/** Las cámaras de los celulares entregan fotos enormes: se reducen (JPEG) para que quepan en el límite de 10 MB. */
async function prepare(file: File): Promise<Blob> {
  if (file.size <= 2 * 1024 * 1024 && ["image/jpeg", "image/png", "image/webp"].includes(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file);
    const scale = Math.min(1, MAX_SIDE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(bitmap.width * scale);
    canvas.height = Math.round(bitmap.height * scale);
    canvas.getContext("2d")?.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", 0.9));
    if (blob) return blob;
  } catch { /* se envía la original */ }
  return file;
}

// Página del celular (/captura/<token>): sin iniciar sesión, solo sube las fotos de UNA fase
// de un paciente y no muestra ningún dato clínico.
export default function Capture() {
  const { token = "" } = useParams<{ token: string }>();
  const { lang, t } = useLanguage();
  const c = CAPTURE_TEXT[lang];
  const [info, setInfo] = useState<CaptureInfo | null>(null);
  const [gone, setGone] = useState(false);
  const [done, setDone] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState("");
  const pending = useRef<string | null>(null);
  const v = VIDEO_TEXT[lang];
  const [recordingView, setRecordingView] = useState<CaptureView | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  const load = useCallback(async () => {
    const response = await fetch(`/api/capture/${encodeURIComponent(token)}`).catch(() => null);
    if (!response || !response.ok) { setGone(true); return; }
    setInfo((await response.json()) as CaptureInfo);
  }, [token]);
  useEffect(() => { void load(); }, [load]);

  const upload = async (file: File | undefined) => {
    const viewId = pending.current;
    if (!file || !viewId) return;
    setBusyId(viewId);
    setError("");
    try {
      const body = await prepare(file);
      const response = await fetch(`/api/capture/${encodeURIComponent(token)}/views/${encodeURIComponent(viewId)}/photo`, {
        method: "POST", headers: { "Content-Type": body.type || "image/jpeg" }, body,
      });
      if (response.status === 410) { setGone(true); return; }
      if (!response.ok) {
        const detail = (await response.json().catch(() => null)) as { error?: string } | null;
        throw new Error(detail?.error ?? c.saveFailed);
      }
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : c.saveFailed);
    } finally {
      setBusyId(null);
      if (inputRef.current) inputRef.current.value = "";
    }
  };

  const saveVideo = async (view: CaptureView, video: RecordedVideo) => {
    setBusyId(view.id);
    setError("");
    try {
      const result = await uploadVideo(`/api/capture/${encodeURIComponent(token)}/views/${encodeURIComponent(view.id)}/video`, video);
      if (!result.ok && result.status === 410) { setGone(true); return; }
      if (!result.ok) throw new Error(result.error ?? v.saveFailed);
      setRecordingView(null);
      await load();
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : v.saveFailed);
    } finally {
      setBusyId(null);
    }
  };

  const finish = async () => {
    await fetch(`/api/capture/${encodeURIComponent(token)}/finish`, { method: "POST" }).catch(() => undefined);
    setDone(true);
  };

  const shell = (children: React.ReactNode) => (
    <div className="min-h-[100dvh] cv-page flex flex-col items-center p-4 sm:p-6" data-testid="capture-page">
      <div className="w-full max-w-md flex flex-col gap-4">{children}</div>
    </div>
  );

  if (gone) return shell(
    <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 p-6 text-center flex flex-col gap-2 mt-10" role="alert">
      <h1 className="text-xl font-extrabold">{c.goneTitle}</h1>
      <p className="text-sm text-muted-foreground">{c.goneText}</p>
    </div>,
  );
  if (done) return shell(
    <div className="bg-white rounded-3xl ring-1 ring-slate-200/70 p-6 text-center flex flex-col items-center gap-2 mt-10">
      <CheckCircle2 className="w-10 h-10 text-primary" />
      <h1 className="text-xl font-extrabold">{c.doneTitle}</h1>
      <p className="text-sm text-muted-foreground">{c.doneText}</p>
    </div>,
  );
  if (!info) return shell(<p className="flex items-center justify-center gap-2 mt-10 text-muted-foreground"><Loader2 className="w-5 h-5 animate-spin" />{c.loading}</p>);

  const taken = info.views.filter((view) => view.taken).length;
  return shell(
    <>
      <div className="flex items-center gap-3">
        <BrandLogo className="h-10 w-10" />
        <div className="min-w-0">
          <h1 className="text-lg font-extrabold break-words">{c.phoneTitle(phaseName(info.phase, lang))}</h1>
          <p className="text-xs text-muted-foreground break-words">{info.clinicName} · {c.progressPhone(taken, info.views.length)}</p>
        </div>
      </div>
      <input ref={inputRef} type="file" accept="image/jpeg,image/png,image/webp" capture="environment" className="sr-only" aria-label={c.take}
        onChange={(event) => void upload(event.target.files?.[0])} />
      <ul className="flex flex-col gap-3">
        {info.views.map((view) => {
          const label = viewLabel(view, info.phase.key, lang, t);
          return (
            <li key={view.id} className="bg-white rounded-2xl p-4 flex items-center gap-3">
              {view.taken ? <CheckCircle2 className="w-5 h-5 text-primary shrink-0" aria-label={c.taken} /> : view.video ? <Video className="w-5 h-5 text-muted-foreground shrink-0" /> : <Camera className="w-5 h-5 text-muted-foreground shrink-0" />}
              <span className="min-w-0 flex-1 font-bold break-words">{label}{!view.required && c.optional}</span>
              <Button type="button" className="rounded-xl shrink-0" variant={view.taken ? "outline" : "default"} disabled={busyId !== null}
                data-testid={`capture-${view.key}`}
                onClick={() => { if (view.video) { setRecordingView(view); return; } pending.current = view.id; inputRef.current?.click(); }}>
                {busyId === view.id ? <><Loader2 className="w-4 h-4 animate-spin mr-2" />{c.saving}</> : view.video ? (view.taken ? v.recordAgain : v.record) : view.taken ? c.retake : c.take}
              </Button>
            </li>
          );
        })}
      </ul>
      {error && <p role="alert" className="text-sm text-destructive">{error}</p>}
      {recordingView && (
        <VideoRecorder title={v.recorderTitle(viewLabel(recordingView, info.phase.key, lang, t))} busy={busyId !== null}
          onClose={() => setRecordingView(null)} onUse={(video) => void saveVideo(recordingView, video)} />
      )}
      <Button type="button" className="rounded-xl h-12" disabled={busyId !== null} onClick={() => void finish()} data-testid="capture-finish">{c.finish}</Button>
    </>,
  );
}
