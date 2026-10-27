import { useCallback, useEffect, useRef, useState } from "react";
import { Circle, Loader2, RefreshCw, Square, SwitchCamera, Upload, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { VIDEO_TEXT } from "@/lib/video-i18n";
import {
  ALLOWED_VIDEO_TYPES, MAX_VIDEO_BYTES, MAX_VIDEO_SECONDS, VIDEO_BITS_PER_SECOND,
  baseVideoType, checkVideoFile, pickVideoMime, type RecordedVideo,
} from "@/lib/video-capture";

const COUNTDOWN_SECONDS = 3;

type Phase = "preparing" | "ready" | "countdown" | "recording" | "preview" | "error" | "unsupported";

/**
 * Graba un video corto en la app (getUserMedia + MediaRecorder, ~720p a 2,5 Mbps,
 * corte automático a los 20 s). No usa <input capture>: la cámara nativa graba a
 * calidad completa y el archivo pesa decenas de MB. La cámara se apaga al terminar
 * de grabar, al cerrar y al desmontar.
 */
export function VideoRecorder({ title, onUse, onClose, busy = false }: {
  title: string;
  onUse: (video: RecordedVideo) => void;
  onClose: () => void;
  busy?: boolean;
}) {
  const { lang } = useLanguage();
  const v = VIDEO_TEXT[lang];
  const mime = useRef<string | null>(pickVideoMime());
  const [phase, setPhase] = useState<Phase>(mime.current === null ? "unsupported" : "preparing");
  const [facing, setFacing] = useState<"environment" | "user">("environment");
  const [countdown, setCountdown] = useState(COUNTDOWN_SECONDS);
  const [elapsed, setElapsed] = useState(0);
  const [recorded, setRecorded] = useState<RecordedVideo | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [fileError, setFileError] = useState<string | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const liveRef = useRef<HTMLVideoElement>(null);
  const fileRef = useRef<HTMLInputElement>(null);
  const timers = useRef<number[]>([]);
  const startedAt = useRef(0);

  const clearTimers = () => { timers.current.forEach((id) => { window.clearTimeout(id); window.clearInterval(id); }); timers.current = []; };
  const stopCamera = useCallback(() => {
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    if (liveRef.current) liveRef.current.srcObject = null;
  }, []);

  const openCamera = useCallback(async (mode: "environment" | "user") => {
    stopCamera();
    setPhase("preparing");
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: mode }, width: { ideal: 1280 }, height: { ideal: 720 }, frameRate: { ideal: 30 } },
        audio: false,
      });
      streamRef.current = stream;
      if (liveRef.current) {
        liveRef.current.srcObject = stream;
        void liveRef.current.play?.()?.catch?.(() => undefined);
      }
      setPhase("ready");
    } catch {
      setPhase("error");
    }
  }, [stopCamera]);

  useEffect(() => {
    if (mime.current !== null) void openCamera(facing);
    // Solo al abrir (y al cambiar de cámara): grabar o previsualizar no reabre la cámara.
  }, [facing, openCamera]);

  // Al salir (cerrar, navegar, desmontar) la cámara se apaga siempre.
  useEffect(() => () => {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
    stopCamera();
  }, [stopCamera]);

  useEffect(() => () => { if (previewUrl) URL.revokeObjectURL(previewUrl); }, [previewUrl]);

  useEffect(() => {
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape" && phase !== "recording") onClose(); };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose, phase]);

  const stopRecording = useCallback(() => {
    clearTimers();
    if (recorderRef.current && recorderRef.current.state !== "inactive") recorderRef.current.stop();
  }, []);

  const beginRecording = () => {
    const stream = streamRef.current;
    if (!stream) return;
    const chunks: Blob[] = [];
    let recorder: MediaRecorder;
    try {
      recorder = new MediaRecorder(stream, { ...(mime.current ? { mimeType: mime.current } : {}), videoBitsPerSecond: VIDEO_BITS_PER_SECOND });
    } catch {
      setPhase("error");
      return;
    }
    recorderRef.current = recorder;
    recorder.ondataavailable = (event) => { if (event.data && event.data.size > 0) chunks.push(event.data); };
    recorder.onstop = () => {
      const durationMs = Math.min(MAX_VIDEO_SECONDS * 1000, Math.round(performance.now() - startedAt.current));
      const type = baseVideoType(recorder.mimeType || mime.current || "") ?? "video/webm";
      const blob = new Blob(chunks, { type });
      stopCamera();
      if (blob.size > MAX_VIDEO_BYTES) {
        setFileError(v.tooLong);
        setPhase("error");
        return;
      }
      setRecorded({ blob, type, durationMs, source: "camera" });
      setPreviewUrl(URL.createObjectURL(blob));
      setPhase("preview");
    };
    startedAt.current = performance.now();
    setElapsed(0);
    recorder.start(1000);
    setPhase("recording");
    timers.current.push(window.setInterval(() => setElapsed(Math.min(MAX_VIDEO_SECONDS, Math.floor((performance.now() - startedAt.current) / 1000))), 250));
    timers.current.push(window.setTimeout(stopRecording, MAX_VIDEO_SECONDS * 1000));
  };

  const startCountdown = () => {
    setCountdown(COUNTDOWN_SECONDS);
    setPhase("countdown");
    let left = COUNTDOWN_SECONDS;
    const tick = window.setInterval(() => {
      left -= 1;
      if (left <= 0) {
        window.clearInterval(tick);
        beginRecording();
      } else {
        setCountdown(left);
      }
    }, 1000);
    timers.current.push(tick);
  };

  const retake = () => {
    setRecorded(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl(null);
    setFileError(null);
    void openCamera(facing);
  };

  const chooseFile = (file: File | undefined) => {
    if (!file) return;
    const check = checkVideoFile(file);
    if (check !== "ok") {
      setFileError(check === "size" ? v.fileTooBig : v.fileWrongType);
      return;
    }
    setFileError(null);
    stopCamera();
    setRecorded({ blob: file, type: baseVideoType(file.type)!, durationMs: null, source: "upload" });
    setPreviewUrl(URL.createObjectURL(file));
    setPhase("preview");
  };

  const live = phase === "preparing" || phase === "ready" || phase === "countdown" || phase === "recording";

  return (
    <div className="fixed inset-0 z-[120] bg-black/90 flex items-center justify-center p-3 sm:p-6" role="dialog" aria-modal="true" aria-label={title} data-testid="video-recorder">
      <div className="w-full max-w-xl bg-card rounded-2xl overflow-hidden shadow-2xl flex flex-col max-h-full">
        <div className="flex items-center justify-between gap-3 px-4 py-3 border-b border-border">
          <h2 className="font-bold text-foreground min-w-0 break-words">{title}</h2>
          <Button type="button" variant="ghost" size="icon" className="h-11 w-11 shrink-0 rounded-xl" aria-label={v.close} onClick={onClose} disabled={phase === "recording" || busy}>
            <X className="w-5 h-5" />
          </Button>
        </div>

        <div className="relative bg-black aspect-video w-full">
          <video ref={liveRef} className={`absolute inset-0 w-full h-full object-contain ${live ? "" : "hidden"}`} muted playsInline autoPlay aria-hidden="true" data-testid="video-live" />
          {phase === "preview" && previewUrl && (
            <video src={previewUrl} className="absolute inset-0 w-full h-full object-contain" controls playsInline controlsList="nodownload" data-testid="video-preview" />
          )}
          {phase === "preparing" && (
            <p className="absolute inset-0 flex items-center justify-center gap-2 text-white/90 text-sm"><Loader2 className="w-5 h-5 animate-spin" />{v.preparing}</p>
          )}
          {phase === "countdown" && (
            <p className="absolute inset-0 flex items-center justify-center text-white text-3xl font-bold" role="status" aria-live="assertive" data-testid="video-countdown">{v.startsIn(countdown)}</p>
          )}
          {phase === "recording" && (
            <p className="absolute top-3 start-3 flex items-center gap-2 rounded-full bg-red-600 px-3 py-1.5 text-white text-sm font-semibold tabular-nums" role="status" aria-live="polite" data-testid="video-timer">
              <Circle className="w-3 h-3 fill-current" aria-hidden="true" />{v.recording(elapsed, MAX_VIDEO_SECONDS)}
            </p>
          )}
          {(phase === "error" || phase === "unsupported") && (
            <p className="absolute inset-0 flex items-center justify-center p-6 text-center text-white/90 text-sm" role="alert" data-testid="video-unavailable">
              {fileError && phase === "error" ? fileError : phase === "unsupported" ? v.unsupported : v.cameraError}
            </p>
          )}
        </div>

        <div className="p-4 flex flex-col gap-3">
          {(phase === "ready" || phase === "countdown" || phase === "recording") && <p className="text-xs text-muted-foreground">{v.autoStop(MAX_VIDEO_SECONDS)}</p>}
          {fileError && phase !== "error" && <p className="text-sm text-destructive" role="alert">{fileError}</p>}
          <div className="flex flex-wrap gap-2">
            {phase === "ready" && (
              <>
                <Button type="button" className="h-11 rounded-xl gap-2 font-semibold" onClick={startCountdown} data-testid="video-start">
                  <Circle className="w-4 h-4 fill-current" />{v.start}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl gap-2" onClick={() => setFacing((f) => (f === "environment" ? "user" : "environment"))}>
                  <SwitchCamera className="w-4 h-4" />{v.switchCamera}
                </Button>
              </>
            )}
            {phase === "recording" && (
              <Button type="button" className="h-11 rounded-xl gap-2 font-semibold bg-red-600 hover:bg-red-700 text-white" onClick={stopRecording} data-testid="video-stop">
                <Square className="w-4 h-4 fill-current" />{v.stop}
              </Button>
            )}
            {phase === "preview" && recorded && (
              <>
                <Button type="button" className="h-11 rounded-xl gap-2 font-semibold" disabled={busy} onClick={() => onUse(recorded)} data-testid="video-use">
                  {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : null}{busy ? v.saving : v.use}
                </Button>
                <Button type="button" variant="outline" className="h-11 rounded-xl gap-2" disabled={busy} onClick={retake} data-testid="video-retake">
                  <RefreshCw className="w-4 h-4" />{v.retake}
                </Button>
              </>
            )}
            {phase !== "recording" && phase !== "countdown" && phase !== "preview" && (
              <>
                <input ref={fileRef} type="file" accept={ALLOWED_VIDEO_TYPES.join(",")} className="sr-only" aria-label={v.uploadFile} data-testid="video-file"
                  onChange={(event) => { chooseFile(event.target.files?.[0]); event.target.value = ""; }} />
                <Button type="button" variant="outline" className="h-11 rounded-xl gap-2" onClick={() => fileRef.current?.click()}>
                  <Upload className="w-4 h-4" />{v.uploadFile}
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
