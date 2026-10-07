import { useState } from "react";
import { LogOut, Building2, Users, Download, ShieldOff, ShieldCheck, Loader2, CreditCard, Plus, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import {
  useGetDirectorCenters,
  getGetDirectorCentersQueryKey,
  usePatchDirectorCenter,
  useRecordDirectorCenterPayment,
  getGetDirectorCenterExportUrl,
  type DirectorCenterSummary,
} from "@workspace/api-client-react";
import { BrandLogo } from "@/components/brand-logo";
import { CreateCenterForm } from "./create-center-form";
import { CenterUsers } from "./center-users";

// Fase 6 (facturación, alcance manual): no hay pasarela de pago ni cobro
// automático — el director registra a mano hasta qué fecha una clínica está
// al día, y el sistema solo lo muestra; nada se suspende solo por vencer.
const PAYMENT_STATUS_LABEL: Record<DirectorCenterSummary["paymentStatus"], string> = {
  al_dia: "Al día",
  atrasada: "Atrasada",
  sin_registro: "Sin registro",
};
const PAYMENT_STATUS_STYLE: Record<DirectorCenterSummary["paymentStatus"], string> = {
  al_dia: "bg-emerald-100 text-emerald-700",
  atrasada: "bg-amber-100 text-amber-700",
  sin_registro: "bg-slate-100 text-slate-600",
};

const CLINIC_TIME_ZONE = "America/Santiago";

function formatPaidUntil(paidUntil: string | null): string | null {
  if (!paidUntil) return null;
  return new Date(paidUntil).toLocaleDateString("es-CL", { year: "numeric", month: "long", day: "numeric", timeZone: CLINIC_TIME_ZONE });
}

// Chile alternates between UTC-3 and UTC-4 depending on daylight saving, so
// rather than hardcode an offset, ask Intl what America/Santiago's offset
// from UTC actually is for the instant in question (works for either side
// of a DST transition). Used so "pagado hasta el 31 de octubre" means
// midnight at the end of October 31st in Chile, not in UTC — otherwise the
// clinic could show as "atrasada" a few hours before the local cutoff.
function utcOffsetMs(instant: Date, timeZone: string): number {
  const asUtc = new Date(instant.toLocaleString("en-US", { timeZone: "UTC" }));
  const asZone = new Date(instant.toLocaleString("en-US", { timeZone }));
  return asUtc.getTime() - asZone.getTime();
}

function chileEndOfDayIso(dateValue: string): string {
  const reference = new Date(`${dateValue}T23:59:59.999Z`);
  return new Date(reference.getTime() + utcOffsetMs(reference, CLINIC_TIME_ZONE)).toISOString();
}

export function DirectorPanel({ onLogout }: { onLogout: () => void }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [usersOpenId, setUsersOpenId] = useState<string | null>(null);
  const [paymentDraft, setPaymentDraft] = useState<Record<string, string>>({});
  const { data, isLoading, isError } = useGetDirectorCenters();
  const patchCenter = usePatchDirectorCenter();
  const recordPayment = useRecordDirectorCenterPayment();

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

  const handleRecordPayment = (id: string) => {
    const dateValue = paymentDraft[id];
    if (!dateValue) return;
    setPendingId(id);
    recordPayment.mutate(
      { id, data: { paidUntil: chileEndOfDayIso(dateValue) } },
      {
        onSuccess: () => {
          queryClient.invalidateQueries({ queryKey: getGetDirectorCentersQueryKey() });
          setPaymentDraft((prev) => ({ ...prev, [id]: "" }));
          toast({ title: "Pago registrado", description: "La fecha de vigencia de esta clínica quedó actualizada." });
        },
        onError: () => {
          toast({ variant: "destructive", title: "Error", description: "No pudimos registrar el pago." });
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
        {creating ? (
          <CreateCenterForm onClose={() => setCreating(false)} />
        ) : (
          <div className="flex justify-end mb-4">
            <Button className="rounded-full h-10 font-semibold" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4 mr-2" /> Crear clínica
            </Button>
          </div>
        )}
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
              className="bg-white rounded-[1.75rem] shadow-sm border border-[#E8E4DE] p-6 flex flex-col gap-5"
            >
              <div className="flex flex-col md:flex-row md:items-center gap-5">
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
                    <span className={`text-xs font-bold px-2.5 py-1 rounded-full ${PAYMENT_STATUS_STYLE[center.paymentStatus]}`}>
                      {PAYMENT_STATUS_LABEL[center.paymentStatus]}
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
                    {formatPaidUntil(center.paidUntil) && (
                      <span className="flex items-center gap-1.5">
                        <CreditCard className="w-4 h-4" />
                        {center.paymentStatus === "atrasada" ? "Vencido el " : "Pagado hasta el "}
                        {formatPaidUntil(center.paidUntil)}
                      </span>
                    )}
                  </div>
                </div>

                <div className="flex flex-wrap items-center gap-2 md:shrink-0">
                  <a
                    href={getGetDirectorCenterExportUrl(center.id)}
                    className="inline-flex items-center gap-2 h-10 px-4 rounded-full border border-[#E8E4DE] text-sm font-semibold text-foreground hover:bg-[#F5F2EE] transition-colors"
                  >
                    <Download className="w-4 h-4" /> Exportar datos
                  </a>
                  <Button
                    variant="outline"
                    className="rounded-full h-10 font-semibold"
                    aria-expanded={usersOpenId === center.id}
                    onClick={() => setUsersOpenId(usersOpenId === center.id ? null : center.id)}
                  >
                    <Users className="w-4 h-4 mr-2" /> Usuarios
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${usersOpenId === center.id ? "rotate-180" : ""}`} />
                  </Button>
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-4 border-t border-[#E8E4DE]">
                <label htmlFor={`paid-until-${center.id}`} className="text-sm font-semibold text-muted-foreground shrink-0">
                  Registrar pago hasta:
                </label>
                <div className="flex items-center gap-2">
                  <Input
                    id={`paid-until-${center.id}`}
                    type="date"
                    className="h-10 rounded-full flex-1 min-w-0 sm:max-w-[180px] sm:flex-none"
                    value={paymentDraft[center.id] ?? ""}
                    onChange={(event) => setPaymentDraft((prev) => ({ ...prev, [center.id]: event.target.value }))}
                  />
                  <Button
                    variant="outline"
                    className="rounded-full h-10 font-semibold shrink-0"
                    disabled={!paymentDraft[center.id] || pendingId === center.id}
                    onClick={() => handleRecordPayment(center.id)}
                  >
                    {pendingId === center.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Registrar pago
                  </Button>
                </div>
              </div>

              {usersOpenId === center.id && <CenterUsers centerId={center.id} />}
            </div>
          ))}
        </div>
      </main>
    </div>
  );
}
