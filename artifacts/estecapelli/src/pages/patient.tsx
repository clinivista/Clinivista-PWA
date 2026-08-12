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
  Timer
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
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
function compress(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onerror = reject;
    r.onload = () => {
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
      if (typeof r.result === "string") img.src = r.result;
    };
    r.readAsDataURL(file);
  });
}

// ---------- Zod schema ----------
const patientSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre completo"),
  phone: z
    .string()
    .min(8, "Ingresa un teléfono válido (mínimo 8 dígitos)")
    .regex(/^[+\d\s\-()]+$/, "Solo se permiten números y el signo +"),
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
  },
  {
    key: "vertex",
    title: "Vértex / Coronilla",
    description: "Inclina levemente la cabeza hacia adelante. La cámara apunta hacia abajo.",
  },
  {
    key: "temporalRight",
    title: "Temporal derecha",
    description: "Gira levemente hacia la izquierda para mostrar la entrada derecha.",
  },
  {
    key: "temporalLeft",
    title: "Temporal izquierda",
    description: "Gira levemente hacia la derecha para mostrar la entrada izquierda.",
  },
  {
    key: "donor",
    title: "Zona donante",
    description: "Fotografía de la nuca / parte posterior de la cabeza.",
  },
];

// ---------- PhotoCapture component ----------
interface PhotoCaptureProps {
  photoKey: string;
  title: string;
  description: string;
  index: number;
  dataUrl: string | undefined;
  onCapture: (key: string, file: File) => Promise<void>;
  isProcessing: boolean;
}

function PhotoCapture({
  photoKey,
  title,
  description,
  index,
  dataUrl,
  onCapture,
  isProcessing,
}: PhotoCaptureProps) {
  const cameraRef = useRef<HTMLInputElement>(null);
  const galleryRef = useRef<HTMLInputElement>(null);

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    await onCapture(photoKey, file);
    e.target.value = "";
  };

  const hasPhoto = !!dataUrl;

  return (
    <div
      className={`relative group overflow-hidden border-2 rounded-2xl transition-all duration-300 ${
        hasPhoto
          ? "border-primary bg-primary/5 shadow-sm"
          : "border-gray-200 bg-white hover:border-gray-300"
      }`}
    >
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
            <p className="text-sm text-muted-foreground mb-5 leading-relaxed sm:pr-2">
              {description}
            </p>

            <div className="flex gap-3 flex-wrap justify-center sm:justify-start">
              <label
                className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none
                  ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                  ${hasPhoto
                    ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-foreground"
                    : "bg-primary text-white hover:bg-primary/90 shadow-sm shadow-primary/20"
                  }`}
              >
                <Camera className="w-4 h-4" />
                {hasPhoto ? "Retomar foto" : "Usar cámara"}
                <input
                  ref={cameraRef}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={handleFile}
                  disabled={isProcessing}
                />
              </label>

              <label
                className={`inline-flex items-center gap-2 text-sm font-semibold px-4 py-2.5 rounded-xl cursor-pointer transition-all select-none
                  ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                  ${hasPhoto
                    ? "bg-white border border-gray-200 text-gray-700 hover:bg-gray-50 hover:text-foreground"
                    : "bg-secondary text-foreground hover:bg-secondary/80 border border-transparent"
                  }`}
              >
                <ImagePlus className="w-4 h-4" />
                {hasPhoto ? "Cambiar archivo" : "Subir foto"}
                <input
                  ref={galleryRef}
                  type="file"
                  accept="image/jpeg,image/png,image/webp,image/heic"
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
      createMutation.mutate(
        { data: payload },
        {
          onSuccess: () => {
            setStep("success");
            window.scrollTo({ top: 0, behavior: "smooth" });
          },
          onError: () =>
            toast({
              variant: "destructive",
              title: "Error al enviar",
              description: "No pudimos enviar tu evaluación. Intenta nuevamente.",
            }),
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
                    name="phone"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel className="text-sm font-bold text-foreground">Teléfono móvil (WhatsApp) *</FormLabel>
                        <FormControl>
                          <Input
                            type="tel"
                            placeholder="+56 9 1234 5678"
                            autoComplete="tel"
                            inputMode="tel"
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
                                Entradas / línea frontal
                              </SelectItem>
                              <SelectItem value="Vértex o coronilla">
                                Vértex o coronilla
                              </SelectItem>
                              <SelectItem value="Zona frontal y vértex">
                                Zona frontal y vértex (ambas)
                              </SelectItem>
                              <SelectItem value="Pérdida generalizada">
                                Pérdida generalizada (todo el cuero cabelludo)
                              </SelectItem>
                              <SelectItem value="Pérdida localizada / irregular">
                                Pérdida localizada o irregular
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
                    <FormItem className="flex flex-row items-start space-x-4 bg-blue-50/40 p-6 rounded-[1.5rem] mt-8 border border-blue-100">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-1 h-5 w-5 rounded shadow-sm data-[state=checked]:bg-primary data-[state=checked]:border-primary"
                        />
                      </FormControl>
                      <div className="space-y-2 leading-none">
                        <FormLabel className="text-base font-bold text-foreground cursor-pointer block">
                          Consentimiento Médico y Privacidad
                        </FormLabel>
                        <p className="text-sm text-muted-foreground leading-relaxed font-medium">
                          Acepto que mis datos y fotografías sean enviados de forma segura al equipo médico de Clinivista para su evaluación clínica confidencial. Entiendo que este proceso preliminar no reemplaza una consulta presencial ni genera un diagnóstico automático.
                        </p>
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
                    index={i}
                    dataUrl={photos[req.key]}
                    onCapture={handlePhotoCapture}
                    isProcessing={processingPhoto === req.key}
                  />
                ))}
              </div>
            </div>

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
              ¡Evaluación enviada con éxito!
            </h2>
            <p className="text-lg text-muted-foreground mb-8 leading-relaxed max-w-md mx-auto">
              Hemos recibido tu información clínica y fotografías. Nuestro equipo médico analizará tu caso y nos contactaremos contigo muy pronto.
            </p>
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
