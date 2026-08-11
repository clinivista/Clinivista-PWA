import { useState, useEffect } from "react";
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
  Activity
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { useGetPatient, getGetPatientQueryKey, useCreatePatient, useUpdatePatient } from "@workspace/api-client-react";
import { useToast } from "@/hooks/use-toast";

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
        const c = document.createElement('canvas');
        c.width = Math.round(img.width * scale);
        c.height = Math.round(img.height * scale);
        const ctx = c.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, c.width, c.height);
        resolve(c.toDataURL('image/jpeg', 0.72));
      };
      if (typeof r.result === 'string') {
        img.src = r.result;
      }
    };
    r.readAsDataURL(file);
  });
}

const patientSchema = z.object({
  name: z.string().min(2, "Ingresa tu nombre completo"),
  phone: z.string().min(8, "Ingresa un teléfono válido"),
  age: z.string().optional(),
  city: z.string().optional(),
  hairLossTime: z.string().optional(),
  pattern: z.string().optional(),
  previousTreatment: z.string().optional(),
  symptoms: z.string().optional(),
  surgeryHistory: z.string().optional(),
  consent: z.boolean().refine(val => val === true, "Debes aceptar los términos para continuar"),
});

type PatientFormValues = z.infer<typeof patientSchema>;

const PHOTO_REQUIREMENTS = [
  { key: "frontal", title: "Vista frontal", description: "Centra la línea de cabello" },
  { key: "vertex", title: "Vértex", description: "Inclina levemente la cabeza" },
  { key: "temporalRight", title: "Temporal derecha", description: "Muestra la entrada derecha" },
  { key: "temporalLeft", title: "Temporal izquierda", description: "Muestra la entrada izquierda" },
  { key: "donor", title: "Zona donante", description: "Fotografía posterior" }
];

export default function PatientFlow() {
  const searchString = useSearch();
  const params = new URLSearchParams(searchString);
  const token = params.get("token");

  const [step, setStep] = useState<"intro" | "data" | "photos" | "success">("intro");
  const { toast } = useToast();

  const { data: existingData, isLoading: isLoadingExisting } = useGetPatient(token || "", {
    query: {
      enabled: !!token,
      queryKey: getGetPatientQueryKey(token || "")
    }
  });

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
      consent: false
    }
  });

  useEffect(() => {
    if (existingData?.lead && step === "intro") {
      const l = existingData.lead;
      form.reset({
        name: l.name || "",
        phone: l.phone || "",
        age: l.age || "",
        city: l.city || "",
        hairLossTime: l.hairLossTime || "",
        pattern: l.pattern || "",
        previousTreatment: l.previousTreatment || "",
        consent: l.consent || false
      });
      // Skip intro if we have a token
      setStep("data");
    }
  }, [existingData, form, step]);

  const [photos, setPhotos] = useState<Record<string, string>>({});
  
  const createMutation = useCreatePatient();
  const updateMutation = useUpdatePatient();

  const handleDataSubmit = (data: PatientFormValues) => {
    setStep("photos");
  };

  const handlePhotoCapture = async (key: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const compressed = await compress(file);
      setPhotos(prev => ({ ...prev, [key]: compressed }));
    } catch (err) {
      toast({
        variant: "destructive",
        title: "Error al procesar imagen",
        description: "Intenta con otra fotografía o cambia el formato."
      });
    }
  };

  const submitFullForm = async () => {
    const formData = form.getValues();
    const photoArray = PHOTO_REQUIREMENTS.map(req => ({
      key: req.key,
      label: req.title,
      dataUrl: photos[req.key],
      quality: 'Control técnico pendiente'
    }));

    const payload = {
      ...formData,
      photos: photoArray
    };

    if (token) {
      updateMutation.mutate({ token, data: payload }, {
        onSuccess: () => setStep("success"),
        onError: () => toast({ variant: "destructive", title: "Error", description: "No pudimos guardar tu información." })
      });
    } else {
      createMutation.mutate({ data: payload }, {
        onSuccess: () => setStep("success"),
        onError: () => toast({ variant: "destructive", title: "Error", description: "No pudimos enviar tu evaluación." })
      });
    }
  };

  if (isLoadingExisting) {
    return <div className="min-h-screen bg-gray-50 flex items-center justify-center">Cargando...</div>;
  }

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col font-sans">
      <header className="bg-white px-6 py-4 shadow-sm flex items-center justify-center sticky top-0 z-10">
        <div className="flex items-center gap-2">
          <Activity className="w-5 h-5 text-primary" />
          <span className="text-lg font-bold text-foreground">Estecapelli</span>
        </div>
      </header>

      <main className="flex-1 w-full max-w-lg mx-auto p-4 md:p-6 pb-24">
        {step !== "success" && (
          <div className="mb-6 flex items-center gap-2 text-sm font-medium text-muted-foreground justify-center">
            <span className={step === "intro" ? "text-primary" : ""}>Inicio</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
            <span className={step === "data" ? "text-primary" : ""}>Datos</span>
            <ChevronRight className="w-4 h-4 opacity-50" />
            <span className={step === "photos" ? "text-primary" : ""}>Fotografías</span>
          </div>
        )}

        {step === "intro" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 text-center animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="w-16 h-16 bg-accent rounded-full flex items-center justify-center mx-auto mb-6">
              <ShieldCheck className="w-8 h-8 text-primary" />
            </div>
            <h1 className="text-2xl font-bold text-foreground mb-4">
              Preevaluación Clínica
            </h1>
            <p className="text-muted-foreground mb-8 leading-relaxed">
              Este proceso nos permitirá conocer tu caso antes de la consulta presencial. 
              Te pediremos algunos datos básicos y 5 fotografías clave de tu cuero cabelludo.
            </p>
            
            <div className="bg-blue-50 text-blue-900 p-4 rounded-xl text-left text-sm mb-8 flex gap-3">
              <Info className="w-5 h-5 flex-shrink-0 text-blue-600 mt-0.5" />
              <div className="flex flex-col gap-2">
                <p>Esta preevaluación no reemplaza una consulta médica ni entrega un diagnóstico.</p>
                <p>La información se revisa por el equipo. Esta plataforma no entrega diagnósticos automáticos.</p>
              </div>
            </div>

            <Button onClick={() => setStep("data")} className="w-full h-12 text-base rounded-full">
              Comenzar ahora
            </Button>
          </div>
        )}

        {step === "data" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-6">
              <button onClick={() => setStep("intro")} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Tus antecedentes</h2>
            </div>

            <Form {...form}>
              <form onSubmit={form.handleSubmit(handleDataSubmit)} className="space-y-5">
                <FormField control={form.control} name="name" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Nombre completo</FormLabel>
                    <FormControl><Input placeholder="Ej. Juan Pérez" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <FormField control={form.control} name="phone" render={({ field }) => (
                  <FormItem>
                    <FormLabel>Teléfono móvil (WhatsApp)</FormLabel>
                    <FormControl><Input type="tel" placeholder="+56 9 1234 5678" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )} />

                <div className="grid grid-cols-2 gap-4">
                  <FormField control={form.control} name="age" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Edad</FormLabel>
                      <FormControl><Input type="number" placeholder="Años" {...field} /></FormControl>
                    </FormItem>
                  )} />
                  <FormField control={form.control} name="city" render={({ field }) => (
                    <FormItem>
                      <FormLabel>Ciudad</FormLabel>
                      <FormControl><Input placeholder="Ej. Santiago" {...field} /></FormControl>
                    </FormItem>
                  )} />
                </div>

                <FormField control={form.control} name="hairLossTime" render={({ field }) => (
                  <FormItem>
                    <FormLabel>¿Hace cuánto notas pérdida de cabello?</FormLabel>
                    <Select onValueChange={field.onChange} defaultValue={field.value}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Selecciona una opción" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Menos de 1 año">Menos de 1 año</SelectItem>
                        <SelectItem value="1 a 3 años">1 a 3 años</SelectItem>
                        <SelectItem value="Más de 3 años">Más de 3 años</SelectItem>
                      </SelectContent>
                    </Select>
                  </FormItem>
                )} />

                <FormField control={form.control} name="consent" render={({ field }) => (
                  <FormItem className="flex flex-row items-start space-x-3 space-y-0 bg-gray-50 p-4 rounded-xl mt-6 border border-gray-100">
                    <FormControl>
                      <Checkbox checked={field.value} onCheckedChange={field.onChange} className="mt-1" />
                    </FormControl>
                    <div className="space-y-1 leading-relaxed">
                      <FormLabel className="text-sm font-normal text-muted-foreground cursor-pointer">
                        Autorizo el uso de mis antecedentes e imágenes exclusivamente para coordinar y revisar esta preevaluación. Entiendo que no corresponde a un diagnóstico ni reemplaza una consulta médica.
                      </FormLabel>
                      <FormMessage />
                    </div>
                  </FormItem>
                )} />

                <Button type="submit" className="w-full h-12 rounded-full mt-6 text-base">
                  Continuar
                  <ChevronRight className="w-4 h-4 ml-2" />
                </Button>
              </form>
            </Form>
          </div>
        )}

        {step === "photos" && (
          <div className="bg-white rounded-2xl p-6 shadow-sm border border-gray-100 animate-in fade-in slide-in-from-bottom-4 duration-300">
            <div className="flex items-center gap-3 mb-4">
              <button onClick={() => setStep("data")} className="p-2 hover:bg-gray-100 rounded-full transition-colors -ml-2">
                <ArrowLeft className="w-5 h-5 text-foreground" />
              </button>
              <h2 className="text-xl font-bold text-foreground">Registro Fotográfico</h2>
            </div>
            
            <p className="text-sm text-muted-foreground mb-6">
              Necesitamos 5 fotografías. Procura tener buena iluminación y que la imagen sea nítida. Puedes tomarlas ahora mismo.
            </p>

            <div className="space-y-4 mb-8">
              {PHOTO_REQUIREMENTS.map((req, index) => {
                const hasPhoto = !!photos[req.key];
                return (
                  <div key={req.key} className={`border rounded-xl p-4 transition-colors ${hasPhoto ? 'border-primary bg-accent/20' : 'border-gray-200'}`}>
                    <div className="flex gap-4 items-center">
                      <div className="flex-1">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="w-5 h-5 rounded-full bg-secondary text-foreground text-xs flex items-center justify-center font-bold">
                            {index + 1}
                          </span>
                          <h3 className="font-semibold text-foreground text-sm">{req.title}</h3>
                          {hasPhoto && <CheckCircle2 className="w-4 h-4 text-primary ml-auto" />}
                        </div>
                        <p className="text-xs text-muted-foreground ml-7">{req.description}</p>
                      </div>
                      
                      <div className="relative shrink-0">
                        {hasPhoto ? (
                          <div className="w-16 h-16 rounded-lg overflow-hidden border border-gray-200 relative group">
                            <img src={photos[req.key]} alt={req.title} className="w-full h-full object-cover" />
                            <label className="absolute inset-0 bg-black/50 flex items-center justify-center opacity-0 group-hover:opacity-100 cursor-pointer transition-opacity">
                              <Camera className="w-5 h-5 text-white" />
                              <input 
                                type="file" 
                                accept="image/*" 
                                capture="environment" 
                                className="hidden"
                                onChange={(e) => handlePhotoCapture(req.key, e)} 
                              />
                            </label>
                          </div>
                        ) : (
                          <label className="w-16 h-16 rounded-lg border-2 border-dashed border-gray-300 hover:border-primary flex items-center justify-center cursor-pointer transition-colors bg-gray-50 text-gray-400 hover:text-primary hover:bg-accent/50">
                            <Camera className="w-6 h-6" />
                            <input 
                              type="file" 
                              accept="image/*" 
                              capture="environment" 
                              className="hidden"
                              onChange={(e) => handlePhotoCapture(req.key, e)} 
                            />
                          </label>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>

            <Button 
              onClick={submitFullForm}
              disabled={Object.keys(photos).length < 5 || createMutation.isPending || updateMutation.isPending}
              className="w-full h-12 rounded-full text-base"
            >
              {(createMutation.isPending || updateMutation.isPending) ? "Enviando..." : "Enviar Evaluación"}
              <Upload className="w-4 h-4 ml-2" />
            </Button>
            {Object.keys(photos).length < 5 && (
              <p className="text-center text-xs text-muted-foreground mt-3">
                Faltan {5 - Object.keys(photos).length} fotografías por subir
              </p>
            )}
          </div>
        )}

        {step === "success" && (
          <div className="bg-white rounded-2xl p-8 shadow-sm border border-gray-100 text-center animate-in zoom-in-95 duration-500 mt-10">
            <div className="w-20 h-20 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-6">
              <Check className="w-10 h-10 text-green-600" />
            </div>
            <h2 className="text-2xl font-bold text-foreground mb-4">
              ¡Evaluación Enviada!
            </h2>
            <p className="text-muted-foreground mb-6">
              Hemos recibido tus datos y fotografías correctamente. Nuestro equipo médico analizará tu caso y nos contactaremos contigo pronto.
            </p>
            <div className="bg-gray-50 p-4 rounded-xl text-sm text-gray-600 border border-gray-100">
              Ya puedes cerrar esta ventana con seguridad.
            </div>
          </div>
        )}

        <footer className="mt-12 text-center text-xs text-muted-foreground px-4">
          <p className="mb-1">Esta preevaluación no reemplaza una consulta médica ni entrega un diagnóstico.</p>
          <p>La información se revisa por el equipo. Esta plataforma no entrega diagnósticos automáticos.</p>
        </footer>
      </main>
    </div>
  );
}