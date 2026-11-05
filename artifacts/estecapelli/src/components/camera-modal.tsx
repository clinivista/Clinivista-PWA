import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, AlertCircle, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { CAMERA_TEXT, fillTools } from "@/lib/tools-i18n";
import { cropRectForVideo, frameFor, parseRatio, type Size } from "@/lib/camera-crop";
import { CAMERA_GUIDE_TEXT } from "@/lib/camera-guide-i18n";
import { analyzeHeadFit, ovalForFrame, type FitStatus } from "@/lib/head-fit";
import { newMachine, step, type Machine, type SayKey } from "@/lib/auto-capture";
import { GuideAudio } from "@/lib/guide-audio";
import { createSegmenter, type Segmenter } from "@/lib/selfie-segmenter";

interface CameraModalProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Called immediately when permission is denied or the browser is unsupported,
   *  so the parent card can show an inline fallback alert. */
  onError?: (message: string) => void;
  title: string;
  /** Shape of the reference frame ("3:4" portrait, "4:3" landscape); the photo is cropped to it. */
  aspectRatio?: string;
  /** Guía automática: óvalo de referencia, voz y pitidos, y foto sola al encajar. Siempre queda el botón manual. */
  guided?: boolean;
}

type GuideStage = "intro" | "loading" | "running" | "manual";
/** Lado más largo (en píxeles) de la imagen que se analiza: chica, para que el análisis sea rápido. */
const ANALYSIS_SIDE = 256;
const ANALYSIS_EVERY_MS = 160;

type PermissionState = "requesting" | "granted" | "denied" | "unsupported";

export function CameraModal({ onCapture, onClose, onError, title, aspectRatio, guided = false }: CameraModalProps) {
  const { lang, t } = useLanguage();
  const cam = CAMERA_TEXT[lang];
  // El mensaje se arma con el idioma vigente sin reiniciar la cámara cuando cambia.
  const textRef = useRef({ cam, t });
  textRef.current = { cam, t };
  const say = (key: "insecure" | "unsupported" | "denied" | "notFound" | "failed") =>
    fillTools(textRef.current.cam[key], { upload: textRef.current.t.pUploadDevice });
  const videoRef = useRef<HTMLVideoElement>(null);
  const viewfinderRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<Size>({ width: 0, height: 0 });
  const frame = frameFor(box, parseRatio(aspectRatio));
  const streamRef = useRef<MediaStream | null>(null);
  /**
   * Per-call acquisition token.
   * Each call to startCamera() creates a fresh object and stores it here.
   * When the async getUserMedia() resolves/rejects, we compare against the
   * current token; if it has changed (flip camera / unmount / re-init), we
   * discard the late stream immediately instead of leaking it.
   */
  const activeTokenRef = useRef<object | null>(null);

  const [permissionState, setPermissionState] = useState<PermissionState>("requesting");
  // La guía automática parte con la cámara frontal (el paciente casi siempre se toma la foto solo).
  const [facingMode, setFacingMode] = useState<"environment" | "user">(guided ? "user" : "environment");
  const guideText = CAMERA_GUIDE_TEXT[lang];
  const [stage, setStage] = useState<GuideStage>("intro");
  const [fitStatus, setFitStatus] = useState<FitStatus>("none");
  const [message, setMessage] = useState<SayKey | "unavailable" | null>(null);
  const [count, setCount] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const audioRef = useRef<GuideAudio | null>(null);
  const segmenterRef = useRef<Segmenter | null>(null);
  const shutterRef = useRef<() => void>(() => undefined);
  const mirrored = guided && facingMode === "user";
  // Con la guía en marcha solo se ve el óvalo: sin el rectángulo ni sus esquinas.
  const ovalOnly = guided && stage === "running";
  const [errorMessage, setErrorMessage] = useState<string>("");

  useEffect(() => {
    const element = viewfinderRef.current;
    if (!element) return;
    const measure = () => setBox({ width: element.clientWidth, height: element.clientHeight });
    measure();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(measure);
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  const startCamera = async (facing: "environment" | "user") => {
    // Create a unique token for this acquisition attempt
    const token = {};
    activeTokenRef.current = token;

    // Stop any existing stream before starting a new one
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }

    if (!navigator.mediaDevices?.getUserMedia) {
      if (activeTokenRef.current !== token) return;
      const insecure = typeof window !== "undefined" && !window.isSecureContext;
      const msg = insecure
        ? say("insecure")
        : say("unsupported");
      setPermissionState("unsupported");
      setErrorMessage(msg);
      onError?.(msg);
      return;
    }

    try {
      // Start with a rear, high-resolution request, then progressively relax
      // constraints for older phones and desktop cameras.
      const attempts: MediaStreamConstraints[] = [
        { video: { facingMode: { ideal: facing }, width: { ideal: 2560 }, height: { ideal: 1440 } }, audio: false },
        { video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } }, audio: false },
        { video: { facingMode: { ideal: facing } }, audio: false },
        { video: true, audio: false },
      ];
      let stream: MediaStream | null = null;
      let lastError: unknown;
      for (const constraints of attempts) {
        try {
          stream = await navigator.mediaDevices.getUserMedia(constraints);
          break;
        } catch (error) {
          lastError = error;
        }
      }
      if (!stream) throw lastError instanceof Error ? lastError : new Error("Camera unavailable");

      // If the component unmounted or startCamera was called again while we waited,
      // discard the late stream immediately to avoid leaving the camera open.
      if (activeTokenRef.current !== token) {
        stream.getTracks().forEach((t) => t.stop());
        return;
      }

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setPermissionState("granted");
    } catch (err: unknown) {
      if (activeTokenRef.current !== token) return;

      const errName = err instanceof Error ? err.name : "";
      const isDenied = errName === "NotAllowedError" || errName === "PermissionDeniedError";
      const isNotFound = errName === "NotFoundError" || errName === "DevicesNotFoundError";

      const msg = isDenied
        ? say("denied")
        : isNotFound
          ? say("notFound")
          : say("failed");

      setPermissionState("denied");
      setErrorMessage(msg);
      // Notify the parent card immediately so it can show the inline alert
      onError?.(msg);
    }
  };

  useEffect(() => {
    startCamera(facingMode);
    return () => {
      // Cancel any in-flight acquisition and stop any active stream
      activeTokenRef.current = null;
      streamRef.current?.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const handleFlipCamera = async () => {
    const next = facingMode === "environment" ? "user" : "environment";
    setFacingMode(next);
    setPermissionState("requesting");
    await startCamera(next);
  };

  const handleShutter = () => {
    const video = videoRef.current;
    if (!video) return;

    // Keep only what is inside the reference frame, at the camera's full resolution (a zoom-in).
    const crop = cropRectForVideo(box, { width: video.videoWidth, height: video.videoHeight }, frame);
    const canvas = document.createElement("canvas");
    canvas.width = crop ? crop.sw : video.videoWidth;
    canvas.height = crop ? crop.sh : video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    if (crop) ctx.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, canvas.width, canvas.height);
    else ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Cancel any future acquisition and stop the stream before notifying parent
    activeTokenRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    onCapture(dataUrl);
  };

  shutterRef.current = handleShutter;
  const latestRef = useRef({ box, frame, mirrored, guideText });
  latestRef.current = { box, frame, mirrored, guideText };

  // Libera voz y segmentador al cerrar.
  useEffect(() => () => {
    audioRef.current?.dispose();
    segmenterRef.current?.close();
    segmenterRef.current = null;
  }, []);

  const speak = (key: SayKey, beep?: Parameters<GuideAudio["beep"]>[0]) => {
    setMessage(key);
    if (beep) audioRef.current?.beep(beep);
    audioRef.current?.say(latestRef.current.guideText[key]);
  };

  // Empezar la guía (un toque del paciente: así el navegador deja sonar la voz).
  const startGuide = async () => {
    const audio = audioRef.current ?? new GuideAudio(lang);
    audioRef.current = audio;
    setMuted(audio.muted);
    audio.unlock();
    audio.prime(latestRef.current.guideText.soundOn); // dentro del toque: así el navegador permite hablar después
    setVoiceMissing(!GuideAudio.canSpeak());
    setStage("loading");
    const segmenter = await createSegmenter();
    if (!segmenter) {
      setMessage("unavailable");
      setStage("manual");
      return;
    }
    segmenterRef.current = segmenter;
    setStage("running");
  };

  // Ciclo de análisis: mira un cuadro cada pocas décimas de segundo, dice qué hacer y toma la foto cuando corresponde.
  useEffect(() => {
    if (!guided || stage !== "running" || permissionState !== "granted") return;
    let stopped = false;
    let timer: number | undefined;
    let machine: Machine = newMachine();
    const canvas = document.createElement("canvas");
    const tick = async () => {
      const video = videoRef.current;
      const segmenter = segmenterRef.current;
      const { box: viewBox, frame: viewFrame, mirrored: flip } = latestRef.current;
      if (stopped || !video || !segmenter) return;
      if (video.videoWidth > 0 && viewFrame.width > 0) {
        const crop = cropRectForVideo(viewBox, { width: video.videoWidth, height: video.videoHeight }, viewFrame, 0);
        const ratio = viewFrame.width / viewFrame.height;
        const width = ratio >= 1 ? ANALYSIS_SIDE : Math.round(ANALYSIS_SIDE * ratio);
        const height = ratio >= 1 ? Math.round(ANALYSIS_SIDE / ratio) : ANALYSIS_SIDE;
        canvas.width = width;
        canvas.height = height;
        const context = canvas.getContext("2d");
        if (context) {
          if (crop) context.drawImage(video, crop.sx, crop.sy, crop.sw, crop.sh, 0, 0, width, height);
          else context.drawImage(video, 0, 0, width, height);
          const mask = await segmenter.run(canvas, width, height);
          if (stopped) return;
          if (mask) {
            const fit = analyzeHeadFit(mask.data, mask.width, mask.height, ovalForFrame(viewFrame.width, viewFrame.height), flip);
            const out = step(machine, fit.status, performance.now());
            machine = out.machine;
            setFitStatus(fit.status);
            setCount(machine.phase === "countdown" && machine.count > 0 ? 4 - machine.count : null);
            if (out.say) speak(out.say, out.beep);
            else if (out.beep) audioRef.current?.beep(out.beep);
            if (out.capture) {
              stopped = true;
              shutterRef.current();
              return;
            }
          }
        }
      }
      if (!stopped) timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS);
    };
    timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS);
    return () => {
      stopped = true;
      if (timer) window.clearTimeout(timer);
      setCount(null);
    };
  }, [guided, stage, permissionState]); // eslint-disable-line react-hooks/exhaustive-deps

  const toggleMute = () => {
    const audio = audioRef.current ?? new GuideAudio(lang);
    audioRef.current = audio;
    audio.setMuted(!audio.muted);
    setMuted(audio.muted);
  };

  const handleClose = () => {
    activeTokenRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    onClose();
  };

  return (
    // Fullscreen on mobile; on desktop a large centered panel so the
    // viewfinder stays big (>= 360px tall) without awkward letterboxing.
    <div className="fixed inset-0 z-50 bg-black/90 flex items-center justify-center">
      <div className="w-full h-full sm:h-auto sm:max-w-3xl sm:mx-6 sm:rounded-3xl sm:overflow-hidden bg-black flex flex-col shadow-2xl">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-black/60 backdrop-blur-sm">
        <button
          onClick={handleClose}
          className="flex items-center gap-2 text-white/80 hover:text-white transition-colors text-sm font-medium"
        >
          <X className="w-5 h-5" />
          Cancelar
        </button>
        <span className="text-white font-semibold text-sm truncate max-w-[160px]">{title}</span>
        {permissionState === "granted" && (
          <button
            onClick={handleFlipCamera}
            className="flex items-center gap-1.5 text-white/80 hover:text-white transition-colors text-sm font-medium"
          >
            <RotateCcw className="w-4 h-4" />
            Voltear
          </button>
        )}
        {permissionState !== "granted" && <div className="w-16" />}
      </div>

      {/* Camera preview / error — large viewfinder: full width on mobile,
          min 360px and up to ~65vh tall on desktop */}
      <div ref={viewfinderRef} className="flex-1 relative overflow-hidden flex items-center justify-center bg-black min-h-[300px] sm:min-h-[360px] sm:h-[min(65vh,640px)]">
        {permissionState === "requesting" && (
          <div className="flex flex-col items-center gap-4 text-white/70">
            <Camera className="w-12 h-12 animate-pulse" />
            <p className="text-base font-medium">{cam.requesting}</p>
          </div>
        )}

        {(permissionState === "denied" || permissionState === "unsupported") && (
          <div className="max-w-sm mx-4 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base mb-2">
                {permissionState === "unsupported" ? cam.unavailableTitle : cam.deniedTitle}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <Button
              onClick={handleClose}
              className="bg-white text-black hover:bg-white/90 font-semibold rounded-xl px-6 py-3"
            >
              {fillTools(cam.useUpload, { photo: t.pUploadPhoto })}
            </Button>
          </div>
        )}

        {/* Video element — always rendered so ref is available; hidden when not granted */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          style={mirrored ? { transform: "scaleX(-1)" } : undefined}
          className={`w-full h-full object-cover ${permissionState === "granted" ? "block" : "hidden"}`}
        />

        {/* Framing guide overlay: the photo is cropped to this frame */}
        {permissionState === "granted" && frame.width > 0 && (
          <div className="absolute inset-0 pointer-events-none">
            <div
              data-testid="camera-frame"
              className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 rounded-2xl shadow-[0_0_0_9999px_rgba(0,0,0,0.45)] ${ovalOnly ? "" : "border-2 border-white/60"}`}
              style={{ width: frame.width, height: frame.height }}
            >
              {!ovalOnly && (<>
                <div className="absolute -top-0.5 -left-0.5 w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-2xl" />
                <div className="absolute -top-0.5 -right-0.5 w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-2xl" />
                <div className="absolute -bottom-0.5 -left-0.5 w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-2xl" />
                <div className="absolute -bottom-0.5 -right-0.5 w-6 h-6 border-b-2 border-r-2 border-white rounded-br-2xl" />
              </>)}
              {guided && stage === "running" && <GuideOval width={frame.width} height={frame.height} ok={fitStatus === "ok"} counting={count !== null} />}
            </div>
          </div>
        )}

        {/* Guía automática: texto grande con lo mismo que dice la voz, y la cuenta regresiva */}
        {permissionState === "granted" && guided && stage === "running" && message && message !== "unavailable" && (
          <div className="absolute top-3 inset-x-3 pointer-events-none flex justify-center">
            <p role="status" aria-live="polite" data-testid="guide-message" className={`max-w-md rounded-2xl px-5 py-3 text-center text-xl font-extrabold leading-snug shadow-lg ${fitStatus === "ok" ? "bg-green-600 text-white" : "bg-white text-slate-900"}`}>
              {guideText[message]}
            </p>
          </div>
        )}
        {permissionState === "granted" && guided && count !== null && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span data-testid="guide-count" className="text-[8rem] leading-none font-black text-white drop-shadow-[0_4px_12px_rgba(0,0,0,0.7)]">{count}</span>
          </div>
        )}
        {permissionState === "granted" && guided && stage === "running" && voiceMissing && (
          <p role="alert" data-testid="guide-no-voice" className="absolute bottom-3 inset-x-3 rounded-2xl bg-amber-100 px-4 py-3 text-center text-base font-semibold text-amber-900">{guideText.noVoice}</p>
        )}
        {permissionState === "granted" && guided && message === "unavailable" && (
          <p role="alert" data-testid="guide-unavailable" className="absolute top-3 inset-x-3 rounded-2xl bg-amber-100 px-4 py-3 text-center text-base font-semibold text-amber-900">{guideText.unavailable}</p>
        )}
        {permissionState === "granted" && guided && stage === "loading" && (
          <div className="absolute inset-0 bg-black/70 flex flex-col items-center justify-center gap-3 text-white" data-testid="guide-loading">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-xl font-bold">{guideText.loading}</p>
          </div>
        )}
        {permissionState === "granted" && guided && stage === "intro" && (
          <div className="absolute inset-0 bg-black/80 flex flex-col items-center justify-center gap-5 px-6 text-center" data-testid="guide-intro">
            <Volume2 className="w-14 h-14 text-white" aria-hidden />
            <h2 className="text-2xl font-extrabold text-white">{guideText.introTitle}</h2>
            <p className="text-lg leading-relaxed text-white/90 max-w-md">{guideText.introBody}</p>
            <p className="text-base leading-relaxed text-amber-200 max-w-md" data-testid="guide-tip">{guideText.introTip}</p>
            <Button onClick={() => void startGuide()} className="h-16 min-w-[14rem] rounded-full bg-green-600 hover:bg-green-700 text-white text-xl font-extrabold" data-testid="guide-start">
              {guideText.start}
            </Button>
            <button type="button" onClick={() => setStage("manual")} className="text-base font-semibold text-white/90 underline underline-offset-4 py-2" data-testid="guide-manual">
              {guideText.manual}
            </button>
          </div>
        )}
      </div>

      {/* Shutter bar — large capture button for easy clicking/tapping */}
      {permissionState === "granted" && (
        <div className="relative bg-black/80 backdrop-blur-sm py-7 flex items-center justify-center">
          {guided && stage === "running" && (
            <button onClick={toggleMute} className="absolute start-4 flex flex-col items-center gap-1 text-white/90 hover:text-white text-xs font-semibold" data-testid="guide-mute" aria-pressed={muted}>
              {muted ? <VolumeX className="w-7 h-7" /> : <Volume2 className="w-7 h-7" />}
              {muted ? guideText.soundOff : guideText.soundOn}
            </button>
          )}
          <button
            onClick={handleShutter}
            className="rounded-full bg-white border-4 border-white/50 shadow-xl hover:scale-105 active:scale-95 transition-transform flex items-center justify-center"
            style={{ width: 88, height: 88 }}
            aria-label="Tomar foto"
          >
            <div className="w-[68px] h-[68px] rounded-full bg-white border-2 border-gray-200 shadow-inner" />
          </button>
        </div>
      )}
      </div>
    </div>
  );
}

/** Óvalo de referencia: se oscurece lo de afuera; es blanco punteado mientras se acomoda y verde sólido cuando encaja. */
function GuideOval({ width, height, ok, counting }: { width: number; height: number; ok: boolean; counting: boolean }) {
  const oval = ovalForFrame(width, height);
  const cx = oval.cx * width;
  const cy = oval.cy * height;
  const rx = oval.rx * width;
  const ry = oval.ry * height;
  const green = ok || counting;
  return (
    <svg width={width} height={height} className="absolute inset-0" data-testid="guide-oval" data-ok={green ? "true" : "false"} aria-hidden>
      <defs>
        <mask id="guide-oval-hole">
          <rect width={width} height={height} fill="white" />
          <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="black" />
        </mask>
      </defs>
      <rect width={width} height={height} fill="rgba(0,0,0,0.4)" mask="url(#guide-oval-hole)" />
      <ellipse cx={cx} cy={cy} rx={rx} ry={ry} fill="none" stroke={green ? "#22c55e" : "#ffffff"} strokeWidth={green ? 8 : 5} strokeDasharray={green ? undefined : "16 10"} strokeLinecap="round" />
    </svg>
  );
}
