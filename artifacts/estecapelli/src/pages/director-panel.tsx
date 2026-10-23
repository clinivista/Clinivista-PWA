import { useEffect, useState } from "react";
import { LogOut, LogIn, Building2, Users, Download, ShieldOff, ShieldCheck, Loader2, CreditCard, Plus, ChevronDown, Palette, LayoutDashboard, Headphones, UserCog, BriefcaseBusiness, Menu, X, Repeat } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetDirectorCenters,
  getGetAuthMeQueryKey,
  getGetDirectorCentersQueryKey,
  usePatchDirectorCenter,
  useRecordDirectorCenterPayment,
  getGetDirectorCenterExportUrl,
  type DirectorCenterSummary,
} from "@workspace/api-client-react";
import { BrandLogo } from "@/components/brand-logo";
import { selectClinic } from "@/components/clinic-chooser";
import { CreateCenterForm } from "./create-center-form";
import { CenterUsers } from "./center-users";
import { SupraTeam } from "./supra-team";
import { SupraInbox, OPEN_SUPPORT_INBOX_EVENT } from "./supra-inbox";
import { SupraDashboard } from "./supra-dashboard";
import { SupportAlerts } from "@/components/support-alerts";
import { SupraAdmin, AdminBanner } from "./supra-admin";
import { ClinicIdentityEditor } from "./clinic-identity-editor";

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

// Un director gestiona además a las personas (usuarios de clínica y equipo de
// supra-control); un administrativo de supra-control solo opera el panel.
type SupraView = "dashboard" | "clinics" | "support" | "team" | "admin";

export function DirectorPanel({ onLogout, canManageUsers = true }: { onLogout: () => void; canManageUsers?: boolean }) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const [view, setView] = useState<SupraView>("dashboard");
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [openTicketId, setOpenTicketId] = useState<string | null>(null);
  const [pendingId, setPendingId] = useState<string | null>(null);
  const [creating, setCreating] = useState(false);
  const [usersOpenId, setUsersOpenId] = useState<string | null>(null);
  const [identityOpenId, setIdentityOpenId] = useState<string | null>(null);
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

  // "Atender ahora" (aviso de tickets): lleva a Soporte y abre ese ticket.
  useEffect(() => {
    const onOpen = (event: Event) => {
      setView("support");
      setOpenTicketId((event as CustomEvent<{ ticketId?: string }>).detail?.ticketId ?? null);
    };
    window.addEventListener(OPEN_SUPPORT_INBOX_EVENT, onOpen);
    return () => window.removeEventListener(OPEN_SUPPORT_INBOX_EVENT, onOpen);
  }, []);

  const { data: queue } = useQuery({
    queryKey: ["support-queue", "open"], refetchInterval: 20_000, retry: false,
    queryFn: async () => {
      const response = await fetch("/api/support/queue?view=open", { credentials: "same-origin" });
      if (!response.ok) throw new Error("queue");
      return (await response.json()) as { counts: { waiting: number } };
    },
  });
  const waiting = queue?.counts.waiting ?? 0;

  const navItems: { id: SupraView; label: string; Icon: typeof Users; show: boolean; badge?: number }[] = [
    { id: "dashboard", label: "Inicio", Icon: LayoutDashboard, show: true },
    { id: "clinics", label: "Clínicas", Icon: Building2, show: true },
    { id: "support", label: "Soporte", Icon: Headphones, show: true, badge: waiting },
    { id: "team", label: "Equipo de supra-control", Icon: UserCog, show: canManageUsers },
    { id: "admin", label: "Servicios y finanzas", Icon: BriefcaseBusiness, show: canManageUsers },
  ];
  const go = (next: SupraView) => { setView(next); setMobileNavOpen(false); if (next !== "support") setOpenTicketId(null); };
  const titles: Record<SupraView, string> = { dashboard: "Resumen de la plataforma", clinics: "Clínicas", support: "Soporte (tickets de las clínicas)", team: "Equipo de supra-control", admin: "Administración: servicios y finanzas" };

  return (
    <div className="h-[100dvh] bg-[#F5F2EE] flex flex-col md:flex-row font-sans">
      <div className="md:hidden bg-[#0B1F33] text-white px-4 py-3 flex items-center justify-between shrink-0 z-30">
        <div className="flex items-center gap-3">
          <BrandLogo className="h-10 w-10 rounded-lg" />
          <span className="font-bold">Supra-control</span>
        </div>
        <button type="button" onClick={() => setMobileNavOpen(true)} aria-label="Abrir menú" aria-expanded={mobileNavOpen} data-testid="supra-menu-open" className="w-11 h-11 rounded-2xl bg-white/10 hover:bg-white/20 flex items-center justify-center">
          <Menu className="w-6 h-6" />
        </button>
      </div>
      {mobileNavOpen && <div className="md:hidden fixed inset-0 bg-black/50 backdrop-blur-sm z-40" onClick={() => setMobileNavOpen(false)} />}

      <aside className={`fixed inset-y-0 left-0 w-72 max-w-[85vw] z-50 transition-transform duration-300 ${mobileNavOpen ? "translate-x-0" : "-translate-x-full"} md:static md:translate-x-0 md:max-w-none md:z-30 bg-[#0B1F33] text-white flex-shrink-0 flex flex-col md:min-h-[100dvh] shadow-2xl rounded-r-[2rem] md:rounded-r-[2.5rem] overflow-y-auto`} data-testid="supra-sidebar">
        <div className="p-7 flex items-center justify-between gap-3 border-b border-white/10">
          <div className="flex items-center gap-3">
            <BrandLogo className="h-14 w-14 rounded-xl" />
            <div>
              <p className="font-bold tracking-tight leading-tight">Supra-control</p>
              <p className="text-xs text-white/60 font-medium">Todas las clínicas</p>
            </div>
          </div>
          <button type="button" onClick={() => setMobileNavOpen(false)} aria-label="Cerrar menú" className="md:hidden w-10 h-10 rounded-full hover:bg-white/10 flex items-center justify-center text-white/70 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="p-6 flex-1">
          <p className="text-xs font-bold text-white/40 uppercase tracking-widest mb-4">Panel</p>
          <nav className="space-y-2">
            {navItems.filter((item) => item.show).map(({ id, label, Icon, badge }) => (
              <Button
                key={id}
                variant="ghost"
                data-testid={`supra-nav-${id}`}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
                className={`w-full justify-start text-white hover:bg-white/20 hover:text-white font-medium rounded-2xl h-12 ${view === id ? "bg-white/10" : "bg-transparent"}`}
              >
                <Icon className="w-5 h-5 mr-3" />
                {label}
                {badge ? <span className="ml-auto rounded-full bg-amber-500 px-2 py-0.5 text-xs font-bold text-white" data-testid="supra-nav-badge">{badge}</span> : null}
              </Button>
            ))}
          </nav>
        </div>
        <div className="p-6 border-t border-white/10 space-y-2">
          {canManageUsers && (
            <Button
              variant="ghost"
              className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 font-medium rounded-2xl h-12"
              data-testid="director-choose-clinic"
              onClick={async () => {
                await selectClinic(null);
                queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
              }}
            >
              <Repeat className="w-5 h-5 mr-3" />
              Cambiar de clínica
            </Button>
          )}
          <Button variant="ghost" className="w-full justify-start text-white/70 hover:text-white hover:bg-white/10 font-medium rounded-2xl h-12" data-testid="supra-logout" onClick={onLogout}>
            <LogOut className="w-5 h-5 mr-3" />
            Salir
          </Button>
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col md:h-[100dvh] overflow-hidden">
        {canManageUsers && <SupportAlerts />}
        {canManageUsers && <AdminBanner />}
        <main className="flex-1 overflow-y-auto p-4 sm:p-6 md:p-10">
          <div className="max-w-5xl w-full mx-auto">
            <h1 className="text-2xl font-bold tracking-tight mb-6" data-testid="supra-title">{titles[view]}</h1>
            {view === "dashboard" && <SupraDashboard onNavigate={(next) => go(next === "support" ? "support" : next === "admin" && canManageUsers ? "admin" : "clinics")} />}
            {view === "support" && <SupraInbox embedded openTicketId={openTicketId} />}
            {view === "team" && canManageUsers && <SupraTeam embedded />}
            {view === "admin" && canManageUsers && <SupraAdmin embedded />}
            {view === "clinics" && (
              <>
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
                    {center.logoDataUrl && (
                      <img src={center.logoDataUrl} alt="" className="h-8 w-8 rounded-lg object-contain bg-white border border-[#E8E4DE]" />
                    )}
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
                  <p className="text-xs text-muted-foreground font-medium mt-1">{center.slug}{center.specialty === "plastica" ? " · Cirugía plástica" : center.specialty === "dermatologia" ? " · Dermatología" : ""}</p>
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
                    aria-expanded={identityOpenId === center.id}
                    onClick={() => setIdentityOpenId(identityOpenId === center.id ? null : center.id)}
                  >
                    <Palette className="w-4 h-4 mr-2" /> Identidad
                  </Button>
                  {canManageUsers && (
                  <Button
                    variant="outline"
                    className="rounded-full h-10 font-semibold"
                    aria-expanded={usersOpenId === center.id}
                    onClick={() => setUsersOpenId(usersOpenId === center.id ? null : center.id)}
                  >
                    <Users className="w-4 h-4 mr-2" /> Usuarios
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${usersOpenId === center.id ? "rotate-180" : ""}`} />
                  </Button>
                  )}
                  {canManageUsers && (
                  <Button
                    className="rounded-full h-10 font-semibold"
                    data-testid={`enter-clinic-${center.id}`}
                    onClick={async () => {
                      const response = await fetch("/api/auth/enter-clinic", {
                        method: "POST", credentials: "include", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ centerId: center.id }),
                      });
                      if (!response.ok) { toast({ variant: "destructive", title: "No pudimos entrar a la clínica" }); return; }
                      queryClient.removeQueries({ predicate: (q) => q.queryKey[0] !== getGetAuthMeQueryKey()[0] });
                      await queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
                    }}
                  >
                    <LogIn className="w-4 h-4 mr-2" /> Entrar a la clínica
                  </Button>
                  )}
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

              {identityOpenId === center.id && (
                <ClinicIdentityEditor center={center} onClose={() => setIdentityOpenId(null)} />
              )}
              {canManageUsers && usersOpenId === center.id && <CenterUsers centerId={center.id} />}
            </div>
          ))}
        </div>
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
