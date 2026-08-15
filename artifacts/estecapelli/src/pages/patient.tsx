import { useState, useEffect, useRef } from "react";
import { useSearch, Link } from "wouter";
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
  useGetPatient, getGetPatientQueryKey, useCreatePatient, useUpdatePatient,
} from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";
import { useLanguage, LANGS, type AppTranslations, type LangCode } from "@/lib/language";

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
      if (typeof r.result === "string") compressImage(r.result).then(resolve).catch(reject);
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
  email: z.string().email("Ingresa un correo válido").min(1),
  phone: z.string().min(6, "Ingresa un teléfono válido"),
  age: z.string().optional().refine(v => !v || (Number(v) >= 18 && Number(v) <= 99), "La edad debe estar entre 18 y 99"),
  city: z.string().optional(),
  hairLossTime: z.string().optional(),
  pattern: z.string().optional(),
  previousTreatment: z.string().optional(),
  symptoms: z.string().optional(),
  surgeryHistory: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "Debes aceptar para continuar"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

// ---------- Photo definitions ----------
function getPhotoRequirements(t: AppTranslations) {
  return [
    {
      key: "frontal",
      title: t.photoFrontalTitle,
      description: t.photoFrontalDesc,
      tip: t.photoFrontalTip,
      color: "#00A9A5",
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <ellipse cx="32" cy="26" rx="14" ry="16" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
          <path d="M18 22 Q18 8 32 8 Q46 8 46 22" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
          <circle cx="26" cy="24" r="2" fill="#3a2718"/>
          <circle cx="38" cy="24" r="2" fill="#3a2718"/>
          <path d="M32 28 Q30 32 32 33 Q34 32 32 28" stroke="#a87c5a" strokeWidth="1" fill="none"/>
          <path d="M27 37 Q32 41 37 37" stroke="#a87c5a" strokeWidth="1.5" fill="none" strokeLinecap="round"/>
          <rect x="2" y="28" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
          <polygon points="12,23 12,38 20,31.5" fill="#4a90d9" opacity="0.9"/>
          <circle cx="7" cy="31.5" r="2" fill="white" opacity="0.7"/>
          <path d="M18 44 Q20 50 32 52 Q44 50 46 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        </svg>
      ),
    },
    {
      key: "vertex",
      title: t.photoVertexTitle,
      description: t.photoVertexDesc,
      tip: t.photoVertexTip,
      color: "#4F9CF9",
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <ellipse cx="32" cy="36" rx="18" ry="20" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
          <ellipse cx="32" cy="34" rx="17" ry="18" fill="#4a3728"/>
          <circle cx="32" cy="32" r="6" fill="#6b4f3a" opacity="0.5"/>
          <ellipse cx="14" cy="38" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
          <ellipse cx="50" cy="38" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
          <rect x="25" y="2" width="14" height="9" rx="2" fill="#4a90d9" opacity="0.9"/>
          <circle cx="32" cy="6.5" r="2.5" fill="white" opacity="0.7"/>
          <line x1="32" y1="11" x2="32" y2="19" stroke="#4a90d9" strokeWidth="2" strokeLinecap="round"/>
          <polygon points="28,18 32,24 36,18" fill="#4a90d9"/>
        </svg>
      ),
    },
    {
      key: "temporalRight",
      title: t.photoTRTitle,
      description: t.photoTRDesc,
      tip: t.photoTRTip,
      color: "#A78BFA",
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <ellipse cx="34" cy="28" rx="13" ry="15" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
          <path d="M21 22 Q22 8 34 8 Q46 9 47 22 L46 28" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
          <path d="M43 14 Q48 12 47 22" stroke="#6b4f3a" strokeWidth="2" fill="none"/>
          <circle cx="30" cy="26" r="2" fill="#3a2718"/>
          <circle cx="40" cy="25" r="1.5" fill="#3a2718"/>
          <path d="M43 14 Q50 18 48 28" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="2,2"/>
          <rect x="2" y="26" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
          <polygon points="12,22 12,37 18,29.5" fill="#4a90d9" opacity="0.9"/>
          <circle cx="7" cy="29.5" r="2" fill="white" opacity="0.7"/>
          <path d="M21 44 Q26 50 34 51 Q42 50 47 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        </svg>
      ),
    },
    {
      key: "temporalLeft",
      title: t.photoTLTitle,
      description: t.photoTLDesc,
      tip: t.photoTLTip,
      color: "#F59E0B",
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <ellipse cx="30" cy="28" rx="13" ry="15" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
          <path d="M43 22 Q42 8 30 8 Q18 9 17 22 L18 28" fill="#4a3728" stroke="#3a2718" strokeWidth="1"/>
          <path d="M21 14 Q16 12 17 22" stroke="#6b4f3a" strokeWidth="2" fill="none"/>
          <circle cx="34" cy="26" r="2" fill="#3a2718"/>
          <circle cx="24" cy="25" r="1.5" fill="#3a2718"/>
          <path d="M21 14 Q14 18 16 28" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="2,2"/>
          <rect x="52" y="26" width="10" height="7" rx="1.5" fill="#4a90d9" opacity="0.9"/>
          <polygon points="52,22 52,37 46,29.5" fill="#4a90d9" opacity="0.9"/>
          <circle cx="57" cy="29.5" r="2" fill="white" opacity="0.7"/>
          <path d="M43 44 Q38 50 30 51 Q22 50 17 44" fill="#c9b5a5" stroke="#a87c5a" strokeWidth="1"/>
        </svg>
      ),
    },
    {
      key: "donor",
      title: t.photoDonorTitle,
      description: t.photoDonorDesc,
      tip: t.photoDonorTip,
      color: "#10B981",
      icon: (
        <svg viewBox="0 0 64 64" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-full h-full">
          <ellipse cx="32" cy="30" rx="18" ry="20" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1.5"/>
          <ellipse cx="32" cy="26" rx="17" ry="17" fill="#4a3728"/>
          <path d="M16 40 Q18 48 32 50 Q46 48 48 40" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
          <path d="M14 36 Q18 46 32 48 Q46 46 50 36" stroke="#ef4444" strokeWidth="2" fill="none" strokeDasharray="3,2"/>
          <ellipse cx="14" cy="32" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
          <ellipse cx="50" cy="32" rx="3" ry="4" fill="#e8d5c4" stroke="#a87c5a" strokeWidth="1"/>
          <rect x="25" y="2" width="14" height="9" rx="2" fill="#4a90d9" opacity="0.9"/>
          <circle cx="32" cy="6.5" r="2.5" fill="white" opacity="0.7"/>
          <line x1="32" y1="11" x2="32" y2="17" stroke="#4a90d9" strokeWidth="2" strokeLinecap="round"/>
          <polygon points="28,16 32,22 36,16" fill="#4a90d9"/>
        </svg>
      ),
    },
  ];
}

// ---------- PhotoCapture component ----------
interface PhotoCaptureProps {
  photoKey: string;
  title: string;
  description: string;
  tip: string;
  icon: React.ReactNode;
  color: string;
  index: number;
  dataUrl: string | undefined;
  onCapture: (key: string, file: File) => Promise<void>;
  onCameraCapture: (key: string, dataUrl: string) => Promise<void>;
  isProcessing: boolean;
}

function PhotoCapture({ photoKey, title, description, tip, icon, color, index, dataUrl, onCapture, onCameraCapture, isProcessing }: PhotoCaptureProps) {
  const galleryRef = useRef<HTMLInputElement>(null);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [guideOpen, setGuideOpen] = useState(true);
  const { t } = useLanguage();

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onCapture(photoKey, file);
    e.target.value = "";
  };

  const hasPhoto = !!dataUrl;

  return (
    <>
      {cameraOpen && (
        <CameraModal
          title={title}
          onCapture={async (url) => { setCameraOpen(false); await onCameraCapture(photoKey, url); }}
          onClose={() => setCameraOpen(false)}
          onError={(msg) => setCameraError(msg)}
        />
      )}

      <div className={`bg-white rounded-[2rem] overflow-hidden shadow-sm transition-all duration-300 ${hasPhoto ? "ring-2 ring-primary/30 shadow-md" : "hover:shadow-md"}`}>
        {/* Colored accent bar */}
        <div className="h-1" style={{ background: `linear-gradient(to right, ${color}, ${color}40)` }} />

        {/* Guide section */}
        <div className="bg-[#F5F2EE]/60">
          <button type="button" onClick={() => setGuideOpen(v => !v)} className="w-full flex items-center justify-between px-6 py-3.5 text-left hover:bg-[#F5F2EE]/80 transition-colors">
            <span className="text-xs font-bold uppercase tracking-wider flex items-center gap-2" style={{ color }}>
              <Info className="w-3.5 h-3.5" />
              {t.pPhotoGuide}
            </span>
            {guideOpen ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
          </button>
          {guideOpen && (
            <div className="flex items-center gap-4 px-6 pb-4">
              <div className="w-16 h-16 shrink-0">{icon}</div>
              <p className="text-xs text-muted-foreground leading-relaxed font-medium">{tip}</p>
            </div>
          )}
        </div>

        <div className="p-6">
          <div className="flex flex-col sm:flex-row gap-5 items-start">
            {/* Photo preview / placeholder */}
            <div className="shrink-0 w-full sm:w-auto flex justify-center">
              {hasPhoto ? (
                <div className="w-28 h-28 rounded-2xl overflow-hidden shadow-lg ring-2 ring-primary/20">
                  <img src={dataUrl} alt={title} className="w-full h-full object-cover" />
                </div>
              ) : (
                <div className="w-28 h-28 rounded-2xl border-2 border-dashed border-gray-200 bg-[#F5F2EE]/60 flex flex-col items-center justify-center text-gray-300">
                  <Camera className="w-8 h-8 mb-1.5" />
                  <span className="text-[10px] uppercase font-black tracking-widest">{index + 1}</span>
                </div>
              )}
            </div>

            <div className="flex-1 min-w-0 py-1 w-full text-center sm:text-left">
              <div className="flex flex-col sm:flex-row items-center sm:justify-between mb-2 gap-2">
                <h3 className="font-bold text-foreground text-lg">{title}</h3>
                {hasPhoto && (
                  <div className="flex items-center gap-1.5 text-primary text-xs font-bold bg-primary/10 px-3 py-1.5 rounded-full">
                    <CheckCircle2 className="w-3.5 h-3.5" />
                    <span>{t.pCompleted}</span>
                  </div>
                )}
              </div>
              <p className="text-sm text-muted-foreground mb-4 leading-relaxed sm:pr-2">{description}</p>

              {cameraError && (
                <Alert variant="destructive" className="mb-4 text-left rounded-2xl">
                  <AlertCircle className="h-4 w-4" />
                  <AlertDescription className="text-xs leading-relaxed">{cameraError}</AlertDescription>
                </Alert>
              )}

              <div className="flex gap-2.5 flex-wrap justify-center sm:justify-start">
                <button
                  type="button"
                  onClick={() => { setCameraError(null); setCameraOpen(true); }}
                  disabled={isProcessing}
                  className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-all select-none ${isProcessing ? "opacity-50 pointer-events-none" : ""} ${hasPhoto ? "bg-[#F5F2EE] border border-[#E8E4DE] text-gray-700 hover:bg-[#EDE9E4]" : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"}`}
                >
                  <Camera className="w-4 h-4" />
                  {hasPhoto ? t.pRetakePhoto : t.pUseCamera}
                </button>

                <label className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-full cursor-pointer transition-all select-none ${isProcessing ? "opacity-50 pointer-events-none" : ""} ${hasPhoto ? "bg-[#F5F2EE] border border-[#E8E4DE] text-gray-700 hover:bg-[#EDE9E4]" : "bg-[#F5F2EE] border border-[#E8E4DE] text-foreground hover:bg-[#EDE9E4]"}`}>
                  <ImagePlus className="w-4 h-4" />
                  {hasPhoto ? t.pChangeFile : t.pUploadPhoto}
                  <input ref={galleryRef} type="file" accept="image/*" className="hidden" onChange={handleFile} disabled={isProcessing} />
                </label>

                {isProcessing && (
                  <span className="inline-flex items-center gap-2 text-sm font-medium text-primary mt-1">
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    {t.pProcessing}
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
  const { t, lang, setLang } = useLanguage();
  const [langOpen, setLangOpen] = useState(false);
  const currentLang = LANGS.find(l => l.code === lang) ?? LANGS[0];

  const PHOTO_REQUIREMENTS = getPhotoRequirements(t);

  const [step, setStep] = useState<"intro" | "data" | "photos" | "success">("intro");
  const [photos, setPhotos] = useState<Record<string, string>>({});
  const [processingPhoto, setProcessingPhoto] = useState<string | null>(null);
  const [duplicateError, setDuplicateError] = useState(false);
  const [phonePrefix, setPhonePrefix] = useState("+56");
  const [phonePrefixOpen, setPhonePrefixOpen] = useState(false);
  const { toast } = useToast();

  const { data: existingData, isLoading: isLoadingExisting } = useGetPatient(token || "", {
    query: { enabled: !!token, queryKey: getGetPatientQueryKey(token || "") },
  });

  const form = useForm<PatientFormValues>({
    resolver: zodResolver(patientSchema),
    defaultValues: { name: "", documentId: "", email: "", phone: "", age: "", city: "", hairLossTime: "", pattern: "", previousTreatment: "", symptoms: "", surgeryHistory: "", consent: false },
  });

  useEffect(() => {
    if (existingData?.lead && step === "intro") {
      const l = existingData.lead;
      form.reset({
        name: l.name || "", documentId: (l as any).documentId || "", email: (l as any).email || "",
        phone: l.phone || "", age: l.age || "", city: l.city || "",
        hairLossTime: (l as any).hairLossTime || "", pattern: (l as any).pattern || "",
        previousTreatment: (l as any).previousTreatment || "", symptoms: (l as any).symptoms || "",
        surgeryHistory: (l as any).surgeryHistory || "", consent: l.consent || false,
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
      setPhotos(prev => ({ ...prev, [key]: compressed }));
    } catch {
      toast({ variant: "destructive", title: t.pPhotoError, description: "Intenta nuevamente con otra fotografía." });
    } finally {
      setProcessingPhoto(null);
    }
  };

  const handleCameraCapture = async (key: string, dataUrl: string) => {
    setProcessingPhoto(key);
    try {
      const compressed = await compressImage(dataUrl);
      setPhotos(prev => ({ ...prev, [key]: compressed }));
    } catch {
      toast({ variant: "destructive", title: t.pPhotoError, description: "Intenta nuevamente." });
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
      toast({ variant: "destructive", title: t.pDataError, description: "Revisa el formulario antes de enviar." });
      setStep("data");
      return;
    }
    const formData = form.getValues();
    const photoArray = PHOTO_REQUIREMENTS.map(req => ({
      key: req.key, label: req.title, dataUrl: photos[req.key] ?? "", quality: "Control técnico pendiente",
    })).filter(p => !!p.dataUrl);

    const payload = { ...formData, photos: photoArray };

    if (token) {
      updateMutation.mutate({ token, data: payload }, {
        onSuccess: () => { setStep("success"); window.scrollTo({ top: 0, behavior: "smooth" }); },
        onError: () => toast({ variant: "destructive", title: "Error", description: t.pSaveError }),
      });
    } else {
      setDuplicateError(false);
      createMutation.mutate({ data: payload }, {
        onSuccess: () => { setStep("success"); window.scrollTo({ top: 0, behavior: "smooth" }); },
        onError: (error: unknown) => {
          const err = error as { status?: number; data?: { duplicate?: boolean } };
          if (err?.status === 409 || err?.data?.duplicate) { setDuplicateError(true); return; }
          toast({ variant: "destructive", title: "Error", description: t.pSaveError });
        },
      });
    }
  };

  const completedPhotos = Object.keys(photos).length;
  const isPending = createMutation.isPending || updateMutation.isPending;

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
                        <FormControl><Input placeholder="12.345.678-9" className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base" {...field} /></FormControl>
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
                          <FormLabel className="text-sm font-bold">{t.pCity} <span className="font-normal text-muted-foreground">{t.optional}</span></FormLabel>
                          <FormControl><Input placeholder={t.pCityPlaceholder} className="h-12 rounded-2xl bg-[#F5F2EE] border-[#E8E4DE] focus:bg-white text-base" {...field} /></FormControl>
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
                              {t.pConsentLine1}
                            </FormLabel>
                            <FormMessage />
                          </div>
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

                <Button type="submit" className="w-full h-14 text-base font-bold rounded-full bg-primary hover:bg-primary/90 text-white shadow-lg shadow-primary/25 group">
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
              <button onClick={() => setStep("data")} className="w-10 h-10 rounded-full bg-white border border-[#E8E4DE] flex items-center justify-center hover:bg-[#F5F2EE] transition-colors text-muted-foreground shrink-0 mt-1 shadow-sm">
                <ArrowLeft className="w-5 h-5" />
              </button>
              <div>
                <h2 className="text-2xl font-extrabold text-foreground tracking-tight">{t.pPhotosTitle}</h2>
                <p className="text-sm text-muted-foreground font-medium">{t.pPhotosSub}</p>
              </div>
            </div>

            {/* Progress card */}
            <div className="mb-6 bg-white rounded-[1.75rem] p-6 shadow-sm">
              <div className="flex items-center justify-between mb-4">
                <span className="text-sm font-bold text-foreground">{t.pProgress}</span>
                <span className={`text-sm font-bold px-3 py-1 rounded-full ${completedPhotos === 5 ? "bg-primary/10 text-primary" : "bg-[#F5F2EE] text-muted-foreground"}`}>{completedPhotos}/5</span>
              </div>
              <div className="flex gap-2">
                {PHOTO_REQUIREMENTS.map((req) => (
                  <div key={req.key} className={`flex-1 h-3 rounded-full transition-all duration-500 ${photos[req.key] ? "bg-primary shadow-sm shadow-primary/30" : "bg-[#E8E4DE]"}`} />
                ))}
              </div>
              {completedPhotos === 5 && (
                <div className="mt-3 flex items-center gap-2 text-primary text-xs font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>¡Todas las fotografías completadas!</span>
                </div>
              )}
            </div>

            <div className="space-y-5">
              {PHOTO_REQUIREMENTS.map((req, index) => (
                <PhotoCapture
                  key={req.key}
                  photoKey={req.key}
                  title={req.title}
                  description={req.description}
                  tip={req.tip}
                  icon={req.icon}
                  color={req.color}
                  index={index}
                  dataUrl={photos[req.key]}
                  onCapture={handlePhotoCapture}
                  onCameraCapture={handleCameraCapture}
                  isProcessing={processingPhoto === req.key}
                />
              ))}
            </div>

            {duplicateError && (
              <Alert variant="destructive" className="mt-6 rounded-2xl">
                <AlertCircle className="h-4 w-4" />
                <AlertDescription>{t.pDuplicate}</AlertDescription>
              </Alert>
            )}

            <div className="mt-8">
              <Button
                onClick={submitFullForm}
                disabled={isPending || completedPhotos < 1}
                className={`w-full h-16 text-lg font-bold rounded-full shadow-xl group transition-all ${completedPhotos === 5 ? "bg-primary hover:bg-primary/90 text-white shadow-primary/25" : "bg-primary/80 hover:bg-primary/70 text-white"}`}
              >
                {isPending ? (
                  <><RefreshCw className="w-5 h-5 mr-3 animate-spin" />{t.pSending}</>
                ) : (
                  <><CheckCircle2 className="w-5 h-5 mr-3" />{t.pSubmitCTA} ({completedPhotos}/5)</>
                )}
              </Button>
              {completedPhotos < 5 && !isPending && (
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
    </div>
  );
}
