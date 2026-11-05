import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, AlertCircle, Volume2, VolumeX, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useLanguage } from "@/lib/language";
import { CAMERA_TEXT, fillTools } from "@/lib/tools-i18n";
import { cropRectForVideo, frameFor, parseRatio, type Size } from "@/lib/camera-crop";
import { CAMERA_GUIDE_TEXT, guideTextFor, type GuideKind } from "@/lib/camera-guide-i18n";
import { analyzeHeadFit, DONOR_OVAL_SCALE, DONOR_TUNE, sharpenMask, donorCropBox, isolateAtOval, ovalForFrame, type FitStatus } from "@/lib/head-fit";
import { newMachine, step, type Machine, type SayKey } from "@/lib/auto-capture";
import { GuideAudio } from "@/lib/guide-audio";
import { createSegmenter, type Segmenter } from "@/lib/selfie-segmenter";
import { createFaceTurn, faceTurnProblem, type FaceTurn } from "@/lib/face-turn";
import { judgeTurn, newTurnState } from "@/lib/turn-fit";

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
  /** Qué vista es: cambia lo que se le pide al paciente (mover la cabeza, girarla, etc.). */
  guideKind?: GuideKind;
  /** Ilustración de referencia que se muestra grande antes de la toma. */
  guideImage?: string;
  /** Miniatura animada en una esquina mientras se toma la foto (no tapa ni recibe toques). */
  guideAnimation?: string;
  /** "Foto 2 de 5". */
  progressLabel?: string;
}

const STATUS_SAY: Record<Exclude<FitStatus, "ok">, SayKey> = { none: "nobody", closer: "closer", farther: "farther", left: "left", right: "right", up: "up", down: "down", turn: "turn" };
type GuideStage = "intro" | "loading" | "running" | "manual";
/** Lado más largo (en píxeles) de la imagen que se analiza: chica, para que el análisis sea rápido. */
const ANALYSIS_SIDE = 256;
const ANALYSIS_EVERY_MS = 160;
/** Tiempo para colocarse antes de que la guía empiece a medir (zona donante). */
const BACK_PREP_MS = 6000;
/** Zona donante: cada cuánto la voz recuerda el botón blanco mientras no se detecta bien la nuca. */
const TAP_HINT_EVERY_MS = 9000;

type PermissionState = "requesting" | "granted" | "denied" | "unsupported";

export function CameraModal({ onCapture, onClose, onError, title, aspectRatio, guided = false, guideKind = "front", guideImage, guideAnimation, progressLabel }: CameraModalProps) {
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
  const { text: guideText, introStep } = guideTextFor(lang, guideKind);
  const introSteps = [...guideText.introBody.split("\n"), ...(introStep ? [introStep] : [])];
  const [stage, setStage] = useState<GuideStage>("intro");
  const [fitStatus, setFitStatus] = useState<FitStatus>("none");
  const [message, setMessage] = useState<SayKey | "takeNow" | "tap" | "getReady" | "unavailable" | null>(null);
  const [watchReady, setWatchReady] = useState(false);
  const [diagnosis, setDiagnosis] = useState("");
  const [count, setCount] = useState<number | null>(null);
  const [muted, setMuted] = useState(false);
  const [voiceMissing, setVoiceMissing] = useState(false);
  const audioRef = useRef<GuideAudio | null>(null);
  const segmenterRef = useRef<Segmenter | null>(null);
  const faceTurnRef = useRef<FaceTurn | null>(null);
  // En las vistas laterales la foto solo se da por buena con la cabeza girada hacia el lado pedido.
  const turnSide = guideKind === "right" || guideKind === "left" ? guideKind : null;
  const shutterRef = useRef<() => void>(() => undefined);
  // Zona donante: dónde está la cabeza reflejada (proporciones 0–1 del cuadro analizado) para recortar la foto.
  const donorBoxRef = useRef<{ x: number; y: number; w: number; h: number } | null>(null);
  const mirrored = guided && facingMode === "user";
  // Con la guía no se dibuja el rectángulo: solo el óvalo (también en modo manual): sin el rectángulo ni sus esquinas.
  const ovalOnly = guided;
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
        // En iPhone el video a veces queda negro si no se pide reproducirlo de forma explícita.
        void videoRef.current.play?.()?.catch(() => undefined);
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
    // Zona donante con espejo: se recorta solo la cabeza reflejada (sin la persona real que también sale en el espejo).
    // Si la nuca no se detectó, se recorta alrededor del óvalo (ahí la puso el paciente).
    const donorOval = ovalForFrame(frame.width, frame.height, DONOR_OVAL_SCALE);
    const aroundOval = { x: Math.max(0, donorOval.cx - donorOval.rx * 1.5), y: Math.max(0, donorOval.cy - donorOval.ry * 1.3), w: Math.min(1, donorOval.rx * 3), h: Math.min(1, donorOval.ry * 2.8) };
    const donor = guideKind === "back" ? (donorBoxRef.current ?? aroundOval) : null;
    const base = cropRectForVideo(box, { width: video.videoWidth, height: video.videoHeight }, frame, donor ? 0 : undefined);
    const crop = donor && base
      ? { sx: Math.round(base.sx + donor.x * base.sw), sy: Math.round(base.sy + donor.y * base.sh), sw: Math.max(1, Math.round(donor.w * base.sw)), sh: Math.max(1, Math.round(donor.h * base.sh)) }
      : base;
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

  // Modo manual: el paciente toma la foto, pero el óvalo sigue avisando (verde) cuando está bien encuadrado.
  const startManual = async () => {
    setStage("manual");
    if (segmenterRef.current) { setWatchReady(true); return; }
    const segmenter = await createSegmenter();
    // Uno después del otro: los dos motores comparten un objeto global y, si se inician a la vez, se pisan y fallan.
    const faceTurn = turnSide && segmenter ? await createFaceTurn() : null;
    faceTurnRef.current = faceTurn;
    if (segmenter && (!turnSide || faceTurn)) { segmenterRef.current = segmenter; setWatchReady(true); }
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
    const faceTurn = turnSide && segmenter ? await createFaceTurn() : null;
    faceTurnRef.current = faceTurn;
    if (turnSide && segmenter && !faceTurn) void faceTurnProblem().then(setDiagnosis);
    // Sin poder medir el giro no se toma la foto sola: una lateral que salga de frente no sirve.
    if (!segmenter || (turnSide && !faceTurn)) {
      setMessage("unavailable");
      setStage("manual");
      return;
    }
    segmenterRef.current = segmenter;
    setWatchReady(true);
    setStage("running");
  };

  // Ciclo de análisis: mira un cuadro cada pocas décimas de segundo, dice qué hacer y toma la foto cuando corresponde.
  useEffect(() => {
    const watchOnly = stage === "manual";
    if (!guided || permissionState !== "granted" || !(stage === "running" || (watchOnly && watchReady))) return;
    let stopped = false;
    let timer: number | undefined;
    let machine: Machine = newMachine();
    let turnState = newTurnState();
    let lastTapHint = performance.now() + BACK_PREP_MS;
    let tapHoldUntil = 0;
    // Zona donante: el paciente no ve la pantalla, así que primero se le explica la postura y se le da tiempo de tomarla.
    const prepUntil = guideKind === "back" ? performance.now() + BACK_PREP_MS : 0;
    if (prepUntil) { setMessage("getReady"); audioRef.current?.say(guideText.getReady); }
    const canvas = document.createElement("canvas");
    const tick = async () => {
      const video = videoRef.current;
      const segmenter = segmenterRef.current;
      const { box: viewBox, frame: viewFrame, mirrored: flip } = latestRef.current;
      if (stopped || !video || !segmenter) return;
      if (performance.now() < prepUntil) { timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS); return; }
      if (video.paused) void video.play?.()?.catch(() => undefined); // si el iPhone detuvo el video, se vuelve a reproducir
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
            const oval = ovalForFrame(viewFrame.width, viewFrame.height, guideKind === "back" ? DONOR_OVAL_SCALE : 1);
            // Con el espejo hay dos siluetas: se mira solo la del reflejo que está en el óvalo.
            const sharp = guideKind === "back" ? sharpenMask(mask.data, DONOR_TUNE.presence) : null;
            const isolated = sharp ? isolateAtOval(sharp, mask.width, mask.height, oval) : null;
            const fit = analyzeHeadFit(sharp ? (isolated ?? new Uint8Array(mask.width * mask.height)) : mask.data, mask.width, mask.height, oval, flip, guideKind === "back" ? DONOR_TUNE : undefined);
            if (guideKind === "back") donorBoxRef.current = fit.status === "ok" && isolated ? donorCropBox(isolated, mask.width, mask.height) : null;
            let status: FitStatus = fit.status;
            if (turnSide && status === "ok") {
              const ratio = faceTurnRef.current ? await faceTurnRef.current.run(canvas) : null;
              if (stopped) return;
              const judged = judgeTurn(turnSide, ratio, turnState, performance.now());
              turnState = judged.state;
              if (!judged.turned) status = "turn";
            }
            if (watchOnly) {
              setFitStatus(status);
              setMessage(status === "ok" ? "takeNow" : STATUS_SAY[status]);
              if (!stopped) timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS);
              return;
            }
            // Zona donante: si la nuca no se logra detectar, la voz recuerda que puede tomar la foto con el botón blanco.
            if (guideKind === "back" && status !== "ok" && performance.now() < tapHoldUntil) {
              timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS);
              return;
            }
            if (guideKind === "back" && status !== "ok" && performance.now() - lastTapHint > TAP_HINT_EVERY_MS) {
              lastTapHint = performance.now();
              tapHoldUntil = lastTapHint + 4500; // el aviso se queda en pantalla y la voz termina de decirlo
              setMessage("tap");
              audioRef.current?.say(latestRef.current.guideText.tap);
              timer = window.setTimeout(() => void tick(), ANALYSIS_EVERY_MS);
              return;
            }
            const out = step(machine, status, performance.now());
            machine = out.machine;
            setFitStatus(status);
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
  }, [guided, stage, permissionState, watchReady]); // eslint-disable-line react-hooks/exhaustive-deps

  // "Escuchar de nuevo": vuelve a decir la última indicación (si la voz está silenciada, la activa para poder oírla).
  const repeatInstruction = () => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.muted) { audio.setMuted(false); setMuted(false); }
    const key = message && message !== "unavailable" ? message : null;
    if (key) audio.say(guideText[key]);
  };

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
        <span aria-hidden className="flex-1" />
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

      {/* Nombre de la foto, bien visible */}
      <div className="bg-black px-4 pb-3 pt-1 flex flex-col items-center gap-1.5">
        {progressLabel && <p data-testid="camera-progress" className="text-lg font-bold text-white/90">{progressLabel}</p>}
        <h2 data-testid="camera-title" className="rounded-full bg-gradient-to-r from-emerald-500 to-teal-500 px-6 py-2 text-center text-2xl font-extrabold tracking-tight text-white shadow-lg">{title}</h2>
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
        {permissionState === "granted" && frame.width > 0 && !(guided && (stage === "intro" || stage === "loading")) && (
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
              {guided && stage !== "intro" && stage !== "loading" && <GuideOval width={frame.width} height={frame.height} scale={guideKind === "back" ? DONOR_OVAL_SCALE : 1} ok={fitStatus === "ok"} counting={count !== null} />}
            </div>
          </div>
        )}

        {/* Miniatura animada del movimiento: esquina inferior, sin recibir toques para no estorbar */}
        {permissionState === "granted" && guided && guideAnimation && (stage === "running" || stage === "manual") && (
          <img src={guideAnimation} alt="" aria-hidden data-testid="guide-thumb" className="absolute bottom-3 end-3 z-10 h-24 w-24 rounded-2xl bg-white/90 object-contain shadow-lg pointer-events-none select-none" />
        )}

        {/* Guía automática: texto grande con lo mismo que dice la voz, y la cuenta regresiva */}
        {permissionState === "granted" && guided && (stage === "running" || stage === "manual") && message && message !== "unavailable" && (
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
          <p role="alert" data-testid="guide-no-voice" className="absolute bottom-3 start-3 end-28 rounded-2xl bg-amber-100 px-4 py-3 text-center text-base font-semibold text-amber-900">{guideText.noVoice}</p>
        )}
        {permissionState === "granted" && guided && message === "unavailable" && (
          <p role="alert" data-testid="guide-unavailable" className="absolute top-3 inset-x-3 rounded-2xl bg-amber-100 px-4 py-3 text-center text-base font-semibold text-amber-900">{guideText.unavailable}{diagnosis && <span data-testid="guide-diagnosis" className="mt-1 block text-xs font-medium opacity-80">{diagnosis}</span>}</p>
        )}
        {permissionState === "granted" && guided && stage === "loading" && (
          <div className="absolute inset-0 z-10 bg-black flex flex-col items-center justify-center gap-3 text-white" data-testid="guide-loading">
            <Loader2 className="w-10 h-10 animate-spin" />
            <p className="text-xl font-bold">{guideText.loading}</p>
          </div>
        )}
        {permissionState === "granted" && guided && stage === "intro" && (
          <div className="absolute inset-0 z-10 bg-black overflow-y-auto flex flex-col items-center justify-center gap-5 px-6 py-4 text-center" data-testid="guide-intro">
            {guideImage ? (
              <img src={guideImage} alt={title} data-testid="guide-image" className="w-full max-w-sm aspect-square object-contain rounded-2xl bg-white" />
            ) : (
              <Volume2 className="w-12 h-12 text-white" aria-hidden />
            )}
            <h2 className="text-2xl font-extrabold text-white">{guideText.introTitle}</h2>
            <ol className="flex flex-col gap-4 max-w-md text-start" data-testid="guide-steps">
              {introSteps.map((step, index) => (
                <li key={index} className="flex items-start gap-3" data-testid={`guide-step-${index + 1}`}>
                  <span className="shrink-0 w-9 h-9 rounded-full bg-white text-black text-lg font-extrabold flex items-center justify-center" aria-hidden>{index + 1}</span>
                  <span className="text-lg leading-snug text-white">{step}</span>
                </li>
              ))}
            </ol>
            <Button onClick={() => void startGuide()} className="h-16 min-w-[14rem] rounded-full bg-green-600 hover:bg-green-700 text-white text-xl font-extrabold" data-testid="guide-start">
              {guideText.start}
            </Button>
            <button type="button" onClick={() => void startManual()} className="text-base font-semibold text-white/90 underline underline-offset-4 py-2" data-testid="guide-manual">
              {guideText.manual}
            </button>
          </div>
        )}
      </div>

      {/* Shutter bar — large capture button for easy clicking/tapping */}
      {permissionState === "granted" && (
        <div className="relative bg-black/80 backdrop-blur-sm py-7 flex items-center justify-center">
          {guided && stage === "running" && (
            <button onClick={repeatInstruction} className="absolute end-4 flex flex-col items-center gap-1 text-white/90 hover:text-white text-xs font-semibold max-w-[5.5rem] text-center" data-testid="guide-repeat">
              <RotateCcw className="w-7 h-7" />
              {guideText.repeat}
            </button>
          )}
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
function GuideOval({ width, height, scale, ok, counting }: { width: number; height: number; scale: number; ok: boolean; counting: boolean }) {
  const oval = ovalForFrame(width, height, scale);
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
