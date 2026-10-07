import { useParams } from "wouter";
import { getGetClinicQueryKey, useGetClinic } from "@workspace/api-client-react";
import { Loader2 } from "lucide-react";
import PatientFlow from "@/pages/patient";

// Dirección propia de cada clínica (/c/<slug>). Si la clínica no existe se
// muestra un aviso claro en vez de dejar al paciente llenar un formulario que
// no se podría guardar; si existe, es el mismo flujo del paciente ya identificado.
export default function ClinicPatient() {
  const { slug = "" } = useParams<{ slug: string }>();
  const normalized = slug.toLowerCase();
  const { isLoading, isError, error } = useGetClinic(normalized, {
    query: { queryKey: getGetClinicQueryKey(normalized), retry: false, staleTime: 5 * 60_000 },
  });
  const notFound = isError && (error as { status?: number } | null)?.status === 404;

  if (isLoading) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F2EE]">
        <Loader2 className="w-8 h-8 animate-spin text-primary" aria-label="Cargando" />
      </div>
    );
  }
  if (notFound) {
    return (
      <div className="min-h-[100dvh] flex items-center justify-center bg-[#F5F2EE] px-6">
        <div className="max-w-sm text-center flex flex-col gap-2" role="alert">
          <h1 className="text-xl font-bold text-foreground">Esta clínica no existe</h1>
          <p className="text-sm text-muted-foreground">
            Revisa que la dirección esté bien escrita o pide el enlace correcto a tu clínica.
          </p>
        </div>
      </div>
    );
  }
  return <PatientFlow clinicSlug={normalized} />;
}
