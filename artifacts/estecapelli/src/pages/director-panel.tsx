import { useState } from "react";
import { LogOut, Building2, Users, Download, ShieldOff, ShieldCheck, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDirectorCenters,
  getGetDirectorCentersQueryKey,
  usePatchDirectorCenter,
  getGetDirectorCenterExportUrl,
} from "@workspace/api-client-react";
import { BrandLogo } from "@/components/brand-logo";

export function DirectorPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const { data, isLoading, isError } = useGetDirectorCenters();
  const patchCenter = usePatchDirectorCenter();

  const handleToggle = (id: string, nextActive: boolean) => {
    setPendingId(id);
    patchCenter.mutate(
      { id, data: { active: nextActive } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
          toast({
            title: nextActive ? "Clínica reactivada" : "Clínica suspendida",
            description: nextActive
              ? "El personal de esta clínica ya puede volver a iniciar sesión."
              : "El personal de esta clínica no podrá iniciar sesión hasta que la reactives.",
          });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No pudimos actualizar esta clínica." });
        },
        onSettled: () => setPendingId(null),
      },
    );
  };

  const centers = data?.centers ?? [];

  return (
    <div className="min-h-[100dvh] bg-[#F5F2EE] flex flex-col">
      <header className="bg-[#0B1F33] text-white px-6 py-5 flex items-center justify-between shrink-0">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-lg" />
          <div>
            <h1 className="text-lg font-bold tracking-tight">Panel de supra-control</h1>
            <p className="text-xs text-white/60 font-medium">Todas las clínicas de Clinivista</p>
          </div>
        </div>
        <Button
          variant="ghost"
          className="text-white/70 hover:text-white hover:bg-white/10 font-medium rounded-2xl"
          onClick={onLogout}
        >
          <LogOut className="w-4 h-4 mr-2" />
          Salir
        </Button>
      </header>

      <main className="flex-1 p-6 md:p-10 max-w-5xl w-full mx-auto">
        {isLoading && (
          <div className="flex items-center gap-2 text-muted-foreground py-10 justify-center">
            <Loader2 className="w-5 h-5 animate-spin" /> Cargando clínicas…
          </div>
        )}
        {isError && (
          <div className="text-center text-red-600 font-medium py-10">
            No pudimos cargar la lista de clínicas.
          </div>
        )}
        {!isLoading && !isError && centers.length === 0 && (
          <div className="text-center text-muted-foreground font-medium py-10">
            Todavía no hay ninguna clínica con pacientes o personal registrado.
          </div>
        )}

        <div className="space-y-4">
          {centers.map((center) => (
            <div
              key={center.id}
              className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 flex flex-col md:flex-row md:items-center gap-5"
            >
              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <h2 className="text-lg font-bold text-foreground truncate">{center.name}</h2>
                  <span
                    className={`text-xs font-bold px-2.5 py-1 rounded-full ${
                      center.active ? "bg-emerald-100 text-emerald-700" : "bg-red-100 text-red-700"
                    }`}
                  >
                    {center.active ? "Activa" : "Suspendida"}
                  </span>
                </div>
                <p className="text-xs text-muted-foreground font-medium mt-1">{center.slug}</p>
                <div className="flex items-center gap-4 mt-3 text-sm text-muted-foreground font-medium">
                  <span className="flex items-center gap-1.5">
                    <Building2 className="w-4 h-4" /> {center.patientCount} pacientes
                  </span>
                  <span className="flex items-center gap-1.5">
                    <Users className="w-4 h-4" /> {center.staffCount} personal
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2 shrink-0">
                <a
                  href={getGetDirectorCenterExportUrl(center.id)}
                  className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[#E8E4DE] text-sm font-semibold text-foreground hover:bg-[#F5F2EE] transition-colors"
                >
                  <Download className="w-4 h-4" /> Exportar datos
                </a>
                <Button
                  variant={center.active ? "outline" : "default"}
                  className="rounded-full h-10 font-semibold"
                  disabled={pendingId === center.id}
                  onClick={() => handleToggle(center.id, !center.active)}
                >
                  {pendingId === center.id ? (
                    <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  ) : center.active ? (
                    <ShieldOff className="w-4 h-4 mr-2" />
                  ) : (
                    <ShieldCheck className="w-4 h-4 mr-2" />
                  )}
                  {center.active ? "Suspender" : "Reactivar"}
                </Button>
              </div>
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
