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
  Upload,
  Activity,
  ImagePlus,
  Phone,
  Calendar,
  RefreshCw,
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
    // reset so same file can be re-selected
    e.target.value = "";
  };

  const hasPhoto = !!dataUrl;

  return (
    <div
      className={`border rounded-2xl p-4 transition-all duration-200 ${
        hasPhoto
          ? "border-primary bg-primary/5"
          : "border-gray-200 bg-white"
      }`}
    >
      <div className="flex gap-4 items-start">
        {/* Thumbnail or placeholder */}
        <div className="shrink-0">
          {hasPhoto ? (
            <div className="w-20 h-20 rounded-xl overflow-hidden border border-primary/30 shadow-sm">
              <img
                src={dataUrl}
                alt={title}
                className="w-full h-full object-cover"
              />
            </div>
          ) : (
            <div className="w-20 h-20 rounded-xl border-2 border-dashed border-gray-300 bg-gray-50 flex items-center justify-center text-gray-300">
              <Camera className="w-7 h-7" />
            </div>
          )}
        </div>

        {/* Info + buttons */}
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 mb-1">
            <span className="w-5 h-5 rounded-full bg-foreground/10 text-foreground text-xs flex items-center justify-center font-bold shrink-0">
              {index + 1}
            </span>
            <h3 className="font-semibold text-foreground text-sm">{title}</h3>
            {hasPhoto && (
              <CheckCircle2 className="w-4 h-4 text-primary ml-auto shrink-0" />
            )}
          </div>
          <p className="text-xs text-muted-foreground mb-3 leading-relaxed">
            {description}
          </p>

          {/* Two capture options */}
          <div className="flex gap-2 flex-wrap">
            {/* Camera button */}
            <label
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none
                ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                ${hasPhoto
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-gray-300 text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                }`}
            >
              <Camera className="w-3.5 h-3.5" />
              {hasPhoto ? "Retomar" : "Cámara"}
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

            {/* Gallery / file upload button */}
            <label
              className={`inline-flex items-center gap-1.5 text-xs font-medium px-3 py-1.5 rounded-full border cursor-pointer transition-colors select-none
                ${isProcessing ? "opacity-50 pointer-events-none" : ""}
                ${hasPhoto
                  ? "border-primary/40 text-primary hover:bg-primary/10"
                  : "border-gray-300 text-foreground hover:border-primary hover:text-primary hover:bg-primary/5"
                }`}
            >
              <ImagePlus className="w-3.5 h-3.5" />
              {hasPhoto ? "Cambiar" : "Subir foto"}
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
              <span className="inline-flex items-center gap-1 text-xs text-muted-foreground px-2">
                <RefreshCw className="w-3 h-3 animate-spin" />
                Procesando…
              </span>
            )}
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

  // Pre-fill form if patient returns via token
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
    // Re-validate data before sending
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
        <div className="text-muted-foreground text-sm flex items-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin" />
          Cargando tu evaluación…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans">
      {/* Header */}
      <header className="bg-white px-6 py-4 shadow-sm flex items-center justify-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold text-foreground">Estecapelli</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-4 md:p-6 pb-24">
        {/* Step indicator */}
        {step !== "success" && (
          <div className="mb-6 flex items-center gap-2 text-sm font-medium justify-center">
            {(["intro", "data", "photos"] as const).map((s, i) => {
              const labels = ["Inicio", "Datos", "Fotografías"];
              const stepIndex = ["intro", "data", "photos"].indexOf(step);
              const isActive = s === step;
              const isDone = i < stepIndex;
              return (
                <span key={s} className="flex items-center gap-2">
                  {i > 0 && <ChevronRight className="w-4 h-4 text-gray-300" />}
                  <span
                    className={`flex items-center gap-1 ${
                      isActive
                        ? "text-primary font-semibold"
                        : isDone
                        ? "text-primary/60"
                        : "text-muted-foreground"
                    }`}
                  >
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
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-primary/10 rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-3">
              Preevaluación Clínica
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Este proceso nos permitirá conocer tu caso antes de la consulta
              presencial. Te pediremos algunos datos básicos y{" "}
              <strong>5 fotografías</strong> clave de tu cuero cabelludo.
            </p>

            {/* Steps preview */}
            <div className="grid grid-cols-3 gap-3 mb-8 text-left">
              {[
                { n: "1", label: "Datos personales", detail: "Nombre, teléfono y antecedentes capilares" },
                { n: "2", label: "Fotografías", detail: "5 fotos guiadas desde tu celular o galería" },
                { n: "3", label: "Análisis del equipo", detail: "El equipo revisa y te contacta" },
              ].map((s) => (
                <div key={s.n} className="bg-gray-50 rounded-xl p-3">
                  <span className="text-xs font-bold text-primary block mb-1">
                    Paso {s.n}
                  </span>
                  <p className="text-xs font-semibold text-foreground mb-1">{s.label}</p>
                  <p className="text-xs text-muted-foreground leading-snug">{s.detail}</p>
                </div>
              ))}
            </div>

            <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-left text-sm mb-8 flex gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-blue-500 mt-0.5" />
              <p className="leading-relaxed">
                Esta preevaluación es <strong>confidencial</strong> y no reemplaza
                una consulta médica. No entrega diagnósticos automáticos.
              </p>
            </div>

            <Button
              onClick={() => setStep("data")}
              className="w-full h-12 text-base rounded-full"
            >
              Comenzar ahora
              <ChevronRight className="w-4 h-4 ml-2" />
            </Button>
          </div>
        )}

        {/* ── STEP: DATA ── */}
        {step === "data" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <button
                type="button"
                onClick={() => setStep("intro")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
                aria-label="Volver"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Tus antecedentes</h2>
            </div>

            <Form {...form}>
              <form
                onSubmit={form.handleSubmit(handleDataSubmit)}
                className="space-y-5"
                noValidate
              >
                {/* Name */}
                <FormField
                  control={form.control}
                  name="name"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Nombre completo *</FormLabel>
                      <FormControl>
                        <Input
                          placeholder="Ej. Juan Pérez"
                          autoComplete="name"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Phone */}
                <FormField
                  control={form.control}
                  name="phone"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Teléfono móvil (WhatsApp) *</FormLabel>
                      <FormControl>
                        <Input
                          type="tel"
                          placeholder="+56 9 1234 5678"
                          autoComplete="tel"
                          inputMode="tel"
                          {...field}
                        />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                {/* Age + City */}
                <div className="grid grid-cols-2 gap-4">
                  <FormField
                    control={form.control}
                    name="age"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>Edad</FormLabel>
                        <FormControl>
                          <Input
                            type="number"
                            placeholder="Años"
                            min={18}
                            max={99}
                            inputMode="numeric"
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
                        <FormLabel>Ciudad</FormLabel>
                        <FormControl>
                          <Input
                            placeholder="Ej. Santiago"
                            autoComplete="address-level2"
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />
                </div>

                {/* Section divider */}
                <div className="pt-2">
                  <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide mb-4">
                    Antecedentes capilares
                  </p>

                  {/* Hair loss time */}
                  <FormField
                    control={form.control}
                    name="hairLossTime"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>¿Hace cuánto notas la pérdida de cabello?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una opción" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  {/* Pattern */}
                  <FormField
                    control={form.control}
                    name="pattern"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>¿Dónde se concentra la pérdida?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una zona" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  {/* Previous treatment */}
                  <FormField
                    control={form.control}
                    name="previousTreatment"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>¿Has usado algún tratamiento para la caída?</FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una opción" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                  {/* Symptoms */}
                  <FormField
                    control={form.control}
                    name="symptoms"
                    render={({ field }) => (
                      <FormItem className="mb-4">
                        <FormLabel>
                          ¿Tienes algún síntoma asociado?{" "}
                          <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <FormControl>
                          <Textarea
                            placeholder="Ej. picazón, caspa, irritación del cuero cabelludo…"
                            className="resize-none"
                            rows={2}
                            {...field}
                          />
                        </FormControl>
                        <FormMessage />
                      </FormItem>
                    )}
                  />

                  {/* Surgery history */}
                  <FormField
                    control={form.control}
                    name="surgeryHistory"
                    render={({ field }) => (
                      <FormItem>
                        <FormLabel>
                          ¿Has tenido alguna cirugía de trasplante capilar antes?{" "}
                          <span className="text-muted-foreground font-normal">(opcional)</span>
                        </FormLabel>
                        <Select
                          onValueChange={field.onChange}
                          value={field.value}
                        >
                          <FormControl>
                            <SelectTrigger>
                              <SelectValue placeholder="Selecciona una opción" />
                            </SelectTrigger>
                          </FormControl>
                          <SelectContent>
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

                {/* Consent */}
                <FormField
                  control={form.control}
                  name="consent"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-gray-50 p-4 rounded-xl mt-6 border border-gray-200">
                      <FormControl>
                        <Checkbox
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          className="mt-0.5"
                          id="consent-check"
                        />
                      </FormControl>
                      <div className="space-y-1 leading-relaxed">
                        <FormLabel
                          htmlFor="consent-check"
                          className="text-sm font-normal text-muted-foreground cursor-pointer"
                        >
                          Autorizo el uso de mis antecedentes e imágenes exclusivamente
                          para coordinar y revisar esta preevaluación. Entiendo que no
                          corresponde a un diagnóstico ni reemplaza una consulta médica.
                        </FormLabel>
                        <FormMessage />
                      </div>
                    </FormItem>
                  )}
                />

                <Button
                  type="submit"
                  className="w-full h-12 rounded-full mt-6 text-base"
                >
                  Continuar a fotografías
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        {/* ── STEP: PHOTOS ── */}
        {step === "photos" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-2">
              <button
                type="button"
                onClick={() => setStep("data")}
                className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2"
                aria-label="Volver"
              >
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Registro fotográfico</h2>
            </div>

            {/* Progress bar */}
            <div className="mb-5">
              <div className="flex justify-between text-xs text-muted-foreground mb-1.5">
                <span>
                  {completedPhotos} de {PHOTO_REQUIREMENTS.length} fotografías
                </span>
                <span className={completedPhotos === 5 ? "text-primary font-medium" : ""}>
                  {completedPhotos === 5 ? "¡Listo para enviar!" : `Faltan ${5 - completedPhotos}`}
                </span>
              </div>
              <div className="h-1.5 bg-gray-100 rounded-full overflow-hidden">
                <div
                  className="h-full bg-primary rounded-full transition-all duration-500"
                  style={{ width: `${(completedPhotos / 5) * 100}%` }}
                />
              </div>
            </div>

            {/* Tip */}
            <div className="bg-amber-50 border border-amber-100 rounded-xl p-3 mb-5 flex gap-2 text-xs text-amber-800">
              <Info className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
              <p>
                Procura buena iluminación y que las imágenes sean nítidas. Puedes usar la{" "}
                <strong>cámara</strong> de tu dispositivo o <strong>subir</strong> fotos
                ya tomadas.
              </p>
            </div>

            {/* Photo cards */}
            <div className="space-y-3 mb-8">
              {PHOTO_REQUIREMENTS.map((req, index) => (
                <PhotoCapture
                  key={req.key}
                  photoKey={req.key}
                  title={req.title}
                  description={req.description}
                  index={index}
                  dataUrl={photos[req.key]}
                  onCapture={handlePhotoCapture}
                  isProcessing={processingPhoto === req.key}
                />
              ))}
            </div>

            <Button
              onClick={submitFullForm}
              disabled={completedPhotos < 5 || isPending}
              className="w-full h-12 rounded-full text-base"
            >
              {isPending ? (
                <>
                  <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                  Enviando evaluación…
                </>
              ) : (
                <>
                  Enviar evaluación
                  <Upload className="w-4 h-4 ml-2" />
                </>
              )}
            </Button>

            {completedPhotos < 5 && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Completa las {5 - completedPhotos} fotografía
                {5 - completedPhotos !== 1 ? "s" : ""} restante
                {5 - completedPhotos !== 1 ? "s" : ""} para continuar
              </p>
            )}
          </div>
        )}

        {/* ── STEP: SUCCESS ── */}
        {step === "success" && (
          <div className="animate-in fade-in zoom-in-95 duration-500 mt-4 space-y-4">
            {/* Main confirmation card */}
            <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center">
              <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-5">
                <CheckCircle2 className="w-10 h-10 text-green-600" />
              </div>
              <h2 className="text-2xl font-bold text-foreground mb-2">
                ¡Evaluación recibida!
              </h2>
              <p className="text-muted-foreground leading-relaxed mb-6">
                Hemos recibido tus datos y las {completedPhotos} fotografías correctamente.
                Nuestro equipo clínico analizará tu caso y se pondrá en contacto contigo.
              </p>

              {/* What to expect */}
              <div className="text-left space-y-3">
                <p className="text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  ¿Qué ocurre ahora?
                </p>
                {[
                  {
                    icon: <CheckCircle2 className="w-4 h-4 text-primary" />,
                    text: "Tus fotografías y datos han sido guardados de forma segura.",
                  },
                  {
                    icon: <Activity className="w-4 h-4 text-primary" />,
                    text: "El equipo médico revisará tu caso y evaluará las imágenes.",
                  },
                  {
                    icon: <Phone className="w-4 h-4 text-primary" />,
                    text: "Nos contactaremos contigo por WhatsApp o teléfono para coordinar los próximos pasos.",
                  },
                  {
                    icon: <Calendar className="w-4 h-4 text-primary" />,
                    text: "Si el equipo lo considera indicado, coordinaremos una consulta presencial.",
                  },
                ].map((item, i) => (
                  <div key={i} className="flex items-start gap-3 bg-gray-50 rounded-xl p-3">
                    <span className="mt-0.5 shrink-0">{item.icon}</span>
                    <p className="text-sm text-muted-foreground leading-snug">
                      {item.text}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            {/* Disclaimer */}
            <div className="bg-blue-50 border border-blue-100 rounded-xl p-4 flex gap-3">
              <Info className="w-4 h-4 text-blue-500 shrink-0 mt-0.5" />
              <p className="text-xs text-blue-800 leading-relaxed">
                Esta preevaluación es confidencial y no constituye un diagnóstico médico.
                El análisis clínico y las recomendaciones de tratamiento se entregarán en
                la consulta presencial.
              </p>
            </div>

            {/* Safe to close */}
            <div className="bg-gray-50 rounded-xl p-4 text-center">
              <p className="text-sm text-muted-foreground">
                Ya puedes cerrar esta ventana con seguridad.
              </p>
            </div>
          </div>
        )}

        {/* Footer */}
        {step !== "success" && (
          <footer className="mt-10 text-center text-xs text-muted-foreground px-4 space-y-1">
            <p>Esta preevaluación no reemplaza una consulta médica ni entrega un diagnóstico.</p>
            <p>La información se revisa exclusivamente por el equipo de Estecapelli.</p>
          </footer>
        )}
      </main>
    </div>
  );
}
