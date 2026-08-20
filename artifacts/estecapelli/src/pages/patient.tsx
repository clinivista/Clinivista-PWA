import { useState, useEffect, useRef, useCallback } from "react";
import { useSearch, Link, useLocation } from "wouter";
import {
  Camera, Check, CheckCircle2, ChevronRight, Info, ArrowLeft,
  ShieldCheck, Activity, ImagePlus, RefreshCw, Timer,
  ChevronDown, ChevronUp, AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CameraModal } from "@/components/camera-modal";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form, FormControl, FormField, FormItem, FormLabel, FormMessage,
} from "@/components/ui/form";
import {
  AlertDialog, AlertDialogContent, AlertDialogHeader, AlertDialogTitle, AlertDialogDescription,
} from "@/components/ui/alert-dialog";
import {
  useGetPatient, getGetPatientQueryKey, useCreatePatient, useUpdatePatient, useDiscardPatientPhotos,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, LANGS, type LangCode } from "@/lib/language";
import { formatRut, validateRut } from "@/lib/rut";
import { getCapillaryPhotoProtocol, type PhotoProtocolView } from "@/lib/photo-protocol";
import { formatBytes, reviewPhotoTechnicalQuality, type TechnicalPhotoReview } from "@/lib/photo-quality";

async function dataUrlToFile(dataUrl: string, name: string): Promise<File> {
  const response = await fetch(dataUrl);
  const blob = await response.blob();
  return new File([blob], name, { type: blob.type || "image/jpeg" });
}

// ---------- Country phone prefixes ----------
const COUNTRY_PREFIXES = [
  { code: "CL", flag: "🇨🇱", name: "Chile", prefix: "+56" },
  { code: "AR", flag: "🇦🇷", name: "Argentina", prefix: "+54" },
  { code: "CO", flag: "🇨🇴", name: "Colombia", prefix: "+57" },
  { code: "MX", flag: "🇲🇽", name: "México", prefix: "+52" },
  { code: "PE", flag: "🇵🇪", name: "Perú", prefix: "+51" },
  { code: "EC", flag: "🇪🇨", name: "Ecuador", prefix: "+593" },
  { code: "BO", flag: "🇧🇴", name: "Bolivia", prefix: "+591" },
  { code: "PY", flag: "🇵🇾", name: "Paraguay", prefix: "+595" },
  { code: "UY", flag: "🇺🇾", name: "Uruguay", prefix: "+598" },
  { code: "VE", flag: "🇻🇪", name: "Venezuela", prefix: "+58" },
  { code: "ES", flag: "🇪🇸", name: "España", prefix: "+34" },
  { code: "PT", flag: "🇵🇹", name: "Portugal", prefix: "+351" },
  { code: "US", flag: "🇺🇸", name: "EE.UU. / Canadá", prefix: "+1" },
  { code: "BR", flag: "🇧🇷", name: "Brasil", prefix: "+55" },
  { code: "TR", flag: "🇹🇷", name: "Turquía", prefix: "+90" },
  { code: "DE", flag: "🇩🇪", name: "Alemania", prefix: "+49" },
  { code: "FR", flag: "🇫🇷", name: "Francia", prefix: "+33" },
  { code: "IT", flag: "🇮🇹", name: "Italia", prefix: "+39" },
  { code: "GB", flag: "🇬🇧", name: "Reino Unido", prefix: "+44" },
  { code: "PL", flag: "🇵🇱", name: "Polonia", prefix: "+48" },
  { code: "RU", flag: "🇷🇺", name: "Rusia", prefix: "+7" },
  { code: "UA", flag: "🇺🇦", name: "Ucrania", prefix: "+380" },
  { code: "SA", flag: "🇸🇦", name: "Arabia Saudita", prefix: "+966" },
  { code: "AE", flag: "🇦🇪", name: "Emiratos Árabes", prefix: "+971" },
  { code: "CN", flag: "🇨🇳", name: "China", prefix: "+86" },
  { code: "AU", flag: "🇦🇺", name: "Australia", prefix: "+61" },
];

// ---------- City options ----------
const CITY_OPTIONS = [
  "Santiago", "Antofagasta", "Arica", "Calama", "Chillán", "Concepción", "Copiapó",
  "Coquimbo", "Curicó", "Iquique", "La Serena", "Los Ángeles", "Osorno", "Puerto Montt",
  "Punta Arenas", "Quillota", "Rancagua", "San Antonio", "Talca", "Temuco", "Valdivia",
  "Valparaíso", "Viña del Mar", "Otra ciudad o comuna",
];

// ---------- Zod schema ----------
const patientSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre completo"),
  documentId: z.string().superRefine((value, ctx) => {
    const result = validateRut(value);
    if (!result.valid) {
      ctx.addIssue({ code: z.ZodIssueCode.custom, message: result.error });
    }
  }),
  email: z.string().email("Ingresa un correo válido").min(1),
  phone: z.string().min(6, "Ingresa un teléfono válido"),
  age: z.string().optional().refine(v => !v || (Number(v) >= 18 && Number(v) <= 99), "La edad debe estar entre 18 y 99"),
  city: z.string().min(1, "Selecciona tu ciudad o comuna"),
  hairLossTime: z.string().optional(),
  pattern: z.string().optional(),
  previousTreatment: z.string().optional(),
  symptoms: z.string().optional(),
  surgeryHistory: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "Debes aceptar para continuar"),
  marketingConsent: z.boolean().optional(),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ---------- Active photo card (wizard) ----------
interface ActivePhotoCardProps {
  view: PhotoProtocolView;
  index: number;
  total: number;
  pendingDataUrl: string | null;
  pendingReview: TechnicalPhotoReview | null;
  acceptedDataUrl: string | undefined;
  savedOnServer: boolean;
  serverState?: { status: string; review?: { warningCodes?: string[] }; hasAdjusted?: boolean };
  onFileSelected: (key: string, file: File) => Promise<void>;
  onCameraCaptured: (key: string, dataUrl: string) => Promise<void>;
  onAccept: (key: string) => void;
  onRetake: () => void;
  isProcessing: boolean;
  photoOfLabel: string;
}

function ActivePhotoCard({
  view, index, total, pendingDataUrl, pendingReview, acceptedDataUrl, savedOnServer, serverState,
  onFileSelected, onCameraCaptured, onAccept, onRetake, isProcessing, photoOfLabel,
}: ActivePhotoCardProps) {
  const { key: photoKey, title, description, tip, referenceVisual, color, orientation, aspectRatio, light, distance, background } = view;
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const { t } = useLanguage();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setCameraError(null);
    await onFileSelected(photoKey, file);
    e.target.value = "";
  };

  const hasPending = !!pendingDataUrl;
  const hasAccepted = !!acceptedDataUrl || savedOnServer;
  const captureState = hasPending
    ? (pendingReview?.warnings.length ? "Requiere revisión técnica" : "Cargada")
    : savedOnServer
      ? (serverState?.hasAdjusted ? "Ajustada" : "Lista")
      : "Pendiente";

  return (
    <>
      {cameraOpen && (
        <CameraModal
          title={title}
          onCapture={async (url) => { setCameraOpen(false); await onCameraCaptured(photoKey, url); }}
          onClose={() => setCameraOpen(false)}
          onError={(msg) => setCameraError(msg)}
        />
      )}

      <div className="bg-white rounded-[2rem] overflow-hidden shadow-md ring-2 ring-primary/20">
        {/* Colored accent bar */}
        <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, ${color}40)` }} />

        {/* Foto X de 5 */}
        <div className="px-6 pt-4 flex items-center justify-between">
          <span className="text-xs font-black uppercase tracking-widest text-primary">{photoOfLabel}</span>
          <span className={`flex items-center gap-1.5 text-xs font-bold px-3 py-1 rounded-full ${hasAccepted && !hasPending ? "text-primary bg-primary/10" : hasPending ? "text-amber-800 bg-amber-50" : "text-muted-foreground bg-muted"}`}>
            {hasAccepted && !hasPending && <CheckCircle2 className="w-3.5 h-3.5" />}
            {captureState}
          </span>
        </div>

        {/* Guide section */}
        <div className="mt-3 bg-[#F5F2EE]/60">
          <button type="button" onClick={() => setGuideOpen(v => !v)} className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-[#F5F2EE]/80 transition-colors">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color }}>
              <Info className="w-3.5 h-3.5" />
              {t.pPhotoGuide}
            </span>
            {guideOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {guideOpen && (
            <div className="flex items-start gap-4 px-6 pb-4">
              <div className="w-16 h-16 shrink-0">{referenceVisual}</div>
              <div className="space-y-2 text-xs text-muted-foreground leading-relaxed font-medium">
                <p>{tip}</p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-1.5 text-[11px]">
                  <div><dt className="font-bold text-foreground">Orientación</dt><dd>{orientation} · {aspectRatio}</dd></div>
                  <div><dt className="font-bold text-foreground">Luz</dt><dd>{light}</dd></div>
                  <div><dt className="font-bold text-foreground">Distancia</dt><dd>{distance}</dd></div>
                  <div><dt className="font-bold text-foreground">Fondo</dt><dd>{background}</dd></div>
                </dl>
              </div>
            </div>
          )}
        </div>

        <div className="p-6">
          <h3 className="font-bold text-foreground text-lg mb-1">{title}</h3>
          <p className="text-sm text-muted-foreground mb-4 leading-relaxed">{description}</p>

          {cameraError && (
            <Alert variant="destructive" className="mb-4 text-left rounded-2xl">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-xs leading-relaxed">{cameraError}</AlertDescription>
            </Alert>
          )}

          {hasPending ? (
            <div className="space-y-4">
              <div className="rounded-2xl overflow-hidden shadow-lg ring-2 ring-primary/20 max-h-[420px] flex justify-center bg-black/5">
                <img src={pendingDataUrl!} alt={title} className="object-contain max-h-[420px] w-auto" />
              </div>
              {pendingReview && (
                <div className="rounded-2xl border border-primary/15 bg-primary/5 p-4 text-sm">
                  <h4 className="font-bold text-foreground">{t.photoTechnicalReview ?? "Revisión técnica"}</h4>
                  <p className="mt-1 text-xs text-muted-foreground">{t.photoTechnicalIntro ?? "Recomendaciones de captura; no analiza rasgos médicos."}</p>
                  <div className="mt-3 grid grid-cols-2 gap-2 text-xs">
                    <span><b>{t.photoResolution ?? "Resolución"}:</b> {pendingReview.width} × {pendingReview.height}</span>
                    <span><b>{t.photoOrientation ?? "Orientación"}:</b> {pendingReview.orientation}</span>
                    <span><b>{t.photoExposure ?? "Exposición"}:</b> {pendingReview.brightness ?? "—"}</span>
                    <span><b>{t.photoContrast ?? "Contraste"}:</b> {pendingReview.contrast ?? "—"}</span>
                    <span><b>{t.photoSharpness ?? "Nitidez"}:</b> {pendingReview.sharpness ?? "—"}</span>
                    <span>{formatBytes(pendingReview.sizeBytes)} · {pendingReview.mimeType}</span>
                  </div>
                  <p className="mt-3 text-xs font-medium text-primary">{t.photoOriginalNote ?? "El archivo original se conserva sin reducir."}</p>
                  {pendingReview.warnings.length > 0 && (
                    <div className="mt-3 rounded-xl bg-amber-50 p-3 text-xs text-amber-950">
                      <b>{t.photoWarnings ?? "Recomendaciones"}:</b>
                      <ul className="mt-1 list-disc pl-4">{pendingReview.warnings.map(warning => <li key={warning}>{warning}</li>)}</ul>
                    </div>
                  )}
                </div>
              )}
              <div className="flex gap-2.5 flex-wrap">
                <button
                  type="button"
                  onClick={() => onAccept(photoKey)}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-full bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20 transition-all disabled:opacity-50"
                >
                  <CheckCircle2 className="w-4 h-4" />
                  {t.pUsePhoto}
                </button>
                <button
                  type="button"
                  onClick={() => { setCameraError(null); onRetake(); setCameraOpen(true); }}
                  disabled={isProcessing}
                  className="inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-full bg-[#F5F2EE] border border-[#E8E4DE] text-gray-700 hover:bg-[#EDE9E4] transition-all disabled:opacity-50"
                >
                  <Camera className="w-4 h-4" />
                  {t.pRepeatPhoto}
                </button>
                <label className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-full cursor-pointer bg-[#F5F2EE] border border-[#E8E4DE] text-gray-700 hover:bg-[#EDE9E4] transition-all select-none ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
                  <ImagePlus className="w-4 h-4" />
                  {t.pUploadAnother}
                  <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="hidden" onChange={handleFile} disabled={isProcessing} />
                </label>
              </div>
            </div>
          ) : (
            <div className="space-y-4">
              {acceptedDataUrl ? (
                <div className="rounded-2xl overflow-hidden shadow-lg ring-2 ring-primary/20 max-h-[420px] flex justify-center bg-black/5">
                  <img src={acceptedDataUrl} alt={title} className="object-contain max-h-[420px] w-auto" />
                </div>
              ) : savedOnServer ? (
                <div className="rounded-2xl border-2 border-primary/20 bg-primary/5 flex flex-col items-center justify-center py-10 text-primary">
                  <CheckCircle2 className="w-10 h-10 mb-2" />
                  <span className="text-sm font-bold">{t.pSavedOnServer}</span>
                </div>
              ) : (
                <div className="rounded-2xl border-2 border-dashed border-gray-200 bg-[#F5F2EE]/60 flex flex-col items-center justify-center py-10 text-gray-300">
                  <Camera className="w-10 h-10 mb-2" />
                  <span className="text-[11px] uppercase font-black tracking-widest">{index + 1} / {total}</span>
                </div>
              )}
              <div className="flex gap-2.5 flex-wrap">
                {/* Camera access is only requested when the patient taps "Tomar foto" */}
                <button
                  type="button"
                  onClick={() => { setCameraError(null); setCameraOpen(true); }}
                  disabled={isProcessing}
                  className={`inline-flex items-center gap-2 text-sm font-bold px-5 py-3 rounded-full transition-all disabled:opacity-50 ${hasAccepted ? "bg-[#F5F2EE] border border-[#E8E4DE] text-gray-700 hover:bg-[#EDE9E4]" : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"}`}
                >
                  <Camera className="w-4 h-4" />
                  {hasAccepted ? t.pRepeatPhoto : t.pTakePhoto}
                </button>
                <label className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-3 rounded-full cursor-pointer bg-[#F5F2EE] border border-[#E8E4DE] text-foreground hover:bg-[#EDE9E4] transition-all select-none ${isProcessing ? "opacity-50 pointer-events-none" : ""}`}>
                  <ImagePlus className="w-4 h-4" />
                  {hasAccepted ? t.pUploadAnother : t.pUploadDevice}
                  <input ref={galleryRef} type="file" accept="image/jpeg,image/png,image/webp,image/heic" capture="environment" className="hidden" onChange={handleFile} disabled={isProcessing} />
                </label>
              </div>
            </div>
          )}

          {isProcessing && (
            <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-3">
              <RefreshCw className="w-4 h-4 animate-spin" />
              {t.pProcessing}
            </span>
          )}
        </div>
      </div>
    </>
  );
}

// ---------- Main component ----------
export default function PatientFlow() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");
  const [patientToken, setPatientToken] = useState<string | null>(token);
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const PHOTO_REQUIREMENTS = getCapillaryPhotoProtocol(t);

  const [step, setStep] = useState<"intro" | "data" | "photos" | "success">("intro");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [pendingPhoto, setPendingPhoto] = useState<string | null>(null);
  const [pendingPhotoFile, setPendingPhotoFile] = useState<File | null>(null);
  const [pendingReview, setPendingReview] = useState<TechnicalPhotoReview | null>(null);
  const [pendingPhotoSource, setPendingPhotoSource] = useState<"camera" | "upload">("upload");
  const [currentPhotoIndex, setCurrentPhotoIndex] = useState(0);
  const [savedKeys, setSavedKeys] = useState<Set<string>>(new Set());
  const [serverPhotoStates, setServerPhotoStates] = useState<Record<string, { status: string; review?: { warningCodes?: string[] }; hasAdjusted?: boolean }>>({});
  const [resumeOffer, setResumeOffer] = useState(false);
  const [exitDialog, setExitDialog] = useState<"closed" | "open" | "confirmDiscard">("closed");
  const [dirty, setDirty] = useState(false);
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+56");
  const [phonePrefixOpen, setPhonePrefixOpen] = useState(false);
  const { toast } = useToast();
  const [, navigate] = useLocation();

  const { data: existingData, isLoading: isLoadingExisting, isError: isTokenError } = useGetPatient(token || "", {
    query: { enabled: !!token, queryKey: getGetPatientQueryKey(token || "") },
  });

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", documentId: "", email: "", phone: "", age: "", city: "", hairLossTime: "", pattern: "", previousTreatment: "", symptoms: "", surgeryHistory: "", consent: false, marketingConsent: false },
  });

  // Live gate for the "Continuar" button: all required fields valid + consent checked
  const watchedValues = form.watch();
  const canContinue = patientSchema.safeParse(watchedValues).success;

  useEffect(() => {
    if (existingData?.lead && step === "intro" && !resumeOffer) {
      const l = existingData.lead;
      form.reset({
        name: l.name || "", documentId: formatRut((l as any).documentId || ""), email: (l as any).email || "",
        phone: l.phone || "", age: l.age || "", city: l.city || "",
        hairLossTime: (l as any).hairLossTime || "", pattern: (l as any).pattern || "",
        previousTreatment: (l as any).previousTreatment || "", symptoms: (l as any).symptoms || "",
        surgeryHistory: (l as any).surgeryHistory || "", consent: l.consent || false,
        marketingConsent: (l as any).marketingConsent || false,
      });
      const keys = Array.isArray((l as any).photoKeys) ? ((l as any).photoKeys as string[]) : [];
      if (keys.length > 0) {
        // The dedicated status endpoint below decides which photos are
        // confirmed; this summary only tells us a resumable draft exists.
        setResumeOffer(true);
      } else {
        setStep("data");
      }
    }
  }, [existingData, step, resumeOffer]); // eslint-disable-line react-hooks/exhaustive-deps

  // The photo endpoint intentionally returns metadata only. On a reload we
  // restore the confirmed states without pulling private image bytes into JSON,
  // localStorage or the browser cache.
  useEffect(() => {
    if (!token) return;
    let alive = true;
    fetch(`/api/patients/${encodeURIComponent(token)}/photos`)
      .then(response => response.ok ? response.json() : Promise.reject(new Error("No photo state")))
      .then((payload: { photos?: Array<{ key: string; status: string; hasAdjusted?: boolean; captureMetadata?: { technicalReview?: { warningCodes?: string[] } } }> }) => {
        if (!alive) return;
        const confirmed = (payload.photos ?? []).filter(photo => photo.status === "confirmed");
        setSavedKeys(new Set(confirmed.map(photo => photo.key)));
        setServerPhotoStates(Object.fromEntries(confirmed.map(photo => [photo.key, {
          status: photo.status, review: photo.captureMetadata?.technicalReview, hasAdjusted: photo.hasAdjusted,
        }])));
        if (confirmed.length > 0) setResumeOffer(true);
      })
      .catch(() => { /* Existing patient summary still provides the safe resume fallback. */ });
    return () => { alive = false; };
  }, [token]);

  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();
  const discardMutation = useDiscardPatientPhotos();

  // A photo counts as completed if it was confirmed privately or is ready locally.
  const isPhotoDone = (key: string) => !!photos[key] || savedKeys.has(key);

  // ---- Server-side draft save (only possible when an invitation token exists) ----
  // Saves are serialized through a single promise chain so a discard/restart can
  // (a) wait for every in-flight save to settle and (b) invalidate queued saves
  // via a generation counter — otherwise a late PUT could re-merge a photo the
  // patient just asked to discard.
  const saveChainRef = useRef<Promise<void>>(Promise.resolve());
  const saveGenRef = useRef(0);

  const saveDraft = useCallback(() => {
    if (!patientToken) return;
    const gen = saveGenRef.current;
    const formData = form.getValues();
    saveChainRef.current = saveChainRef.current
      .then(async () => {
        // A discard/restart happened while this save was queued — drop it.
        if (saveGenRef.current !== gen) return;
        const res = await updateMutation.mutateAsync({ token: patientToken, data: formData });
        if (saveGenRef.current !== gen) return; // discarded while in flight; DELETE runs after this chain
        const keys = Array.isArray((res as any)?.lead?.photoKeys) ? ((res as any).lead.photoKeys as string[]) : [];
        setSavedKeys(prev => new Set([...prev, ...keys]));
        setDirty(false);
        toast({ title: t.pSavedProgress, duration: 2000 });
      })
      .catch(() => { /* save errors are non-fatal for the draft flow */ });
  }, [patientToken, form, updateMutation, toast, t]);

  const clearPendingPreview = () => {
    if (pendingPhoto?.startsWith("blob:")) URL.revokeObjectURL(pendingPhoto);
    setPendingPhoto(null);
    setPendingPhotoFile(null);
    setPendingReview(null);
  };

  const preparePhoto = async (key: string, file: File, source: "camera" | "upload") => {
    setProcessingPhoto(key);
    try {
      if (!/^image\/(jpeg|png|webp)$/i.test(file.type)) {
        throw new Error(t.photoInvalidFormat ?? "Este formato no se puede procesar. Usa JPEG, PNG o WebP.");
      }
      const view = PHOTO_REQUIREMENTS.find(requirement => requirement.key === key);
      if (!view) throw new Error("Vista fotográfica no disponible.");
      const review = await reviewPhotoTechnicalQuality(file, view);
      if (pendingPhoto?.startsWith("blob:")) URL.revokeObjectURL(pendingPhoto);
      setPendingPhoto(URL.createObjectURL(file));
      setPendingPhotoFile(file);
      setPendingReview(review);
      setPendingPhotoSource(source);
      setDirty(true);
    } catch (error) {
      toast({ variant: "destructive", title: t.pPhotoError, description: error instanceof Error ? error.message : "Intenta nuevamente con otra fotografía." });
    } finally {
      setProcessingPhoto(null);
    }
  };

  const handlePhotoCapture = async (key: string, file: File) => preparePhoto(key, file, "upload");

  const handleCameraCapture = async (key: string, dataUrl: string) => {
    try {
      await preparePhoto(key, await dataUrlToFile(dataUrl, `camera-${key}.jpg`), "camera");
    } catch {
      toast({ variant: "destructive", title: t.pPhotoError, description: "Intenta nuevamente." });
    }
  };

  // "Usar esta foto": accept the pending capture, auto-save, and advance to the next missing photo
  const handleAcceptPhoto = async (key: string) => {
    if (!pendingPhoto || !pendingPhotoFile || !patientToken) return;
    setProcessingPhoto(key);
    try {
      const contentType = pendingPhotoFile.type || "image/jpeg";
      const upload = await fetch(`/api/patients/${encodeURIComponent(patientToken)}/photos`, {
        method: "POST",
        headers: {
          "Content-Type": contentType,
          "x-photo-key": key,
          "x-photo-source": pendingPhotoSource,
          ...(pendingReview ? {
            "x-photo-width": String(pendingReview.width),
            "x-photo-height": String(pendingReview.height),
            "x-photo-metadata": JSON.stringify({ technicalReview: {
              width: pendingReview.width, height: pendingReview.height, sizeBytes: pendingReview.sizeBytes,
              mimeType: pendingReview.mimeType, orientation: pendingReview.orientation, aspectRatio: pendingReview.aspectRatio,
              brightness: pendingReview.brightness, contrast: pendingReview.contrast, sharpness: pendingReview.sharpness,
              warningCodes: pendingReview.warningCodes,
            } }),
          } : {}),
        },
        body: pendingPhotoFile,
      });
      if (!upload.ok) throw new Error("Upload failed");
      const uploaded = await upload.json() as { id: string; key: string };
      const confirmation = await fetch(`/api/patients/${encodeURIComponent(patientToken)}/photos/${encodeURIComponent(uploaded.id)}/confirm`, {
        method: "POST",
      });
      if (!confirmation.ok) throw new Error("Confirmation failed");
    } catch {
      toast({ variant: "destructive", title: t.pPhotoError, description: t.pSaveError });
      return;
    } finally {
      setProcessingPhoto(null);
    }
    const next = { ...photos, [key]: pendingPhoto };
    setPhotos(next);
    setPendingPhoto(null);
    setPendingPhotoFile(null);
    setPendingReview(null);
    setSavedKeys(prev => new Set([...prev, key]));
    setServerPhotoStates(prev => ({ ...prev, [key]: { status: "confirmed", review: pendingReview ? { warningCodes: pendingReview.warningCodes } : undefined, hasAdjusted: false } }));
    saveDraft();
    const nextMissing = PHOTO_REQUIREMENTS.findIndex(r => !next[r.key] && !savedKeys.has(r.key));
    if (nextMissing !== -1) setCurrentPhotoIndex(nextMissing);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // "Repetir" an already-accepted photo: only jumps to that photo, nothing else is cleared
  const handleRetakeAccepted = (index: number) => {
    clearPendingPreview();
    setCurrentPhotoIndex(index);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // "Volver": one step back without clearing photos, personal data, or consent
  const handlePhotoBack = () => {
    clearPendingPreview();
    if (currentPhotoIndex > 0) {
      setCurrentPhotoIndex(i => i - 1);
    } else {
      setStep("data");
    }
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const continueToPhotos = () => {
    setStep("photos");
    const firstMissing = PHOTO_REQUIREMENTS.findIndex(r => !isPhotoDone(r.key));
    setCurrentPhotoIndex(firstMissing === -1 ? 0 : firstMissing);
    if (patientToken) saveDraft();
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const handleDataSubmit = (data: PatientFormValues) => {
    if (patientToken) {
      continueToPhotos();
      return;
    }
    setDuplicateError(false);
    createMutation.mutate({ data }, {
      onSuccess: (result) => {
        const newToken = result.lead.token;
        setPatientToken(newToken);
        window.history.replaceState({}, "", `/patient?token=${encodeURIComponent(newToken)}`);
        setStep("photos");
        setCurrentPhotoIndex(0);
        window.scrollTo({ top: 0, behavior: "smooth" });
      },
      onError: (error: unknown) => {
        const err = error as { status?: number; data?: { duplicate?: boolean } };
        if (err?.status === 409 || err?.data?.duplicate) {
          setDuplicateError(true);
          return;
        }
        toast({ variant: "destructive", title: "Error", description: t.pSaveError });
      },
    });
  };

  const handleResume = () => {
    setResumeOffer(false);
    setStep("photos");
    const firstMissing = PHOTO_REQUIREMENTS.findIndex(r => !isPhotoDone(r.key));
    setCurrentPhotoIndex(firstMissing === -1 ? 0 : firstMissing);
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  // ---- Exit / discard protection ----
  // beforeunload only when there are unsaved local changes
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  // Intercept browser back during the photo step with the exit dialog
  useEffect(() => {
    if (step !== "photos") return;
    window.history.pushState({ photoGuard: true }, "");
    const onPop = () => {
      window.history.pushState({ photoGuard: true }, "");
      setExitDialog("open");
    };
    window.addEventListener("popstate", onPop);
    return () => window.removeEventListener("popstate", onPop);
  }, [step]);

  const handleExitKeepProgress = () => {
    setExitDialog("closed");
    if (patientToken && dirty) saveDraft();
    setDirty(false);
    navigate("/");
  };

  const clearLocalDraft = () => {
    Object.values(photos).forEach(url => { if (url.startsWith("blob:")) URL.revokeObjectURL(url); });
    setPhotos({});
    clearPendingPreview();
    setSavedKeys(new Set());
    setServerPhotoStates({});
    setCurrentPhotoIndex(0);
    setDirty(false);
  };

  // Invalidate queued/in-flight saves, wait for them to settle, then remove
  // the server-side draft photos unconditionally (any token may have a draft:
  // a save could still be in flight when React state says otherwise).
  const discardServerDraft = async (): Promise<boolean> => {
    if (!patientToken) return true;
    saveGenRef.current += 1; // queued saves become no-ops
    await saveChainRef.current; // in-flight save settles before we delete
    try {
      await discardMutation.mutateAsync({ token: patientToken });
      return true;
    } catch {
      toast({ variant: "destructive", title: "Error", description: t.pSaveError });
      return false;
    }
  };

  // "Descartar preevaluación": remove the sensitive photos from the server draft
  // (token-authorized DELETE) before leaving, so nothing is offered for resume later.
  const handleDiscard = async () => {
    const ok = await discardServerDraft();
    if (!ok) return; // keep the dialog open so the patient can retry
    setExitDialog("closed");
    clearLocalDraft();
    form.reset();
    navigate("/");
  };

  // "Empezar desde el principio": also resets the server draft photos so the
  // patient truly starts over (personal data stays editable in the form).
  const handleRestart = async () => {
    const ok = await discardServerDraft();
    if (!ok) return;
    clearLocalDraft();
    setResumeOffer(false);
    setStep("data");
  };

  const submitFullForm = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast({ variant: "destructive", title: t.pDataError, description: "Revisa el formulario antes de enviar." });
      setStep("data");
      return;
    }
    const formData = form.getValues();
    if (patientToken) {
      updateMutation.mutate({ token: patientToken, data: { ...formData, submit: true } }, {
        onSuccess: (result) => {
          if (result.lead.status !== "listo") {
            toast({ variant: "destructive", title: "Faltan fotografías", description: "Guarda las cinco vistas obligatorias antes de enviar." });
            return;
          }
          setStep("success"); window.scrollTo({ top: 0, behavior: "smooth" });
        },
        onError: () => toast({ variant: "destructive", title: "Error", description: t.pSaveError }),
      });
    } else {
      setDuplicateError(false);
      createMutation.mutate({ data: formData }, {
        onSuccess: () => { setStep("success"); window.scrollTo({ top: 0, behavior: "smooth" }); },
        onError: (error: unknown) => {
          const err = error as { status?: number; data?: { duplicate?: boolean } };
          if (err?.status === 409 || err?.data?.duplicate) { setDuplicateError(true); return; }
          toast({ variant: "destructive", title: "Error", description: t.pSaveError });
        },
      });
    }
  };

  const completedPhotos = PHOTO_REQUIREMENTS.filter(r => isPhotoDone(r.key)).length;
  const isPending = createMutation.isPending || updateMutation.isPending;
  const activeReq = PHOTO_REQUIREMENTS[currentPhotoIndex];

  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-[#F5F2EE] flex items-center justify-center">
        <div className="text-muted-foreground font-medium flex items-center gap-3 bg-white px-6 py-4 rounded-full shadow-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          {t.loading}
        </div>
      </div>
    );
  }

  // Invalid / expired invitation token — show clear error instead of the default flow
  if (token && isTokenError) {
    return (
      <div className="min-h-[100dvh] bg-[#F5F2EE] flex items-center justify-center p-4 font-sans">
        <div className="bg-white rounded-[2.5rem] shadow-sm max-w-md w-full overflow-hidden animate-in fade-in slide-in-from-bottom-8 duration-500">
          <div className="h-1.5 bg-gradient-to-r from-red-400 to-amber-400" />
          <div className="p-8 md:p-10 text-center">
            <div className="w-20 h-20 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-6">
              <AlertCircle className="w-10 h-10 text-red-500" />
            </div>
            <h1 className="text-2xl font-extrabold text-foreground mb-3 tracking-tight">
              Este enlace no es válido o ha expirado
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed text-base">
              El enlace de invitación que usaste ya no está disponible. Por favor contacta al centro para solicitar un nuevo enlace de pre-evaluación.
            </p>
            <p className="text-sm text-muted-foreground mb-6 bg-[#F5F2EE] border border-[#E8E4DE] rounded-2xl p-4 leading-relaxed">
              Escríbenos por WhatsApp o responde al mensaje donde recibiste este enlace y te enviaremos uno nuevo.
            </p>
            <div className="space-y-3">
              <Link href="/">
                <span className="w-full h-14 inline-flex items-center justify-center text-base font-semibold rounded-full bg-[#F5F2EE] border border-[#E8E4DE] text-foreground hover:bg-[#EDE9E4] transition-colors cursor-pointer">
                  Ir al inicio
                </span>
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] flex flex-col font-sans" dir={lang === "ar" ? "rtl" : "ltr"}>
      {/* Header */}
      <header className="bg-white px-5 py-4 shadow-sm border-b border-[#E8E4DE] flex items-center justify-between sticky top-0 z-40">
        <Link href="/">
          <div className="flex items-center gap-2.5 cursor-pointer group">
            <div className="w-9 h-9 rounded-full bg-primary flex items-center justify-center group-hover:scale-105 transition-transform shadow-sm shadow-primary/20">
              <Activity className="w-5 h-5 text-white" />
            </div>
            <span className="text-xl font-bold text-foreground tracking-tight">Clinivista</span>
          </div>
        </Link>

        {/* Language selector */}
        <div className="relative">
          <button
            onClick={() => setLangOpen(v => !v)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-[#E8E4DE] text-sm font-medium text-gray-600 hover:bg-[#F5F2EE] transition-colors"
          >
            <span>{currentLang.flag}</span>
            <ChevronDown className={`w-3.5 h-3.5 transition-transform ${langOpen ? "rotate-180" : ""}`} />
          </button>
          {langOpen && (
            <div className="absolute right-0 mt-2 w-44 bg-white rounded-3xl shadow-xl border border-[#E8E4DE] overflow-hidden z-50 animate-in fade-in slide-in-from-top-2 duration-150">
              {LANGS.map(l => (
                <button key={l.code} onClick={() => { setLang(l.code as LangCode); setLangOpen(false); }}
                  className={`w-full flex items-center gap-2.5 px-4 py-2.5 text-sm hover:bg-[#F5F2EE] text-left transition-colors ${lang === l.code ? "text-primary font-semibold bg-primary/5" : "text-gray-700"}`}>
                  <span className="text-base">{l.flag}</span>
                  <span>{l.name}</span>
                  {lang === l.code && <Check className="w-3.5 h-3.5 ml-auto text-primary" />}
                </button>
              ))}
            </div>
          )}
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 pb-32">
        {/* Step indicator */}
        {step !== "success" && (
          <div className="mb-10 flex items-center gap-2 text-sm font-semibold justify-center">
            {(["intro", "data", "photos"] as const).map((s, i) => {
              const labels = [t.stepIntro, t.stepData, t.stepPhotos];
              const stepIndex = ["intro", "data", "photos"].indexOf(step);
              const isActive = s === step;
              const isDone = i < stepIndex;
              return (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  <span className={`flex items-center gap-1.5 px-4 py-2 rounded-full transition-all ${isActive ? "bg-primary text-white shadow-sm shadow-primary/20" : isDone ? "bg-primary/10 text-primary" : "bg-white text-muted-foreground border border-[#E8E4DE]"}`}>
                    {isDone && <Check className="w-3.5 h-3.5" />}
                    {labels[i]}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* ── Resume offer (saved draft found for this token) ── */}
        {step === "intro" && resumeOffer && (
          <div className="mb-6 bg-white rounded-[2rem] overflow-hidden shadow-md ring-2 ring-primary/20 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="h-1 bg-gradient-to-r from-primary to-primary/30" />
            <div className="p-6 md:p-8">
              <div className="flex items-start gap-4">
                <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                  <CheckCircle2 className="w-6 h-6 text-primary" />
                </div>
                <div className="flex-1">
                  <h3 className="font-extrabold text-foreground text-lg mb-1">{t.pResumeTitle}</h3>
                  <p className="text-sm text-muted-foreground mb-4 leading-relaxed">
                    {t.pResumeDesc} ({completedPhotos}/5)
                  </p>
                  <div className="flex gap-2.5 flex-wrap">
                    <Button onClick={handleResume} className="rounded-full font-bold bg-primary hover:bg-primary/90 text-white px-5">
                      {t.pResumeCTA}
                      <ChevronRight className="w-4 h-4 ml-1.5" />
                    </Button>
                    <Button variant="outline" disabled={discardMutation.isPending} onClick={handleRestart} className="rounded-full font-semibold border-[#E8E4DE] hover:bg-[#F5F2EE] bg-white">
                      {t.pResumeRestart}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: INTRO ── */}
        {step === "intro" && (
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="h-1.5 bg-gradient-to-r from-primary via-[#4F9CF9] to-[#A78BFA]" />
            <div className="p-8 md:p-12 text-center">
              <div className="inline-flex items-center justify-center gap-2 px-5 py-2 bg-primary/8 text-primary rounded-full text-sm font-bold mb-8 border border-primary/15">
                <Timer className="w-4 h-4" />
                {t.pEstimate}
              </div>

              <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
                <ShieldCheck className="w-10 h-10 text-primary" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">{t.pIntroTitle}</h1>
              <p className="text-muted-foreground mb-10 leading-relaxed max-w-md mx-auto text-base">{t.pIntroDesc}</p>

              <div className="space-y-3 mb-10 text-left">
                {[
                  { icon: "01", label: t.pStep1Label, detail: t.pStep1Detail, color: "#00A9A5", bg: "bg-[#00A9A5]/8" },
                  { icon: "02", label: t.pStep2Label, detail: t.pStep2Detail, color: "#4F9CF9", bg: "bg-[#4F9CF9]/8" },
                  { icon: "03", label: t.pStep3Label, detail: t.pStep3Detail, color: "#A78BFA", bg: "bg-[#A78BFA]/8" },
                ].map(item => (
                  <div key={item.icon} className="flex items-center gap-4 p-4 bg-[#F5F2EE] rounded-2xl">
                    <div className={`w-10 h-10 rounded-full flex items-center justify-center font-black text-sm shrink-0 ${item.bg}`} style={{ color: item.color }}>{item.icon}</div>
                    <div>
                      <div className="font-bold text-foreground">{item.label}</div>
                      <div className="text-sm text-muted-foreground">{item.detail}</div>
                    </div>
                  </div>
                ))}
              </div>

              <p className="text-xs text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto bg-amber-50/80 border border-amber-100 p-4 rounded-2xl text-left">
                {t.pDisclaimer}
              </p>

              <Button onClick={() => { setStep("data"); window.scrollTo({ top: 0, behavior: "smooth" }); }}
                className="w-full h-14 text-base font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group">
                {t.pBeginCTA}
                <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
              </Button>
            </div>
          </div>
        )}

        {/* ── STEP: DATA ── */}
        {step === "data" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-6 flex items-center gap-3">
              <button onClick={() => setStep("intro")} className="w-10 h-10 rounded-full bg-white border border-[#E8E4DE] flex items-center justify-center hover:bg-[#F5F2EE] transition-colors text-muted-foreground hover:text-foreground shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t.pDataTitle}</h2>
                <p className="text-sm text-muted-foreground font-medium">{t.pDataSub}</p>
              </div>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDataSubmit)} className="space-y-5">
                {/* Personal data */}
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="h-1 bg-gradient-to-r from-[#00A9A5] to-[#00A9A5]/30" />
                  <div className="p-6 md:p-8 space-y-5">
                    <h3 className="font-bold text-foreground text-sm uppercase tracking-wider text-[#00A9A5]">{t.pDataTitle}</h3>

                    <FormField control={form.control} name="name" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pFullName}</FormLabel>
                        <FormControl><Input placeholder="María García" className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="documentId" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pDocId}</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="12.345.678-5"
                            inputMode="text"
                            autoComplete="off"
                            maxLength={12}
                            className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base"
                            name={field.name}
                            ref={field.ref}
                            value={field.value}
                            onChange={e => field.onChange(formatRut(e.target.value))}
                            onBlur={() => { field.onBlur(); void form.trigger("documentId"); }}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    {/* Phone with prefix */}
                    <FormField control={form.control} name="phone" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pPhone}</FormLabel>
                        <div className="flex gap-2">
                          <div className="relative">
                            <button type="button" onClick={() => setPhonePrefixOpen(v => !v)}
                              className="h-12 px-3 rounded-2xl border border-[#E8E4DE] bg-[#F5F2EE] flex items-center gap-1.5 text-sm font-semibold hover:bg-[#EDE9E4] transition-colors min-w-[90px]">
                              <span>{COUNTRY_PREFIXES.find(c => c.prefix === phonePrefix)?.flag}</span>
                              <span>{phonePrefix}</span>
                              <ChevronDown className={`w-3.5 h-3.5 text-muted-foreground transition-transform ${phonePrefixOpen ? "rotate-180" : ""}`} />
                            </button>
                            {phonePrefixOpen && (
                              <div className="absolute top-full left-0 mt-1 w-60 bg-white border border-[#E8E4DE] rounded-2xl shadow-xl z-50 max-h-64 overflow-y-auto animate-in fade-in">
                                {COUNTRY_PREFIXES.map(c => (
                                  <button key={c.code} type="button"
                                    onClick={() => { setPhonePrefix(c.prefix); setPhonePrefixOpen(false); }}
                                    className={`w-full flex items-center gap-3 px-4 py-2.5 text-sm hover:bg-[#F5F2EE] text-left ${phonePrefix === c.prefix ? "font-bold text-primary" : "text-foreground"}`}>
                                    <span>{c.flag}</span>
                                    <span className="text-muted-foreground">{c.prefix}</span>
                                    <span>{c.name}</span>
                                  </button>
                                ))}
                              </div>
                            )}
                          </div>
                          <FormControl>
                            <Input
                              placeholder="9 1234 5678"
                              className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base flex-1"
                              {...field}
                              onChange={e => field.onChange(phonePrefix + " " + e.target.value.replace(/^\+\d+\s?/, ""))}
                              value={field.value.replace(phonePrefix + " ", "").replace(phonePrefix, "")}
                            />
                          </FormControl>
                        </div>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="email" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pEmail}</FormLabel>
                        <FormControl><Input type="email" placeholder="correo@ejemplo.com" className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base" {...field} /></FormControl>
                        <FormMessage />
                      </FormItem>
                    )} />

                    <div className="grid grid-cols-2 gap-4">
                      <FormField control={form.control} name="age" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold">{t.pAge} <span className="font-normal text-muted-foreground">{t.optional}</span></FormLabel>
                          <FormControl><Input type="number" min="18" max="99" placeholder={t.pAgePlaceholder} className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base" {...field} /></FormControl>
                          <FormMessage />
                        </FormItem>
                      )} />

                      <FormField control={form.control} name="city" render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold">{t.pCity}</FormLabel>
                          <Select onValueChange={field.onChange} value={field.value || ""}>
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base">
                                <SelectValue placeholder={t.pCityPlaceholder} />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-2xl">
                              {CITY_OPTIONS.map(c => <SelectItem key={c} value={c}>{c}</SelectItem>)}
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )} />
                    </div>
                  </div>
                </div>

                {/* Hair history */}
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="h-1 bg-gradient-to-r from-[#4F9CF9] to-[#4F9CF9]/30" />
                  <div className="p-6 md:p-8 space-y-5">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-[#4F9CF9]">{t.pHairHistory}</h3>

                    <FormField control={form.control} name="hairLossTime" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pHairLossTime}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base">
                              <SelectValue placeholder={t.pSelectOpt} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl">
                            {t.pHairLossOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="pattern" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pPattern}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base">
                              <SelectValue placeholder={t.pSelectZone} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl">
                            {t.pPatternOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="previousTreatment" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pPrevTreatment}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base">
                              <SelectValue placeholder={t.pSelectOpt} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl">
                            {t.pPrevTreatOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="symptoms" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pSymptoms}</FormLabel>
                        <FormControl><Textarea placeholder={t.pSymptomsPlaceholder} className="rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base min-h-[80px] resize-none" {...field} /></FormControl>
                      </FormItem>
                    )} />

                    <FormField control={form.control} name="surgeryHistory" render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold">{t.pSurgery}</FormLabel>
                        <Select onValueChange={field.onChange} value={field.value || ""}>
                          <FormControl>
                            <SelectTrigger className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base">
                              <SelectValue placeholder={t.pSelectOpt} />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent className="rounded-2xl">
                            {t.pSurgeryOpts.map(o => <SelectItem key={o} value={o}>{o}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {/* Consent */}
                <div className="bg-white rounded-[2rem] overflow-hidden shadow-sm">
                  <div className="h-1 bg-gradient-to-r from-[#A78BFA] to-[#A78BFA]/30" />
                  <div className="p-6 md:p-8 space-y-4">
                    <h3 className="font-bold text-sm uppercase tracking-wider text-[#A78BFA]">{t.pConsentTitle}</h3>
                    <ul className="space-y-2.5 text-sm text-muted-foreground">
                      <li className="flex items-start gap-2.5 bg-[#F5F2EE] rounded-2xl p-3.5">
                        <Check className="w-4 h-4 text-[#A78BFA] mt-0.5 shrink-0" />{t.pConsentLine1}
                      </li>
                      <li className="flex items-start gap-2.5 bg-[#F5F2EE] rounded-2xl p-3.5">
                        <Check className="w-4 h-4 text-[#A78BFA] mt-0.5 shrink-0" />{t.pConsentLine2}
                      </li>
                    </ul>
                    <FormField control={form.control} name="consent" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 bg-primary/5 border border-primary/15 p-4 rounded-2xl">
                          <FormControl><Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-0.5 border-primary data-[state=checked]:bg-primary" /></FormControl>
                          <div className="space-y-1">
                            <FormLabel className="text-sm font-medium text-foreground leading-snug cursor-pointer">
                              {t.pConsentCheckbox}
                            </FormLabel>
                            <FormMessage />
                          </div>
                        </div>
                      </FormItem>
                    )} />
                    <FormField control={form.control} name="marketingConsent" render={({ field }) => (
                      <FormItem>
                        <div className="flex items-start gap-3 bg-[#F5F2EE] border border-[#E8E4DE] p-4 rounded-2xl">
                          <FormControl><Checkbox checked={!!field.value} onCheckedChange={field.onChange} className="mt-0.5" /></FormControl>
                          <FormLabel className="text-sm font-medium text-muted-foreground leading-snug cursor-pointer">
                            {t.pConsentMarketing}
                          </FormLabel>
                        </div>
                      </FormItem>
                    )} />
                  </div>
                </div>

                {duplicateError && (
                  <Alert variant="destructive" className="rounded-2xl">
                    <AlertCircle className="h-4 w-4" />
                    <AlertDescription>{t.pDuplicate}</AlertDescription>
                  </Alert>
                )}

                <Button
                  type="submit"
                  disabled={!canContinue}
                  aria-disabled={!canContinue}
                  className="w-full h-14 text-base font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group disabled:opacity-50"
                >
                  {t.pContinueCTA}
                  <ChevronRight className="w-5 h-5 ml-2 group-hover:translate-x-1 transition-transform" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* ── STEP: PHOTOS ── */}
        {step === "photos" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="mb-6 flex items-start gap-3">
              <button
                onClick={handlePhotoBack}
                className="h-10 px-4 rounded-full bg-white border border-[#E8E4DE] flex items-center gap-2 justify-center hover:bg-[#F5F2EE] transition-colors text-muted-foreground hover:text-foreground shrink-0 mt-1 shadow-sm text-sm font-semibold"
              >
                <ArrowLeft className="w-4 h-4" />
                {t.pBack}
              </button>
              <div className="flex-1">
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t.pPhotosTitle}</h2>
                <p className="text-sm text-muted-foreground font-medium">{t.pPhotosSub}</p>
              </div>
              <button
                onClick={() => setExitDialog("open")}
                className="h-10 px-4 rounded-full bg-white border border-[#E8E4DE] flex items-center justify-center hover:bg-[#F5F2EE] transition-colors text-muted-foreground hover:text-foreground shrink-0 mt-1 shadow-sm text-sm font-semibold"
              >
                {t.pExit}
              </button>
            </div>

            {/* Progress card — "Foto X de 5" */}
            <div className="mb-6 bg-white rounded-[1.75rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-foreground">
                  {t.pPhotoOf.replace("{n}", String(currentPhotoIndex + 1)).replace("{total}", "5")}
                </span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${completedPhotos === 5 ? "bg-primary/10 text-primary" : "bg-[#F5F2EE] text-muted-foreground"}`}>{completedPhotos}/5</span>
              </div>
              <div className="flex gap-2">
                {PHOTO_REQUIREMENTS.map((req, i) => (
                  <button
                    key={req.key}
                    type="button"
                    onClick={() => handleRetakeAccepted(i)}
                    aria-label={req.title}
                    className={`flex-1 h-3 rounded-full transition-all duration-500 ${isPhotoDone(req.key) ? "bg-primary shadow-sm shadow-primary/30" : i === currentPhotoIndex ? "bg-primary/40" : "bg-[#E8E4DE]"}`}
                  />
                ))}
              </div>
              {completedPhotos === 5 && (
                <div className="mt-3 flex items-center gap-2 text-primary text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Todas las fotografías completadas!</span>
                </div>
              )}
            </div>

            {/* Active photo card */}
            <ActivePhotoCard
              key={activeReq.key}
              view={activeReq}
              index={currentPhotoIndex}
              total={5}
              pendingDataUrl={pendingPhoto}
              pendingReview={pendingReview}
              acceptedDataUrl={photos[activeReq.key]}
              savedOnServer={savedKeys.has(activeReq.key)}
              serverState={serverPhotoStates[activeReq.key]}
              onFileSelected={handlePhotoCapture}
              onCameraCaptured={handleCameraCapture}
              onAccept={handleAcceptPhoto}
              onRetake={clearPendingPreview}
              isProcessing={processingPhoto === activeReq.key}
              photoOfLabel={t.pPhotoOf.replace("{n}", String(currentPhotoIndex + 1)).replace("{total}", "5")}
            />

            {/* Accepted photo thumbnails */}
            {completedPhotos > 0 && (
              <div className="mt-6 grid grid-cols-2 sm:grid-cols-3 gap-3">
                {PHOTO_REQUIREMENTS.map((req, i) => {
                  if (!isPhotoDone(req.key) || i === currentPhotoIndex) return null;
                  return (
                    <div key={req.key} className="bg-white rounded-2xl overflow-hidden shadow-sm border border-[#E8E4DE]">
                      {photos[req.key] ? (
                        <img src={photos[req.key]} alt={req.title} className="w-full h-24 object-cover" />
                      ) : (
                        <div className="w-full h-24 bg-primary/5 flex items-center justify-center text-primary">
                          <CheckCircle2 className="w-7 h-7" />
                        </div>
                      )}
                      <div className="p-2.5 flex items-center justify-between gap-2">
                        <span className="text-[11px] font-bold text-foreground truncate">{req.title} <span className="text-primary">{serverPhotoStates[req.key]?.review?.warningCodes?.length ? "· revisar" : "· lista"}</span></span>
                        <button
                          type="button"
                          onClick={() => handleRetakeAccepted(i)}
                          className="text-[11px] font-semibold text-primary hover:underline shrink-0"
                        >
                          {t.pRepeatPhoto}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {duplicateError && (
              <Alert variant="destructive" className="mt-6 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t.pDuplicate}</AlertDescription>
              </Alert>
            )}

            <div className="mt-8">
              <Button
                onClick={submitFullForm}
                disabled={isPending || completedPhotos < PHOTO_REQUIREMENTS.filter(photo => photo.required).length}
                className={`w-full h-16 text-lg font-bold rounded-full shadow-xl group transition-all ${completedPhotos === 5 ? "bg-primary hover:bg-primary/90 text-white shadow-primary/25" : "bg-primary/80 hover:bg-primary/70 text-white"}`}
              >
                {isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-3 animate-spin" />{t.pSending}</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5 mr-3" />{t.pSubmitCTA} ({completedPhotos}/5)</>
                )}
              </Button>
              {completedPhotos < PHOTO_REQUIREMENTS.filter(photo => photo.required).length && !isPending && (
                <p className="text-center text-xs text-muted-foreground mt-3 font-medium">
                  {completedPhotos}/5 {t.pCompleted.toLowerCase()}
                </p>
              )}
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === "success" && (
          <div className="bg-white rounded-[2.5rem] overflow-hidden shadow-sm animate-in fade-in zoom-in-95 duration-500">
            <div className="h-1.5 bg-gradient-to-r from-primary via-[#4F9CF9] to-[#A78BFA]" />
            <div className="p-8 md:p-12 text-center">
              <div className="w-24 h-24 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6 relative">
                <div className="absolute inset-0 bg-primary/20 rounded-full animate-ping opacity-30" />
                <CheckCircle2 className="w-12 h-12 text-primary relative z-10" />
              </div>

              <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">{t.pSuccessTitle}</h1>
              <p className="text-muted-foreground mb-10 leading-relaxed max-w-md mx-auto">{t.pSuccessDesc}</p>

              <div className="bg-[#F5F2EE] rounded-2xl p-6 text-left mb-8">
                <h3 className="font-bold text-foreground mb-4 text-base">{t.pSuccessNext}</h3>
                <div className="space-y-3">
                  {[t.pSuccessStep1, t.pSuccessStep2, t.pSuccessStep3].map((stepItem, i) => (
                    <div key={i} className="flex items-center gap-3 bg-white p-3.5 rounded-2xl">
                      <div className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <span className="text-primary font-bold text-sm">{i + 1}</span>
                      </div>
                      <span className="text-sm font-medium text-foreground">{stepItem}</span>
                    </div>
                  ))}
                </div>
              </div>

              <Link href="/">
                <Button variant="outline" className="w-full h-12 rounded-full font-semibold border-[#E8E4DE] hover:bg-[#F5F2EE] bg-white">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  {t.pGoHome}
                </Button>
              </Link>
            </div>
          </div>
        )}
      </main>

      {/* ── Exit / discard warning modal ── */}
      <AlertDialog open={exitDialog !== "closed"} onOpenChange={(open) => { if (!open) setExitDialog("closed"); }}>
        <AlertDialogContent className="rounded-3xl max-w-md">
          {exitDialog === "open" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.pExitTitle}</AlertDialogTitle>
                <AlertDialogDescription>{t.pExitDesc}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2.5 mt-2">
                <Button onClick={() => setExitDialog("closed")} className="w-full h-12 rounded-full font-bold bg-primary hover:bg-primary/90 text-white">
                  {t.pExitContinue}
                </Button>
                <Button variant="outline" onClick={handleExitKeepProgress} className="w-full h-12 rounded-full font-semibold border-[#E8E4DE] hover:bg-[#F5F2EE] bg-white">
                  {t.pExitSave}
                </Button>
                <Button variant="destructive" onClick={() => setExitDialog("confirmDiscard")} className="w-full h-12 rounded-full font-semibold">
                  {t.pExitDiscard}
                </Button>
              </div>
            </>
          )}
          {exitDialog === "confirmDiscard" && (
            <>
              <AlertDialogHeader>
                <AlertDialogTitle>{t.pExitDiscard}</AlertDialogTitle>
                <AlertDialogDescription>{t.pExitDiscardConfirm}</AlertDialogDescription>
              </AlertDialogHeader>
              <div className="flex flex-col gap-2.5 mt-2">
                <Button variant="destructive" disabled={discardMutation.isPending} onClick={handleDiscard} className="w-full h-12 rounded-full font-semibold">
                  {discardMutation.isPending ? t.pProcessing : t.pExitDiscard}
                </Button>
                <Button variant="outline" onClick={() => setExitDialog("open")} className="w-full h-12 rounded-full font-semibold border-[#E8E4DE] hover:bg-[#F5F2EE] bg-white">
                  {t.cancel}
                </Button>
              </div>
            </>
          )}
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
