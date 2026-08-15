import { useState, useEffect, useRef } from "react";
import { useSearch } from "wouter";
import {
  Camera,
  Check,
  CheckCircle2,
  ChevronRight,
  Info,
  ArrowLeft,
  ShieldCheck,
  Activity,
  ImagePlus,
  RefreshCw,
  Timer,
  ChevronDown,
  ChevronUp,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { CameraModal } from "@/components/camera-modal";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";
import {
  useGetPatient,
  getGetPatientQueryKey,
  useCreatePatient,
  useUpdatePatient,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

// ---------- Image compression ----------
function compressImage(src: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onerror = reject;
    img.onload = () => {
      const max = 1400;
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement("canvas");
      c.width = Math.round(img.width * scale);
      c.height = Math.round(img.height * scale);
      const ctx = c.getContext("2d");
      if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL("image/jpeg", 0.72));
    };
    img.src = src;
  });
}

function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
      if (typeof r.result === "string") {
        compressImage(r.result).then(resolve).catch(reject);
      }
    };
    r.readAsDataURL(file);
  });
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

// ---------- Zod schema ----------
const patientSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre completo"),
  documentId: z.string().min(1, "El documento de identidad es obligatorio"),
  email: z
    .string()
    .email("Ingresa un correo válido (ej. nombre@correo.com)")
    .min(1, "Ingresa tu correo electrónico"),
  phone: z
    .string()
    .min(6, "Ingresa un teléfono válido"),
  age: z
    .string()
    .optional()
    .refine(
      (v) => !v || (Number(v) >= 18 && Number(v) <= 99),
      "La edad debe estar entre 18 y 99 años"
    ),
  city: z.string().optional(),
  hairLossTime: z.string().optional(),
  pattern: z.string().optional(),
  previousTreatment: z.string().optional(),
  symptoms: z.string().optional(),
  surgeryHistory: z.string().optional(),
  consent: z
    .boolean()
    .refine((val) => val === true, "Debes aceptar para continuar"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ---------- Photo definitions ----------
const PHOTO_REQUIREMENTS = [
  {
    key: "frontal",
    title: "Vista frontal",
    description: "De frente, centrado, buena iluminación. Muestra la línea de nacimiento del cabello.",
    tip: "Mira directamente a la cámara con buena luz natural. Mantén el cabello despejado de la frente.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Face outline */}
        <ellipse cx="32" cy="26" rx="14" ry="16" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
        {/* Hair top */}
        <path d="M18 22 Q18 8 32 8 Q46 8 46 22" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
        {/* Eyes */}
        <circle cx="26" cy="24" r="2" fill="#3a2718"/>
        <circle cx="38" cy="24" r="2" fill="#3a2718"/>
        {/* Nose */}
        <path d="M32 28 Q30 32 32 33 Q34 32 32 28" stroke="#a87c5a" strokeWidth="1" fill="none"/>
        {/* Mouth */}
        <path d="M27 37 Q32 41 37 37" stroke="#a87c5a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
        {/* Camera arrow pointing at face */}
        <rect x="2" y="28" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
        <polygon points="12,23 12,38 20,31.5" fill="#4a90d9" opacity="0.9"/>
        <circle cx="7" cy="31.5" r="2" fill="white" opacity="0.7"/>
        {/* Shoulders */}
        <path d="M18 44 Q20 50 32 52 Q44 50 46 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        {/* Guide arrows */}
        <text x="32" y="62" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Frontal</text>
      </svg>
    ),
  },
  {
    key: "vertex",
    title: "Vértex / Coronilla",
    description: "Inclina levemente la cabeza hacia adelante. La cámara apunta hacia abajo.",
    tip: "Inclina la cabeza hacia abajo 45°. Pide a alguien que tome la foto desde arriba, apuntando a la coronilla.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Top-down view of head */}
        <ellipse cx="32" cy="36" rx="18" ry="20" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
        {/* Hair from top */}
        <ellipse cx="32" cy="34" rx="17" ry="18" fill="#4a3728"/>
        {/* Crown/vertex center highlight */}
        <circle cx="32" cy="32" r="6" fill="#6b4f3a" opacity="0.5"/>
        {/* Ears */}
        <ellipse cx="14" cy="38" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
        <ellipse cx="50" cy="38" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
        {/* Camera from top */}
        <rect x="25" y="2" width="14" height="9" rx="2" fill="#4a90d9" opacity="0.9"/>
        <circle cx="32" cy="6.5" r="2.5" fill="white" opacity="0.7"/>
        {/* Down arrow */}
        <line x1="32" y1="11" x2="32" y2="19" stroke="#4a90d9" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="28,18 32,24 36,18" fill="#4a90d9"/>
        <text x="32" y="62" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Vista desde arriba</text>
      </svg>
    ),
  },
  {
    key: "temporalRight",
    title: "Temporal derecha",
    description: "Gira levemente hacia la izquierda para mostrar la entrada derecha.",
    tip: "Gira la cabeza ~30° hacia tu izquierda. La cámara debe mostrar claramente la entrada del lado derecho.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Face profile left-ish angle */}
        <ellipse cx="34" cy="28" rx="13" ry="15" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
        {/* Hair */}
        <path d="M21 22 Q22 8 34 8 Q46 9 47 22 L46 28" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
        {/* Hairline right temple highlight */}
        <path d="M43 14 Q48 12 47 22" stroke="#6b4f3a" strokeWidth="2" fill="none"/>
        {/* Eye */}
        <circle cx="30" cy="26" r="2" fill="#3a2718"/>
        <circle cx="40" cy="25" r="1.5" fill="#3a2718"/>
        {/* Right temple zone highlight */}
        <path d="M43 14 Q50 18 48 28" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="2,2"/>
        {/* Camera arrow from left */}
        <rect x="2" y="26" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
        <polygon points="12,22 12,37 18,29.5" fill="#4a90d9" opacity="0.9"/>
        <circle cx="7" cy="29.5" r="2" fill="white" opacity="0.7"/>
        {/* Shoulders */}
        <path d="M21 44 Q26 50 34 51 Q42 50 47 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        <text x="32" y="62" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Entrada derecha</text>
      </svg>
    ),
  },
  {
    key: "temporalLeft",
    title: "Temporal izquierda",
    description: "Gira levemente hacia la derecha para mostrar la entrada izquierda.",
    tip: "Gira la cabeza ~30° hacia tu derecha. La cámara debe mostrar claramente la entrada del lado izquierdo.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Mirror of temporal right */}
        <ellipse cx="30" cy="28" rx="13" ry="15" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
        {/* Hair */}
        <path d="M43 22 Q42 8 30 8 Q18 9 17 22 L18 28" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
        {/* Hairline left temple highlight */}
        <path d="M21 14 Q16 12 17 22" stroke="#6b4f3a" strokeWidth="2" fill="none"/>
        {/* Eyes */}
        <circle cx="34" cy="26" r="2" fill="#3a2718"/>
        <circle cx="24" cy="25" r="1.5" fill="#3a2718"/>
        {/* Left temple zone highlight */}
        <path d="M21 14 Q14 18 16 28" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="2,2"/>
        {/* Camera arrow from right */}
        <rect x="52" y="26" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
        <polygon points="52,22 52,37 46,29.5" fill="#4a90d9" opacity="0.9"/>
        <circle cx="57" cy="29.5" r="2" fill="white" opacity="0.7"/>
        {/* Shoulders */}
        <path d="M43 44 Q38 50 30 51 Q22 50 17 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        <text x="32" y="62" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Entrada izquierda</text>
      </svg>
    ),
  },
  {
    key: "donor",
    title: "Zona donante",
    description: "Fotografía de la nuca / parte posterior de la cabeza.",
    tip: "Inclina la cabeza ligeramente hacia adelante. La cámara apunta a la nuca, mostrando la zona posterior completa.",
    icon: (
      <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
        {/* Back of head view */}
        <ellipse cx="32" cy="30" rx="18" ry="20" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
        {/* Hair covering most of head back */}
        <ellipse cx="32" cy="26" rx="17" ry="17" fill="#4a3728"/>
        {/* Nape - skin showing at bottom */}
        <path d="M16 40 Q18 48 32 50 Q46 48 48 40" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
        {/* Donor zone highlight */}
        <path d="M14 36 Q18 46 32 48 Q46 46 50 36" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="3,2"/>
        {/* Ears */}
        <ellipse cx="14" cy="32" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
        <ellipse cx="50" cy="32" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
        {/* Camera arrow from behind/above */}
        <rect x="25" y="2" width="14" height="9" rx="2" fill="#4a90d9" opacity="0.9"/>
        <circle cx="32" cy="6.5" r="2.5" fill="white" opacity="0.7"/>
        <line x1="32" y1="11" x2="32" y2="17" stroke="#4a90d9" strokeWidth="2" strokeLinecap="round"/>
        <polygon points="28,16 32,22 36,16" fill="#4a90d9"/>
        <text x="32" y="62" textAnchor="middle" fontSize="7" fill="#6b7280" fontFamily="sans-serif">Vista posterior/nuca</text>
      </svg>
    ),
  },
];

// ---------- PhotoCapture component ----------
interface PhotoCaptureProps {
  photoKey: string;
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
  index: number;
  dataUrl: string | undefined;
  onCapture: (key: string, file: File) => Promise<void>;
  onCameraCapture: (key: string, dataUrl: string) => Promise<void>;
  isProcessing: boolean;
}

function PhotoCapture({
  photoKey,
  title,
  description,
  tip,
  icon,
  index,
  dataUrl,
  onCapture,
  onCameraCapture,
  isProcessing,
}: PhotoCaptureProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onCapture(photoKey, file);
    e.target.value = "";
  };

  const handleOpenCamera = () => {
    setCameraError(null);
    setCameraOpen(true);
  };

  const handleCameraCapture = async (capturedDataUrl: string) => {
    setCameraOpen(false);
    await onCameraCapture(photoKey, capturedDataUrl);
  };

  const handleCameraClose = () => {
    setCameraOpen(false);
  };

  const hasPhoto = !!dataUrl;

  return (
    <>
      {cameraOpen && (
        <CameraModal
          title={title}
          onCapture={handleCameraCapture}
          onClose={handleCameraClose}
          onError={(msg) => setCameraError(msg)}
        />
      )}

      <div
        className={`relative group overflow-hidden border-2 rounded-2xl transition-all duration-300 ${
          hasPhoto
            ? "border-primary bg-primary/5 shadow-sm"
            : "border-gray-200 bg-white hover:border-gray-300"
        }`}
      >
        {/* Photo guide panel */}
        <div className="border-b border-gray-100 bg-gray-50/70">
          <button
            type="button"
            onClick={() => setGuideOpen((v) => !v)}
            className="w-full flex items-center justify-between px-5 py-3 text-left hover:bg-gray-100/60 transition-colors"
          >
            <span className="text-xs font-bold text-primary uppercase tracking-wider flex items-center gap-2">
              <Info className="w-3.5 h-3.5" />
              Guía de posición
            </span>
            {guideOpen ? (
              <ChevronUp className="w-4 h-4 text-muted-foreground" />
            ) : (
              <ChevronDown className="w-4 h-4 text-muted-foreground" />
            )}
          </button>
          {guideOpen && (
            <div className="flex items-center gap-4 px-5 pb-4">
              <div className="w-16 h-16 shrink-0">{icon}</div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{tip}</p>
            </div>
          )}
        </div>

        <div className="p-5">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            <div className="shrink-0 w-full sm:w-auto flex justify-center">
              {hasPhoto ? (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl overflow-hidden shadow-md ring-1 ring-black/5">
                  <img
                    src={dataUrl}
                    alt={title}
                    className="w-full h-full object-cover"
                  />
                </div>
              ) : (
                <div className="w-24 h-24 sm:w-28 sm:h-28 rounded-xl border border-dashed border-gray-300 bg-gray-50/50 flex flex-col items-center justify-center text-gray-400 group-hover:bg-gray-50 transition-colors">
                  <Camera className="w-8 h-8 mb-2" />
                  <span className="text-[10px] uppercase font-bold tracking-wider text-gray-400">Toma {index + 1}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 py-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-2 sm:mb-1.5 gap-2">
                <h3 className="font-bold text-foreground text-lg">{title}</h3>
                {hasPhoto && (
                  <div className="flex items-center gap-1.5 text-primary text-xs font-semibold bg-primary/10 px-2.5 py-1 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>Completada</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed sm:pr-2">
                {description}
              </p>

              {/* Camera error alert */}
              {cameraError && (
                <Alert variant="destructive" className="mb-4 text-left">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">
                    {cameraError}
                  </AlertDescription>
                </Alert>
              )}

              <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
                {/* Usar Cámara */}
                <button
                  type="button"
                  onClick={handleOpenCamera}
                  disabled={isProcessing}
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none
                    ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                    ${hasPhoto
                      ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-foreground"
                      : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                    }`}
                >
                  <Camera className="w-4 h-4" />
                  {hasPhoto ? "Retomar foto" : "Usar Cámara"}
                </button>

                {/* Subir Foto */}
                <label
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none
                    ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                    ${hasPhoto
                      ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-foreground"
                      : "bg-secondary text-foreground hover:bg-secondary/80 border border-transparent"
                    }`}
                >
                  <ImagePlus className="w-4 h-4" />
                  {hasPhoto ? "Cambiar archivo" : "Subir Foto"}
                  <input
                    ref={galleryRef}
                    type="file"
                    accept="image/*"
                    className="hidden"
                    onChange={handleFile}
                    disabled={isProcessing}
                  />
                </label>

                {isProcessing && (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    Procesando...
                  </span>
                )}
              </div>
            </div>
          </div>
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

  const [step, setStep] = useState<"intro" | "data" | "photos" | "success">("intro");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+56");
  const [phonePrefixOpen, setPhonePrefixOpen] = useState(false);
  const { toast } = useToast();

  const { data: existingData, isLoading: isLoadingExisting } = useGetPatient(
    token || "",
    {
      query: {
        enabled: !!token,
        queryKey: getGetPatientQueryKey(token || ""),
      },
    }
  );

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: {
      name: "",
      documentId: "",
      email: "",
      phone: "",
      age: "",
      city: "",
      hairLossTime: "",
      pattern: "",
      previousTreatment: "",
      symptoms: "",
      surgeryHistory: "",
      consent: false,
    },
  });

  useEffect(() => {
    if (existingData?.lead && step === "intro") {
      const l = existingData.lead;
      form.reset({
        name: l.name || "",
        documentId: (l as any).documentId || "",
        email: (l as any).email || "",
        phone: l.phone || "",
        age: l.age || "",
        city: l.city || "",
        hairLossTime: (l as any).hairLossTime || "",
        pattern: (l as any).pattern || "",
        previousTreatment: (l as any).previousTreatment || "",
        symptoms: (l as any).symptoms || "",
        surgeryHistory: (l as any).surgeryHistory || "",
        consent: l.consent || false,
      });
      setStep("data");
    }
  }, [existingData, step]); // eslint-disable-line react-hooks/exhaustive-deps

  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  const handlePhotoCapture = async (key: string, file: File) => {
    setProcessingPhoto(key);
    try {
      const compressed = await compress(file);
      setPhotos((prev) => ({ ...prev, [key]: compressed }));
    } catch {
      toast({
        variant: "destructive",
        title: "Error al procesar imagen",
        description: "Intenta nuevamente con otra fotografía.",
      });
    } finally {
      setProcessingPhoto(null);
    }
  };

  const handleCameraCapture = async (key: string, dataUrl: string) => {
    setProcessingPhoto(key);
    try {
      const compressed = await compressImage(dataUrl);
      setPhotos((prev) => ({ ...prev, [key]: compressed }));
    } catch {
      toast({
        variant: "destructive",
        title: "Error al procesar imagen",
        description: "Intenta nuevamente con otra fotografía.",
      });
    } finally {
      setProcessingPhoto(null);
    }
  };

  const handleDataSubmit = (_data: PatientFormValues) => {
    setStep("photos");
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  const submitFullForm = async () => {
    const valid = await form.trigger();
    if (!valid) {
      toast({
        variant: "destructive",
        title: "Datos incompletos",
        description: "Revisa el formulario antes de enviar.",
      });
      setStep("data");
      return;
    }

    const formData = form.getValues();
    const photoArray = PHOTO_REQUIREMENTS.map((req) => ({
      key: req.key,
      label: req.title,
      dataUrl: photos[req.key] ?? "",
      quality: "Control técnico pendiente",
    })).filter((p) => !!p.dataUrl);

    const payload = { ...formData, photos: photoArray };

    if (token) {
      updateMutation.mutate(
        { token, data: payload },
        {
          onSuccess: () => {
            setStep("success");
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
          onError: () =>
            toast({
              variant: "destructive",
              title: "Error al guardar",
              description: "No pudimos guardar tu información. Intenta nuevamente.",
            }),
        }
      );
    } else {
      setDuplicateError(false);
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            setStep("success");
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
          onError: (error: unknown) => {
            const err = error as { status?: number; data?: { duplicate?: boolean } };
            if (err?.status === 409 || err?.data?.duplicate) {
              setDuplicateError(true);
              return;
            }
            toast({
              variant: "destructive",
              title: "Error al enviar",
              description: "No pudimos enviar tu evaluación. Intenta nuevamente.",
            });
          },
        }
      );
    }
  };

  const completedPhotos = Object.keys(photos).length;
  const isPending = createMutation.isPending || updateMutation.isPending;

  if (isLoadingExisting) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-muted-foreground font-medium flex items-center gap-3 bg-white px-6 py-4 rounded-full shadow-sm">
          <RefreshCw className="w-5 h-5 animate-spin text-primary" />
          Cargando tu evaluación segura…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50/50 flex flex-col font-sans">
      {/* Premium Header */}
      <header className="bg-white px-6 py-4 shadow-sm border-b border-gray-100 flex items-center justify-center sticky top-0 z-40">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-[8px] bg-primary flex items-center justify-center">
            <Activity className="w-5 h-5 text-white" />
          </div>
          <span className="text-xl font-bold text-foreground tracking-tight">Clinivista</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-2xl mx-auto p-4 md:p-8 pb-32">
        {/* Step indicator */}
        {step !== "success" && (
          <div className="mb-10 flex items-center gap-2 text-sm font-semibold justify-center">
            {(["intro", "data", "photos"] as const).map((s, i) => {
              const labels = ["Inicio", "Datos", "Fotografías"];
              const stepIndex = ["intro", "data", "photos"].indexOf(step);
              const isActive = s === step;
              const isDone = i < stepIndex;
              return (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  <span
                    className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full transition-colors ${
                      isActive
                        ? "bg-primary/10 text-primary"
                        : isDone
                        ? "text-primary/60"
                        : "text-muted-foreground"
                    }`}
                  >
                    {isDone && <Check className="w-4 h-4" />}
                    {labels[i]}
                  </span>
                </span>
              );
            })}
          </div>
        )}

        {/* ── STEP: INTRO ── */}
        {step === "intro" && (
          <div className="bg-white rounded-[2rem] p-8 md:p-12 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-primary/10 text-primary rounded-full text-sm font-bold mb-8 border border-primary/20">
              <Timer className="w-4 h-4" />
              Tiempo estimado: 4–6 minutos
            </div>
            
            <div className="w-20 h-20 bg-primary/10 rounded-[1.25rem] flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-10 h-10 text-primary" />
            </div>
            <h1 className="text-3xl md:text-4xl font-extrabold text-foreground mb-4 tracking-tight">
              Preevaluación Clínica
            </h1>
            <p className="text-lg text-muted-foreground mb-10 leading-relaxed max-w-lg mx-auto">
              Este proceso nos permitirá conocer tu caso a detalle antes de la consulta presencial. Te pediremos tus datos y <strong className="text-foreground">5 fotografías precisas</strong> de tu cuero cabelludo.
            </p>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-10 text-left">
              {[
                { n: "1", label: "Datos personales", detail: "Antecedentes capilares básicos" },
                { n: "2", label: "Fotografías", detail: "5 tomas guiadas paso a paso" },
                { n: "3", label: "Análisis médico", detail: "Revisión clínica confidencial" },
              ].map((s) => (
                <div key={s.n} className="bg-gray-50/80 rounded-2xl p-5 border border-gray-100">
                  <span className="w-8 h-8 rounded-full bg-white shadow-sm flex items-center justify-center text-sm font-bold text-primary mb-3">
                    {s.n}
                  </span>
                  <p className="text-sm font-bold text-foreground mb-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground leading-relaxed">{s.detail}</p>
                </div>
              ))}
            </div>

            <div className="bg-secondary/60 text-foreground p-5 rounded-2xl text-left text-sm mb-10 flex gap-4 border border-primary/10">
              <Info className="w-6 h-6 flex-shrink-0 text-primary mt-0.5" />
              <p className="leading-relaxed font-medium text-blue-900/80">
                Esta preevaluación es estrictamente <strong className="text-blue-900 font-bold">confidencial</strong> y no reemplaza una consulta médica presencial. No entrega diagnósticos automáticos.
              </p>
            </div>

            <Button
              onClick={() => setStep("data")}
              className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]"
            >
              Comenzar Evaluación
              <ChevronRight className="w-5 h-5 ml-2" />
            </Button>
          </div>
        )}

        {/* ── STEP: DATA ── */}
        {step === "data" && (
          <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="flex items-center gap-4 mb-8 pb-6 border-b border-gray-100">
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
                aria-label="Volver"
              >
                <ArrowLeft className="w-6 h-6 text-foreground" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold text-foreground">Tus Antecedentes</h2>
                <p className="text-sm text-muted-foreground mt-1 font-medium">Completa esta información básica para tu ficha clínica</p>
              </div>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleDataSubmit)}
                className="space-y-6"
                noValidate
              >
                <div className="space-y-6">
                  <FormField
                    control={form.control}
                    name="name"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">Nombre completo *</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej. Juan Pérez"
                            autoComplete="name"
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="documentId"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">
                          Documento de identidad *
                        </FormLabel>
                        <FormControl>
                          <Input
                            placeholder="RUT, DNI o pasaporte"
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <FormField
                    control={form.control}
                    name="phone"
                    render={({ field }) => {
                      const currentCountry = COUNTRY_PREFIXES.find(c => c.prefix === phonePrefix) || COUNTRY_PREFIXES[0];
                      const rawNumber = field.value.startsWith(phonePrefix)
                        ? field.value.slice(phonePrefix.length)
                        : field.value.replace(/^\+\d{1,4}/, "");
                      return (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">Teléfono móvil (WhatsApp) *</FormLabel>
                          <FormControl>
                            <div className="flex relative">
                              {/* Country prefix selector */}
                              <div className="relative">
                                <button
                                  type="button"
                                  onClick={() => setPhonePrefixOpen(v => !v)}
                                  className="inline-flex items-center gap-2 h-12 px-3 rounded-l-xl border border-r-0 border-gray-200 bg-gray-100 hover:bg-gray-200 transition-colors text-sm font-semibold text-foreground select-none min-w-[90px]"
                                >
                                  <span>{currentCountry.flag}</span>
                                  <span>{phonePrefix}</span>
                                  <ChevronDown className="w-3.5 h-3.5 text-gray-500 ml-auto" />
                                </button>
                                {phonePrefixOpen && (
                                  <>
                                    <div className="fixed inset-0 z-40" onClick={() => setPhonePrefixOpen(false)} />
                                    <div className="absolute left-0 top-full mt-1 w-64 bg-white border border-gray-200 rounded-2xl shadow-2xl overflow-hidden z-50 animate-in fade-in zoom-in-95 duration-150">
                                      <div className="max-h-64 overflow-y-auto p-1.5 space-y-0.5">
                                        {COUNTRY_PREFIXES.map(c => (
                                          <button
                                            key={c.code}
                                            type="button"
                                            onClick={() => {
                                              setPhonePrefix(c.prefix);
                                              field.onChange(rawNumber ? `${c.prefix}${rawNumber}` : "");
                                              setPhonePrefixOpen(false);
                                            }}
                                            className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-colors text-left
                                              ${phonePrefix === c.prefix ? "bg-primary/10 text-primary font-bold" : "text-foreground hover:bg-gray-50"}`}
                                          >
                                            <span className="text-base">{c.flag}</span>
                                            <span className="flex-1 font-medium">{c.name}</span>
                                            <span className="text-muted-foreground font-semibold text-xs">{c.prefix}</span>
                                          </button>
                                        ))}
                                      </div>
                                    </div>
                                  </>
                                )}
                              </div>
                              <Input
                                type="tel"
                                placeholder="9 1234 5678"
                                autoComplete="tel-national"
                                inputMode="tel"
                                className="h-12 rounded-xl rounded-l-none bg-gray-50 border-gray-200 focus:bg-white text-base"
                                value={rawNumber}
                                onChange={(e) => {
                                  const digits = e.target.value.replace(/\D/g, "");
                                  field.onChange(digits ? `${phonePrefix}${digits}` : "");
                                }}
                                onBlur={field.onBlur}
                                name={field.name}
                                ref={field.ref}
                              />
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      );
                    }}
                  />

                  <FormField
                    control={form.control}
                    name="email"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">Correo electrónico *</FormLabel>
                        <FormControl>
                          <Input
                            type="email"
                            placeholder="ejemplo@correo.com"
                            autoComplete="email"
                            inputMode="email"
                            className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  <div className="grid grid-cols-2 gap-5">
                    <FormField
                      control={form.control}
                      name="age"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">Edad</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              placeholder="Años"
                              min={18}
                              max={99}
                              inputMode="numeric"
                              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <FormField
                      control={form.control}
                      name="city"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">Ciudad</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="Ej. Santiago"
                              autoComplete="address-level2"
                              className="h-12 rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                <div className="pt-8 mt-8 border-t border-gray-100">
                  <h3 className="text-lg font-bold text-foreground mb-6 flex items-center gap-2">
                    <Activity className="w-5 h-5 text-primary" />
                    Historial Capilar
                  </h3>

                  <div className="space-y-6">
                    <FormField
                      control={form.control}
                      name="hairLossTime"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">¿Hace cuánto notas la pérdida de cabello?</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 text-base">
                                <SelectValue placeholder="Selecciona una opción" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Menos de 6 meses">Menos de 6 meses</SelectItem>
                              <SelectItem value="6 meses a 1 año">6 meses a 1 año</SelectItem>
                              <SelectItem value="1 a 3 años">1 a 3 años</SelectItem>
                              <SelectItem value="Más de 3 años">Más de 3 años</SelectItem>
                              <SelectItem value="No estoy seguro">No estoy seguro</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="pattern"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">¿Dónde se concentra la pérdida?</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 text-base">
                                <SelectValue placeholder="Selecciona una zona" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Entradas / línea frontal">
                                Frente / entradas
                              </SelectItem>
                              <SelectItem value="Vértex o coronilla">
                                Coronilla (parte superior)
                              </SelectItem>
                              <SelectItem value="Zona frontal y vértex">
                                Frente y coronilla
                              </SelectItem>
                              <SelectItem value="Pérdida generalizada">
                                Todo el cuero cabelludo
                              </SelectItem>
                              <SelectItem value="Pérdida localizada / irregular">
                                Zonas irregulares o dispersas
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="previousTreatment"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">¿Has usado algún tratamiento para la caída?</FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 text-base">
                                <SelectValue placeholder="Selecciona una opción" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="Ninguno">Ninguno</SelectItem>
                              <SelectItem value="Minoxidil tópico">
                                Minoxidil tópico
                              </SelectItem>
                              <SelectItem value="Finasteride oral">
                                Finasteride oral
                              </SelectItem>
                              <SelectItem value="Minoxidil y Finasteride">
                                Minoxidil y Finasteride
                              </SelectItem>
                              <SelectItem value="Plasma rico en plaquetas (PRP)">
                                Plasma rico en plaquetas (PRP)
                              </SelectItem>
                              <SelectItem value="Otro tratamiento">Otro tratamiento</SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="symptoms"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">
                            ¿Tienes algún síntoma asociado?{" "}
                            <span className="text-muted-foreground font-normal">(opcional)</span>
                          </FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Ej. picazón, caspa, irritación..."
                              className="resize-none rounded-xl bg-gray-50 border-gray-200 focus:bg-white text-base p-4"
                              rows={3}
                              {...field}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="surgeryHistory"
                      render={({ field }) => (
                        <FormItem>
                          <FormLabel className="text-sm font-bold text-foreground">
                            ¿Has tenido alguna cirugía de trasplante antes?{" "}
                            <span className="text-muted-foreground font-normal">(opcional)</span>
                          </FormLabel>
                          <Select
                            onValueChange={field.onChange}
                            value={field.value}
                          >
                            <FormControl>
                              <SelectTrigger className="h-12 rounded-xl bg-gray-50 border-gray-200 text-base">
                                <SelectValue placeholder="Selecciona una opción" />
                              </SelectTrigger>
                            </FormControl>
                            <SelectContent className="rounded-xl">
                              <SelectItem value="No">No</SelectItem>
                              <SelectItem value="Sí, 1 cirugía previa">Sí, 1 cirugía previa</SelectItem>
                              <SelectItem value="Sí, 2 o más cirugías previas">
                                Sí, 2 o más cirugías previas
                              </SelectItem>
                            </SelectContent>
                          </Select>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Consent */}
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-4 bg-amber-50 p-6 rounded-[1.5rem] mt-8 border-2 border-amber-200">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-5 w-5 rounded shadow-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <div className="space-y-3 leading-none">
                        <FormLabel className="text-base font-bold text-foreground cursor-pointer flex items-center gap-2">
                          <ShieldCheck className="w-5 h-5 text-amber-600 shrink-0" />
                          Consentimiento y Privacidad
                        </FormLabel>
                        <ul className="text-sm text-amber-900/80 leading-relaxed font-medium space-y-2 list-disc pl-4">
                          <li>
                            Tus fotos y datos se transmiten de forma cifrada y son tratados con total confidencialidad.
                          </li>
                          <li>
                            Esta evaluación preliminar no constituye un diagnóstico ni reemplaza una consulta médica presencial.
                          </li>
                        </ul>
                      </div>
                    </FormItem>
                  )}
                />

                <div className="pt-6">
                  <Button type="submit" className="w-full h-14 text-lg font-bold rounded-2xl shadow-lg shadow-primary/20 transition-all hover:scale-[1.02]">
                    Continuar a Fotografías
                    <ChevronRight className="w-5 h-5 ml-2" />
                  </Button>
                </div>
              </form>
            </Form>
          </div>
        )}

        {/* ── STEP: PHOTOS ── */}
        {step === "photos" && (
          <div className="animate-in fade-in slide-in-from-bottom-8 duration-500">
            <div className="bg-white rounded-[2rem] p-6 md:p-10 shadow-sm border border-gray-100 mb-8">
              <div className="flex items-center gap-4 mb-6 pb-6 border-b border-gray-100">
                <button
                  type="button"
                  onClick={() => setStep("data")}
                  className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
                  aria-label="Volver"
                >
                  <ArrowLeft className="w-6 h-6 text-foreground" />
                </button>
                <div>
                  <h2 className="text-2xl font-extrabold text-foreground">Registro Fotográfico</h2>
                  <p className="text-sm text-muted-foreground mt-1 font-medium">Necesitamos 5 tomas para tu evaluación clínica</p>
                </div>
              </div>

              <div className="space-y-5">
                {PHOTO_REQUIREMENTS.map((req, i) => (
                  <PhotoCapture
                    key={req.key}
                    photoKey={req.key}
                    title={req.title}
                    description={req.description}
                    tip={req.tip}
                    icon={req.icon}
                    index={i}
                    dataUrl={photos[req.key]}
                    onCapture={handlePhotoCapture}
                    onCameraCapture={handleCameraCapture}
                    isProcessing={processingPhoto === req.key}
                  />
                ))}
              </div>
            </div>

            {/* Duplicate submission error */}
            {duplicateError && (
              <Alert variant="destructive" className="mb-24 bg-red-50 border-red-200">
                <AlertCircle className="h-5 w-5" />
                <AlertDescription className="text-sm leading-relaxed font-medium">
                  Ya existe una evaluación registrada con este teléfono o correo. Si necesitas ayuda, contáctanos directamente.
                </AlertDescription>
              </Alert>
            )}

            {/* Sticky Action Bar */}
            <div className="fixed bottom-0 left-0 w-full bg-white/80 backdrop-blur-xl border-t border-gray-200 p-4 md:p-6 z-30 shadow-[0_-10px_40px_rgba(0,0,0,0.05)]">
              <div className="max-w-2xl mx-auto flex items-center justify-between gap-4">
                <div className="flex-1">
                  <div className="text-sm font-bold text-foreground flex items-center gap-2 mb-1">
                    Progreso
                    <span className="text-primary">{completedPhotos}/5 completadas</span>
                  </div>
                  <div className="h-2.5 w-full bg-gray-100 rounded-full overflow-hidden">
                    <div
                      className="h-full bg-primary transition-all duration-500 rounded-full"
                      style={{ width: `${(completedPhotos / 5) * 100}%` }}
                    />
                  </div>
                </div>

                <Button
                  onClick={submitFullForm}
                  disabled={completedPhotos < 5 || isPending}
                  className="h-14 px-8 rounded-2xl text-base font-bold shadow-lg shadow-primary/20 shrink-0"
                >
                  {isPending ? "Enviando..." : "Enviar Evaluación"}
                  {!isPending && <CheckCircle2 className="w-5 h-5 ml-2" />}
                </Button>
              </div>
            </div>
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === "success" && (
          <div className="bg-white rounded-[2rem] p-10 md:p-14 shadow-sm border border-gray-100 text-center animate-in zoom-in-95 duration-500">
            <div className="w-24 h-24 bg-green-50 rounded-[1.5rem] flex items-center justify-center mx-auto mb-8 relative">
              <div className="absolute inset-0 bg-green-100 animate-ping rounded-[1.5rem] opacity-20"></div>
              <CheckCircle2 className="w-12 h-12 text-green-500 relative z-10" />
            </div>
            <h2 className="text-3xl font-extrabold text-foreground mb-4 tracking-tight">
              ¡Tu evaluación fue recibida!
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
              Nuestro equipo revisará tu información y fotografías. Recibirás una respuesta en un plazo máximo de{" "}
              <strong className="text-foreground">24 horas hábiles</strong>.
            </p>

            <div className="bg-gray-50 rounded-2xl p-6 mb-8 max-w-md mx-auto text-left space-y-4 border border-gray-100">
              <p className="text-sm font-bold text-foreground uppercase tracking-wider">¿Qué sigue ahora?</p>
              {[
                { icon: <Timer className="w-5 h-5 text-primary" />, text: "Revisión de tu caso (hasta 24 h hábiles)" },
                { icon: <Info className="w-5 h-5 text-primary" />, text: "Te contactaremos por WhatsApp o correo" },
                { icon: <CheckCircle2 className="w-5 h-5 text-primary" />, text: "Coordinamos tu consulta" },
              ].map((s, i) => (
                <div key={i} className="flex items-center gap-3">
                  <span className="w-9 h-9 rounded-full bg-white shadow-sm flex items-center justify-center shrink-0">
                    {s.icon}
                  </span>
                  <p className="text-sm font-medium text-foreground">{s.text}</p>
                </div>
              ))}
            </div>
            <Button
              variant="outline"
              onClick={() => window.location.href = "/"}
              className="h-14 px-8 rounded-2xl text-base font-bold border-gray-200 hover:bg-gray-50"
            >
              Volver al inicio
            </Button>
          </div>
        )}
      </main>
    </div>
  );
}
