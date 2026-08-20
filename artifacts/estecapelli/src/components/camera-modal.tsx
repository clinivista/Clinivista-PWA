import { useEffect, useRef, useState } from "react";
import { Camera, X, RotateCcw, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface CameraModalProps {
  onCapture: (dataUrl: string) => void;
  onClose: () => void;
  /** Called immediately when permission is denied or the browser is unsupported,
   *  so the parent card can show an inline fallback alert. */
  onError?: (message: string) => void;
  title: string;
}

type PermissionState = "requesting" | "granted" | "denied" | "unsupported";

export function CameraModal({ onCapture, onClose, onError, title }: CameraModalProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
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
  const [facingMode, setFacingMode] = useState<"environment" | "user">("environment");
  const [errorMessage, setErrorMessage] = useState<string>("");

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
        ? "La cámara no está disponible porque la página no se cargó de forma segura (HTTPS). Usa la opción «Subir desde el dispositivo» para seleccionar una imagen de tu galería."
        : "Tu navegador no soporta acceso a cámara. Por favor usa la opción «Subir desde el dispositivo» para seleccionar una imagen de tu galería.";
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
        ? "Acceso a la cámara denegado. Verifica los permisos en tu navegador y vuelve a intentar, o usa «Subir desde el dispositivo» para seleccionar una imagen de tu galería."
        : isNotFound
          ? "No se encontró ninguna cámara en este dispositivo. Usa la opción «Subir desde el dispositivo» para seleccionar una imagen de tu galería."
          : "No se pudo acceder a la cámara. Usa la opción «Subir desde el dispositivo» para seleccionar una imagen de tu galería.";

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

    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.92);

    // Cancel any future acquisition and stop the stream before notifying parent
    activeTokenRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;

    onCapture(dataUrl);
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
      <div className="flex-1 relative overflow-hidden flex items-center justify-center bg-black min-h-[300px] sm:min-h-[360px] sm:h-[min(65vh,640px)]">
        {permissionState === "requesting" && (
          <div className="flex flex-col items-center gap-4 text-white/70">
            <Camera className="w-12 h-12 animate-pulse" />
            <p className="text-base font-medium">Solicitando acceso a la cámara…</p>
          </div>
        )}

        {(permissionState === "denied" || permissionState === "unsupported") && (
          <div className="max-w-sm mx-4 flex flex-col items-center gap-5 text-center">
            <div className="w-16 h-16 rounded-full bg-red-500/20 flex items-center justify-center">
              <AlertCircle className="w-8 h-8 text-red-400" />
            </div>
            <div>
              <p className="text-white font-semibold text-base mb-2">
                {permissionState === "unsupported" ? "Cámara no disponible" : "Acceso denegado"}
              </p>
              <p className="text-white/70 text-sm leading-relaxed">{errorMessage}</p>
            </div>
            <Button
              onClick={handleClose}
              className="bg-white text-black hover:bg-white/90 font-semibold rounded-xl px-6 py-3"
            >
              Usar «Subir Foto»
            </Button>
          </div>
        )}

        {/* Video element — always rendered so ref is available; hidden when not granted */}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover ${permissionState === "granted" ? "block" : "hidden"}`}
        />

        {/* Framing guide overlay */}
        {permissionState === "granted" && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-56 h-72 border-2 border-white/50 rounded-2xl" />
            <div className="absolute top-[calc(50%-144px)] left-[calc(50%-112px)] w-6 h-6 border-t-2 border-l-2 border-white rounded-tl-md" />
            <div className="absolute top-[calc(50%-144px)] right-[calc(50%-112px)] w-6 h-6 border-t-2 border-r-2 border-white rounded-tr-md" />
            <div className="absolute bottom-[calc(50%-144px)] left-[calc(50%-112px)] w-6 h-6 border-b-2 border-l-2 border-white rounded-bl-md" />
            <div className="absolute bottom-[calc(50%-144px)] right-[calc(50%-112px)] w-6 h-6 border-b-2 border-r-2 border-white rounded-br-md" />
          </div>
        )}
      </div>

      {/* Shutter bar — large capture button for easy clicking/tapping */}
      {permissionState === "granted" && (
        <div className="bg-black/80 backdrop-blur-sm py-7 flex items-center justify-center">
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
