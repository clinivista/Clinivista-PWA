import { useEffect, useRef, useState } from "react";
import { LogOut, LogIn, Building2, Users, Download, ShieldOff, ShieldCheck, Loader2, CreditCard, Plus, ChevronDown, Palette, LayoutDashboard, Headphones, UserCog, BriefcaseBusiness, Repeat, BookOpen, UserRound, SearchX, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useToast } from "@/hooks/use-toast";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import {
  useGetDirectorCenters,
  useGetAuthMe,
  getGetAuthMeQueryKey,
  getGetDirectorCentersQueryKey,
  usePatchDirectorCenter,
  useRecordDirectorCenterPayment,
  getGetDirectorCenterExportUrl,
  type DirectorCenterSummary,
} from "@workspace/api-client-react";
import { DashboardTopbar, initialsOf } from "@/components/dashboard/topbar";
import { cardClass } from "@/components/dashboard/cards";
import {
  navItemClass, sidebarClass, SidebarOverlay, SidebarBrand, SidebarSectionLabel, SidebarIdentityCard, SidebarHelpCard, NavCount,
} from "@/components/dashboard/sidebar";
import { selectClinic } from "@/components/clinic-chooser";
import { CreateCenterForm } from "./create-center-form";
import { CenterUsers } from "./center-users";
import { SupraTeam } from "./supra-team";
import { DirectorAccount } from "./director-account";
import { SupraManual } from "./supra-manual";
import { SupraInbox, OPEN_SUPPORT_INBOX_EVENT } from "./supra-inbox";
import { SupraDashboard } from "./supra-dashboard";
import { SupportAlerts } from "@/components/support-alerts";
import { SupraAdmin, AdminBanner } from "./supra-admin";
import { ClinicIdentityEditor } from "./clinic-identity-editor";
import { ClinicPlanSelect } from "@/components/clinic-plan-select";
import { CenterTranscription } from "@/components/center-transcription";

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

/** Búsqueda de clínicas por nombre, sin distinguir mayúsculas ni tildes. */
export const normalizeName = (value: string) => value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().trim();

// Un director gestiona además a las personas (usuarios de clínica y equipo de
// supra-control); un administrativo de supra-control solo opera el panel.
type SupraView = "dashboard" | "clinics" | "support" | "team" | "admin" | "account" | "manual";

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
  const [search, setSearch] = useState("");
  // Clínica elegida en «Clínicas recientes»: se lleva a la vista y se resalta un momento.
  const [focusClinicId, setFocusClinicId] = useState<string | null>(null);
  const [highlightId, setHighlightId] = useState<string | null>(null);
  const highlightTimer = useRef<number | null>(null);
  const { data, isLoading, isError } = useGetDirectorCenters();
  const { data: me } = useGetAuthMe();
  const userName = me?.user?.name ?? "";
  const roleLabel = me?.user?.role === "supra_admin" ? "Supra-control" : "Director";
  const patchCenter = usePatchDirectorCenter();
  const recordPayment = useRecordDirectorCenterPayment();

  // Theme portals while this panel is mounted; clinic view keeps its own scope.
  useEffect(() => {
    document.body.classList.add("supra-dashboard");
    return () => document.body.classList.remove("supra-dashboard");
  }, []);

  useEffect(() => {
    if (!mobileNavOpen) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setMobileNavOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [mobileNavOpen]);

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
  const query = normalizeName(search);
  const shownCenters = query ? centers.filter((center) => normalizeName(center.name).includes(query)) : centers;

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
    { id: "account", label: "Mi cuenta", Icon: UserRound, show: canManageUsers },
    { id: "manual", label: "Manual", Icon: BookOpen, show: true },
  ];
  const go = (next: SupraView) => { setView(next); setMobileNavOpen(false); if (next !== "support") setOpenTicketId(null); };
  const openClinic = (id: string) => { setSearch(""); setFocusClinicId(id); go("clinics"); };

  useEffect(() => {
    if (view !== "clinics" || !focusClinicId || isLoading) return;
    const card = document.querySelector(`[data-testid="center-card-${focusClinicId}"]`);
    card?.scrollIntoView?.({ block: "center", behavior: "smooth" });
    setHighlightId(focusClinicId);
    setFocusClinicId(null);
    if (highlightTimer.current) window.clearTimeout(highlightTimer.current);
    highlightTimer.current = window.setTimeout(() => setHighlightId(null), 2500);
  }, [view, focusClinicId, isLoading]);
  useEffect(() => () => { if (highlightTimer.current) window.clearTimeout(highlightTimer.current); }, []);

  const switchClinic = async () => {
    await selectClinic(null);
    queryClient.invalidateQueries({ queryKey: getGetAuthMeQueryKey() });
  };
  const subtitles: Partial<Record<SupraView, string>> = {
    clinics: "Gestiona el acceso, la identidad y la vigencia de cada clínica.",
    support: "Tickets de las clínicas: atiende, responde y resuelve.",
    team: "Personas con acceso a supra-control.",
    admin: "Servicios contratados, su estado y los movimientos del mes.",
    account: "Tu cuenta y el perfil con que entras a las clínicas.",
    manual: "Cómo usar supra-control.",
  };
  const titles: Record<SupraView, string> = { dashboard: "Resumen de la plataforma", clinics: "Clínicas", support: "Soporte (tickets de las clínicas)", team: "Equipo de supra-control", admin: "Administración: servicios y finanzas", account: "Mi cuenta", manual: "Manual de supra-control" };

  return (
    <div className="supra-dashboard h-[100dvh] bg-background text-foreground flex flex-col md:flex-row font-sans">
      <SidebarOverlay open={mobileNavOpen} onClose={() => setMobileNavOpen(false)} />

      <aside className={sidebarClass(mobileNavOpen)} data-testid="supra-sidebar">
        <SidebarBrand tagline="Supra-control · Todas las clínicas" closeLabel="Cerrar menú" onClose={() => setMobileNavOpen(false)} />
        <div className="px-4 py-2 flex-1">
          <nav className="space-y-1" aria-label="Panel">
            {navItems.filter((item) => item.show).map(({ id, label, Icon, badge }) => (
              <Button
                key={id}
                variant="ghost"
                data-testid={`supra-nav-${id}`}
                aria-current={view === id ? "page" : undefined}
                onClick={() => go(id)}
                className={`${navItemClass(view === id)} h-auto min-h-12 py-2.5`}
              >
                <Icon className="w-5 h-5 shrink-0" />
                <span className="sd-nav-label">{label}</span>
                <NavCount count={badge ?? 0} testId="supra-nav-badge" />
              </Button>
            ))}
          </nav>
        </div>
        <div className="px-4 pb-5 pt-4 space-y-4">
          <div className="pt-4 border-t border-white/10">
            <SidebarSectionLabel>Mi cuenta</SidebarSectionLabel>
            <SidebarIdentityCard
              testId="supra-account-card"
              initial={initialsOf(userName)}
              title={userName || roleLabel}
              subtitle={roleLabel}
              onClick={canManageUsers ? () => go("account") : undefined}
              label={canManageUsers ? `Abrir Mi cuenta: ${userName}` : undefined}
            />
            {canManageUsers && (
              <Button
                variant="ghost"
                className="mt-2 w-full justify-start gap-3 text-white/85 hover:bg-white/10 hover:text-white font-medium rounded-xl h-11 [&_svg]:size-5"
                data-testid="director-choose-clinic"
                onClick={switchClinic}
              >
                <Repeat className="w-5 h-5" />
                Cambiar de clínica
              </Button>
            )}
          </div>
          <SidebarHelpCard title="¿Necesitas ayuda?" desc="Ver el manual de supra-control" onClick={() => go("manual")} testId="supra-help-card" />
        </div>
      </aside>

      <div className="flex-1 min-w-0 flex flex-col min-h-0 md:h-[100dvh] overflow-hidden">
        {canManageUsers && <SupportAlerts />}
        {canManageUsers && <AdminBanner />}
        <DashboardTopbar
          testId="supra-topbar"
          menu={{ open: mobileNavOpen, label: "Abrir menú", onOpen: () => setMobileNavOpen(true), testId: "supra-menu-open" }}
          search={{
            value: search,
            placeholder: "Buscar clínicas por nombre…",
            label: "Buscar clínicas",
            onSearch: (value, submit) => { setSearch(value); if ((submit || value.trim()) && view !== "clinics") go("clinics"); },
            show: true,
            showMobile: view === "dashboard" || view === "clinics",
          }}
          bell={{ count: waiting, label: waiting === 0 ? "Tickets en espera: ninguno" : `Tickets en espera: ${waiting}`, onClick: () => go("support") }}
          account={{
            name: userName || roleLabel,
            role: roleLabel,
            label: "Menú de la cuenta",
            content: (close) => (
              <div className="py-1">
                {canManageUsers && (
                  <button type="button" onClick={() => { close(); go("account"); }} className="w-full min-h-11 flex items-center gap-2.5 px-4 text-sm text-start text-foreground hover:bg-muted transition-colors" data-testid="supra-menu-account">
                    <UserRound className="w-4 h-4" aria-hidden="true" />Mi cuenta
                  </button>
                )}
                {canManageUsers && (
                  <button type="button" onClick={() => { close(); void switchClinic(); }} className="w-full min-h-11 flex items-center gap-2.5 px-4 text-sm text-start text-foreground hover:bg-muted transition-colors" data-testid="supra-menu-switch">
                    <Repeat className="w-4 h-4" aria-hidden="true" />Cambiar de clínica
                  </button>
                )}
                <button type="button" onClick={() => { close(); onLogout(); }} className="w-full min-h-12 flex items-center gap-2.5 px-4 border-t border-border text-sm font-semibold text-red-700 hover:bg-red-50 transition-colors" data-testid="supra-logout">
                  <LogOut className="w-4 h-4" aria-hidden="true" />Salir
                </button>
              </div>
            ),
          }}
        />
        <main className="flex-1 min-h-0 overflow-y-auto">
          {view === "dashboard" ? (
            <SupraDashboard
              userName={userName}
              canManageUsers={canManageUsers}
              onNavigate={(next) => go(next === "admin" || next === "team" ? (canManageUsers ? next : "clinics") : next)}
              onOpenClinic={openClinic}
            />
          ) : (
          <>
          <header className="bg-card border-b border-border px-4 py-5 sm:px-6 md:px-8 md:py-6">
            <h1 className="text-xl sm:text-2xl font-bold text-foreground tracking-tight" data-testid="supra-title">{titles[view]}</h1>
            {subtitles[view] && <p className="text-sm text-muted-foreground mt-1">{subtitles[view]}</p>}
          </header>
          <div className="px-4 sm:px-6 md:px-8 py-6 pb-12">
          <div className="max-w-7xl w-full mx-auto">
            {view === "support" && <SupraInbox embedded openTicketId={openTicketId} />}
            {view === "team" && canManageUsers && <SupraTeam embedded />}
            {view === "admin" && canManageUsers && <SupraAdmin embedded />}
            {view === "account" && canManageUsers && <DirectorAccount />}
            {view === "manual" && <SupraManual />}
            {view === "clinics" && (
              <>
        {creating ? (
          <CreateCenterForm onClose={() => setCreating(false)} />
        ) : (
          <div className="flex flex-wrap items-center justify-between gap-3 mb-4">
            {query ? (
              <p className="flex flex-wrap items-center gap-2 text-sm text-muted-foreground" data-testid="clinic-filter">
                Filtrando por «<span className="font-semibold text-foreground">{search.trim()}</span>»: {shownCenters.length} de {centers.length}
                <Button type="button" variant="ghost" className="h-11 rounded-xl px-3 gap-1 text-primary hover:bg-accent hover:text-primary font-semibold" onClick={() => setSearch("")}>
                  <X className="w-4 h-4" />Quitar filtro
                </Button>
              </p>
            ) : <span />}
            <Button className="rounded-xl h-11 px-5 font-semibold gap-2 shadow-sm shadow-primary/25" onClick={() => setCreating(true)}>
              <Plus className="w-4 h-4" /> Crear clínica
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
          <div className={`${cardClass} px-6 py-14 text-center text-muted-foreground font-medium`}>
            Todavía no hay ninguna clínica con pacientes o personal registrado.
          </div>
        )}
        {!isLoading && !isError && centers.length > 0 && shownCenters.length === 0 && (
          <div className={`${cardClass} px-6 py-14 text-center flex flex-col items-center`} data-testid="clinic-filter-empty">
            <SearchX className="w-8 h-8 text-primary/60 mb-3" aria-hidden="true" />
            <p className="font-semibold text-foreground">Ninguna clínica coincide con «{search.trim()}».</p>
          </div>
        )}

        <div className="space-y-4">
          {shownCenters.map((center) => (
            <div
              key={center.id}
              className={`${cardClass} p-5 sm:p-6 flex flex-col gap-5 transition-shadow ${highlightId === center.id ? "ring-2 ring-primary ring-offset-2 ring-offset-background" : ""}`}
              data-highlighted={highlightId === center.id ? "true" : undefined}
            >
              <div className="flex flex-col gap-5" data-testid={`center-card-${center.id}`}>
                <div className="min-w-0">
                  <div className="flex items-center gap-2 flex-wrap">
                    {center.logoDataUrl && (
                      <img src={center.logoDataUrl} alt="" className="h-8 w-8 shrink-0 rounded-lg object-contain bg-white border border-border" />
                    )}
                    <h2 className="text-lg font-bold text-foreground break-words min-w-0">{center.name}</h2>
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
                  <div className="flex flex-wrap items-center gap-x-4 gap-y-1.5 mt-3 text-sm text-muted-foreground font-medium">
                    <span className="flex items-center gap-1.5 whitespace-nowrap">
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

                <div className="flex flex-wrap items-center gap-2 min-w-0">
                  <a
                    href={getGetDirectorCenterExportUrl(center.id)}
                    className="inline-flex items-center gap-2 h-11 px-4 rounded-xl border border-border bg-card text-sm font-semibold text-foreground hover:bg-muted transition-colors"
                  >
                    <Download className="w-4 h-4" /> Exportar datos
                  </a>
                  <Button
                    variant="outline"
                    className="rounded-xl h-11 font-semibold"
                    aria-expanded={identityOpenId === center.id}
                    onClick={() => setIdentityOpenId(identityOpenId === center.id ? null : center.id)}
                  >
                    <Palette className="w-4 h-4 mr-2" /> Identidad
                  </Button>
                  {canManageUsers && (
                  <Button
                    variant="outline"
                    className="rounded-xl h-11 font-semibold"
                    aria-expanded={usersOpenId === center.id}
                    onClick={() => setUsersOpenId(usersOpenId === center.id ? null : center.id)}
                  >
                    <Users className="w-4 h-4 mr-2" /> Usuarios
                    <ChevronDown className={`w-4 h-4 ml-1 transition-transform ${usersOpenId === center.id ? "rotate-180" : ""}`} />
                  </Button>
                  )}
                  {canManageUsers && (
                  <Button
                    className="rounded-xl h-11 font-semibold"
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
                    className="rounded-xl h-11 font-semibold"
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

              <div className="flex flex-col sm:flex-row sm:items-center gap-2 pt-4 border-t border-border">
                <label htmlFor={`paid-until-${center.id}`} className="text-sm font-semibold text-muted-foreground shrink-0">
                  Registrar pago hasta:
                </label>
                <div className="flex flex-wrap sm:flex-nowrap items-center gap-2">
                  <Input
                    id={`paid-until-${center.id}`}
                    type="date"
                    className="h-11 rounded-xl flex-1 min-w-0 sm:max-w-[180px] sm:flex-none"
                    value={paymentDraft[center.id] ?? ""}
                    onChange={(event) => setPaymentDraft((prev) => ({ ...prev, [center.id]: event.target.value }))}
                  />
                  <Button
                    variant="outline"
                    className="rounded-xl h-11 font-semibold shrink-0"
                    disabled={!paymentDraft[center.id] || pendingId === center.id}
                    onClick={() => handleRecordPayment(center.id)}
                  >
                    {pendingId === center.id ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <CreditCard className="w-4 h-4 mr-2" />}
                    Registrar pago
                  </Button>
                </div>
              </div>

              <ClinicPlanSelect center={center} />
              <CenterTranscription centerId={center.id} />

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
          </div>
          </>
          )}
        </main>
      </div>
    </div>
  );
}
